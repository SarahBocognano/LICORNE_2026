import Phaser from 'phaser';

/**
 * Heart Display UI Component
 * Symbolic player life display (no real damage system)
 */
export class HeartDisplay {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private hearts: Phaser.GameObjects.Text[] = [];

    private maxHearts: number;
    private currentHearts: number;

    constructor(
        scene: Phaser.Scene,
        maxHearts: number = 3,
        x?: number,
        y?: number
    ) {
        this.scene = scene;
        this.maxHearts = maxHearts;
        this.currentHearts = maxHearts;

        const cam = scene.cameras.main;

        // Default position: top-right
        const posX = x ?? cam.width - 20;
        const posY = y ?? 20;

        this.container = scene.add.container(posX, posY);
        this.container.setScrollFactor(0);
        this.container.setDepth(10000);

        this.createDisplay();
        this.startHeartbeat();
    }

    private createDisplay(): void {
        const spacing = 26;

        for (let i = 0; i < this.maxHearts; i++) {
            const heart = this.scene.add.text(
                -i * spacing,
                0,
                '❤️',
                {
                    fontSize: '22px',
                }
            ).setOrigin(1, 0);

            this.hearts.push(heart);
            this.container.add(heart);
        }
    }

    /**
     * Small pulse animation
     */
    private startHeartbeat(): void {
        this.scene.tweens.add({
            targets: this.container,
            scale: 1.05,
            duration: 1200,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
        });
    }
}
