import Phaser from 'phaser';
import { ServiceRegistry } from '../services/ServiceRegistry';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', 'finalMapWithObjects.json');
    this.load.image('tiles', 'spritesheet.png');
    this.load.atlas('a-king', 'a-king.png', 'a-king_atlas.json');
  }

  create(): void {
    const token = import.meta.env.VITE_GITHUB_TOKEN || 'Not set';
    const owner = import.meta.env.VITE_GITHUB_OWNER || 'OpenCTI-Platform';
    const repo = import.meta.env.VITE_GITHUB_REPO || 'opencti';

    if (token !== 'Not set') {
      ServiceRegistry.initGitHub({ token, owner, repo });
    }

    this.scene.start('WorldScene');
  }
}