import { graphql } from '@octokit/graphql';
import { StalePRQueryResult, type GitHubConfig, type LeaderboardQueryResult, type ReviewerStats, type StalePR, type PRWithStatus, type PRStatus, type UrgencyLevel, RescuerStats } from './github.types';


export class GitHubService {
  private graphql: typeof graphql;
  private owner: string;
  private repo: string;

  constructor(config: GitHubConfig) {
    this.graphql = graphql.defaults({
      headers: {
        authorization: `token ${config.token}`,
      },
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }


  /**
   * 🏆 Leaderboard
   * - Counts reviews + comments
   * - Includes OPEN + CLOSED PRs
   * - Hackathon-safe limits
   */
  async getLeaderboard(): Promise<ReviewerStats[]> {
    const leaderboard = new Map<string, ReviewerStats>();
    let cursor: string | null = null;
    let pagesFetched = 0;

    // Guardrail: don't scan the whole repo history
    while (pagesFetched < 6) {
      const res: LeaderboardQueryResult = await this.graphql(
        LEADERBOARD_QUERY,
        {
          owner: this.owner,
          repo: this.repo,
          cursor,
        }
      );

      const prConnection = res.repository.pullRequests;

      for (const pr of prConnection.nodes) {
        // Only count the latest review per user per PR
        const reviewedUsers = new Set<string>();

        for (const review of pr.reviews.nodes) {
          const username = review.author?.login;
          if (!username || reviewedUsers.has(username)) continue;

          reviewedUsers.add(username);
          const stats = this.getOrCreateReviewer(leaderboard, username);

          stats.reviewCount++;

          switch (review.state) {
            case 'APPROVED':
              stats.approvals++;
              stats.points += 50;
              break;
            case 'CHANGES_REQUESTED':
              stats.changesRequested++;
              stats.points += 30;
              break;
            default:
              stats.comments++;
              stats.points += 10;
          }
        }

        // Plain issue comments (not formal reviews)
        for (const comment of pr.comments.nodes) {
          const username = comment.author?.login;
          if (!username) continue;

          const stats = this.getOrCreateReviewer(leaderboard, username);
          stats.totalComments++;
          stats.points += 5;
        }
      }

      if (!prConnection.pageInfo.hasNextPage) break;
      cursor = prConnection.pageInfo.endCursor;
      pagesFetched++;
    }

    return Array.from(leaderboard.values()).sort(
      (a, b) => b.points - a.points
    );
  }

  /**
   * Convenience for Phaser / UI
   */
  async getTopReviewers(limit = 10): Promise<ReviewerStats[]> {
    const leaderboard = await this.getLeaderboard();
    return leaderboard.slice(0, limit);
  }

  /**
   * 🚑 RESCUE LEADERBOARD - Who saved the most neglected PRs?
   * Focuses on reviewers who help OLD/stale PRs (the real heroes!)
   * 
   * @param minAge - PRs must be this old to count as "rescued" (default: 7)
   * @param timeUnit - Time unit for age calculation
   * @param countComments - Whether to count regular comments as rescues (default: true, at 50% value)
   */
  async getRescueLeaderboard(
    minAge = 7,
    timeUnit: 'hours' | 'days' = 'days',
    countComments = true
  ): Promise<RescuerStats[]> {
    const leaderboard = new Map<string, RescuerStats>();
    let cursor: string | null = null;
    let pagesFetched = 0;

    // Fetch both open and closed PRs
    const RESCUE_QUERY = `
      query($owner: String!, $repo: String!, $cursor: String) {
        repository(owner: $owner, name: $repo) {
          pullRequests(
            first: 30
            after: $cursor
            states: [OPEN, CLOSED, MERGED]
            orderBy: { field: CREATED_AT, direction: DESC }
          ) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              createdAt
              reviews(first: 30) {
                nodes {
                  state
                  author { login }
                  submittedAt
                }
              }
              comments(first: 30) {
                nodes {
                  author { login }
                  createdAt
                }
              }
            }
          }
        }
      }
    `;

    while (pagesFetched < 6) {
      const res: any = await this.graphql(RESCUE_QUERY, {
        owner: this.owner,
        repo: this.repo,
        cursor,
      });

      const prConnection = res.repository.pullRequests;

      for (const pr of prConnection.nodes) {
        const prCreatedAt = new Date(pr.createdAt);
        const reviewedUsers = new Set<string>();

        // Process formal reviews (full points)
        for (const review of pr.reviews.nodes) {
          const username = review.author?.login;
          const reviewedAt = new Date(review.submittedAt);
          
          if (!username || reviewedUsers.has(username)) continue;
          reviewedUsers.add(username);

          // Calculate PR age when reviewed
          const ageAtReviewMs = reviewedAt.getTime() - prCreatedAt.getTime();
          let ageAtReview: number;
          
          if (timeUnit === 'hours') {
            ageAtReview = ageAtReviewMs / (1000 * 60 * 60);
          } else {
            ageAtReview = ageAtReviewMs / (1000 * 60 * 60 * 24);
          }

          // Only count if PR was old enough (a "rescue")
          if (ageAtReview < minAge) continue;

          const stats = this.getOrCreateRescuer(leaderboard, username);
          stats.rescueCount++;

          // Award points based on how old the PR was and review type
          let rescuePoints = 0;
          let isFullReview = review.state === 'APPROVED' || review.state === 'CHANGES_REQUESTED';
          let multiplier = isFullReview ? 1.0 : 0.5; // Comments get 50% value

          if (timeUnit === 'hours') {
            // Hours thresholds: 6+ = critical, 3+ = urgent, 1+ = warning
            if (ageAtReview >= 6) {
              stats.criticalRescues++;
              rescuePoints = Math.floor(100 * multiplier);
            } else if (ageAtReview >= 3) {
              stats.urgentRescues++;
              rescuePoints = Math.floor(50 * multiplier);
            } else {
              stats.warningRescues++;
              rescuePoints = Math.floor(25 * multiplier);
            }
          } else {
            // Days thresholds: 14+ = critical, 7+ = urgent, 3+ = warning
            if (ageAtReview >= 14) {
              stats.criticalRescues++;
              rescuePoints = Math.floor(100 * multiplier);
            } else if (ageAtReview >= 7) {
              stats.urgentRescues++;
              rescuePoints = Math.floor(50 * multiplier);
            } else {
              stats.warningRescues++;
              rescuePoints = Math.floor(25 * multiplier);
            }
          }

          stats.points += rescuePoints;

          // Track review type
          switch (review.state) {
            case 'APPROVED':
              stats.approvals++;
              break;
            case 'CHANGES_REQUESTED':
              stats.changesRequested++;
              break;
            default:
              stats.comments++;
          }
        }

        // Process regular comments if enabled (50% points)
        if (countComments) {
          const commentedUsers = new Set<string>();
          
          for (const comment of pr.comments.nodes) {
            const username = comment.author?.login;
            const commentedAt = new Date(comment.createdAt);
            
            if (!username || commentedUsers.has(username) || reviewedUsers.has(username)) {
              continue; // Skip if already reviewed or commented
            }
            commentedUsers.add(username);

            // Calculate PR age when commented
            const ageAtCommentMs = commentedAt.getTime() - prCreatedAt.getTime();
            let ageAtComment: number;
            
            if (timeUnit === 'hours') {
              ageAtComment = ageAtCommentMs / (1000 * 60 * 60);
            } else {
              ageAtComment = ageAtCommentMs / (1000 * 60 * 60 * 24);
            }

            // Only count if PR was old enough
            if (ageAtComment < minAge) continue;

            const stats = this.getOrCreateRescuer(leaderboard, username);
            stats.rescueCount++;

            // Award 50% points for comments
            let rescuePoints = 0;
            
            if (timeUnit === 'hours') {
              if (ageAtComment >= 6) {
                stats.criticalRescues++;
                rescuePoints = 50; // 50% of 100
              } else if (ageAtComment >= 3) {
                stats.urgentRescues++;
                rescuePoints = 25; // 50% of 50
              } else {
                stats.warningRescues++;
                rescuePoints = 12; // 50% of 25
              }
            } else {
              if (ageAtComment >= 14) {
                stats.criticalRescues++;
                rescuePoints = 50; // 50% of 100
              } else if (ageAtComment >= 7) {
                stats.urgentRescues++;
                rescuePoints = 25; // 50% of 50
              } else {
                stats.warningRescues++;
                rescuePoints = 12; // 50% of 25
              }
            }

            stats.points += rescuePoints;
            stats.comments++; // Track as comment rescue
          }
        }
      }

      if (!prConnection.pageInfo.hasNextPage) break;
      cursor = prConnection.pageInfo.endCursor;
      pagesFetched++;
    }

    return Array.from(leaderboard.values()).sort(
      (a, b) => b.points - a.points
    );
  }

  /**
   * Get top N rescuers
   */
  async getTopRescuers(
    limit = 10, 
    minAge = 7, 
    timeUnit: 'hours' | 'days' = 'days',
    countComments = true
  ): Promise<RescuerStats[]> {
    const leaderboard = await this.getRescueLeaderboard(minAge, timeUnit, countComments);
    return leaderboard.slice(0, limit);
  }

  /**
   * Internal helper
   */
  private getOrCreateReviewer(
    map: Map<string, ReviewerStats>,
    username: string
  ): ReviewerStats {
    if (!map.has(username)) {
      map.set(username, {
        username,
        reviewCount: 0,
        approvals: 0,
        changesRequested: 0,
        comments: 0,
        totalComments: 0,
        reactions: 0,
        points: 0,
      });
    }
    return map.get(username)!;
  }

  /**
   * Internal helper for rescuer stats
   */
  private getOrCreateRescuer(
    map: Map<string, RescuerStats>,
    username: string
  ): RescuerStats {
    if (!map.has(username)) {
      map.set(username, {
        username,
        rescueCount: 0,
        criticalRescues: 0,
        urgentRescues: 0,
        warningRescues: 0,
        approvals: 0,
        changesRequested: 0,
        comments: 0,
        points: 0,
      });
    }
    return map.get(username)!;
  }

  async fetchStalePRs(
    staleTime = 7, 
    onlyUnreviewed = true, 
    timeUnit: 'hours' | 'days' = 'days'
  ): Promise<StalePR[]> {
    const stalePRs: StalePR[] = [];
    let cursor: string | null = null;
    const now = new Date();
    let pagesFetched = 0;

    while (pagesFetched < 6) { // guardrail like leaderboard
      const res: StalePRQueryResult = await this.graphql(
        STALE_PR_QUERY,
        {
          owner: this.owner,
          repo: this.repo,
          cursor,
        }
      );

      const prConnection = res.repository.pullRequests;

      for (const pr of prConnection.nodes) {
        const createdAt = new Date(pr.createdAt);
        const ageMs = now.getTime() - createdAt.getTime();
        
        
        // Calculate age based on time unit
        let age: number;
        if (timeUnit === 'hours') {
          age = ageMs / (1000 * 60 * 60); // Convert to hours
        } else {
          age = ageMs / (1000 * 60 * 60 * 24); // Convert to days
        }

        if (age < staleTime) continue;

        const reviewCount = pr.reviews.nodes.length;

        console.log(
          `PR #${pr.number} age=${age.toFixed(2)} ${timeUnit}, reviews=${reviewCount}`
        );

        if (onlyUnreviewed && reviewCount > 0) continue;

        const commentCount = pr.comments.nodes.length;

        stalePRs.push({
          number: pr.number,
          title: pr.title,
          url: pr.url,
          createdAt: pr.createdAt,
          reviewCount,
          commentCount,
        });
      }

      if (!prConnection.pageInfo.hasNextPage) break;
      cursor = prConnection.pageInfo.endCursor;
      pagesFetched++;
    }

    return stalePRs;
  }

  /**
   * 🔥 Get top 10 most neglected PRs with urgency status
   * Perfect for "PR Fire Brigade" game!
   * @param minTime - Minimum age (default: 3)
   * @param timeUnit - Time unit: 'hours' or 'days' (default: 'days')
   */
  async getTop10MostNeglectedPRs(
    minTime = 3, 
    timeUnit: 'hours' | 'days' = 'days'
  ): Promise<PRWithStatus[]> {
    // Get all stale PRs (3+ time units old)
    console.log("min time", minTime, timeUnit)
    const stalePRs = await this.fetchStalePRs(minTime, false, timeUnit);
    const now = new Date();

    // Add status to each PR
    const prsWithStatus: PRWithStatus[] = stalePRs.map(pr => {
      const createdAt = new Date(pr.createdAt);
      const ageMs = now.getTime() - createdAt.getTime();
      
      // Calculate age in requested unit
      let age: number;
      if (timeUnit === 'hours') {
        age = Math.floor(ageMs / (1000 * 60 * 60));
      } else {
        age = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      }
      
      // Calculate status based on activity
      const status = this.calculatePRStatus(age, pr.reviewCount, pr.commentCount, timeUnit);
      
      return {
        ...pr,
        ageDays: age, // Renamed but still used for compatibility
        status,
      };
    });

    // Sort by urgency (most neglected first)
    const sorted = prsWithStatus.sort((a, b) => {
      // Priority order: critical > urgent > warning > normal
      const urgencyOrder: Record<UrgencyLevel, number> = { 
        critical: 4, 
        urgent: 3, 
        warning: 2, 
        normal: 1 
      };
      
      if (urgencyOrder[a.status.urgency] !== urgencyOrder[b.status.urgency]) {
        return urgencyOrder[b.status.urgency] - urgencyOrder[a.status.urgency];
      }
      
      // If same urgency, older PRs first
      return b.ageDays - a.ageDays;
    });

    // Return top 10
    return sorted.slice(0, 10);
  }

  /**
   * Calculate PR status based on age and activity
   * @param age - Age in specified time unit
   * @param reviewCount - Number of reviews
   * @param commentCount - Number of comments
   * @param timeUnit - Time unit used for age ('hours' or 'days')
   */
  private calculatePRStatus(
    age: number, 
    reviewCount: number, 
    commentCount: number,
    timeUnit: 'hours' | 'days' = 'days'
  ): PRStatus {
    const hasReview = reviewCount > 0;
    const hasComments = commentCount > 0;

    const criticalThreshold = timeUnit === 'hours' ? 6 : 14;
    const urgentThreshold   = timeUnit === 'hours' ? 3 : 7;
    const warningThreshold  = timeUnit === 'hours' ? 1 : 3;

    const units = timeUnit === 'hours' ? 'hours' : 'days';

    // 🛑 Reviewed PRs are always safe
    if (hasReview) {
      return {
        urgency: 'normal',
        message: '✅ Reviewed',
        color: 0x00ff00,
        emoji: '✅',
      };
    }

    // 🔥 CRITICAL: Old + no reviews
    if (age >= criticalThreshold) {
      return {
        urgency: 'critical',
        message: hasComments
          ? `🔴 CRITICAL: Discussed but not reviewed for ${criticalThreshold}+ ${units}`
          : `🔥 CRITICAL: No activity for ${criticalThreshold}+ ${units}`,
        color: 0xff0000,
        emoji: '🔥',
      };
    }

    // 🟠 URGENT: Aging without review
    if (age >= urgentThreshold) {
      return {
        urgency: 'urgent',
        message: hasComments
          ? `⚠️ URGENT: Comments but no review`
          : `🟠 URGENT: No activity for ${urgentThreshold}+ ${units}`,
        color: 0xff8800,
        emoji: '🟠',
      };
    }

    // 🟡 WARNING: Fresh but ignored
    if (age >= warningThreshold) {
      return {
        urgency: 'warning',
        message: hasComments
          ? '🟡 WARNING: Discussed, no review'
          : '💭 Needs attention',
        color: 0xffff00,
        emoji: '🟡',
      };
    }

    // 🟢 NORMAL: Fresh PR
    return {
      urgency: 'normal',
      message: '🆕 New PR',
      color: 0x66ff66,
      emoji: '🆕',
    };
  }
}

/** GRAPHQL QUERIES */

/**
 * GraphQL query:
 * - Open + Closed PRs
 * - Reviews (author + state)
 * - Issue comments (author)
 * - Paginated
 */
const LEADERBOARD_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: 30
      after: $cursor
      states: [OPEN, CLOSED]
      orderBy: { field: UPDATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        reviews(first: 30) {
          nodes {
            state
            author { login }
          }
        }
        comments(first: 30) {
          nodes {
            author { login }
          }
        }
      }
    }
  }
}
`;

export const STALE_PR_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: 30
      after: $cursor
      states: [OPEN]
      orderBy: { field: CREATED_AT, direction: DESC }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        number
        title
        url
        createdAt
        reviews(first: 30) {
          nodes {
            state
            author { login }
          }
        }
        comments(first: 30) {
          nodes {
            author { login }
          }
        }
      }
    }
  }
}
`;