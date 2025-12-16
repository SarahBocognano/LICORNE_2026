/**
 * Mock for octokit that makes real API calls
 * This bypasses the ESM import issues in Jest
 */

interface OctokitConfig {
  auth?: string;
}

interface PullsListParams {
  owner: string;
  repo: string;
  state: string;
  per_page: number;
}

interface ReviewsListParams {
  owner: string;
  repo: string;
  pull_number: number;
}

interface CommentsListParams {
  owner: string;
  repo: string;
  issue_number: number;
}

interface UsersGetByUsernameParams {
  username: string;
}

interface SearchUsersParams {
  q: string;
  per_page: number;
}

interface ReactionsListParams {
  owner: string;
  repo: string;
  issue_number: number;
}

export class Octokit {
  private token: string;

  constructor(config: OctokitConfig = {}) {
    this.token = config.auth || '';
  }

  rest = {
    pulls: {
      list: async (params: PullsListParams) => {
        const { owner, repo, state, per_page } = params;
        const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },

      listReviews: async (params: ReviewsListParams) => {
        const { owner, repo, pull_number } = params;
        const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_number}/reviews`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },
    },

    issues: {
      listComments: async (params: CommentsListParams) => {
        const { owner, repo, issue_number } = params;
        const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },
    },

    users: {
      getByUsername: async (params: UsersGetByUsernameParams) => {
        const { username } = params;
        const url = `https://api.github.com/users/${username}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },
    },

    search: {
      users: async (params: SearchUsersParams) => {
        const { q, per_page } = params;
        const url = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=${per_page}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },
    },

    reactions: {
      listForIssue: async (params: ReactionsListParams) => {
        const { owner, repo, issue_number } = params;
        const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/reactions`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return { data };
      },
    },
  };
}