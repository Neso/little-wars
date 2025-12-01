import { describe, expect, it } from 'vitest';
import { WeightedSymbolSource } from '../src/core/SymbolSource';
import { CoinValueDistribution, CoinValueWeight, SymbolDistribution } from '../src/core/types';

const distribution: SymbolDistribution = { empty: 0.7, coin: 0.15, soldier: 0.15 };
const sharedCoinWeights: CoinValueWeight[] = [
  { value: 1, weight: 0.3 },
  { value: 2, weight: 0.25 },
  { value: 3, weight: 0.25 },
  { value: 25, weight: 0.1 },
  { value: 50, weight: 0.05 },
  { value: 100, weight: 0.05 }
];

const coinDistribution: CoinValueDistribution = {
  GREEN: sharedCoinWeights,
  ORANGE: sharedCoinWeights
};

describe('WeightedSymbolSource', () => {
  it('respects distribution cutoffs deterministically', () => {
    const rolls = [0.0, 0.69, 0.7, 0.84, 0.85, 0.99];
    let index = 0;
    const rng = () => rolls[index++ % rolls.length];
    const source = new WeightedSymbolSource(distribution, coinDistribution, rng);

    const symbols = source.generateSymbols(6);

    expect(symbols[0].type).toBe('EMPTY');
    expect(symbols[1].type).toBe('EMPTY');
    expect(symbols[2].type).toBe('COIN');
    expect(symbols[3].type).toBe('COIN');
    expect(symbols[4].type).toBe('SOLDIER');
    expect(symbols[5].type).toBe('SOLDIER');
  });

  it('returns coin values according to weighted distribution', () => {
    const rolls = [0.71, 0.75, 0.9, 0.95, 0.99]; // all coin rolls
    const rng = (() => {
      let idx = 0;
      return () => {
        const value = rolls[idx % rolls.length];
        idx += 1;
        return value;
      };
    })();
    const source = new WeightedSymbolSource(distribution, coinDistribution, rng);
    const symbols = source.generateSymbols(5).filter((s) => s.type === 'COIN');

    expect(symbols.map((s) => (s.type === 'COIN' ? s.value : 0))).toEqual([1, 2, 25, 50, 100]);
  });

  it('throws when distribution does not sum to 1', () => {
    expect(
      () => new WeightedSymbolSource({ empty: 0.5, coin: 0.5, soldier: 0.1 }, coinDistribution, Math.random)
    ).toThrow('Symbol distribution must sum to 1.');
  });
});
