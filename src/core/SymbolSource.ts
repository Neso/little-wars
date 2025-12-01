import {
  Colour,
  CoinValueDistribution,
  CoinValueWeight,
  Symbol,
  SymbolDistribution,
  SymbolType,
  TankReelWeights
} from './types';

export interface SymbolSource {
  generateSymbols(rows: number, cols: number): Symbol[];
}

type Rng = () => number;

export class WeightedSymbolSource implements SymbolSource {
  private distribution: SymbolDistribution;
  private coinDistribution: CoinValueDistribution;
  private tankReels: TankReelWeights;
  private rng: Rng;

  constructor(
    distribution: SymbolDistribution,
    coinValueDistribution: CoinValueDistribution,
    tankReels: TankReelWeights,
    rng: Rng = Math.random
  ) {
    this.distribution = { ...distribution };
    this.coinDistribution = { ...coinValueDistribution };
    this.tankReels = tankReels;
    this.rng = rng;
    this.validateDistribution(distribution);
    this.validateCoinDistribution(coinValueDistribution);
    this.validateTankReels(tankReels);
  }

  public generateSymbols(rows: number, cols: number): Symbol[] {
    const symbols: Symbol[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        symbols.push(this.randomSymbol(col));
      }
    }
    return symbols;
  }

  private randomSymbol(col: number): Symbol {
    const tank = this.rollTank(col);
    if (tank) return tank;

    const roll = this.rng();
    const emptyCutoff = this.distribution.empty;
    const coinCutoff = emptyCutoff + this.distribution.coin;
    const soldierCutoff = coinCutoff + this.distribution.soldier;

    if (roll < emptyCutoff) {
      return { type: 'EMPTY' };
    }
    if (roll < coinCutoff) {
      return this.randomCoin();
    }
    if (roll < soldierCutoff) {
      return this.randomSoldier();
    }
    return { type: 'EMPTY' };
  }

  private randomColour(): Colour {
    return this.rng() < 0.5 ? 'GREEN' : 'ORANGE';
  }

  private randomCoin(): Symbol {
    const colour = this.randomColour();
    const value = this.randomCoinValue(colour, true);
    return {
      type: 'COIN',
      colour,
      value
    };
  }

  private randomSoldier(): Symbol {
    return {
      type: 'SOLDIER',
      colour: this.randomColour()
    };
  }

  private randomCoinValue(colour: Colour, onOwn: boolean): number {
    const dist = onOwn ? this.coinDistribution[colour].onOwn : this.coinDistribution[colour].onOpposite;
    const total = dist.reduce((sum, c) => sum + c.weight, 0);
    let roll = this.rng() * total;
    for (const entry of dist) {
      if (roll < entry.weight) {
        return entry.value;
      }
      roll -= entry.weight;
    }
    return dist[dist.length - 1].value;
  }

  private validateDistribution(distribution: SymbolDistribution): void {
    const total = distribution.empty + distribution.coin + distribution.soldier + (distribution.tank ?? 0);
    if (Math.abs(total - 1) > 0.0001) {
      throw new Error('Symbol distribution must sum to 1.');
    }
  }

  private validateCoinDistribution(distribution: CoinValueDistribution): void {
    (['GREEN', 'ORANGE'] as const).forEach((colour) => {
      ['onOwn', 'onOpposite'].forEach((key) => {
        const dist = distribution[colour][key as 'onOwn' | 'onOpposite'];
        const total = dist.reduce((sum, c) => sum + c.weight, 0);
        if (total <= 0) {
          throw new Error(`Coin value distribution for ${colour} (${key}) must have positive weights.`);
        }
      });
    });
  }

  private validateTankReels(reels: TankReelWeights): void {
    const cols = Math.max(reels.GREEN.length, reels.ORANGE.length);
    if (cols === 0) return;
    for (let i = 0; i < cols; i++) {
      const green = reels.GREEN[i] ?? 0;
      const orange = reels.ORANGE[i] ?? 0;
      if (green + orange > 1) {
        throw new Error(`Tank probabilities exceed 1 in column ${i}`);
      }
    }
  }

  private rollTank(col: number): Symbol | null {
    const green = this.tankReels.GREEN[col] ?? 0;
    const orange = this.tankReels.ORANGE[col] ?? 0;
    const roll = this.rng();
    if (roll < green) return { type: 'TANK', colour: 'GREEN' };
    if (roll < green + orange) return { type: 'TANK', colour: 'ORANGE' };
    return null;
  }
}

export class FixedSymbolSource implements SymbolSource {
  private readonly symbols: Symbol[];

  constructor(symbols: Symbol[]) {
    this.symbols = symbols;
  }

  public generateSymbols(rows: number, cols: number): Symbol[] {
    const tileCount = rows * cols;
    if (this.symbols.length !== tileCount) {
      throw new Error('FixedSymbolSource requires symbol count to match tile count.');
    }
    return this.symbols;
  }
}

export const countSymbolType = (symbols: Symbol[], type: SymbolType): number =>
  symbols.filter((s) => s.type === type).length;
