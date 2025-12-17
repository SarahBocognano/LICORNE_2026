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
  private interactionDistance = 50;
  private isNearNPC = false;
  private interactionText?: Phaser.GameObjects.Text;

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

    // Set up proximity
    this.setupProximityDetection();

    // Config of camera
    const mapWidthPx = this.map.widthInPixels;
    const mapHeightPx = this.map.heightInPixels;
    const zoom = Math.min(window.innerWidth / mapWidthPx, window.innerHeight / mapHeightPx);

    this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.startFollow(this.player);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
  }

  private setupProximityDetection() {
    this.events.on('update', () => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.npc.x, this.npc.y
      );

      // Si le joueur est assez proche
      if (distance < this.interactionDistance) {
        if (!this.isNearNPC) {
          this.isNearNPC = true;
          this.npc.interact(this); // Passer la scène au NPC pour créer le texte
        }
      } else {
        if (this.isNearNPC) {
          this.isNearNPC = false;
          this.destroyInteractionText();
        }
      }
    });
  }

  private destroyInteractionText() {
    if (this.interactionText) {
      this.interactionText.destroy();
      this.interactionText = undefined;
    }
  }

  public createInteractionText(x: number, y: number, message: string) {
    this.destroyInteractionText(); // Détruire le texte existant s'il y en a un

    this.interactionText = this.add.text(
      x,
      y - 40,
      message,
      {
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 10, y: 5 }
      }
    );
    this.interactionText.setOrigin(0.5);
    this.interactionText.setDepth(1000);
  }

  update() {
    this.player.update(this.cursors);
  }
}