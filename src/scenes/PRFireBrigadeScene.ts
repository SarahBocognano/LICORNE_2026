import Phaser from 'phaser';
import { GitHubService } from '../services/GithubService';
import { RescueStatsService } from '../services/RescueStatsService';
import type { PRWithStatus } from '../services/github.types';

export class PRFireBrigadeScene extends Phaser.Scene {
  private github!: GitHubService;
  private statusText!: Phaser.GameObjects.Text;
  private prContainer!: Phaser.GameObjects.Container;
  private neglectedPRs: PRWithStatus[] = [];
  private timeUnit: 'hours' | 'days' = 'days';
  private minTime: number = 3;

  constructor() {
    super('PRFireBrigadeScene');
  }

  init(data: { token: string; owner: string; repo: string; timeUnit?: 'hours' | 'days'; minTime?: number }) {
    this.github = new GitHubService({
      token: data.token,
      owner: data.owner,
      repo: data.repo,
    });
    
    // Allow testing with hours instead of days
    this.timeUnit = data.timeUnit || 'days';
    this.minTime = data.minTime || (this.timeUnit === 'hours' ? 1 : 3);
  }

  create(): void {
    // Title with fire emoji
    this.add.text(400, 20, '🚒 PR Fire Brigade', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: '#ff4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 55, 'Save the most neglected PRs!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffaa00',
    }).setOrigin(0.5);

