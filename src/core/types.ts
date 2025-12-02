export type Colour = 'GREEN' | 'ORANGE';
export type SymbolType = 'EMPTY' | 'COIN' | 'SOLDIER' | 'TANK';

export interface MultiplierThreshold {
  tilesRequired: number;
  multiplier: number;
}

export interface BetConfig {
  min: number;
  max: number;
  step: number;
  defaultBet: number;
}

export interface SpinResetRule {
  symbolType: SymbolType;
  minCount: number;
  resetToSpins: number;
}

export interface SymbolDistribution {
  empty: number;
  coin: number;
  soldier: number;
  tank?: number;
}

export interface CoinValueWeight {
  value: number;
  weight: number;
}

export interface CoinValueDistributionPerMatch {
  onOwn: CoinValueWeight[];
  onOpposite: CoinValueWeight[];
}

export type CoinValueDistribution = Record<Colour, CoinValueDistributionPerMatch>;

export interface TankReelWeights {
  GREEN: number[];
  ORANGE: number[];
}

export interface GameConfig {
  startingBalance: number;
  bet: BetConfig;
  spinsPerRound: number;
  spinResetRules: SpinResetRule[];
  multipliers: Record<Colour, MultiplierThreshold[]>;
  symbolDistribution: SymbolDistribution;
  coinValueDistribution: CoinValueDistribution;
  tankReelWeights: TankReelWeights;
  freeSpinMode?: {
    enabled: boolean;
    triggerSymbol?: SymbolType;
    spinsPerRound: number;
  };
  autoPlayDelayMs?: number;
}

export interface BaseSymbol {
  type: SymbolType;
}

export interface EmptySymbol extends BaseSymbol {
  type: 'EMPTY';
}

export interface CoinSymbol extends BaseSymbol {
  type: 'COIN';
  colour: Colour;
  value: number;
}

export interface SoldierSymbol extends BaseSymbol {
  type: 'SOLDIER';
  colour: Colour;
}

export interface TankSymbol extends BaseSymbol {
  type: 'TANK';
  colour: Colour;
}

export type Symbol = EmptySymbol | CoinSymbol | SoldierSymbol | TankSymbol;

export interface Tile {
  id: string;
  row: number;
  col: number;
  colour: Colour;
  symbol: Symbol | null;
}

export interface Multipliers {
  GREEN: number;
  ORANGE: number;
}

export interface GameState {
  tiles: Tile[];
  balance: number;
  bet: number;
  totalWin: number;
  roundWin: number;
  lastRoundWin?: number;
  lastSpinPayouts?: { tileId: string; amount: number }[];
  freeSpinActive: boolean;
  lastRoundWasFreeSpin?: boolean;
  initialCounts?: { GREEN: number; ORANGE: number };
  initialMultipliers?: Multipliers;
  remainingSpins: number;
  maxSpinsPerRound: number;
  greenTileCount: number;
  orangeTileCount: number;
  multipliers: Multipliers;
  roundActive: boolean;
}

export interface RgsSpinResult {
  tiles: Tile[];
  balance: number;
  totalWin: number;
  roundWin: number;
  lastRoundWin?: number;
  freeSpinActive: boolean;
  lastRoundWasFreeSpin?: boolean;
  initialCounts?: { GREEN: number; ORANGE: number };
  initialMultipliers?: Multipliers;
  remainingSpins: number;
  maxSpinsPerRound: number;
  lastSpinPayouts?: { tileId: string; amount: number }[];
}
