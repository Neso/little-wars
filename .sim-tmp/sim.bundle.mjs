// src/core/math.ts
var clamp = (x, min, max) => Math.max(min, Math.min(max, x));
var getColourMultiplier = (colour, count, config) => {
  const steps = config.colourMultipliers[colour] || [];
  let best = 1;
  steps.forEach((step) => {
    if (count >= step.tilesRequired && step.multiplier >= best) {
      best = step.multiplier;
    }
  });
  return best;
};
var getMeanCoinMultiplier = (config) => {
  const { coinMultipliers } = config;
  let weightSum = 0;
  let weightedSum = 0;
  coinMultipliers.forEach((entry) => {
    weightSum += entry.weight;
    weightedSum += entry.value * entry.weight;
  });
  if (weightSum <= 0) return 1;
  return weightedSum / weightSum;
};
var sampleCoinMultiplier = (config, rng) => {
  const { coinMultipliers } = config;
  const total = coinMultipliers.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return 1;
  let t = rng() * total;
  for (const entry of coinMultipliers) {
    if (t < entry.weight) return entry.value;
    t -= entry.weight;
  }
  return coinMultipliers[coinMultipliers.length - 1].value;
};
var getCoinProbabilityForState = (greenCount, orangeCount, config) => {
  const { baseRtp, matchProbability, maxCoinProbability } = config;
  const mu = getMeanCoinMultiplier(config);
  const mGreen = getColourMultiplier("GREEN", greenCount, config);
  const mOrange = getColourMultiplier("ORANGE", orangeCount, config);
  const denom = matchProbability * mu * (greenCount * mGreen + orangeCount * mOrange);
  if (denom <= 0) return 0;
  const pCoin = baseRtp / denom;
  return clamp(pCoin, 0, maxCoinProbability);
};
var resolveMathSpin = (boardColours, bet, config, rng = Math.random) => {
  const totalTiles = config.rows * config.cols;
  if (boardColours.length !== totalTiles) {
    throw new Error("boardColours length does not match rows * cols");
  }
  let greenCount = 0;
  let orangeCount = 0;
  boardColours.forEach((c) => {
    if (c === "GREEN") greenCount += 1;
    else orangeCount += 1;
  });
  const baseCounts = { GREEN: greenCount, ORANGE: orangeCount };
  const baseMultipliers = {
    GREEN: getColourMultiplier("GREEN", greenCount, config),
    ORANGE: getColourMultiplier("ORANGE", orangeCount, config)
  };
  const pCoin = getCoinProbabilityForState(greenCount, orangeCount, config);
  const updatedColours = [...boardColours];
  const symbols = [];
  let totalCoinWin = 0;
  const lastSpinPayouts = [];
  for (let idx = 0; idx < totalTiles; idx++) {
    const tileColour = boardColours[idx];
    const roll = rng();
    if (roll < pCoin) {
      const matchesTile = rng() < config.matchProbability;
      const coinColour = matchesTile ? tileColour : tileColour === "GREEN" ? "ORANGE" : "GREEN";
      const coinMultiplier = sampleCoinMultiplier(config, rng);
      const symbol = { type: "COIN", colour: coinColour, value: coinMultiplier };
      symbols.push(symbol);
      if (matchesTile) {
        const boardMultiplier = baseMultipliers[tileColour];
        const win = bet * coinMultiplier * boardMultiplier;
        totalCoinWin += win;
        lastSpinPayouts.push({ index: idx, amount: win });
      } else {
        updatedColours[idx] = coinColour;
      }
    } else {
      symbols.push({ type: "EMPTY" });
    }
  }
  return {
    symbols,
    updatedColours,
    baseCounts: { ...baseCounts },
    baseMultipliers,
    totalCoinWin,
    lastSpinPayouts
  };
};

// src/config/mathConfig.ts
var defaultMathConfig = {
  baseRtp: 0.95,
  rows: 5,
  cols: 6,
  matchProbability: 0.25,
  maxCoinProbability: 0.9,
  coinMultipliers: [
    { value: 1, weight: 50 },
    { value: 2, weight: 30 },
    { value: 3, weight: 15 },
    { value: 25, weight: 4 },
    { value: 50, weight: 1 },
    { value: 100, weight: 0.5 }
  ],
  colourMultipliers: {
    GREEN: [
      { tilesRequired: 0, multiplier: 1 },
      { tilesRequired: 16, multiplier: 2 },
      { tilesRequired: 18, multiplier: 3 },
      { tilesRequired: 20, multiplier: 5 },
      { tilesRequired: 25, multiplier: 10 }
    ],
    ORANGE: [
      { tilesRequired: 0, multiplier: 1 },
      { tilesRequired: 14, multiplier: 2 },
      { tilesRequired: 20, multiplier: 3 },
      { tilesRequired: 25, multiplier: 5 },
      { tilesRequired: 30, multiplier: 10 }
    ]
  }
};

// scripts/sim.ts
var parseArgs = () => {
  const args = process.argv.slice(2);
  const getNum = (flag, fallback) => {
    const idx = args.indexOf(flag);
    if (idx >= 0 && idx + 1 < args.length) {
      const v = Number(args[idx + 1]);
      if (!Number.isNaN(v) && v > 0) return v;
    }
    return fallback;
  };
  return {
    spins: getNum("--spins", 1e4),
    bet: getNum("--bet", 1),
    seed: getNum("--seed", Date.now()),
    json: args.includes("--json")
  };
};
var mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 1831565813;
    let x = Math.imul(t ^ t >>> 15, 1 | t);
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
};
var run = () => {
  const { spins, bet, seed, json } = parseArgs();
  const rng = mulberry32(seed);
  const cfg = defaultMathConfig;
  const totalTiles = cfg.rows * cfg.cols;
  let board = Array.from(
    { length: totalTiles },
    (_v, idx) => idx < totalTiles / 2 ? "GREEN" : "ORANGE"
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
      if (s.type !== "COIN") return;
      coins += 1;
      if (s.colour === before[idx]) matches += 1;
      else opposites += 1;
    });
  }
  const greens = board.filter((c) => c === "GREEN").length;
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
    console.log("--- Little Wars Monte Carlo ---");
    console.log(`spins: ${spins}, bet: ${bet}, seed: ${seed}`);
    console.log(`totalBet: ${totalBet.toFixed(2)}, totalWin: ${totalWin.toFixed(2)}, RTP: ${(rtp * 100).toFixed(2)}%`);
    console.log(`coins: ${coins}, matchRate: ${(report.matchRate * 100).toFixed(2)}%, oppositeRate: ${(report.oppositeRate * 100).toFixed(2)}%`);
    console.log(`final tiles -> GREEN: ${greens}, ORANGE: ${oranges}`);
  }
};
run();
