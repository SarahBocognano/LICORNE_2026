import { graphql } from '@octokit/graphql';
import { STALE_PR_QUERY, StalePRQueryResult, type GitHubConfig, type LeaderboardQueryResult, type ReviewerStats, type StalePR } from './github.types';

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

  async fetchStalePRs(staleDays = 7, onlyUnreviewed = true): Promise<StalePR[]> {
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
        // Only OPEN PRs
        // We can check pr.closed or rely on state, assuming nodes include state
        // For simplicity, just filter by reviews if needed
        const createdAt = new Date(pr.createdAt); // make sure createdAt exists
        const ageDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

        if (ageDays < staleDays) continue;

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
}