    // Personal stats (left side)
    const stats = RescueStatsService.getStats();
    const statsText = `🚑 Today: ${stats.rescuesToday} | Week: ${stats.rescuesThisWeek} | 🔥 Streak: ${stats.currentStreak} days`;
    this.add.text(20, 80, statsText, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: stats.currentStreak >= 3 ? '#00ff00' : '#ffffff',
      fontStyle: stats.currentStreak >= 7 ? 'bold' : 'normal',
    });

    // Team goal progress bar (right side)
    const teamGoal = RescueStatsService.getTeamGoal();
    this.createTeamGoalBar(teamGoal, 420, 72);

    // Status text
    this.statusText = this.add.text(400, 100, 'Loading neglected PRs...', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffff00',
    }).setOrigin(0.5);

    // Container for PR cards
    this.prContainer = this.add.container(0, 0);

    // Instructions
    this.add.text(400, 560, 'Click a PR to rescue it! | Press R to refresh | Press ESC to go back', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);

    // Keyboard controls
    this.input.keyboard?.on('keydown-R', () => {
      this.fetchAndDisplayPRs();
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('LauncherScene');
    });

    // Check if streak was broken
    const streakStatus = RescueStatsService.checkStreak();
    if (streakStatus.broken) {
      this.showStreakBrokenNotification();
    }

    // Fetch PRs
    this.fetchAndDisplayPRs();
  }

  private createTeamGoalBar(teamGoal: any, x: number, y: number): void {
    const width = 350;
    const height = 20;
    const progress = Math.min(teamGoal.current / teamGoal.target, 1);

    // Background
    this.add.rectangle(x, y, width, height, 0x2d2d2d)
      .setOrigin(0, 0);

    // Progress fill
    const progressColor = progress >= 1 ? 0x00ff00 : progress >= 0.75 ? 0xffaa00 : 0x4493f8;
    this.add.rectangle(x + 2, y + 2, (width - 4) * progress, height - 4, progressColor)
      .setOrigin(0, 0);

    // Text
    const periodText = teamGoal.period === 'daily' ? 'Today' : 'This Week';
    const goalText = `🎯 Team Goal (${periodText}): ${teamGoal.current}/${teamGoal.target} PRs rescued`;
    this.add.text(x + width / 2, y + height / 2, goalText, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  private async fetchAndDisplayPRs(): Promise<void> {
    try {
      const unitLabel = this.timeUnit === 'hours' ? 'hours' : 'days';
      this.statusText.setText(`🔍 Scanning for neglected PRs (${this.minTime}+ ${unitLabel})...`);
      this.statusText.setColor('#ffff00');

      // Fetch top 10 most neglected PRs
      const prs = await this.github.getTop10MostNeglectedPRs(this.minTime, this.timeUnit);
      this.neglectedPRs = prs;

      // Check if any previously opened PRs were rescued
      await this.checkRescuedPRs();

      if (prs.length === 0) {
        this.statusText.setText('🎉 All PRs are being reviewed! Great job!');
        this.statusText.setColor('#00ff00');
        return;
      }

      // Count by urgency
      const critical = prs.filter(pr => pr.status.urgency === 'critical').length;
      const urgent = prs.filter(pr => pr.status.urgency === 'urgent').length;
      const warning = prs.filter(pr => pr.status.urgency === 'warning').length;

      this.statusText.setText(`Found ${prs.length} neglected PRs | 🔥 ${critical} Critical | 🟠 ${urgent} Urgent | 🟡 ${warning} Warning`);
      this.statusText.setColor('#ffffff');

      // Display PRs
      this.displayPRs(prs);

    } catch (error) {
      console.error('Error fetching PRs:', error);
      this.statusText.setText(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.statusText.setColor('#ff0000');
    }
  }

  private displayPRs(prs: PRWithStatus[]): void {
    // Clear previous PRs
    this.prContainer.removeAll(true);

    const startY = 125; // Moved down to make room for stats
    const cardHeight = 43;
    const cardWidth = 760;

    prs.forEach((pr, index) => {
      const yPos = startY + (index * cardHeight);
      const card = this.createPRCard(pr, 20, yPos, cardWidth, cardHeight - 2);
      this.prContainer.add(card);
    });
  }

  private createPRCard(
    pr: PRWithStatus,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Background with urgency color (dimmed)
    const bgColor = this.darkenColor(pr.status.color);
    const bg = this.add.rectangle(0, 0, width, height, bgColor)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Hover effects
    bg.on('pointerover', () => {
      bg.setFillStyle(this.lightenColor(bgColor));
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(bgColor);
    });

    // Click to rescue (open PR in browser)
    bg.on('pointerdown', () => {
      this.rescuePR(pr);
    });

    // Urgency indicator bar (left side)
    const urgencyBar = this.add.rectangle(0, 0, 5, height, pr.status.color)
      .setOrigin(0, 0);

    // Add fire animation for critical PRs
    if (pr.status.urgency === 'critical') {
      this.addFireAnimation(container, urgencyBar);
    }

    // Emoji + PR number
    const prLabel = this.add.text(15, 5, `${pr.status.emoji} #${pr.number}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    // PR title (truncated)
    const maxTitleLength = 55;
    const title = pr.title.length > maxTitleLength
      ? pr.title.substring(0, maxTitleLength) + '...'
      : pr.title;

    const prTitle = this.add.text(15, 22, title, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#cccccc',
    });

    // Status message (right side, top)
    const statusMsg = this.add.text(width - 10, 5, pr.status.message, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: this.getTextColor(pr.status.urgency),
    }).setOrigin(1, 0);

    // Activity info (right side, bottom)
    const unitLabel = this.timeUnit === 'hours' ? 'h' : 'd';
    const activityText = `${pr.ageDays}${unitLabel} old | ${pr.reviewCount}👁️ ${pr.commentCount}💬`;
    const activity = this.add.text(width - 10, 24, activityText, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(1, 0);

    container.add([bg, urgencyBar, prLabel, prTitle, statusMsg, activity]);

    return container;
  }

  private rescuePR(pr: PRWithStatus): void {
    // Just open the PR in browser - no notification yet
    window.open(pr.url, '_blank');
    
    // Track that user opened this PR (not yet rescued)
    this.trackPROpened(pr.number);
  }

  private trackPROpened(prNumber: number): void {
    // Track opened PRs (not rescued yet - they need to actually review it)
    const opened = JSON.parse(localStorage.getItem('pr_opened') || '[]');
    opened.push({
      prNumber,
      timestamp: Date.now(),
    });
    localStorage.setItem('pr_opened', JSON.stringify(opened));
    
    console.log(`👀 Opened PR #${prNumber} - waiting for user to review...`);
  }

  /**
   * Check if PR was actually rescued (got reviews/comments)
   * Call this when refreshing the list
   */
  private async checkRescuedPRs(): Promise<void> {
    const opened = JSON.parse(localStorage.getItem('pr_opened') || '[]');
    const rescued = JSON.parse(localStorage.getItem('pr_rescued') || '[]');
    
    for (const item of opened) {
      // Check if this PR now has activity
      const pr = this.neglectedPRs.find(p => p.number === item.prNumber);
      
      // If PR is no longer in neglected list, it was rescued!
      if (!pr && !rescued.find((r: any) => r.prNumber === item.prNumber)) {
        rescued.push({
          prNumber: item.prNumber,
          timestamp: Date.now(),
        });
        
        // Show rescue notification
        this.showRescueNotification(item.prNumber);
        
        console.log(`✅ PR #${item.prNumber} was rescued!`);
      }
    }
    
    // Update rescued list
    localStorage.setItem('pr_rescued', JSON.stringify(rescued));
    
    // Clean up opened list - keep only recent ones (last 24h)
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentOpened = opened.filter((item: any) => item.timestamp > dayAgo);
    localStorage.setItem('pr_opened', JSON.stringify(recentOpened));
  }

  private showRescueNotification(prNumber: number): void {
    // Record the rescue
    const stats = RescueStatsService.recordRescue(prNumber);
    const teamGoal = RescueStatsService.getTeamGoal();

    const notification = this.add.container(400, -80);

    const bg = this.add.rectangle(0, 0, 500, 80, 0x00ff00);
    
    const title = this.add.text(0, -18, `🎉 You rescued PR #${prNumber}!`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Show streak if >= 2
    let detailsText = `Today: ${stats.rescuesToday} | Total: ${stats.totalRescues}`;
    if (stats.currentStreak >= 2) {
      detailsText = `🔥 ${stats.currentStreak} day streak! | ${detailsText}`;
    }

    const details = this.add.text(0, 5, detailsText, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#000000',
    }).setOrigin(0.5);

    // Team goal progress
    const teamProgress = this.add.text(0, 22, `Team: ${teamGoal.current}/${teamGoal.target} rescued`, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#006600',
    }).setOrigin(0.5);

    notification.add([bg, title, details, teamProgress]);

    // Animate in
    this.tweens.add({
      targets: notification,
      y: 110,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stay visible for 3 seconds
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: notification,
            y: -80,
            alpha: 0,
            duration: 400,
            onComplete: () => {
              notification.destroy();
              // Refresh the scene to update stats
              this.scene.restart();
            },
          });
        });
      },
    });

    // Check if team goal completed
    if (teamGoal.current === teamGoal.target) {
      this.time.delayedCall(3500, () => {
        this.showTeamGoalComplete(teamGoal);
      });
    }
  }

  private showStreakBrokenNotification(): void {
    const notification = this.add.container(400, -60);

    const bg = this.add.rectangle(0, 0, 450, 60, 0xff4444);
    const text = this.add.text(0, 0, `💔 Streak broken! Rescue a PR to start again.`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    notification.add([bg, text]);

    // Animate in and out
    this.tweens.add({
      targets: notification,
      y: 110,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: notification,
            y: -60,
            alpha: 0,
            duration: 400,
            onComplete: () => notification.destroy(),
          });
        });
      },
    });
  }

  private showTeamGoalComplete(teamGoal: any): void {
    const notification = this.add.container(400, -100);

    const bg = this.add.rectangle(0, 0, 600, 100, 0xffd700);
    
    const title = this.add.text(0, -20, `🏆 TEAM GOAL COMPLETE! 🏆`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const details = this.add.text(0, 10, `${teamGoal.target} PRs rescued this ${teamGoal.period === 'daily' ? 'day' : 'week'}!`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#000000',
    }).setOrigin(0.5);

    const congrats = this.add.text(0, 30, `Amazing teamwork! 🎉`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#006600',
    }).setOrigin(0.5);

    notification.add([bg, title, details, congrats]);

    // Animate in
    this.tweens.add({
      targets: notification,
      y: 300,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stay visible for 5 seconds
        this.time.delayedCall(5000, () => {
          this.tweens.add({
            targets: notification,
            alpha: 0,
            duration: 500,
            onComplete: () => notification.destroy(),
          });
        });
      },
    });
  }

  private addFireAnimation(container: Phaser.GameObjects.Container, bar: Phaser.GameObjects.Rectangle): void {
    // Pulse animation for critical PRs
    this.tweens.add({
      targets: bar,
      alpha: 0.5,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private darkenColor(color: number): number {
    // Make color darker for backgrounds
    const r = ((color >> 16) & 0xff) * 0.2;
    const g = ((color >> 8) & 0xff) * 0.2;
    const b = (color & 0xff) * 0.2;
    return (r << 16) | (g << 8) | b;
  }

  private lightenColor(color: number): number {
    // Make color lighter for hover
    const r = Math.min(((color >> 16) & 0xff) * 1.5, 255);
    const g = Math.min(((color >> 8) & 0xff) * 1.5, 255);
    const b = Math.min((color & 0xff) * 1.5, 255);
    return (r << 16) | (g << 8) | b;
  }

  private getTextColor(urgency: string): string {
    switch (urgency) {
      case 'critical': return '#ff4444';
      case 'urgent': return '#ffaa00';
      case 'warning': return '#ffff00';
      default: return '#00ff00';
    }
  }
}