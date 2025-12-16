import { Octokit } from 'octokit';
import type { 
  GitHubPullRequest, 
  GitHubConfig, 
  GitHubReview, 
  PRWithReviewInfo, 
  ReviewerStats,
  GitHubUser,
  GitHubUserSearchResult,
  ReviewerStatsWithUser
} from './github.types';

export class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
    this.owner = config.owner;
    this.repo = config.repo;
  }

  /**
   * Calculate the age of a PR in days
   */
  private calculateAgeDays(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Fetch all open PRs for the configured repository
   */
  async fetchAllOpenPRs(): Promise<GitHubPullRequest[]> {
    try {
      console.log(`Fetching open PRs for ${this.owner}/${this.repo}...`);
      
      const { data } = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: 100, // Max per page
      });

      console.log(`Found ${data.length} open PRs`);
      return data;
    } catch (error) {
      console.error('Error fetching PRs:', error);
      throw new Error(`Failed to fetch PRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch reviews for a specific PR
   * Reviews are formal: APPROVED, CHANGES_REQUESTED, COMMENTED
   */
  async fetchPRReviews(prNumber: number): Promise<GitHubReview[]> {
    try {
      const { data } = await this.octokit.rest.pulls.listReviews({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return data;
    } catch (error) {
      console.error(`Error fetching reviews for PR #${prNumber}:`, error);
      return [];
    }
  }

  /**
   * Fetch issue comments for a specific PR
   * These are regular comments in the PR conversation (not code reviews)
   */
  async fetchPRComments(prNumber: number): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber, // PRs are issues in the API
      });

      return data;
    } catch (error) {
      console.error(`Error fetching comments for PR #${prNumber}:`, error);
      return [];
    }
  }

  /**
   * Fetch reactions for a specific PR
   * These are emoji reactions (👍 👎 😄 🎉 ❤️ 🚀 👀 ️)
   */
  async fetchPRReactions(prNumber: number): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.reactions.listForIssue({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
      });

      return data;
    } catch (error) {
      console.error(`Error fetching reactions for PR #${prNumber}:`, error);
      return [];
    }
  }

  /**
   * Find PRs without reviews that are older than X days
   * @param minAgeDays - Minimum age in days (e.g., 7 for PRs older than 7 days)
   * @returns Array of PRs with review information
   */
  async fetchPRsWithoutReviewsSince(minAgeDays: number): Promise<PRWithReviewInfo[]> {
    try {
      console.log(`Fetching PRs without reviews older than ${minAgeDays} days...`);

      // Get all open PRs
      const allPRs = await this.fetchAllOpenPRs();
      const prsWithReviewInfo: PRWithReviewInfo[] = [];

      // Check each PR for reviews and age
      for (const pr of allPRs) {
        const ageDays = this.calculateAgeDays(pr.created_at);

        // Skip PRs that are too new
        if (ageDays < minAgeDays) {
          continue;
        }

        // Fetch reviews for this PR
        const reviews = await this.fetchPRReviews(pr.number);

        // Filter to meaningful reviews (not just comments)
        const meaningfulReviews = reviews.filter(
          r => r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED'
        );

        const prInfo: PRWithReviewInfo = {
          pr,
          reviews: meaningfulReviews,
          ageDays,
          hasReviews: meaningfulReviews.length > 0,
        };

        // Only include PRs without reviews
        if (meaningfulReviews.length === 0) {
          prsWithReviewInfo.push(prInfo);
        }
      }

      console.log(`Found ${prsWithReviewInfo.length} PRs without reviews older than ${minAgeDays} days`);
      return prsWithReviewInfo;
    } catch (error) {
      console.error('Error fetching PRs without reviews:', error);
      throw new Error(`Failed to fetch PRs without reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find PRs without any reviews OR comments older than X days
   * These are PRs that have been completely ignored
   * @param minAgeDays - Minimum age in days (e.g., 3 for PRs older than 3 days)
   * @returns Array of PRs with review and comment information
   */
  async fetchPRsWithoutActivitySince(minAgeDays: number): Promise<PRWithReviewInfo[]> {
    try {
      console.log(`Fetching PRs without any activity older than ${minAgeDays} days...`);

      // Get all open PRs
      const allPRs = await this.fetchAllOpenPRs();
      const prsWithoutActivity: PRWithReviewInfo[] = [];

      // Check each PR for reviews, comments, and age
      for (const pr of allPRs) {
        const ageDays = this.calculateAgeDays(pr.created_at);

        // Skip PRs that are too new
        if (ageDays < minAgeDays) {
          continue;
        }

        // Fetch reviews and comments
        const reviews = await this.fetchPRReviews(pr.number);
        const comments = await this.fetchPRComments(pr.number);

        // Filter to meaningful reviews
        const meaningfulReviews = reviews.filter(
          r => r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED'
        );

        // No reviews AND no comments = totally ignored PR
        if (meaningfulReviews.length === 0 && comments.length === 0) {
          const prInfo: PRWithReviewInfo = {
            pr,
            reviews: meaningfulReviews,
            ageDays,
            hasReviews: false,
          };
          prsWithoutActivity.push(prInfo);
        }
      }

      console.log(`Found ${prsWithoutActivity.length} PRs without any activity older than ${minAgeDays} days`);
      return prsWithoutActivity;
    } catch (error) {
      console.error('Error fetching PRs without activity:', error);
      throw new Error(`Failed to fetch PRs without activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get reviewer statistics for all PRs in the repository
   * Returns who reviewed the most, with their stats
   * @param state - PR state: 'open', 'closed', 'all' (default: 'all')
   * @param limit - Maximum number of PRs to check (default: 100)
   */
  async getReviewerStats(state: 'open' | 'closed' | 'all' = 'all', limit: number = 100): Promise<ReviewerStats[]> {
    try {
      console.log(`Fetching reviewer statistics for ${this.owner}/${this.repo}...`);

      const reviewerMap = new Map<string, ReviewerStats>();

      // Fetch PRs based on state
      const prStates: ('open' | 'closed')[] = state === 'all' ? ['open', 'closed'] : [state];

      for (const prState of prStates) {
        console.log(`Fetching ${prState} PRs...`);
        
        const { data: prs } = await this.octokit.rest.pulls.list({
          owner: this.owner,
          repo: this.repo,
          state: prState,
          per_page: limit,
          sort: 'updated',
          direction: 'desc',
        });

        console.log(`Found ${prs.length} ${prState} PRs`);

        // Collect stats from all PRs
        for (const pr of prs) {
          // Fetch reviews, comments, AND reactions
          const reviews = await this.fetchPRReviews(pr.number);
          const comments = await this.fetchPRComments(pr.number);
          const reactions = await this.fetchPRReactions(pr.number);

          // Process reviews
          for (const review of reviews) {
            const username = review.user?.login;
            if (!username) continue;

            // Initialize reviewer if not exists
            if (!reviewerMap.has(username)) {
              reviewerMap.set(username, {
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

            const stats = reviewerMap.get(username)!;
            stats.reviewCount++;

            // Count by review type
            if (review.state === 'APPROVED') {
              stats.approvals++;
              stats.points += 50; // 50 points for approval
            } else if (review.state === 'CHANGES_REQUESTED') {
              stats.changesRequested++;
              stats.points += 30; // 30 points for requesting changes
            } else if (review.state === 'COMMENTED') {
              stats.comments++;
              stats.points += 10; // 10 points for comment reviews
            }
          }

          // Process regular comments (not part of a review)
          for (const comment of comments) {
            const username = comment.user?.login;
            if (!username) continue;

            // Initialize if needed
            if (!reviewerMap.has(username)) {
              reviewerMap.set(username, {
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

            const stats = reviewerMap.get(username)!;
            stats.totalComments++;
            stats.points += 5; // 5 points for regular comments
          }

          // Process emoji reactions (👍 ❤️ 🚀 etc)
          for (const reaction of reactions) {
            const username = reaction.user?.login;
            if (!username) continue;

            // Initialize if needed
            if (!reviewerMap.has(username)) {
              reviewerMap.set(username, {
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

            const stats = reviewerMap.get(username)!;
            stats.reactions++;
            stats.points += 2; // 2 points for reactions
          }
        }
      }

      // Convert to array and sort by points
      const rankedReviewers = Array.from(reviewerMap.values())
        .sort((a, b) => b.points - a.points);

      console.log(`Found ${rankedReviewers.length} reviewers across ${state} PRs`);
      return rankedReviewers;
    } catch (error) {
      console.error('Error fetching reviewer stats:', error);
      throw new Error(`Failed to fetch reviewer stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top N reviewers by points
   * @param limit - Number of top reviewers to return
   * @param state - PR state to consider: 'open', 'closed', 'all' (default: 'all')
   * @param prLimit - Maximum PRs to check (default: 100)
   */
  async getTopReviewers(limit: number = 10, state: 'open' | 'closed' | 'all' = 'all', prLimit: number = 100): Promise<ReviewerStats[]> {
    const allReviewers = await this.getReviewerStats(state, prLimit);
    return allReviewers.slice(0, limit);
  }

  /**
   * Get stats for a specific reviewer
   * @param username - GitHub username
   * @param state - PR state to consider (default: 'all')
   * @param limit - Maximum PRs to check (default: 100)
   */
  async getReviewerStatsByUsername(username: string, state: 'open' | 'closed' | 'all' = 'all', limit: number = 100): Promise<ReviewerStats | null> {
    const allReviewers = await this.getReviewerStats(state, limit);
    return allReviewers.find(r => r.username === username) || null;
  }

  /**
   * Get GitHub user information by username
   */
  async getUserByUsername(username: string): Promise<GitHubUser | null> {
    try {
      const { data } = await this.octokit.rest.users.getByUsername({
        username,
      });
      return data;
    } catch (error) {
      console.error(`Error fetching user ${username}:`, error);
      return null;
    }
  }

  /**
   * Search for users by username or email (partial match)
   * Note: Email search only works if users have public emails
   */
  async searchUsers(query: string): Promise<GitHubUserSearchResult[]> {
    try {
      const { data } = await this.octokit.rest.search.users({
        q: query,
        per_page: 20,
      });

      return data.items.map(user => ({
        username: user.login,
        id: user.id,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        type: user.type,
      }));
    } catch (error) {
      console.error(`Error searching users with query "${query}":`, error);
      return [];
    }
  }

  /**
   * Get reviewer stats with full user information
   * @param state - PR state to consider (default: 'all')
   * @param limit - Maximum PRs to check (default: 100)
   */
  async getReviewerStatsWithUserInfo(state: 'open' | 'closed' | 'all' = 'all', limit: number = 100): Promise<ReviewerStatsWithUser[]> {
    const stats = await this.getReviewerStats(state, limit);
    const statsWithUserInfo: ReviewerStatsWithUser[] = [];

    for (const reviewer of stats) {
      const userInfo = await this.getUserByUsername(reviewer.username);
      
      statsWithUserInfo.push({
        ...reviewer,
        userInfo: userInfo ? {
          name: userInfo.name,
          email: userInfo.email,
          avatar_url: userInfo.avatar_url,
          bio: userInfo.bio,
          company: userInfo.company,
          location: userInfo.location,
        } : null,
      });
    }

    return statsWithUserInfo;
  }

  /**
   * Get reviewer stats for a list of specific users
   * Useful for team leaderboards
   * @param usernames - Array of GitHub usernames
   * @param state - PR state to consider (default: 'all')
   * @param limit - Maximum PRs to check (default: 100)
   */
  async getReviewerStatsForUsers(usernames: string[], state: 'open' | 'closed' | 'all' = 'all', limit: number = 100): Promise<ReviewerStats[]> {
    const allStats = await this.getReviewerStats(state, limit);
    return allStats.filter(s => usernames.includes(s.username));
  }
}