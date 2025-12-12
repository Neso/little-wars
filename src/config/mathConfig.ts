import { Colour, CoinValueDistribution } from '@core/types';

export interface CoinMultiplierWeight {
  value: number;
  weight: number;
}

export interface OppositeCoinCountWeight {
  count: number;
  weight: number;
}

export interface FeatureWeight {
  type: 'SOLDIER' | 'TANK' | 'BOMB' | 'AEROPLANE';
  weight: number;
}

export interface FeatureCountWeight {
  count: number;
  weight: number;
}

export interface MathConfig {
  baseRtp: number;
  rows: number;
  cols: number;
  matchProbability: number;
  maxCoinProbability: number;
  coinMultipliers: CoinMultiplierWeight[];
  coinValueDistribution: CoinValueDistribution;
  oppositeCoinCountWeights: OppositeCoinCountWeight[];
  featureCountWeights: FeatureCountWeight[];
  featureWeights: FeatureWeight[];
  featureColourWeights: Record<
    'SOLDIER' | 'TANK' | 'BOMB' | 'AEROPLANE',
    { GREEN: number; ORANGE: number }
  >;
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
  coinValueDistribution: {
    GREEN: {
      onOwn: [
        { value: 1, weight: 0.3 },
        { value: 2, weight: 0.25 },
        { value: 3, weight: 0.25 },
        { value: 25, weight: 0.1 },
        { value: 50, weight: 0.05 },
        { value: 100, weight: 0.05 }
      ],
      onOpposite: [
        { value: 1, weight: 0.1 },
        { value: 2, weight: 0.15 },
        { value: 3, weight: 0.25 },
        { value: 25, weight: 0.2 },
        { value: 50, weight: 0.2 },
        { value: 100, weight: 0.1 }
      ]
    },
    ORANGE: {
      onOwn: [
        { value: 1, weight: 0.3 },
        { value: 2, weight: 0.25 },
        { value: 3, weight: 0.25 },
        { value: 25, weight: 0.1 },
        { value: 50, weight: 0.05 },
        { value: 100, weight: 0.05 }
      ],
      onOpposite: [
        { value: 1, weight: 0.1 },
        { value: 2, weight: 0.15 },
        { value: 3, weight: 0.25 },
        { value: 25, weight: 0.2 },
        { value: 50, weight: 0.2 },
        { value: 100, weight: 0.1 }
      ]
    }
  },
  oppositeCoinCountWeights: [
    { count: 0, weight: 25 },
    { count: 1, weight: 25 },
    { count: 2, weight: 25 },
    { count: 3, weight: 15 },
    { count: 4, weight: 7 },
    { count: 5, weight: 3 }
  ],
  featureCountWeights: [
    { count: 1, weight: 60 },
    { count: 2, weight: 25 },
    { count: 3, weight: 10 },
    { count: 4, weight: 3 },
    { count: 5, weight: 2 }
  ],
  featureWeights: [
    { type: 'SOLDIER', weight: 50 },
    { type: 'TANK', weight: 20 },
    { type: 'BOMB', weight: 10 },
    { type: 'AEROPLANE', weight: 20 }
  ],
  featureColourWeights: {
    SOLDIER: { GREEN: 0.5, ORANGE: 0.5 },
    TANK: { GREEN: 0.5, ORANGE: 0.5 },
    BOMB: { GREEN: 0.5, ORANGE: 0.5 },
    AEROPLANE: { GREEN: 0.5, ORANGE: 0.5 }
  },
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
