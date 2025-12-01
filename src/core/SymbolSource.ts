import {
  Colour,
  CoinValueDistribution,
  CoinValueWeight,
  Symbol,
  SymbolDistribution,
  SymbolType
} from './types';

export interface SymbolSource {
  generateSymbols(tileCount: number): Symbol[];
}

type Rng = () => number;

export class WeightedSymbolSource implements SymbolSource {
  private distribution: SymbolDistribution;
  private coinDistribution: CoinValueDistribution;
  private rng: Rng;

  constructor(
    distribution: SymbolDistribution,
    coinValueDistribution: CoinValueDistribution,
    rng: Rng = Math.random
  ) {
    this.distribution = { ...distribution };
    this.coinDistribution = { ...coinValueDistribution };
    this.rng = rng;
    this.validateDistribution(distribution);
    this.validateCoinDistribution(coinValueDistribution);
  }

  public generateSymbols(tileCount: number): Symbol[] {
    return Array.from({ length: tileCount }, () => this.randomSymbol());
  }

  private randomSymbol(): Symbol {
    const roll = this.rng();
    const emptyCutoff = this.distribution.empty;
    const coinCutoff = emptyCutoff + this.distribution.coin;

    if (roll < emptyCutoff) {
      return { type: 'EMPTY' };
    }
    if (roll < coinCutoff) {
      return this.randomCoin();
    }
    return this.randomSoldier();
  }

  private randomColour(): Colour {
    return this.rng() < 0.5 ? 'GREEN' : 'ORANGE';
  }

  private randomCoin(): Symbol {
    const colour = this.randomColour();
    return {
      type: 'COIN',
      colour,
      value: this.randomCoinValue(colour)
    };
  }

  private randomSoldier(): Symbol {
    return {
      type: 'SOLDIER',
      colour: this.randomColour()
    };
  }

  private randomCoinValue(colour: Colour): number {
    const dist = this.coinDistribution[colour];
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
    const total = distribution.empty + distribution.coin + distribution.soldier;
    if (Math.abs(total - 1) > 0.0001) {
      throw new Error('Symbol distribution must sum to 1.');
    }
  }

  private validateCoinDistribution(distribution: CoinValueDistribution): void {
    (['GREEN', 'ORANGE'] as const).forEach((colour) => {
      const dist = distribution[colour];
      const total = dist.reduce((sum, c) => sum + c.weight, 0);
      if (total <= 0) {
        throw new Error(`Coin value distribution for ${colour} must have positive weights.`);
      }
    });
  }
}

export class FixedSymbolSource implements SymbolSource {
  private readonly symbols: Symbol[];

  constructor(symbols: Symbol[]) {
    this.symbols = symbols;
  }

  public generateSymbols(tileCount: number): Symbol[] {
    if (this.symbols.length !== tileCount) {
      throw new Error('FixedSymbolSource requires symbol count to match tile count.');
    }
    return this.symbols;
  }
}

export const countSymbolType = (symbols: Symbol[], type: SymbolType): number =>
  symbols.filter((s) => s.type === type).length;
