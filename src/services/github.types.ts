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