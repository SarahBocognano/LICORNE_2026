import Phaser from 'phaser';
import { GitHubService } from '../services/GithubService';
import { RescueStatsService } from '../services/RescueStatsService';
import type { PRWithStatus } from '../services/github.types';

export class RescueRouletteScene extends Phaser.Scene {
  private github!: GitHubService;
  private statusText!: Phaser.GameObjects.Text;
  private rouletteContainer!: Phaser.GameObjects.Container;
  private spinButton!: Phaser.GameObjects.Container;
  private criticalPRs: PRWithStatus[] = [];
  private isSpinning = false;
  private assignedPR: PRWithStatus | null = null;
  private timeUnit: 'hours' | 'days' = 'hours';
  private minTime: number = 1;

  constructor() {
    super('RescueRouletteScene');
  }

  init(data: { token: string; owner: string; repo: string; timeUnit?: 'hours' | 'days'; minTime?: number }) {
    this.github = new GitHubService({
      token: data.token,
      owner: data.owner,
      repo: data.repo,
    });
    
    this.timeUnit = data.timeUnit || 'days';
    this.minTime = data.minTime || (this.timeUnit === 'hours' ? 1 : 3);
  }

  create(): void {
    // Title
    this.add.text(400, 30, '🎰 PR Rescue Roulette', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(400, 70, 'Spin to get assigned a random critical PR!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffaa00',
    }).setOrigin(0.5);

    // Status text
    this.statusText = this.add.text(400, 100, 'Loading critical PRs...', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffff00',
    }).setOrigin(0.5);

    // Roulette container
    this.rouletteContainer = this.add.container(400, 300);

    // Spin button
    this.createSpinButton();

    // Instructions
    this.add.text(400, 560, 'Press SPACE to spin | Press ESC to go back', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);

