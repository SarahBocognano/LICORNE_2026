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

  describe('getReviewerStatsByUsername', () => {
    it('should get stats for a specific reviewer', async () => {
      // First get all reviewers to pick one
      const allReviewers = await service.getReviewerStats();
      
      if (allReviewers.length === 0) {
        console.log('⚠️  No reviewers found');
        return;
      }

      const testUsername = allReviewers[0].username;
      const stats = await service.getReviewerStatsByUsername(testUsername);
      console.log("allReviewers[0]", allReviewers[0])

      expect(stats).not.toBeNull();
      if (stats) {
        console.log(`\n📊 Stats for ${testUsername}:`);
        console.log(`   Total points: ${stats.points}`);
        console.log(`   Total reviews: ${stats.reviewCount}`);
        console.log(`   Approvals: ${stats.approvals}`);
        console.log(`   Changes requested: ${stats.changesRequested}`);
        console.log(`   Comments: ${stats.comments}`);

        expect(stats.username).toBe(testUsername);
      }
    }, 60000);

    it('should return null for non-existent reviewer', async () => {
      const stats = await service.getReviewerStatsByUsername('nonexistent-user-12345');
      expect(stats).toBeNull();
    }, 60000);
  });

  describe('user stats ', () => {
      it('should fetch all reviewer stats', async () => {
      const stats = await service.getReviewerStats('all', 50);

      console.log(`\n🏆 Reviewer Leaderboard (${TEST_OWNER}/${TEST_REPO})`);
      console.log('='.repeat(80));
      console.log(`Total reviewers: ${stats.length}\n`);

      stats.slice(0, 10).forEach((reviewer, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        console.log(`${medal} ${reviewer.username}`);
        console.log(`   💯 Points: ${reviewer.points}`);
        console.log(`   📊 Total Reviews: ${reviewer.reviewCount}`);
        console.log(`   ✅ Approvals: ${reviewer.approvals}`);
        console.log(`   🔄 Changes Requested: ${reviewer.changesRequested}`);
        console.log(`   💬 Comments: ${reviewer.comments}`);
        console.log('');
      });

      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    }, 120000);

    it('should fetch stats for specific user', async () => {
      // Get all reviewers first
      const allStats = await service.getReviewerStats('all', 30);
      
      if (allStats.length === 0) {
        console.log('⚠️  No reviewers found');
        return;
      }

      // Get detailed stats for top reviewer
      const topReviewer = allStats[0];
      const userStats = await service.getReviewerStatsByUsername(topReviewer.username, 'all', 30);

      console.log(`\n👤 Detailed Stats for: ${topReviewer.username}`);
      console.log('='.repeat(80));
      if (userStats) {
        console.log(`Rank: #1`);
        console.log(`Total Points: ${userStats.points}`);
        console.log(`Total Reviews: ${userStats.reviewCount}`);
        console.log(`Breakdown:`);
        console.log(`  - ✅ Approvals: ${userStats.approvals} (${userStats.approvals * 50} points)`);
        console.log(`  - 🔄 Changes Requested: ${userStats.changesRequested} (${userStats.changesRequested * 30} points)`);
        console.log(`  - 💬 Comments: ${userStats.comments} (${userStats.comments * 10} points)`);
      }

      expect(userStats).not.toBeNull();
    }, 120000);

    it('should fetch top 5 reviewers', async () => {
      const top5 = await service.getTopReviewers(5, 'all', 30);

      console.log(`\n🏆 Top 5 Reviewers`);
      
      top5.forEach((reviewer, index) => {
        const rank = index + 1;
        console.log(`#${rank} ${reviewer.username} - ${reviewer.points} points (${reviewer.reviewCount} reviews)`);
      });

      expect(top5.length).toBeLessThanOrEqual(5);
      expect(top5.length).toBeGreaterThan(0);
    }, 120000);
  })
});