import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', 'finalMap.json');
    this.load.image('tiles', 'spritesheet.png');
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}