    // Keyboard controls
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.isSpinning && this.criticalPRs.length > 0) {
        this.spin();
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('LauncherScene');
    });

    // Fetch critical PRs
    this.fetchCriticalPRs();
  }

  private async fetchCriticalPRs(): Promise<void> {
    try {
      const prs = await this.github.getTop10MostNeglectedPRs(this.minTime, this.timeUnit);
      
      // Filter only critical and urgent PRs
      this.criticalPRs = prs.filter(pr => 
        pr.status.urgency === 'critical' || pr.status.urgency === 'urgent'
      );

      if (this.criticalPRs.length === 0) {
        this.statusText.setText('🎉 No critical PRs need rescue!');
        this.statusText.setColor('#00ff00');
      } else {
        this.statusText.setText(`${this.criticalPRs.length} critical PRs ready to rescue!`);
        this.statusText.setColor('#ffffff');
      }
    } catch (error) {
      console.error('Error fetching PRs:', error);
      this.statusText.setText('Error loading PRs');
      this.statusText.setColor('#ff0000');
    }
  }

  private createSpinButton(): void {
    this.spinButton = this.add.container(400, 450);

    const buttonBg = this.add.rectangle(0, 0, 200, 60, 0xffd700)
      .setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(0, 0, '🎰 SPIN!', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.spinButton.add([buttonBg, buttonText]);

    // Hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0xffee00);
      this.spinButton.setScale(1.05);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0xffd700);
      this.spinButton.setScale(1);
    });

    buttonBg.on('pointerdown', () => {
      if (!this.isSpinning && this.criticalPRs.length > 0) {
        this.spin();
      }
    });

    // Pulse animation
    this.tweens.add({
      targets: this.spinButton,
      scale: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private async spin(): Promise<void> {
    if (this.isSpinning || this.criticalPRs.length === 0) return;

    this.isSpinning = true;
    this.statusText.setText('🎰 SPINNING...');
    this.statusText.setColor('#ffff00');

    // Hide previous result
    this.rouletteContainer.removeAll(true);

    // Slot machine animation
    await this.animateSlotMachine();

    // Pick random PR
    const randomIndex = Math.floor(Math.random() * this.criticalPRs.length);
    this.assignedPR = this.criticalPRs[randomIndex];

    // Show result
    this.showResult(this.assignedPR);

    this.isSpinning = false;
  }

  private async animateSlotMachine(): Promise<void> {
    return new Promise((resolve) => {
      const slotContainer = this.add.container(0, 0);
      this.rouletteContainer.add(slotContainer);

      // Create 3 slot reels
      const reels: Phaser.GameObjects.Text[] = [];
      
      for (let i = 0; i < 3; i++) {
        const reel = this.add.text(
          (i - 1) * 120,
          0,
          '🔥',
          {
            fontFamily: 'Arial',
            fontSize: '64px',
          }
        ).setOrigin(0.5);
        
        slotContainer.add(reel);
        reels.push(reel);
      }

      // Spin each reel
      const symbols = ['🔥', '🟠', '⚠️', '💀', '🚨'];
      let completed = 0;

      reels.forEach((reel, index) => {
        let spinCount = 0;
        const maxSpins = 20 + (index * 10);

        const spinInterval = setInterval(() => {
          reel.setText(symbols[Math.floor(Math.random() * symbols.length)]);
          spinCount++;

          if (spinCount >= maxSpins) {
            clearInterval(spinInterval);
            reel.setText('🔥');
            completed++;

            if (completed === 3) {
              // All reels stopped
              setTimeout(() => {
                slotContainer.destroy();
                resolve();
              }, 300);
            }
          }
        }, 50 + (index * 20));
      });
    });
  }

  private showResult(pr: PRWithStatus): void {
    // Calculate bonus points
    const basePoints = pr.status.urgency === 'critical' ? 100 : 50;
    const bonusPoints = Math.floor(basePoints * 1.5); // 50% bonus

    // Result container
    const resultBg = this.add.rectangle(0, 0, 700, 200, 0x2d2d2d, 0.95)
      .setOrigin(0.5);

    // PR info
    const prNumber = this.add.text(0, -70, `PR #${pr.number}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const prTitle = this.add.text(0, -40, this.truncate(pr.title, 50), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    const status = this.add.text(0, -10, pr.status.message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: this.getStatusColor(pr.status.urgency),
    }).setOrigin(0.5);

    const unitLabel = this.timeUnit === 'hours' ? 'hours' : 'days';
    const age = this.add.text(0, 15, `${pr.ageDays} ${unitLabel} old | ${pr.reviewCount}👁️ ${pr.commentCount}💬`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
    }).setOrigin(0.5);

    const bonus = this.add.text(0, 45, `🎁 BONUS: ${bonusPoints} points for rescuing!`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#00ff00',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Action buttons
    const rescueButton = this.createActionButton(-100, 80, '🚑 RESCUE NOW', 0x00aa00, () => {
      this.rescuePR(pr, bonusPoints);
    });

    const rerollButton = this.createActionButton(100, 80, '🔄 SPIN AGAIN', 0x4488ff, () => {
      this.spin();
    });

    this.rouletteContainer.add([
      resultBg,
      prNumber,
      prTitle,
      status,
      age,
      bonus,
      rescueButton,
      rerollButton,
    ]);

    // Entrance animation
    this.rouletteContainer.setScale(0);
    this.tweens.add({
      targets: this.rouletteContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Sparkle effect
    this.createSparkles();
  }

  private createActionButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 180, 40, color)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => {
      container.setScale(1.05);
    });

    bg.on('pointerout', () => {
      container.setScale(1);
    });

    bg.on('pointerdown', callback);

    return container;
  }

  private rescuePR(pr: PRWithStatus, bonusPoints: number): void {
    // Open PR in browser
    window.open(pr.url, '_blank');

    // Track as opened (will be rescued when reviewed)
    this.trackPROpened(pr.number);

    // Show feedback
    const notification = this.add.container(400, -60);

    const bg = this.add.rectangle(0, 0, 500, 60, 0x00aa00);
    const text = this.add.text(0, 0, `🚑 Opening PR #${pr.number}! Rescue it for ${bonusPoints} pts!`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    notification.add([bg, text]);

    this.tweens.add({
      targets: notification,
      y: 100,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
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

  private trackPROpened(prNumber: number): void {
    const opened = JSON.parse(localStorage.getItem('pr_opened') || '[]');
    opened.push({
      prNumber,
      timestamp: Date.now(),
      bonus: true, // Mark as roulette rescue for bonus
    });
    localStorage.setItem('pr_opened', JSON.stringify(opened));
  }

  private createSparkles(): void {
    // Create particle effect
    for (let i = 0; i < 20; i++) {
      const sparkle = this.add.text(
        Phaser.Math.Between(-300, 300),
        Phaser.Math.Between(-100, 100),
        '✨',
        { fontSize: '20px' }
      );

      this.rouletteContainer.add(sparkle);

      this.tweens.add({
        targets: sparkle,
        y: sparkle.y + Phaser.Math.Between(-100, -200),
        alpha: 0,
        scale: 0,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onComplete: () => sparkle.destroy(),
      });
    }
  }

  private getStatusColor(urgency: string): string {
    switch (urgency) {
      case 'critical': return '#ff0000';
      case 'urgent': return '#ff8800';
      case 'warning': return '#ffff00';
      default: return '#00ff00';
    }
  }

  private truncate(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}