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
    // Sequence accounts for extra draws on coins (type, colour, value) and soldiers (type, colour).
    const rolls = [
      0.0, // type -> EMPTY
      0.69, // type -> EMPTY
      0.7, // type -> COIN
      0.4, // coin colour
      0.1, // coin value -> 1
      0.84, // type -> COIN
      0.6, // coin colour
      0.8, // coin value -> 25
      0.85, // type -> SOLDIER
      0.2, // soldier colour
      0.99, // type -> SOLDIER
      0.9 // soldier colour
    ];
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
    // Each symbol: type -> COIN followed by colour then value roll.
    const rolls = [
      0.71, 0.1, 0.0, // coin -> value roll 0.0 -> 1
      0.72, 0.2, 0.31, // value roll 0.31 -> 2
      0.73, 0.3, 0.56, // value roll 0.56 -> 3
      0.74, 0.4, 0.89, // value roll 0.89 -> 25
      0.75, 0.5, 0.94 // value roll 0.94 -> 50
    ];
    const rng = (() => {
      let idx = 0;
      return () => rolls[idx++ % rolls.length];
    })();
    const source = new WeightedSymbolSource(distribution, coinDistribution, rng);
    const symbols = source.generateSymbols(5).filter((s) => s.type === 'COIN');

    expect(symbols.map((s) => (s.type === 'COIN' ? s.value : 0))).toEqual([1, 2, 3, 25, 50]);
  });

  it('throws when distribution does not sum to 1', () => {
    expect(
      () => new WeightedSymbolSource({ empty: 0.5, coin: 0.5, soldier: 0.1 }, coinDistribution, Math.random)
    ).toThrow('Symbol distribution must sum to 1.');
  });
});
