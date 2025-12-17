import Phaser from 'phaser';

export class LauncherScene extends Phaser.Scene {
  constructor() {
    super('LauncherScene');
  }

  create(): void {
    // Title
    this.add.text(400, 50, 'GitHub PR Review Game', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Instructions
    const instructions = [
      'Configure your GitHub repository:',
      '',
      'Press SPACE to launch with default config',
      '(Set GITHUB_TOKEN in environment)',
    ];

    this.add.text(400, 150, instructions, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center',
    }).setOrigin(0.5);

    // Config display
    const token = import.meta.env.VITE_GITHUB_TOKEN || 'Not set';
    const owner = import.meta.env.VITE_GITHUB_OWNER || 'OpenCTI-Platform';
    const repo = import.meta.env.VITE_GITHUB_REPO || 'opencti';

    const configText = [
      'Current Configuration:',
      `Token: ${token === 'Not set' ? token : token.substring(0, 8) + '...'}`,
      `Owner: ${owner}`,
      `Repo: ${repo}`,
      `Min Age: 3 days`,
    ];

    this.add.text(400, 300, configText, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
      align: 'center',
    }).setOrigin(0.5);

    // Warning if token not set
    if (token === 'Not set') {
      this.add.text(400, 420, '⚠️ Set VITE_GITHUB_TOKEN in .env file', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ff4444',
      }).setOrigin(0.5);
    }

    // Launch button
    const launchText = this.add.text(400, 450, 'Press SPACE to Launch', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#00ff00',
    }).setOrigin(0.5);

    // Fire Brigade button
    const fireBrigadeText = this.add.text(400, 480, 'Press F for Fire Brigade 🚒', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ff4444',
    }).setOrigin(0.5);

    // Roulette button
    const rouletteText = this.add.text(400, 510, 'Press Q for Rescue Roulette 🎰', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Leaderboard button
    const leaderboardText = this.add.text(400, 540, 'Press L for Leaderboard 🏆', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffd700',
    }).setOrigin(0.5);

    // Pulse effect on launch button
    this.tweens.add({
      targets: launchText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Pulse effect on fire brigade button
    this.tweens.add({
      targets: fireBrigadeText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      delay: 200,
    });

    // Pulse effect on roulette button
    this.tweens.add({
      targets: rouletteText,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      delay: 400,
    });

    // Pulse effect on leaderboard button
    this.tweens.add({
      targets: leaderboardText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      delay: 600,
    });

    // Handle space key - Launch PR display
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (token === 'Not set') {
        alert('Please set VITE_GITHUB_TOKEN in your .env file first!');
        return;
      }

      this.scene.start('PRDisplayScene', {
        token,
        owner,
        repo,
        minAgeDays: 3,
      });
    });

    // Handle F key - Fire Brigade
    this.input.keyboard?.on('keydown-F', () => {
      if (token === 'Not set') {
        alert('Please set VITE_GITHUB_TOKEN in your .env file first!');
        return;
      }

      this.scene.start('PRFireBrigadeScene', {
        token,
        owner,
        repo,
        timeUnit: 'hours',
        minTime: 1
      });
    });

    // Handle Q key - Rescue Roulette
    this.input.keyboard?.on('keydown-Q', () => {
      if (token === 'Not set') {
        alert('Please set VITE_GITHUB_TOKEN in your .env file first!');
        return;
      }

      this.scene.start('RescueRouletteScene', {
        token,
        owner,
        repo,
        timeUnit: 'hours',
        minTime: 1
      });
    });

    // Handle L key - Show leaderboard
    this.input.keyboard?.on('keydown-L', () => {
      if (token === 'Not set') {
        alert('Please set VITE_GITHUB_TOKEN in your .env file first!');
        return;
      }

      this.scene.start('LeaderboardScene', {
        token,
        owner,
        repo,
      });
    });

    // ESC to go back to main scene
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MainScene');
    });
  }
}