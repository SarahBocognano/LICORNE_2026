import Phaser from 'phaser';
import { WorldScene } from "../scenes/WorldScene";
import {Actor} from "./Actor";

export class NPC extends Actor{
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters');
    this.setFrame('npc-1');
    this.setImmovable(true);
    this.setDisplaySize(32, 32);
    this.getBody().setOffset(8, 0);

  }

  interact(scene: Phaser.Scene) {
    if (scene instanceof WorldScene) {
      scene.createInteractionText(this.x, this.y, "Bonjour ! Voici mon stand. Regarde le tableau des quêtes : Appuie sur [E]");
    }
  }
}