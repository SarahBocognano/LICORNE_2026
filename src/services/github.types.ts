import type { Endpoints } from '@octokit/types';

export type GitHubPullRequest = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];
export type GitHubReview = Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews']['response']['data'][0];
export type GitHubUser = Endpoints['GET /users/{username}']['response']['data'];

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
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

export interface RescuerStats {
  username: string;
  rescueCount: number;         // Total PRs rescued (reviewed when old)
  criticalRescues: number;     // PRs rescued at 14+ days (100 pts each)
  urgentRescues: number;       // PRs rescued at 7-13 days (50 pts each)
  warningRescues: number;      // PRs rescued at 3-6 days (25 pts each)
  approvals: number;           // How many were approved
  changesRequested: number;    // How many requested changes
  comments: number;            // How many just commented
  points: number;              // Total rescue points
}

export interface StalePR {
  number: number;
  title: string;
  url: string;
  createdAt: string;
  reviewCount: number;
  commentCount: number;
}

export type UrgencyLevel = 'normal' | 'warning' | 'urgent' | 'critical';

export interface PRStatus {
  urgency: UrgencyLevel;
  message: string;
  color: number;  // Phaser color hex
  emoji: string;
}

export interface PRWithStatus extends StalePR {
  ageDays: number;
  status: PRStatus;
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