import { describe, expect, it } from 'vitest';
import { LocalRgsClient } from '../src/net/LocalRgsClient';
import { FixedSymbolSource } from '../src/core/SymbolSource';
import { GameEngine } from '../src/core/GameEngine';
import config from '../src/config/config.json';
import { Symbol } from '../src/core/types';

const emptySymbols = (count: number): Symbol[] =>
  Array.from({ length: count }, () => ({ type: 'EMPTY' }));

const makeBaseState = () => {
  const dummyRgs = { getSpin: async () => { throw new Error('noop'); } };
  const engine = new GameEngine(config, dummyRgs as any);
  const base = engine.getState();
  return {
    ...base,
    balance: base.balance - base.bet,
    totalWin: 0,
    roundWin: 0,
    remainingSpins: 1,
    maxSpinsPerRound: 1,
    roundActive: true
  };
};

const countColours = (tiles: ReturnType<typeof makeBaseState>['tiles']) =>
  tiles.reduce(
    (acc, t) => {
      acc[t.colour] += 1;
      return acc;
    },
    { GREEN: 0, ORANGE: 0 } as { GREEN: number; ORANGE: number }
  );

describe('LocalRgsClient', () => {
  it('pays coins on matching colour using initial multipliers and updates balance on round end', async () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'COIN', colour: 'GREEN', value: 2 };
    const cfg = {
      ...config,
      coinValueDistribution: {
        GREEN: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] },
        ORANGE: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] }
      }
    };
    const rgs = new LocalRgsClient(cfg, new FixedSymbolSource(symbols));
    const baseState = makeBaseState();

    const result = await rgs.getSpin(baseState);

    expect(result.lastRoundWin).toBe(2);
    expect(result.balance).toBe(1001);
    expect(result.totalWin).toBe(0);
    expect(result.roundWin).toBe(0);
    expect(result.freeSpinActive).toBe(false);
    const counts = countColours(result.tiles);
    expect(counts.GREEN).toBe(15);
    expect(counts.ORANGE).toBe(15);
  });

  it('uses initial counts for payouts but applies flips after coins', async () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'COIN', colour: 'ORANGE', value: 1 };
    const rgs = new LocalRgsClient(config, new FixedSymbolSource(symbols));
    const baseState = makeBaseState();

    const result = await rgs.getSpin(baseState);

    expect(result.initialCounts?.GREEN).toBe(15);
    expect(result.initialCounts?.ORANGE).toBe(15);
    const counts = countColours(result.tiles);
    expect(counts.GREEN).toBe(14);
    expect(counts.ORANGE).toBe(16);
    expect(result.lastRoundWin).toBe(0);
    expect(result.balance).toBe(999); // no win, bet already deducted
  });
});
