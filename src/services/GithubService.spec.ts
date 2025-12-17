import { GitHubService } from './GithubService';

const OWNER = "SarahBocognano";
const REPO = "LICORNE_2026";

describe('GitHubService - GraphQL leaderboard', () => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const TEST_OWNER = OWNER || process.env.GITHUB_OWNER || 'facebook';
  const TEST_REPO = REPO || process.env.GITHUB_REPO || 'react';

  if (!GITHUB_TOKEN) {
    it.skip('GITHUB_TOKEN not set, skipping tests', () => {
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

  it('should fetch the full leaderboard', async () => {
    const leaderboard = await service.getLeaderboard();
    console.log('🏆 Leaderboard (top 10 shown):');
    leaderboard.slice(0, 10).forEach((r, i) => {
      console.log(
        `${i + 1}. ${r.username} — ${r.points} pts | Reviews: ${r.reviewCount}, ✅ ${r.approvals}, 🔄 ${r.changesRequested}, 💬 ${r.totalComments}`
      );
    });

    expect(Array.isArray(leaderboard)).toBe(true);
    expect(leaderboard.length).toBeGreaterThan(0);
  }, 120000);

  it('should fetch top 5 reviewers', async () => {
    const top5 = await service.getTopReviewers(5);
    console.log('🏆 Top 5 Reviewers:', top5.map(r => `${r.username} (${r.points} pts)`));

    expect(Array.isArray(top5)).toBe(true);
    expect(top5.length).toBeLessThanOrEqual(5);
  });

  it('should have points for each reviewer', async () => {
    const top = await service.getTopReviewers(3);
    top.forEach(r => {
      console.log(`👤 ${r.username}: ${r.points} pts`);
      expect(r.points).toBeGreaterThanOrEqual(0);
    });
  });
});
