import { Tile } from '@core/types';
import { AnimationSettings, defaultAnimation } from '@config/animation';
import { Application, Container, Graphics, Rectangle, Sprite, Texture, Text, TextStyle } from 'pixi.js';

const textures = {
  coin: {
    GREEN: Texture.from(new URL('../assets/symbols/coin-green.png', import.meta.url).href),
    ORANGE: Texture.from(new URL('../assets/symbols/coin-orange.png', import.meta.url).href)
  },
  soldier: {
    GREEN: Texture.from(new URL('../assets/symbols/soldier-green.png', import.meta.url).href),
    ORANGE: Texture.from(new URL('../assets/symbols/soldier-orange.png', import.meta.url).href)
  },
  tank: {
    GREEN: Texture.from(new URL('../assets/symbols/tank-green.png', import.meta.url).href),
    ORANGE: Texture.from(new URL('../assets/symbols/tank-orange.png', import.meta.url).href)
  },
  broken: Texture.from(new URL('../assets/symbols/broken.png', import.meta.url).href)
};

export class GameMachine {
  private app: Application;
  private container: Container;
  private tilesLayer: Container;
  private flickerLayer: Container;
  private symbolsLayer: Container;
  private payoutLayer: Container;
  private tankLayer: Container;
  private totalWinLayer: Container;
  private dimmed = false;
  private viewportWidth = 320;
  private viewportHeight = 280;
  private skipRequested = false;
  private lastColours: Map<string, string> = new Map();
  private animation: AnimationSettings;

  constructor(app: Application, container?: Container, animation: AnimationSettings = defaultAnimation) {
    this.app = app;
    this.container = container ?? new Container();
    this.animation = animation;
    this.tilesLayer = new Container();
    this.flickerLayer = new Container();
    this.symbolsLayer = new Container();
    this.container.addChild(this.tilesLayer);
    this.container.addChild(this.flickerLayer);
    this.container.addChild(this.symbolsLayer);
    this.payoutLayer = new Container();
    this.container.addChild(this.payoutLayer);
    this.tankLayer = new Container();
    this.container.addChild(this.tankLayer);
    this.totalWinLayer = new Container();
    this.container.addChild(this.totalWinLayer);
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

  public update(
    tiles: Tile[],
    payouts?: { tileId: string; amount: number }[],
    multipliers?: { GREEN: number; ORANGE: number }
  ): void {
    const layout = this.computeLayout(tiles);
    this.tilesLayer.removeChildren();
    this.symbolsLayer.removeChildren();
    this.payoutLayer.removeChildren();
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

      const container = this.createSymbolContainer(tile, layout.size, multipliers);
      container.x = x + (layout.size - container.width) / 2;
      container.y = y + (layout.size - container.height) / 2;
      this.symbolsLayer.addChild(container);
    });

