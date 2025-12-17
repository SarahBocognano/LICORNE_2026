import Phaser from 'phaser';
import { Actor } from "./Actor";

export class QuestNPC extends Actor {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'characters');
    this.setFrame('npc-2');
    this.setImmovable(true);
    this.setDisplaySize(32, 32);
  }
}