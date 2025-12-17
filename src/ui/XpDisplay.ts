import Phaser from 'phaser';
import { XPSystem, type UserXP, type XPGain } from '../services/XPSystem';

/**
 * XP Display UI Component
 * Shows user's level, XP bar, and title in top-right corner
 */
export class XPDisplay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private levelText!: Phaser.GameObjects.Text;
  private xpText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number = 10, y: number = 10) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.container.setScrollFactor(0); // Stay fixed on screen
    this.container.setDepth(10000); // Always on top

    this.createDisplay();
    this.refresh();
  }

  private createDisplay(): void {
    const width = 250;
    const height = 70;

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.8)
      .setOrigin(0, 0);

    const border = this.scene.add.rectangle(0, 0, width, height)
      .setStrokeStyle(2, 0xffd700)
      .setOrigin(0, 0);

    // Level badge
    const levelBadge = this.scene.add.circle(30, 30, 25, 0xffd700);
    
    this.levelText = this.scene.add.text(30, 30, '1', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Title and rank
    this.titleText = this.scene.add.text(65, 15, '🌱 Rookie Reviewer', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    // XP bar background
    this.xpBarBg = this.scene.add.rectangle(65, 40, 175, 12, 0x2d2d2d)
      .setOrigin(0, 0);

    // XP bar (progress)
    this.xpBar = this.scene.add.rectangle(65, 40, 0, 12, 0x00ff00)
      .setOrigin(0, 0);

    // XP text
    this.xpText = this.scene.add.text(65, 55, '0 / 100 XP', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#cccccc',
    }).setOrigin(0, 0);

    this.container.add([
      bg,
      border,
      levelBadge,
      this.levelText,
      this.titleText,
      this.xpBarBg,
      this.xpBar,
      this.xpText,
    ]);
  }

  /**
   * Refresh display with current XP data
   */
  refresh(): void {
    const userXP = XPSystem.getUserXP();
    const progress = XPSystem.getXPProgress();

    // Update level
    this.levelText.setText(userXP.level.toString());

    // Update title
    this.titleText.setText(`${userXP.rank} ${userXP.title}`);

    // Update XP bar
    const barWidth = 175;
    this.xpBar.width = (barWidth * progress) / 100;

    // Update XP bar color based on progress
    if (progress >= 75) {
      this.xpBar.setFillStyle(0xffd700); // Gold when close to level up
    } else if (progress >= 50) {
      this.xpBar.setFillStyle(0x00ff00); // Green
    } else {
      this.xpBar.setFillStyle(0x4493f8); // Blue
    }

    // Update XP text
    this.xpText.setText(`${userXP.currentXP} XP | ${userXP.xpForNextLevel} to next level`);
  }

  /**
   * Show XP gain animation
   */
  showXPGain(gain: XPGain): void {
    // Create floating XP text
    const xpGainText = this.scene.add.text(
      this.container.x + 125,
      this.container.y + 35,
      `+${gain.amount} XP`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#00ff00',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);
    xpGainText.setScrollFactor(0);
    xpGainText.setDepth(10001);

    // Animate up and fade
    this.scene.tweens.add({
      targets: xpGainText,
      y: xpGainText.y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        xpGainText.destroy();
      }
    });

    // Refresh display
    this.refresh();

    // Show level up if applicable
    if (gain.leveledUp && gain.newLevel) {
      this.showLevelUp(gain.newLevel);
    }
  }

  /**
   * Show level up animation
   */
  private showLevelUp(newLevel: number): void {
    const userXP = XPSystem.getUserXP();

    // Create level up notification
    const notification = this.scene.add.container(
      this.scene.cameras.main.width / 2,
      -100
    );
    notification.setScrollFactor(0);
    notification.setDepth(10002);

    const bg = this.scene.add.rectangle(0, 0, 400, 120, 0xffd700);
    
    const levelUpText = this.scene.add.text(0, -30, '🎉 LEVEL UP! 🎉', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const newLevelText = this.scene.add.text(0, 10, `Level ${newLevel}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#000000',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const titleText = this.scene.add.text(0, 40, `${userXP.rank} ${userXP.title}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#333333',
    }).setOrigin(0.5);

    notification.add([bg, levelUpText, newLevelText, titleText]);

    // Animate in
    this.scene.tweens.add({
      targets: notification,
      y: 150,
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stay for 3 seconds
        this.scene.time.delayedCall(3000, () => {
          // Animate out
          this.scene.tweens.add({
            targets: notification,
            y: -100,
            alpha: 0,
            duration: 500,
            onComplete: () => notification.destroy(),
          });
        });
      }
    });

    // Particle effect
    this.createLevelUpParticles();
  }

  /**
   * Create particle effect for level up
   */
  private createLevelUpParticles(): void {
    for (let i = 0; i < 30; i++) {
      const x = this.scene.cameras.main.width / 2 + Phaser.Math.Between(-200, 200);
      const y = 150;

      const particle = this.scene.add.text(x, y, '⭐', {
        fontSize: '20px',
      });
      particle.setScrollFactor(0);
      particle.setDepth(10003);

      this.scene.tweens.add({
        targets: particle,
        y: y + Phaser.Math.Between(-150, -50),
        x: particle.x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        scale: 0,
        duration: 1500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Destroy the display
   */
  destroy(): void {
    this.container.destroy();
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
}