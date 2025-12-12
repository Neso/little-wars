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

  it('pays only on matching coins and leaves colours unchanged for matching drops', () => {
    const config = {
      ...defaultMathConfig,
      rows: 1,
      cols: 2,
      maxCoinProbability: 1,
      baseRtp: 1000, // force pCoin to clamp to 1 for tiny board
      coinValueDistribution: {
        GREEN: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] },
        ORANGE: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] }
      },
      oppositeCoinCountWeights: [{ count: 0, weight: 1 }],
      featureCountWeights: [],
      featureWeights: []
    };
    const rolls = [0, 0, 0, 0]; // coin presence + coin value for each tile
    let cursor = 0;
    const rng = () => rolls[cursor++] ?? 1;
    const board: ('GREEN' | 'ORANGE')[] = ['GREEN', 'ORANGE'];
    const result = resolveMathSpin(board, 1, config, rng);
    expect(result.symbols.filter((s) => s.type === 'COIN')).toHaveLength(2);
    // Both coins match their tiles -> each pays bet(1) * multiplier(2) * board multiplier(1)
    expect(result.totalCoinWin).toBe(4);
    expect(result.updatedColours).toEqual(board);
  });

  it('places opposite-colour coins using configured count distribution', () => {
    const config = {
      ...defaultMathConfig,
      rows: 1,
      cols: 2,
      baseRtp: 0,
      maxCoinProbability: 0,
      coinValueDistribution: {
        GREEN: { onOwn: [{ value: 1, weight: 1 }], onOpposite: [{ value: 1, weight: 1 }] },
        ORANGE: { onOwn: [{ value: 1, weight: 1 }], onOpposite: [{ value: 1, weight: 1 }] }
      },
      oppositeCoinCountWeights: [{ count: 1, weight: 1 }],
      featureCountWeights: [],
      featureWeights: []
    };
    const rolls = [0, 0, 0, 0.9, 0]; // presence rolls, count roll, shuffle (keep index 0 first), coin value
    let cursor = 0;
    const rng = () => rolls[cursor++] ?? 0;
    const board: ('GREEN' | 'ORANGE')[] = ['GREEN', 'ORANGE'];
    const result = resolveMathSpin(board, 1, config, rng);
    const coinIndices = result.symbols
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s.type === 'COIN');
    expect(coinIndices).toHaveLength(1);
    const { idx, s } = coinIndices[0];
    expect((s as any).colour).toBe('ORANGE');
    expect(result.updatedColours[idx]).toBe('ORANGE');
    expect(result.totalCoinWin).toBe(0);
  });

  it('places features based on configured counts and weights', () => {
    const config = {
      ...defaultMathConfig,
      rows: 1,
      cols: 2,
      baseRtp: 0,
      maxCoinProbability: 0,
      oppositeCoinCountWeights: [],
      featureCountWeights: [{ count: 2, weight: 1 }],
      featureWeights: [{ type: 'SOLDIER', weight: 1 }]
    };
    const rolls = [0, 0, 0.2, 0.1, 0, 0.4, 0.8, 0.9]; // coin presence (2), feature count, shuffle, type per feature, colour per feature
    let cursor = 0;
    const rng = () => rolls[cursor++] ?? 0;
    const board: ('GREEN' | 'ORANGE')[] = ['GREEN', 'ORANGE'];
    const result = resolveMathSpin(board, 1, config, rng);
    const featureSymbols = result.symbols.filter((s) => s.type === 'SOLDIER');
    expect(featureSymbols).toHaveLength(2);
    const colours = featureSymbols.map((s) => (s as any).colour).sort();
    expect(colours).toEqual(['GREEN', 'ORANGE']);
  });
});
