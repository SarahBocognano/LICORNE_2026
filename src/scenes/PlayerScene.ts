import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private speed = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pixel');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setTint(0xff00ff);
    this.setDisplaySize(32, 32);

    if (!scene.textures.exists('pixel')) {
      const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, 1, 1);
      graphics.generateTexture('pixel', 1, 1);
    }
  }

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
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