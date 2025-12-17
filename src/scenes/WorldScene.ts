import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { NPC } from '../objects/Npc';

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private npc!: NPC;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create() {
    // Load map
    this.map = this.make.tilemap({ key: 'map' });
    this.tileset = this.map.addTilesetImage('tiles', 'tiles')!;

    // Create principal layer
    this.worldLayer = this.map.createLayer('Tile Layer 1', this.tileset, 0, 0)!;

    // Config collisions
    this.worldLayer.setCollisionByProperty({ collides: true });

    // Create Player and NPC on map
    const spawnPoint = this.map.findObject('Objects', (obj) => obj.name === 'Spawn Point') || { x: 400, y: 300 };
    this.player = new Player(this, spawnPoint.x as number, spawnPoint.y as number);

    const npcPoint = this.map.findObject('Objects', (obj) => obj.name === 'NPC') || { x: 500, y: 300 };
    this.npc = new NPC(this, npcPoint.x as number, npcPoint.y as number);

    // Config of physics
    this.physics.add.collider(this.player, this.worldLayer);

    // Config of camera
    const mapWidthPx = this.map.widthInPixels;
    const mapHeightPx = this.map.heightInPixels;
    const zoom = Math.min(window.innerWidth / mapWidthPx, window.innerHeight / mapHeightPx);

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player);

    // Config of controls
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.input.keyboard.on('keydown-E', () => {
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) < 50) {
          this.npc.interact();
        }
      });
    }
  }

  update() {
    this.player.update(this.cursors);
  }
}