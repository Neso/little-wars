import { Colour, Tile } from './types';

const ROWS = 5;
const COLS = 6;

export class Board {
  private tiles: Tile[];

  constructor() {
    this.tiles = this.createInitialTiles();
  }

  public getTiles(): Tile[] {
    return this.tiles.map((tile) => ({ ...tile, symbol: tile.symbol ? { ...tile.symbol } : null }));
  }

  public setTileSymbol(tileId: string, symbol: Tile['symbol']): void {
    const tile = this.tiles.find((t) => t.id === tileId);
    if (!tile) {
      throw new Error(`Tile not found: ${tileId}`);
    }
    tile.symbol = symbol;
  }

  public setTileColour(tileId: string, colour: Colour): void {
    const tile = this.tiles.find((t) => t.id === tileId);
    if (!tile) {
      throw new Error(`Tile not found: ${tileId}`);
    }
    tile.colour = colour;
  }

  public countColours(): { GREEN: number; ORANGE: number } {
    return this.tiles.reduce(
      (acc, tile) => {
        acc[tile.colour] += 1;
        return acc;
      },
      { GREEN: 0, ORANGE: 0 } as { GREEN: number; ORANGE: number }
    );
  }

  public clearSymbols(): void {
    this.tiles.forEach((tile) => {
      tile.symbol = null;
    });
  }

  private createInitialTiles(): Tile[] {
    const tiles: Tile[] = [];
    let greenCount = 0;
    let orangeCount = 0;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const id = `${row}-${col}`;
        const colour: Colour =
          greenCount < 15
            ? 'GREEN'
            : orangeCount < 15
            ? 'ORANGE'
            : greenCount <= orangeCount
            ? 'GREEN'
            : 'ORANGE';

        if (colour === 'GREEN') {
          greenCount += 1;
        } else {
          orangeCount += 1;
        }

        tiles.push({
          id,
          row,
          col,
          colour,
          symbol: null
        });
      }
    }

    return tiles;
  }
}
