import { describe, expect, it } from 'vitest';
import config from '../src/config/config.json';
import { GameEngine } from '../src/core/GameEngine';
import { FixedSymbolSource } from '../src/core/SymbolSource';
import { Symbol } from '../src/core/types';

const emptySymbols = (count: number): Symbol[] => Array.from({ length: count }, () => ({ type: 'EMPTY' }));

describe('GameEngine', () => {
  it('awards coin payout when colours match and keeps ownership', () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'COIN', colour: 'GREEN', value: 2 };
    const configOverride = {
      ...config,
      coinValueDistribution: {
        GREEN: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] },
        ORANGE: { onOwn: [{ value: 2, weight: 1 }], onOpposite: [{ value: 2, weight: 1 }] }
      }
    };
    const engine = new GameEngine(configOverride, new FixedSymbolSource(symbols));

    const state = engine.spin();

    expect(state.totalWin).toBe(0); // round ended, winnings banked
    expect(state.lastRoundWin).toBe(2);
    expect(state.lastSpinWin).toBe(2);
    expect(state.balance).toBe(1001); // 1000 - 1 bet + 2 win
    expect(state.greenTileCount).toBe(15);
    expect(state.orangeTileCount).toBe(15);
  });

  it('flips ownership on mismatched coin and updates multipliers', () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'COIN', colour: 'ORANGE', value: 1 };
    symbols[1] = { type: 'COIN', colour: 'ORANGE', value: 1 };
    symbols[2] = { type: 'COIN', colour: 'ORANGE', value: 1 };
    const engine = new GameEngine(config, new FixedSymbolSource(symbols));

    const state = engine.spin();

    expect(state.greenTileCount).toBe(12);
    expect(state.orangeTileCount).toBe(18);
    expect(state.multipliers.ORANGE).toBe(2);
  });

  it('applies spin reset rules when soldiers land', () => {
    const singleSpinConfig = {
      ...config,
      spinsPerRound: 1,
      spinResetRules: [{ symbolType: 'SOLDIER', minCount: 1, resetToSpins: 1 }]
    };
    const symbols: Symbol[] = emptySymbols(30);
    symbols[5] = { type: 'SOLDIER', colour: 'GREEN' };
    const engine = new GameEngine(singleSpinConfig, new FixedSymbolSource(symbols));

    const state = engine.spin();

    expect(state.remainingSpins).toBe(0);
    expect(state.roundActive).toBe(false);
  });

  it('soldier flips opposite tile when landing on opposite colour', () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'SOLDIER', colour: 'GREEN' };
    const engine = new GameEngine(config, new FixedSymbolSource(symbols));
    // Force tile 0 to be ORANGE to test flip
    // @ts-expect-error private access for test
    engine.board.setTileColour('0-0', 'ORANGE');

    const state = engine.spin();
    expect(state.greenTileCount).toBe(15); // back to balance after flip
    expect(state.orangeTileCount).toBe(15);
  });

  it('soldier on own colour attacks adjacent tile (non-diagonal)', () => {
    const symbols: Symbol[] = emptySymbols(30);
    symbols[0] = { type: 'SOLDIER', colour: 'GREEN' };
    const engine = new GameEngine(config, new FixedSymbolSource(symbols));
    // Arrange adjacent tile (0,1) as ORANGE to be targeted
    // @ts-expect-error private access for test
    engine.board.setTileColour('0-0', 'GREEN');
    // @ts-expect-error private access for test
    engine.board.setTileColour('0-1', 'ORANGE');

    const state = engine.spin();
    expect(state.greenTileCount).toBe(15); // converted adjacent to green, restoring balance
    expect(state.orangeTileCount).toBe(15);
  });
});
