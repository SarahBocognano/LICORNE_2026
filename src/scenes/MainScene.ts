import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  private text!: Phaser.GameObjects.Text;

  constructor() {
    super('MainScene');
  }

  preload(): void {
    // Ici tu pourras plus tard charger des assets (tileset, sprite du perso, etc.)
  }

  create(): void {
    this.text = this.add.text(20, 20, 'RPG GitHub + Phaser', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });

    // Exemple : personnage représenté par un simple carré
    const player = this.add.rectangle(400, 300, 32, 32, 0x00ff00);
    this.add.existing(player);
  }

  update(time: number, delta: number): void {
    // Boucle de jeu (plus tard : déplacement, interactions PNJ, etc.)
  }
}