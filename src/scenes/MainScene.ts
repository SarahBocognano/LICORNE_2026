import Phaser from 'phaser';

const TILE_SIZE = 16;

export class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload(): void {
    this.load.tilemapTiledJSON('map', '/map.json');
    this.load.image('tiles', '/spritesheet-2.png');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Nombre de tuiles nécessaires pour couvrir l’écran
    const mapWidth = Math.ceil(width / TILE_SIZE);
    const mapHeight = Math.ceil(height / TILE_SIZE);

    // Crée une tilemap vide de la bonne taille
    const map = this.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: mapWidth,
      height: mapHeight
    });

    // Tileset depuis l’image (première tuile = herbe)
    const tileset = map.addTilesetImage('tiles', undefined, TILE_SIZE, TILE_SIZE);

    // Crée un layer
    // @ts-ignore
    const layer = map.createBlankLayer('Ground', tileset, 0, 0);

    // Remplit toute la map avec l’ID 0 (première tuile = herbe)
    layer?.fill(0, 0, 0, mapWidth, mapHeight);

    // Caméra : pas de zoom, on laisse 1:1
    this.cameras.main.setBounds(0, 0, mapWidth * TILE_SIZE, mapHeight * TILE_SIZE);
    this.cameras.main.centerOn(width / 2, height / 2);
  }}