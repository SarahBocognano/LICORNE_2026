import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private speed = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {

    super(scene, x, y, 'pixel');

    if (!scene.textures.exists('pixel')) {
      const graphics = scene.make.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillRect(0, 0, 1, 1);
      graphics.generateTexture('pixel', 1, 1);
      graphics.destroy();
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setTint(0xff00ff);
    this.setDisplaySize(32, 32);
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    // set movement of the characters with keyboard
    this.setVelocity(0);

    if (cursors.left.isDown) {
      this.setVelocityX(-this.speed);
    } else if (cursors.right.isDown) {
      this.setVelocityX(this.speed);
    }

    if (cursors.up.isDown) {
      this.setVelocityY(-this.speed);
    } else if (cursors.down.isDown) {
      this.setVelocityY(this.speed);
    }
  }
}