import { graphql } from '@octokit/graphql';
import { StalePRQueryResult, type GitHubConfig, type LeaderboardQueryResult, type ReviewerStats, type StalePR, type PRWithStatus, type PRStatus, type UrgencyLevel } from './github.types';

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

    // Guardrail: don’t scan the whole repo history
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
    const totalActivity = reviewCount + commentCount;

    // Adjust thresholds based on time unit
    // Days: 14, 7, 3
    // Hours: 6, 3, 1 (proportionally scaled for testing)
    const criticalThreshold = timeUnit === 'hours' ? 6 : 14;
    const urgentThreshold = timeUnit === 'hours' ? 3 : 7;
    const warningThreshold = timeUnit === 'hours' ? 1 : 3;

    const unit = timeUnit === 'hours' ? 'hour' : 'day';
    const units = timeUnit === 'hours' ? 'hours' : 'days';

    // CRITICAL: Old + No activity
    if (age >= criticalThreshold && totalActivity === 0) {
      return {
        urgency: 'critical',
        message: `🔥 CRITICAL: No activity for ${criticalThreshold}+ ${units}`,
        color: 0xff0000,
        emoji: '🔥',
      };
    }

    // CRITICAL: Old + Very little activity
    if (age >= criticalThreshold && totalActivity < 3) {
      return {
        urgency: 'critical',
        message: `🔴 CRITICAL: Almost no activity for ${criticalThreshold}+ ${units}`,
        color: 0xff4444,
        emoji: '🔴',
      };
    }

    // URGENT: No activity for a while
    if (age >= urgentThreshold && totalActivity === 0) {
      return {
        urgency: 'urgent',
        message: `🟠 URGENT: No activity for ${urgentThreshold}+ ${units}`,
        color: 0xff8800,
        emoji: '🟠',
      };
    }

    // URGENT: Old with minimal activity
    if (age >= urgentThreshold && totalActivity < 3) {
      return {
        urgency: 'urgent',
        message: `⚠️ URGENT: Little activity for ${urgentThreshold}+ ${units}`,
        color: 0xffaa00,
        emoji: '⚠️',
      };
    }

    // WARNING: No reviews but some comments
    if (age >= warningThreshold && reviewCount === 0 && commentCount > 0) {
      return {
        urgency: 'warning',
        message: '🟡 WARNING: Comments but no reviews',
        color: 0xffff00,
        emoji: '🟡',
      };
    }

    // WARNING: Getting old
    if (age >= warningThreshold) {
      return {
        urgency: 'warning',
        message: '💭 Needs attention',
        color: 0xffdd00,
        emoji: '💭',
      };
    }

    // NORMAL: Recent with activity
    return {
      urgency: 'normal',
      message: '✅ Active',
      color: 0x00ff00,
      emoji: '✅',
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

const STALE_PR_QUERY = `
query($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(
      first: 30
      after: $cursor
      states: [OPEN]
      orderBy: { field: UPDATED_AT, direction: ASC }
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