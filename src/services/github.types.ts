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