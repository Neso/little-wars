import { describe, expect, it } from 'vitest';
import { resolveMathSpin, getCoinProbabilityForState } from '../src/core/math';
import { defaultMathConfig } from '../src/config/mathConfig';

const makeBoard = () => {
  const tiles: ('GREEN' | 'ORANGE')[] = [];
  for (let i = 0; i < 30; i++) {
    tiles.push(i < 15 ? 'GREEN' : 'ORANGE');
  }
  return tiles;
};

const seqRng = (values: number[]) => {
  let idx = 0;
  return () => {
    const v = values[idx % values.length];
    idx += 1;
    return v;
  };
};

describe('math spec integration', () => {
  it('clamps coin probability to maxCoinProbability', () => {
    const p = getCoinProbabilityForState(15, 15, { ...defaultMathConfig, baseRtp: 1000 });
    expect(p).toBeCloseTo(defaultMathConfig.maxCoinProbability);
  });

  it('pays only on matching coins and flips opposite colour coins', () => {
    const config = {
      ...defaultMathConfig,
      rows: 1,
      cols: 2,
      maxCoinProbability: 1,
      baseRtp: 100, // force pCoin to clamp to 1 for tiny board
      coinMultipliers: [{ value: 2, weight: 1 }],
      matchProbability: 0.5
    };
    // coin roll 0 -> coin, match roll 0 -> match
    // coin roll 0 -> coin, match roll 0.9 -> opposite
    const rolls = [0, 0, 0, 0.9];
    let cursor = 0;
    const rng = () => rolls[cursor++] ?? 1;
    const board: ('GREEN' | 'ORANGE')[] = ['GREEN', 'ORANGE'];
    const result = resolveMathSpin(board, 1, config, rng);
    expect(result.symbols.filter((s) => s.type === 'COIN')).toHaveLength(2);
    // First coin matches -> pays bet(1) * multiplier(2) * board multiplier(1) = 2
    expect(result.totalCoinWin).toBe(2);
    // Second coin flips tile colour
    expect(result.updatedColours[1]).toBe('GREEN');
  });
});
