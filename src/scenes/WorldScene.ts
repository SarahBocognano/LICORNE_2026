import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { NPC } from '../objects/Npc';
import { ServiceRegistry } from '../services/ServiceRegistry';
import { DialogManager } from '../utils/DialogManager';
import { buildPRListHTML } from '../utils/PrListBuilder';

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
  private hasShownDialog = false;

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

      this.input.keyboard.on('keydown-E', () => {
        if (this.isNearNPC && !DialogManager.isOpen()) {
          this.showPRDialog();
        }
      });
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

private async showPRDialog() {
    // Prevent showing multiple times
    if (this.hasShownDialog) return;
    this.hasShownDialog = true;

    try {
      // Step 1: Show loading dialog
      DialogManager.show({
        title: '🔍 Checking for neglected PRs...',
        content: `
          <div style="text-align: center; padding: 60px 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 18px; color: #ffff00;">Loading...</div>
            <div style="font-size: 14px; color: #888; margin-top: 8px;">
              Fetching PRs from GitHub
            </div>
          </div>
        `,
      });

      // Step 2: Get GitHub service from global registry
      const github = ServiceRegistry.getGitHub();

      // Step 3: Fetch top 10 neglected PRs
      // Use 'hours' for testing, 'days' for production
      const prs = await github.getTop10MostNeglectedPRs(1, 'hours'); // 1+ hour for testing
      // const prs = await github.getTop10MostNeglectedPRs(3, 'days'); // 3+ days for production

      // Step 4: Show results in scrollable dialog
      DialogManager.show({
        title: '🚨 Neglected PRs Need Your Help!',
        content: buildPRListHTML(prs, 'hours'),
        width: '700px',
        height: '80vh',
        onClose: () => {
          this.hasShownDialog = false;
        }
      });

    } catch (error) {
      console.error('Error fetching PRs:', error);
      
      // Show error dialog
      DialogManager.show({
        title: '❌ Error Loading PRs',
        content: `
          <div style="text-align: center; padding: 60px 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="font-size: 18px; color: #ff4444; margin-bottom: 12px;">
              Failed to load PRs
            </div>
            <div style="font-size: 14px; color: #888; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 4px; margin-top: 16px;">
              ${error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        `,
      });
    }
  }

  update() {
    this.player.update(this.cursors);
  }
}