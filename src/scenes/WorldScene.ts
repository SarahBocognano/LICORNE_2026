import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { NPC } from '../objects/Npc';
import { ServiceRegistry } from '../services/ServiceRegistry';
// @ts-ignore
import { GitHubActivityTracker } from '../services/GitHubActivityTracker';
import { DialogManager } from '../utils/DialogManager';
import { buildPRListHTML } from '../utils/PrListBuilder';
import { XPDisplay } from '../ui/XpDisplay';
import {QuestNPC} from "../objects/QuestNpc";

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private npc!: NPC;
  private questNpc!: QuestNPC;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  private tileset!: Phaser.Tilemaps.Tileset;
  private worldLayer!: Phaser.Tilemaps.TilemapLayer;
  private interactionDistance = 50;
  private isNearNPC = false;
  private interactionText?: Phaser.GameObjects.Text;
  private hasShownDialog = false;
  private xpDisplay!: XPDisplay;

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

    const npcQuestPoint = this.map.findObject('Objects', (obj) => obj.name === 'NPC 2') || { x: 500, y: 300 };
    this.questNpc = new QuestNPC(this, npcQuestPoint.x as number, npcQuestPoint.y as number);

    // Handle objects with collisions
    const objectLayer = this.map.getObjectLayer('Objects');
    if (objectLayer) {
      objectLayer.objects.forEach((obj) => {
        const collides = Boolean(obj.properties?.find((p: any) => p.name === 'collides')?.value);
        if (collides && obj.name !== 'NPC' && obj.name !== 'Spawn Point') {

          // If the object is a rectangle
          if (obj.rectangle || (obj.width && obj.height)) {
            const collider = this.add.rectangle(
                (obj.x as number) + (obj.width ?? 16) / 2,
                (obj.y as number) + (obj.height ?? 16) / 2,
                obj.width ?? 16,
                obj.height ?? 16
            );
            this.physics.add.existing(collider, true); // true = StaticBody
            this.physics.add.collider(this.player, collider);

            // If the object is a polygone
          } else if (obj.polygon) {
            const baseX = obj.x ?? 0;
            const baseY = obj.y ?? 0;
            const points = obj.polygon;

            for (let i = 0; i < points.length; i++) {
              const p1 = points[i];
              const p2 = points[(i + 1) % points.length];

              const minX = Math.min(p1.x, p2.x);
              const minY = Math.min(p1.y, p2.y);
              const width = Math.abs(p2.x - p1.x) || 8;
              const height = Math.abs(p2.y - p1.y) || 8;

              const collider = this.add.rectangle(
                  baseX + minX + width / 2,
                  baseY + minY + height / 2,
                  width,
                  height
              );
              this.physics.add.existing(collider, true);
              this.physics.add.collider(this.player, collider);
            }
          }
        }
      });
    }

    // Create XP display (top-left)
    const displayX = 40;
    this.xpDisplay = new XPDisplay(this, displayX, 40);

    // Add sync button below XP display
    this.createSyncButton(displayX, 120);

    // Prompt for username if not set
    if (!GitHubActivityTracker.hasUsername()) {
      this.promptForUsername();
    }

    // Config of physics
    this.physics.add.collider(this.player, this.worldLayer);
    this.physics.add.collider(this.player, this.npc);
    this.physics.add.collider(this.player, this.questNpc);

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

      // Press E to interact with NPC
      this.input.keyboard.on('keydown-E', () => {
        if (this.isNearNPC && !DialogManager.isOpen()) {
          this.showPRDialog();
        }
      });

      // Press S to sync GitHub activity
      this.input.keyboard.on('keydown-S', () => {
        this.syncGitHubActivity();
      });
    }
  }

  /**
   * Create sync button
   */
  private createSyncButton(x: number, y: number): void {
    const button = this.add.container(x, y);
    button.setScrollFactor(0);
    button.setDepth(10000);

    const bg = this.add.rectangle(0, 0, 250, 40, 0x4493f8, 0.9)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(125, 20, '🔄 Sync Activity (S)', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    button.add([bg, text]);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setFillStyle(0x5aa3ff);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x4493f8);
    });

    bg.on('pointerdown', () => {
      this.syncGitHubActivity();
    });

    // Pulse animation
    this.tweens.add({
      targets: button,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Prompt user for GitHub username
   */
  private promptForUsername(): void {
    setTimeout(() => {
      const username = prompt('Enter your GitHub username to track XP:');
      if (username && username.trim()) {
        GitHubActivityTracker.setUsername(username.trim());
        alert(`✅ Username set to: ${username.trim()}\n\nSyncing your GitHub activity...`);

        // Auto-sync after setting username
        this.syncGitHubActivity();
      }
    }, 1000);
  }

  /**
   * Sync GitHub activity and award XP
   */
  private async syncGitHubActivity(): Promise<void> {
    if (!GitHubActivityTracker.hasUsername()) {
      alert('Please set your GitHub username first!');
      this.promptForUsername();
      return;
    }

    try {
      // Show loading
      const loadingText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        '🔄 Syncing GitHub activity...\nThis may take a few seconds',
        {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: { x: 20, y: 10 },
          align: 'center',
        }
      ).setOrigin(0.5);
      loadingText.setScrollFactor(0);
      loadingText.setDepth(10001);

      // Sync activity (1+ hour for testing, 7+ days for production)
      const result = await GitHubActivityTracker.syncXP({
        minAge: 1,
        timeUnit: 'hours'
      });
      // Production: await GitHubActivityTracker.syncXP();

      loadingText.destroy();

      if (result.xpGained > 0) {
        // Show XP gain animation with level up info
        const gain = {
          amount: result.xpGained,
          reason: result.newActivities.join(', '),
          leveledUp: result.leveledUp || false,
          newLevel: result.newLevel,
        };

        this.xpDisplay.showXPGain(gain);

        // Refresh display after animation starts
        setTimeout(() => {
          this.xpDisplay.refresh();
        }, 100);

        // Show success message
        const levelUpText = result.leveledUp ? `\n\n🎉 LEVEL UP! Now level ${result.newLevel}!` : '';
        const message = result.newActivities.length > 0
          ? `✨ Synced!\n\n${result.newActivities.join('\n')}\n\nTotal: +${result.xpGained} XP${levelUpText}`
          : `✨ First Sync Complete!\n\nGained ${result.xpGained} XP for your existing activity!${levelUpText}`;

        alert(message);
      } else {
        const username = GitHubActivityTracker.getStoredUsername();
        alert(`✅ Already synced! No new activity found.\n\n💡 To gain XP:\n1. Review/comment on PRs that are 1+ hour old\n2. Wait 2-3 minutes for GitHub API\n3. Sync again (Press S)\n\nYour username: ${username}`);
      }

    } catch (error) {
      console.error('Sync error:', error);
      alert('❌ Failed to sync.\n\nPossible reasons:\n- Username is incorrect\n- GitHub API error\n- Network issue\n\nCheck console for details.');
    }
  }

  private setupProximityDetection() {
    this.events.on('update', () => {
      const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y,
          this.npc.x, this.npc.y
      );

      if (distance < this.interactionDistance) {
        if (!this.isNearNPC) {
          this.isNearNPC = true;
          this.npc.interact(this);
        }
      } else {
        if (this.isNearNPC) {
          this.isNearNPC = false;
          this.destroyInteractionText();
          this.hasShownDialog = false;
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
    this.destroyInteractionText();

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
        onClose: () => {
          this.hasShownDialog = false;
        }
      });
    }
  }

  update() {
    // @ts-ignore
    this.player.update(this.cursors);
  }
}