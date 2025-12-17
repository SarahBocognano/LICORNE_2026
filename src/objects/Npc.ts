import Phaser from 'phaser';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'npc');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);
  }

  interact() {
    console.log("NPC: Bonjour ! Voici mon stand.");
  }
}