import type { Endpoints } from '@octokit/types';

export type GitHubPullRequest = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];
export type GitHubReview = Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews']['response']['data'][0];
export type GitHubUser = Endpoints['GET /users/{username}']['response']['data'];

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface PRWithReviewInfo {
  pr: GitHubPullRequest;
  reviews: GitHubReview[];
  ageDays: number;
  hasReviews: boolean;
}

export interface ReviewerStats {
  username: string;
  reviewCount: number;        // Number of formal reviews (APPROVED, CHANGES_REQUESTED, COMMENTED)
  approvals: number;           // Number of APPROVED reviews
  changesRequested: number;    // Number of CHANGES_REQUESTED reviews
  comments: number;            // Number of COMMENTED reviews (review with just comment)
  totalComments: number;       // Number of regular issue comments (not part of review)
  reactions: number;           // Number of emoji reactions (👍 ❤️ 🚀 etc)
  points: number;              // Total points
}

export interface GitHubUserSearchResult {
  username: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

export interface ReviewerStatsWithUser extends ReviewerStats {
  userInfo: {
    name: string | null;
    email: string | null;
    avatar_url: string;
    bio: string | null;
    company: string | null;
    location: string | null;
  } | null;
}

export interface StalePR {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  reviewCount: number;
  commentCount: number;
}

export interface LeaderboardQueryResult {
  repository: {
    pullRequests: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: Array<{
        reviews: {
          nodes: Array<{
            state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | string;
            author: { login: string } | null;
          }>;
        };
        comments: {
          nodes: Array<{
            author: { login: string } | null;
          }>;
        };
      }>;
    };
  };
}

export const STALE_PR_QUERY = `
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

export interface StalePRQueryResult {
  repository: {
    pullRequests: {
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      nodes: {
        number: number;
        title: string;
        url: string;
        createdAt: string;
        reviews: {
          nodes: {
            state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | string;
            author?: {
              login: string;
            } | null;
          }[];
        };
        comments: {
          nodes: {
            author?: {
              login: string;
            } | null;
          }[];
        };
      }[];
    };
  };
}
