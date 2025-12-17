import Phaser from 'phaser';
import { WorldScene } from "../scenes/WorldScene";

export class NPC extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'npc');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setImmovable(true);
  }

  interact(scene: Phaser.Scene) {
    if (scene instanceof WorldScene) {
      scene.createInteractionText(this.x, this.y, "Bonjour ! Voici mon stand.");
    }
  }
}