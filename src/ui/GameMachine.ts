import { Tile } from '@core/types';
import { Application, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';

const textures = {
  coin: {
    GREEN: Texture.from(new URL('../assets/symbols/coin-green.png', import.meta.url).href),
    ORANGE: Texture.from(new URL('../assets/symbols/coin-orange.png', import.meta.url).href)
  },
  soldier: {
    GREEN: Texture.from(new URL('../assets/symbols/soldier-green.png', import.meta.url).href),
    ORANGE: Texture.from(new URL('../assets/symbols/soldier-orange.png', import.meta.url).href)
  },
  broken: Texture.from(new URL('../assets/symbols/broken.png', import.meta.url).href)
};

export class GameMachine {
  private app: Application;
  private container: Container;
  private tilesLayer: Container;
  private flickerLayer: Container;
  private symbolsLayer: Container;
  private dimmed = false;
  private viewportWidth = 320;
  private viewportHeight = 280;
  private skipRequested = false;
  private lastColours: Map<string, string> = new Map();

  constructor(app: Application, container?: Container) {
    this.app = app;
    this.container = container ?? new Container();
    this.tilesLayer = new Container();
    this.flickerLayer = new Container();
    this.symbolsLayer = new Container();
    this.container.addChild(this.tilesLayer);
    this.container.addChild(this.flickerLayer);
    this.container.addChild(this.symbolsLayer);
    this.app.stage.addChild(this.container);
  }

  public setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.app.renderer.resize(width, height);
    this.container.hitArea = new Rectangle(0, 0, width, height);
  }

  public setOpacity(dimmed: boolean): void {
    this.dimmed = dimmed;
    // No dimming; keep state for potential hooks.
  }

  public skipAnimation(): void {
    this.skipRequested = true;
  }

  public update(tiles: Tile[]): void {
    const layout = this.computeLayout(tiles);
    this.tilesLayer.removeChildren();
    this.symbolsLayer.removeChildren();
    if (!tiles.length) return;

    const changed: Tile[] = [];
    tiles.forEach((tile) => {
      const prev = this.lastColours.get(tile.id);
      if (prev && prev !== tile.colour) {
        changed.push(tile);
      }
    });

    tiles.forEach((tile) => {
      const { x, y } = this.positionFor(tile, layout);
      const graphic = new Graphics();
      const colour = tile.colour === 'GREEN' ? 0x00aa66 : 0xff8800;
      graphic.beginFill(colour);
      graphic.drawRect(x, y, layout.size, layout.size);
      graphic.endFill();
      this.tilesLayer.addChild(graphic);

      const sprite = this.createSymbolSprite(tile, layout.size);
      sprite.x = x + (layout.size - sprite.width) / 2;
      sprite.y = y + (layout.size - sprite.height) / 2;
      this.symbolsLayer.addChild(sprite);
    });

    this.flashChangedTiles(changed, layout);
    this.lastColours = new Map(tiles.map((t) => [t.id, t.colour]));
  }

  public animateSpin(tiles: Tile[], durationMs = 500, columnDelayMs = 120): Promise<void> {
    const layout = this.computeLayout(tiles);
    this.skipRequested = false;
    this.tilesLayer.removeChildren();
    this.symbolsLayer.removeChildren();
    this.setOpacity(true);
    this.drawTilesOnly(tiles, layout);

    const overlay = new Container();
    this.container.addChild(overlay);

    const columns = new Map<number, Tile[]>();
    tiles.forEach((tile) => {
      const colTiles = columns.get(tile.col) ?? [];
      colTiles.push(tile);
      columns.set(tile.col, colTiles);
    });

    let resolved = false;
    const finalize = () => {
      if (resolved) return;
      resolved = true;
      this.container.removeChild(overlay);
      this.setOpacity(false);
      this.update(tiles);
    };

    return new Promise((resolve) => {
      const totalSprites = tiles.length;
      let finished = 0;
      const markDone = () => {
        finished += 1;
        if (finished >= totalSprites || this.skipRequested) {
          finalize();
          resolve();
        }
      };

      if (this.skipRequested || totalSprites === 0) {
        finalize();
        resolve();
        return;
      }

      columns.forEach((colTiles, colIndex) => {
        setTimeout(() => {
          if (this.skipRequested) {
            markDone();
            return;
          }
          colTiles.forEach((tile) => {
            const { x, y } = this.positionFor(tile, layout);
            const sprite = this.createSymbolSprite(tile, layout.size);
            sprite.x = x + (layout.size - sprite.width) / 2;
            sprite.y = -layout.size * 2; // start above view
            overlay.addChild(sprite);

            const targetY = y + (layout.size - sprite.height) / 2;
            const startY = sprite.y;
            const startTime = performance.now();

            const animate = (now: number) => {
              if (this.skipRequested) {
                sprite.y = targetY;
                markDone();
                return;
              }
              const t = Math.min(1, (now - startTime) / durationMs);
              const eased = 1 - (1 - t) * (1 - t);
              sprite.y = startY + (targetY - startY) * eased;
              if (t < 1) {
                requestAnimationFrame(animate);
              } else {
                markDone();
              }
            };
            requestAnimationFrame(animate);
          });
        }, colIndex * columnDelayMs);
      });
    });
  }

  private computeLayout(tiles: Tile[]) {
    if (!tiles.length) {
      return { tileSize: 0, offsetX: 0, offsetY: 0, padding: 0, size: 0 };
    }
    const rows = Math.max(...tiles.map((t) => t.row)) + 1;
    const cols = Math.max(...tiles.map((t) => t.col)) + 1;
    const tileSize = Math.min(this.viewportWidth / cols, this.viewportHeight / rows);
    const offsetX = (this.viewportWidth - tileSize * cols) / 2;
    const offsetY = (this.viewportHeight - tileSize * rows) / 2;
    const padding = Math.max(tileSize * 0.05, 1);
    const size = tileSize - padding * 2;
    return { tileSize, offsetX, offsetY, padding, size };
  }

  private positionFor(tile: Tile, layout: { tileSize: number; offsetX: number; offsetY: number; padding: number; size: number }) {
    return {
      x: layout.offsetX + tile.col * layout.tileSize + layout.padding,
      y: layout.offsetY + tile.row * layout.tileSize + layout.padding
    };
  }

  private drawTilesOnly(tiles: Tile[], layout: { tileSize: number; offsetX: number; offsetY: number; padding: number; size: number }): void {
    tiles.forEach((tile) => {
      const { x, y } = this.positionFor(tile, layout);
      const graphic = new Graphics();
      const colour = tile.colour === 'GREEN' ? 0x00aa66 : 0xff8800;
      graphic.beginFill(colour);
      graphic.drawRect(x, y, layout.size, layout.size);
      graphic.endFill();
      this.tilesLayer.addChild(graphic);
    });
  }

  private createSymbolSprite(tile: Tile, tileSize: number): Sprite {
    const symbol = tile.symbol;
    let texture = textures.broken;
    if (symbol?.type === 'COIN') texture = textures.coin[symbol.colour];
    else if (symbol?.type === 'SOLDIER') texture = textures.soldier[symbol.colour];
    const sprite = new Sprite(texture);
    const desired = tileSize * 0.7;
    const scale = desired / Math.max(texture.width, texture.height);
    sprite.width = texture.width * scale;
    sprite.height = texture.height * scale;
    return sprite;
  }

  private flashChangedTiles(changed: Tile[], layout: { offsetX: number; offsetY: number; tileSize: number; padding: number; size: number }): void {
    this.flickerLayer.removeChildren();
    if (!changed.length) return;
    const overlays: Graphics[] = [];
    changed.forEach((tile) => {
      const { x, y } = this.positionFor(tile, layout);
      const g = new Graphics();
      g.beginFill(0xffffff, 1);
      g.drawRect(x, y, layout.size, layout.size);
      g.endFill();
      g.alpha = 0;
      this.flickerLayer.addChild(g);
      overlays.push(g);
    });

    let step = 0;
    const maxSteps = 6; // 3 flickers
    const interval = 70;
    const toggle = () => {
      const visible = step % 2 === 0;
      overlays.forEach((g) => (g.alpha = visible ? 0.7 : 0));
      step += 1;
      if (step <= maxSteps) {
        setTimeout(toggle, interval);
      } else {
        overlays.forEach((g) => (g.alpha = 0));
        this.flickerLayer.removeChildren();
      }
    };
    toggle();
  }
}
