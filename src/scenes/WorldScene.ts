import Phaser from 'phaser';
import { Player } from './PlayerScene';
import { NPC } from './NpcScene';

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
    // 1. Charger la map
    this.map = this.make.tilemap({ key: 'map' });
    this.tileset = this.map.addTilesetImage('tiles', 'tiles')!;

    // 2. Créer la couche principale
    this.worldLayer = this.map.createLayer('Tile Layer 1', this.tileset, 0, 0)!;

    // 3. Configurer les collisions
    this.worldLayer.setCollisionByProperty({ collides: true });

    // 4. Créer le joueur et le NPC
    const spawnPoint = this.map.findObject('Objects', (obj) => obj.name === 'Spawn Point') || { x: 400, y: 300 };
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);

    const npcPoint = this.map.findObject('Objects', (obj) => obj.name === 'NPC') || { x: 500, y: 300 };
    this.npc = new NPC(this, npcPoint.x, npcPoint.y);

    // 5. Configurer la physique
    this.physics.add.collider(this.player, this.worldLayer);

    // 6. Configurer la caméra
    const mapWidthPx = this.map.widthInPixels;
    const mapHeightPx = this.map.heightInPixels;
    const zoom = Math.min(window.innerWidth / mapWidthPx, window.innerHeight / mapHeightPx);

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player);

    // 7. Configurer les contrôles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-E', () => {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y) < 50) {
        this.npc.interact();
      }
    });
  }

  update() {
    this.player.update(this.cursors);
  }
}