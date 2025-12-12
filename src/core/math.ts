import { Colour, CoinValueDistribution, Symbol, SymbolType } from './types';
import { MathConfig, OppositeCoinCountWeight } from '@config/mathConfig';

const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x));

export const getColourMultiplier = (colour: Colour, count: number, config: MathConfig): number => {
  const steps = config.colourMultipliers[colour] || [];
  let best = 1;
  steps.forEach((step) => {
    if (count >= step.tilesRequired && step.multiplier >= best) {
      best = step.multiplier;
    }
  });
  return best;
};

const weightedMean = (entries: { value: number; weight: number }[]): number => {
  let weightSum = 0;
  let weightedSum = 0;
  entries.forEach((entry) => {
    weightSum += entry.weight;
    weightedSum += entry.value * entry.weight;
  });
  if (weightSum <= 0) return 1;
  return weightedSum / weightSum;
};

const getMeanCoinMultiplierForColour = (colour: Colour, config: MathConfig): number => {
  const dist: CoinValueDistribution | undefined = config.coinValueDistribution;
  if (dist) {
    return weightedMean(dist[colour].onOwn);
  }
  return weightedMean(config.coinMultipliers);
};

const sampleCoinMultiplier = (
  config: MathConfig,
  rng: () => number,
  colour: Colour,
  onOwn: boolean
): number => {
  const dist: CoinValueDistribution | undefined = config.coinValueDistribution;
  if (dist) {
    const entries = onOwn ? dist[colour].onOwn : dist[colour].onOpposite;
    const total = entries.reduce((sum, c) => sum + c.weight, 0);
    if (total <= 0) return 1;
    let t = rng() * total;
    for (const entry of entries) {
      if (t < entry.weight) return entry.value;
      t -= entry.weight;
    }
    return entries[entries.length - 1].value;
  }

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

const sampleOppositeCoinCount = (
  weights: OppositeCoinCountWeight[],
  rng: () => number
): number => {
  if (!weights.length) return 0;
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return 0;
  let t = rng() * total;
  for (const entry of weights) {
    if (t < entry.weight) return entry.count;
    t -= entry.weight;
  }
  return weights[weights.length - 1].count;
};

export const getCoinProbabilityForState = (
  greenCount: number,
  orangeCount: number,
  config: MathConfig
): number => {
  const { baseRtp, maxCoinProbability } = config;
  const muGreen = getMeanCoinMultiplierForColour('GREEN', config);
  const muOrange = getMeanCoinMultiplierForColour('ORANGE', config);
  const mGreen = getColourMultiplier('GREEN', greenCount, config);
  const mOrange = getColourMultiplier('ORANGE', orangeCount, config);
  const denom = greenCount * mGreen * muGreen + orangeCount * mOrange * muOrange;
  if (denom <= 0) return 0;
  const pCoin = baseRtp / denom;
  return clamp(pCoin, 0, maxCoinProbability);
};

export interface MathSpinResolution {
  symbols: Symbol[];
  updatedColours: Colour[];
  baseCounts: { GREEN: number; ORANGE: number };
  baseMultipliers: { GREEN: number; ORANGE: number };
  totalCoinWin: number;
  lastSpinPayouts: { index: number; amount: number }[];
}

export const resolveMathSpin = (
  boardColours: Colour[],
  bet: number,
  config: MathConfig,
  rng: () => number = Math.random
): MathSpinResolution => {
  const totalTiles = config.rows * config.cols;
  if (boardColours.length !== totalTiles) {
    throw new Error('boardColours length does not match rows * cols');
  }

  let greenCount = 0;
  let orangeCount = 0;
  boardColours.forEach((c) => {
    if (c === 'GREEN') greenCount += 1;
    else orangeCount += 1;
  });

  const baseCounts = { GREEN: greenCount, ORANGE: orangeCount } as const;
  const baseMultipliers = {
    GREEN: getColourMultiplier('GREEN', greenCount, config),
    ORANGE: getColourMultiplier('ORANGE', orangeCount, config)
  };

  const pCoin = getCoinProbabilityForState(greenCount, orangeCount, config);
  const updatedColours: Colour[] = [...boardColours];
  const symbols: Symbol[] = Array(totalTiles);
  let totalCoinWin = 0;
  const lastSpinPayouts: { index: number; amount: number }[] = [];

  // Place paying coins on matching colours
  for (let idx = 0; idx < totalTiles; idx++) {
    const tileColour = boardColours[idx];
    if (rng() < pCoin) {
      const coinMultiplier = sampleCoinMultiplier(config, rng, tileColour, true);
      const symbol: Symbol = { type: 'COIN', colour: tileColour, value: coinMultiplier };
      symbols[idx] = symbol;
      const boardMultiplier = baseMultipliers[tileColour];
      const win = bet * coinMultiplier * boardMultiplier;
      totalCoinWin += win;
      lastSpinPayouts.push({ index: idx, amount: win });
    }
  }

  // Place opposite-colour coins using fixed count distribution
  const emptyIndices: number[] = [];
  for (let idx = 0; idx < totalTiles; idx++) {
    if (!symbols[idx]) emptyIndices.push(idx);
  }

  const targetOppositeCoins = sampleOppositeCoinCount(config.oppositeCoinCountWeights, rng);
  const oppositeCoinsToPlace = Math.min(targetOppositeCoins, emptyIndices.length);

  // Shuffle empty indices to pick random slots
  for (let i = emptyIndices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [emptyIndices[i], emptyIndices[j]] = [emptyIndices[j], emptyIndices[i]];
  }
  const selectedOpposites = new Set<number>(emptyIndices.slice(0, oppositeCoinsToPlace));

  selectedOpposites.forEach((idx) => {
    const tileColour = boardColours[idx];
    const coinColour: Colour = tileColour === 'GREEN' ? 'ORANGE' : 'GREEN';
    const coinMultiplier = sampleCoinMultiplier(config, rng, coinColour, false);
    symbols[idx] = { type: 'COIN', colour: coinColour, value: coinMultiplier };
    updatedColours[idx] = coinColour;
  });

  for (let idx = 0; idx < totalTiles; idx++) {
    if (!symbols[idx]) symbols[idx] = { type: 'EMPTY' };
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

export const hasAnimatedSymbols = (symbols: Symbol[]): boolean =>
  symbols.some((s) => s.type !== ('EMPTY' as SymbolType));
