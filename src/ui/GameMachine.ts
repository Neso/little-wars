import { Tile } from '@core/types';
import { Application, Container, Graphics } from 'pixi.js';

export class GameMachine {
  private app: Application;
  private container: Container;
  private dimmed = false;

  constructor(app: Application, container?: Container) {
    this.app = app;
    this.container = container ?? new Container();
    this.app.stage.addChild(this.container);
  }

  public setOpacity(dimmed: boolean): void {
    this.dimmed = dimmed;
    this.container.alpha = dimmed ? 0.3 : 1;
  }

  public update(tiles: Tile[]): void {
    this.container.removeChildren();
    tiles.forEach((tile) => {
      const graphic = new Graphics();
      const colour = tile.colour === 'GREEN' ? 0x00aa66 : 0xff8800;
      graphic.beginFill(colour);
      graphic.drawRect(tile.col * 50, tile.row * 50, 48, 48);
      graphic.endFill();
      graphic.alpha = this.dimmed ? 0.3 : 1;
      this.container.addChild(graphic);
    });
  }
}
