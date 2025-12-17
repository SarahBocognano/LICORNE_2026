import Phaser from 'phaser';
import { GitHubService } from '../services/GithubService';
import type { RescuerStats } from '../services/github.types';

export class LeaderboardScene extends Phaser.Scene {
  private github!: GitHubService;
  private statusText!: Phaser.GameObjects.Text;
  private leaderboardContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('LeaderboardScene');
  }

  init(data: { token: string; owner: string; repo: string }) {
    this.github = new GitHubService({
      token: data.token,
      owner: data.owner,
      repo: data.repo,
    });
  }

  create(): void {
    // Title
    this.add
      .text(400, 30, '🚑 PR Rescuer Leaderboard', {
        fontFamily: 'Arial',
        fontSize: '36px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(400, 65, 'Heroes who saved neglected PRs!', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffaa00',
      })
      .setOrigin(0.5);

    // Status text
    this.statusText = this.add
      .text(400, 90, 'Loading leaderboard...', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffff00',
      })
      .setOrigin(0.5);

    // Instructions
    this.add
      .text(400, 560, 'Press ESC to go back | Press R to refresh', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888',
      })
      .setOrigin(0.5);

    // Container for leaderboard entries
    this.leaderboardContainer = this.add.container(0, 0);

    // Keyboard controls
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('LauncherScene');
    });

    this.input.keyboard?.on('keydown-R', () => {
      this.fetchAndDisplayLeaderboard();
    });

    // Initial fetch
    this.fetchAndDisplayLeaderboard();
  }

  private async fetchAndDisplayLeaderboard(): Promise<void> {
    try {
      this.statusText.setText('Fetching rescue stats...');
      this.statusText.setColor('#ffff00');

      // Get top rescuers (people who reviewed PRs 7+ days old)
      const topRescuers = await this.github.getTopRescuers(10, 1, 'hours');

      this.statusText.setText(`Top ${topRescuers.length} PR Rescuers`);
      this.statusText.setColor('#00ff00');

      this.displayLeaderboard(topRescuers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      this.statusText.setText(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      this.statusText.setColor('#ff0000');
    }
  }

  private displayLeaderboard(rescuers: RescuerStats[]): void {
    this.leaderboardContainer.removeAll(true);

    const startY = 120;
    const entryHeight = 42;
    const entryWidth = 700;

    rescuers.forEach((rescuer, index) => {
      const yPos = startY + index * entryHeight;
      const entry = this.createLeaderboardEntry(
        rescuer,
        index + 1,
        50,
        yPos,
        entryWidth,
        entryHeight - 5
      );
      this.leaderboardContainer.add(entry);
    });
  }

  private createLeaderboardEntry(
    rescuer: RescuerStats,
    rank: number,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background color based on rank
    let bgColor = 0x2d2d2d;
    if (rank === 1) bgColor = 0xffd700;
    else if (rank === 2) bgColor = 0xc0c0c0;
    else if (rank === 3) bgColor = 0xcd7f32;

    const bg = this.add
      .rectangle(0, 0, width, height, bgColor, rank <= 3 ? 0.3 : 1)
      .setOrigin(0, 0);

    // Rank / Medal
    let rankText = `${rank}`;
    let rankColor = '#ffffff';

    if (rank === 1) {
      rankText = '🥇';
      rankColor = '#ffd700';
    } else if (rank === 2) {
      rankText = '🥈';
      rankColor = '#c0c0c0';
    } else if (rank === 3) {
      rankText = '🥉';
      rankColor = '#cd7f32';
    }

    const rankDisplay = this.add
      .text(15, height / 2, rankText, {
        fontFamily: 'Arial',
        fontSize: rank <= 3 ? '24px' : '18px',
        color: rankColor,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    // Username
    const username = this.add.text(60, 8, rescuer.username, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: rank <= 3 ? '#ffffff' : '#cccccc',
      fontStyle: rank === 1 ? 'bold' : 'normal',
    });

    // Stats - Show rescue breakdown
    const statsText = `${rescuer.rescueCount} rescues | 🔥 ${rescuer.criticalRescues} | 🟠 ${rescuer.urgentRescues} | 🟡 ${rescuer.warningRescues}`;
    const stats = this.add.text(60, 24, statsText, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#888888',
    });

    // Points
    const points = this.add
      .text(width - 15, height / 2, `${rescuer.points} pts`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffd700',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    const separator = this.add
      .rectangle(0, height, width, 1, 0x444444)
      .setOrigin(0, 0);

    container.add([bg, rankDisplay, username, stats, points, separator]);

    return container;
  }
}