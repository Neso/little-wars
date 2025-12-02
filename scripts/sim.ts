import { resolveMathSpin } from '../src/core/math';
import { defaultMathConfig } from '../src/config/mathConfig';
import { Colour } from '../src/core/types';

interface SimArgs {
  spins: number;
  bet: number;
  seed: number;
  json: boolean;
}

const parseArgs = (): SimArgs => {
  const args = process.argv.slice(2);
  const getNum = (flag: string, fallback: number): number => {
    const idx = args.indexOf(flag);
    if (idx >= 0 && idx + 1 < args.length) {
      const v = Number(args[idx + 1]);
      if (!Number.isNaN(v) && v > 0) return v;
    }
    return fallback;
  };
  return {
    spins: getNum('--spins', 10000),
    bet: getNum('--bet', 1),
    seed: getNum('--seed', Date.now()),
    json: args.includes('--json')
  };
};

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const run = (): void => {
  const { spins, bet, seed, json } = parseArgs();
  const rng = mulberry32(seed);
  const cfg = defaultMathConfig;
  const totalTiles = cfg.rows * cfg.cols;
  let board: Colour[] = Array.from({ length: totalTiles }, (_v, idx) =>
    idx < totalTiles / 2 ? 'GREEN' : 'ORANGE'
  );

  let totalWin = 0;
  let coins = 0;
  let matches = 0;
  let opposites = 0;

  for (let i = 0; i < spins; i++) {
    const before = [...board];
    const result = resolveMathSpin(board, bet, cfg, rng);
    board = result.updatedColours;
    totalWin += result.totalCoinWin;
    result.symbols.forEach((s, idx) => {
      if (s.type !== 'COIN') return;
      coins += 1;
      if (s.colour === before[idx]) matches += 1;
      else opposites += 1;
    });
  }

  const greens = board.filter((c) => c === 'GREEN').length;
  const oranges = board.length - greens;
  const totalBet = spins * bet;
  const rtp = totalWin / totalBet;
  const report = {
    spins,
    bet,
    seed,
    totalBet,
    totalWin,
    rtp,
    coins,
    matchRate: coins ? matches / coins : 0,
    oppositeRate: coins ? opposites / coins : 0,
    finalTiles: { GREEN: greens, ORANGE: oranges }
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('--- Little Wars Monte Carlo ---');
    console.log(`spins: ${spins}, bet: ${bet}, seed: ${seed}`);
    console.log(`totalBet: ${totalBet.toFixed(2)}, totalWin: ${totalWin.toFixed(2)}, RTP: ${(rtp * 100).toFixed(2)}%`);
    console.log(`coins: ${coins}, matchRate: ${(report.matchRate * 100).toFixed(2)}%, oppositeRate: ${(report.oppositeRate * 100).toFixed(2)}%`);
    console.log(`final tiles -> GREEN: ${greens}, ORANGE: ${oranges}`);
  }
};

run();
