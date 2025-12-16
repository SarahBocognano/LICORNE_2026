import type { Endpoints } from '@octokit/types';

export type GitHubPullRequest = Endpoints['GET /repos/{owner}/{repo}/pulls']['response']['data'][0];
export type GitHubReview = Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews']['response']['data'][0];

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