import { Colour } from '@core/types';

export interface CoinMultiplierWeight {
  value: number;
  weight: number;
}

export interface MathConfig {
  baseRtp: number;
  rows: number;
  cols: number;
  matchProbability: number;
  maxCoinProbability: number;
  coinMultipliers: CoinMultiplierWeight[];
  colourMultipliers: Record<Colour, { tilesRequired: number; multiplier: number }[]>;
}

export const defaultMathConfig: MathConfig = {
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
