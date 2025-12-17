import { Octokit } from 'octokit';
import type { GitHubPullRequest, GitHubConfig, PRWithReviewInfo, GitHubReview } from './github.types';

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
   * Fetch all open PRs for the configured repository
   */
  async fetchAllOpenPRs(): Promise<GitHubPullRequest[]> {
    try {
      console.log(`Fetching open PRs for ${this.owner}/${this.repo}...`);
      
      const { data } = await this.octokit.rest.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        per_page: 100,
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



  private calculateAgeDays(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }


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
}