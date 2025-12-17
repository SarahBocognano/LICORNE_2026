import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', 'finalMap.json');
    this.load.image('tiles', 'spritesheet.png');
    this.load.atlas('a-king', 'a-king.png', 'a-king_atlas.json');
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}