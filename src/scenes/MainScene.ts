import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', '/finalMap.json');
    this.load.image('spritesheet', '/spritesheet.png');
  }

  create(): void {
    const map = this.make.tilemap({ key: 'map' });
    console.log('map size in tiles:', map.width, map.height);
    console.log('map size in pixels:', map.widthInPixels, map.heightInPixels);

    const tileset = map.addTilesetImage('tiles', 'spritesheet');
    const layer = map.createLayer('Tile Layer 1', tileset!, 0, 0);

    const mapWidthPx = map.widthInPixels;
    const mapHeightPx = map.heightInPixels;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const zoomX = screenW / mapWidthPx;
    const zoomY = screenH / mapHeightPx;

    const zoom = Math.max(zoomX, zoomY);

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(mapWidthPx / 2, mapHeightPx / 2);
  }
}