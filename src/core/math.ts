import { Colour, Symbol, SymbolType } from './types';
import { MathConfig } from '@config/mathConfig';

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

export const getMeanCoinMultiplier = (config: MathConfig): number => {
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

export const sampleCoinMultiplier = (config: MathConfig, rng: () => number): number => {
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

export const getCoinProbabilityForState = (
  greenCount: number,
  orangeCount: number,
  config: MathConfig
): number => {
  const { baseRtp, matchProbability, maxCoinProbability } = config;
  const mu = getMeanCoinMultiplier(config);
  const mGreen = getColourMultiplier('GREEN', greenCount, config);
  const mOrange = getColourMultiplier('ORANGE', orangeCount, config);
  const denom = matchProbability * mu * (greenCount * mGreen + orangeCount * mOrange);
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
  const symbols: Symbol[] = [];
  let totalCoinWin = 0;
  const lastSpinPayouts: { index: number; amount: number }[] = [];

  for (let idx = 0; idx < totalTiles; idx++) {
    const tileColour = boardColours[idx];
    const roll = rng();
    if (roll < pCoin) {
      const matchesTile = rng() < config.matchProbability;
      const coinColour: Colour = matchesTile ? tileColour : tileColour === 'GREEN' ? 'ORANGE' : 'GREEN';
      const coinMultiplier = sampleCoinMultiplier(config, rng);
      const symbol: Symbol = { type: 'COIN', colour: coinColour, value: coinMultiplier };
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
      symbols.push({ type: 'EMPTY' });
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

export const hasAnimatedSymbols = (symbols: Symbol[]): boolean =>
  symbols.some((s) => s.type !== ('EMPTY' as SymbolType));
