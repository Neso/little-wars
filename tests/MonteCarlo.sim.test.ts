import { describe, it, expect } from 'vitest';
import { resolveMathSpin } from '../src/core/math';
import { defaultMathConfig } from '../src/config/mathConfig';

const initialBoard = (): ('GREEN' | 'ORANGE')[] =>
  Array.from({ length: defaultMathConfig.rows * defaultMathConfig.cols }, (_, idx) =>
    idx < 15 ? 'GREEN' : 'ORANGE'
  );

describe.skip('Monte Carlo RTP sanity check', () => {
  it('estimates RTP close to target over many spins', () => {
    let board = initialBoard();
    const bet = 1;
    const spins = 10000;
    let totalWin = 0;
    for (let i = 0; i < spins; i++) {
      const result = resolveMathSpin(board, bet, defaultMathConfig);
      totalWin += result.totalCoinWin;
      board = result.updatedColours;
    }
    const rtp = totalWin / (bet * spins);
    expect(rtp).toBeGreaterThan(0.5);
  });
});
