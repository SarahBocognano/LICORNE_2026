import { GitHubService } from './GithubService';

const OWNER = "SarahBocognano"
const REPO = "LICORNE_2026"

describe('GitHubService - PRs without reviews', () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const TEST_OWNER = OWNER || process.env.GITHUB_OWNER || 'facebook';
  const TEST_REPO = REPO || process.env.GITHUB_REPO || 'react';

  if (!GITHUB_TOKEN) {
    it.skip('Tests require GITHUB_TOKEN environment variable', () => {
      console.log('ℹ️  Set GITHUB_TOKEN to run these tests');
    });
    return;
  }

  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService({
      token: GITHUB_TOKEN,
      owner: TEST_OWNER,
      repo: TEST_REPO,
    });
  });

  describe('fetchPRReviews', () => {
    it('should fetch reviews for a specific PR', async () => {
      const prs = await service.fetchAllOpenPRs();
      
      if (prs.length === 0) {
        console.log('⚠️  No open PRs to test with');
        return;
      }

      const testPR = prs[0];
      const reviews = await service.fetchPRReviews(testPR.number);

      expect(Array.isArray(reviews)).toBe(true);
      console.log(`PR #${testPR.number} has ${reviews.length} reviews`);

      if (reviews.length > 0) {
        const firstReview = reviews[0];
        expect(firstReview).toHaveProperty('id');
        expect(firstReview).toHaveProperty('state');
        expect(firstReview).toHaveProperty('user');
      }
    }, 15000);
  });

  describe('fetchPRsWithoutReviewsSince', () => {
    it('should find PRs without reviews older than 7 days', async () => {
      const minAgeDays = 7;

      const prs = await service.fetchAllOpenPRs();

      for (const pr of prs) {
        const reviews = await service.fetchPRReviews(pr.number);
        const comments = await service.fetchPRComments(pr.number);
        console.log(`PR #${pr.number} has ${reviews.length} reviews, ${comments.length} comments`);
      }
    }, 30000);
  });

    describe('fetchPRsWithoutActivitySince', () => {
    it('should find PRs without reviews or comments older than 3 days', async () => {
      const minAgeDays = 3;
      
      const prsWithoutActivity = await service.fetchPRsWithoutActivitySince(minAgeDays);

      expect(Array.isArray(prsWithoutActivity)).toBe(true);
      console.log(`\n✅ Found ${prsWithoutActivity.length} PRs without any activity older than ${minAgeDays} days\n`);

      prsWithoutActivity.forEach((prInfo, index) => {
        console.log(`${index + 1}. PR #${prInfo.pr.number}: ${prInfo.pr.title}`);
        console.log(`   Age: ${prInfo.ageDays} days`);
        console.log(`   Author: ${prInfo.pr.user?.login || 'Unknown'}`);
        console.log(`   URL: ${prInfo.pr.html_url}`);
        console.log('');
      });

      prsWithoutActivity.forEach((prInfo) => {
        expect(prInfo).toHaveProperty('pr');
        expect(prInfo).toHaveProperty('reviews');
        expect(prInfo).toHaveProperty('ageDays');
        expect(prInfo).toHaveProperty('hasReviews');

        expect(prInfo.ageDays).toBeGreaterThanOrEqual(minAgeDays);
        expect(prInfo.hasReviews).toBe(false);
        expect(prInfo.reviews.length).toBe(0);
      });
    }, 60000);
  });
});