    this.flashChangedTiles(changed, layout);
    this.showPayouts(payouts ?? [], tiles, layout);
    this.lastColours = new Map(tiles.map((t) => [t.id, t.colour]));
  }

  public animateSpin(
    tiles: Tile[],
    payouts?: { tileId: string; amount: number }[],
    prevTiles?: Tile[],
    multipliers?: { GREEN: number; ORANGE: number }
  ): Promise<void> {
    const layout = this.computeLayout(tiles);
    if (prevTiles) {
      this.lastColours = new Map(prevTiles.map((t) => [t.id, t.colour]));
    }
    this.skipRequested = false;
    this.tilesLayer.removeChildren();
    this.symbolsLayer.removeChildren();
    this.setOpacity(false);
    this.drawTilesOnly(prevTiles ?? tiles, layout);

    const overlay = new Container();
    this.container.addChild(overlay);

    let resolved = false;
    const tankTiles = tiles.filter((t) => t.symbol?.type === 'TANK');

    const finalize = async () => {
      if (resolved) return;
      resolved = true;
      await this.playTankOverlay(tankTiles, tiles, layout);
      this.container.removeChild(overlay);
      this.update(tiles, payouts, multipliers);
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

      const columns = new Map<number, Tile[]>();
      tiles.forEach((tile) => {
        const arr = columns.get(tile.col) ?? [];
        arr.push(tile);
        columns.set(tile.col, arr);
      });

      columns.forEach((colTiles, colIndex) => {
        const sorted = [...colTiles].sort((a, b) => b.row - a.row); // bottom to top
        sorted.forEach((tile, orderInColumn) => {
          const delay =
            colIndex * this.animation.columnDelayMs +
            orderInColumn * this.animation.stackDelayMs;
          setTimeout(() => {
            if (this.skipRequested) {
              markDone();
              return;
            }
            const { x, y } = this.positionFor(tile, layout);
            const container = this.createSymbolContainer(tile, layout.size, multipliers);
            container.x = x + (layout.size - container.width) / 2;
            const startY =
              y -
              layout.tileSize * this.animation.startOffsetTiles -
              (layout.size - container.height) / 2 -
              this.animation.offscreenOffsetPx;
            container.y = startY; // start above view
            overlay.addChild(container);

            const targetY = y + (layout.size - container.height) / 2;
            const startTime = performance.now();
            const duration = this.animation.fallDurationMs;
            const power = this.animation.easingPower;

            const animate = (now: number) => {
              if (this.skipRequested) {
                container.y = targetY;
                this.shake(container);
                markDone();
                return;
              }
              const t = Math.min(1, (now - startTime) / duration);
              const eased = 1 - Math.pow(1 - t, power);
              container.y = startY + (targetY - startY) * eased;
              if (t < 1) {
                requestAnimationFrame(animate);
              } else {
                this.shake(container);
                markDone();
              }
            };
            requestAnimationFrame(animate);
          }, delay);
        });
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

  private createSymbolContainer(
    tile: Tile,
    tileSize: number,
    multipliers: { GREEN: number; ORANGE: number } = { GREEN: 1, ORANGE: 1 }
  ): Container {
    const symbol = tile.symbol;
    let texture = textures.broken;
    if (symbol?.type === 'COIN') texture = textures.coin[symbol.colour];
    else if (symbol?.type === 'SOLDIER') texture = textures.soldier[symbol.colour];
    else if (symbol?.type === 'TANK') texture = textures.tank[symbol.colour];
    const sprite = new Sprite(texture);
    const desired = tileSize * 0.7;
    const scale = desired / Math.max(texture.width, texture.height);
    sprite.width = texture.width * scale;
    sprite.height = texture.height * scale;
    const container = new Container();
    container.addChild(sprite);

    if (symbol?.type === 'COIN') {
      const label = new Text(
        `${symbol.value ?? ''}`,
        new TextStyle({ fill: '#fff', fontSize: 24, fontWeight: '900', stroke: '#000', strokeThickness: 4 })
      );
      label.x = sprite.width / 2 - label.width / 2;
      label.y = sprite.height - label.height;
      container.addChild(label);
    }

    return container;
  }

  private showPayouts(
    payouts: { tileId: string; amount: number }[],
    tiles: Tile[],
    layout: { offsetX: number; offsetY: number; tileSize: number; padding: number; size: number }
  ): void {
    if (!payouts.length) return;
    const tileMap = new Map(tiles.map((t) => [t.id, t]));
    payouts.forEach((payout) => {
      const tile = tileMap.get(payout.tileId);
      if (!tile) return;
      const { x, y } = this.positionFor(tile, layout);
      const txt = new Text(`+${payout.amount}`, new TextStyle({ fill: '#ffffff', fontSize: 44, fontWeight: '900' }));
      txt.x = x + layout.size / 2 - txt.width / 2;
      txt.y = y + layout.size / 2 - txt.height / 2;
      this.payoutLayer.addChild(txt);
      const startY = txt.y;
      const duration = 700;
      const start = performance.now();
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 2);
        txt.alpha = 1 - eased;
        txt.y = startY - eased * 20;
        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          this.payoutLayer.removeChild(txt);
        }
      };
      requestAnimationFrame(animate);
    });
  }

  public showTotalWin(amount: number): void {
    this.totalWinLayer.removeChildren();
    const txt = new Text(`Win: ${amount}`, new TextStyle({ fill: '#fff', fontSize: 32, fontWeight: '900', stroke: '#000', strokeThickness: 4 }));
    txt.x = this.viewportWidth / 2 - txt.width / 2;
    txt.y = this.viewportHeight / 2 - txt.height / 2;
    txt.zIndex = 9999;
    this.totalWinLayer.addChild(txt);
    setTimeout(() => {
      this.totalWinLayer.removeChildren();
    }, this.animation.totalWinDisplayMs);
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

  private playTankOverlay(
    tankTiles: Tile[],
    tiles: Tile[],
    layout: { offsetX: number; offsetY: number; tileSize: number; padding: number; size: number }
  ): Promise<void> {
    this.tankLayer.removeChildren();
    if (!tankTiles.length) return Promise.resolve();
    const maxCol = Math.max(...tiles.map((t) => t.col));

    const animations = tankTiles.map((tank) => {
      return new Promise<void>((resolve) => {
        const startPos = this.positionFor(tank, layout);
        const sprite = new Sprite(textures.tank[tank.symbol?.colour === 'ORANGE' ? 'ORANGE' : 'GREEN']);
        const desired = layout.size * 0.8;
        const scale = desired / Math.max(sprite.texture.width, sprite.texture.height);
        sprite.width = sprite.texture.width * scale;
        sprite.height = sprite.texture.height * scale;
        sprite.x = startPos.x + (layout.size - sprite.width) / 2;
        sprite.y = startPos.y + (layout.size - sprite.height) / 2;
        this.tankLayer.addChild(sprite);

        for (let c = tank.col; c <= maxCol; c++) {
          setTimeout(() => {
            const { x, y } = this.positionFor({ ...tank, col: c } as Tile, layout);
            const flash = new Graphics();
            flash.beginFill(0xffffff, 0.4);
            flash.drawRect(x, y, layout.size, layout.size);
            flash.endFill();
            this.tankLayer.addChild(flash);
            setTimeout(() => this.tankLayer.removeChild(flash), 100);
          }, (c - tank.col) * 80);
        }

        const endX =
          layout.offsetX +
          maxCol * layout.tileSize +
          layout.padding +
          (layout.size - sprite.width) / 2;
        const startX = sprite.x;
        const distance = endX - startX;
        const duration = 500;
        const startTime = performance.now();
        const animate = (now: number) => {
          if (this.skipRequested) {
            sprite.x = endX;
            resolve();
            return;
          }
          const t = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - t, 2);
          sprite.x = startX + distance * eased;
          if (t < 1) {
            requestAnimationFrame(animate);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(animate);
      });
    });

    return Promise.all(animations).then(() => {
      this.tankLayer.removeChildren();
    });
  }

  private shake(container: Container): void {
    const originalY = container.y;
    const amplitude = this.animation.tremorOffsetPx;
    const duration = this.animation.tremorDurationMs;
    const start = performance.now();

    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const damped = (1 - t) * amplitude;
      container.y = originalY + Math.sin(t * Math.PI * 4) * damped;
      if (t < 1 && !this.skipRequested) {
        requestAnimationFrame(animate);
      } else {
        container.y = originalY;
      }
    };
    requestAnimationFrame(animate);
  }
}
