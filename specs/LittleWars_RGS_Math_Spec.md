
# Little Wars – Math & Dummy RGS Specification

## 1. Game Math Overview
- Grid: **6×5 = 30 tiles**
- Each tile has a **colour**: GREEN or ORANGE  
- Initial board: **15 GREEN, 15 ORANGE**

### 1.1 Symbols
- EMPTY  
- GREEN_COIN  
- ORANGE_COIN  

Coins only pay when landing on a tile of the same colour.

### 1.2 Coin Multipliers
Current multipliers:
```
1, 2, 3, 25, 50, 100
```
Extendable via config.

### 1.3 Colour-Based Multipliers
```json
{
  "multipliers": {
    "GREEN": [
      { "tilesRequired": 0, "multiplier": 1 },
      { "tilesRequired": 16, "multiplier": 2 },
      { "tilesRequired": 18, "multiplier": 3 },
      { "tilesRequired": 20, "multiplier": 5 },
      { "tilesRequired": 25, "multiplier": 10 }
    ],
    "ORANGE": [
      { "tilesRequired": 0, "multiplier": 1 },
      { "tilesRequired": 14, "multiplier": 2 },
      { "tilesRequired": 20, "multiplier": 3 },
      { "tilesRequired": 25, "multiplier": 5 },
      { "tilesRequired": 30, "multiplier": 10 }
    ]
  }
}
```

### 1.4 Win Formula
```
win = bet × coinMultiplier × boardColorMultiplier
```

---

## 2. RTP Model (Target 95%)

Expected win per tile:
```
E = p_coin × matchProbability × meanCoinMultiplier × colorMultiplier
```

Total expectation for board state:
```
E_total = G × E_green + O × E_orange
```

Enforcing RTP:
```
p_coin = 0.95 / ( matchProbability × μ × (G*M_G + O*M_O) )
```

---

## 3. Per‑Spin Algorithm
1. Count GREEN + ORANGE tiles  
2. Compute board multipliers  
3. Compute μ (weighted mean coin multiplier)  
4. Compute p_coin  
5. For each tile:
   - Roll EMPTY vs COIN  
   - If COIN:
     - Determine if coin colour matches tile  
     - Sample coin multiplier  
     - Pay if matching  
     - Flip tile if opposite  
6. Output win + grid + updated board

---

## 4. TypeScript Code (math.ts)
```ts
// math.ts

export type Color = "GREEN" | "ORANGE";

export type SymbolType = "EMPTY" | "GREEN_COIN" | "ORANGE_COIN";

export interface TileMultiplierStep {
    tilesRequired: number;
    multiplier: number;
}

export interface ColorMultiplierConfig {
    [color: string]: TileMultiplierStep[];
}

export interface CoinMultiplierConfigEntry {
    value: number;   // e.g. 1, 2, 3, 25, 50, 100
    weight: number;  // relative weight, not necessarily normalised
}

export interface RgsMathConfig {
    baseRtp: number; // e.g. 0.95
    rows: number;    // 5
    cols: number;    // 6
    coinMultipliers: CoinMultiplierConfigEntry[];
    colorMultipliers: ColorMultiplierConfig;
    matchProbability: number; // r, default 1.0
    maxCoinProbability?: number; // safety cap, e.g. 0.9
}

export interface CoinSymbol {
    type: SymbolType;
    multiplier?: number; // coin multiplier, only present for coins
}

export interface SpinResult {
    totalWin: number;
    coinGrid: CoinSymbol[][];
    updatedBoardColors: Color[];
}

/**
 * Utility: clamp a number into [min, max].
 */
function clamp(x: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, x));
}

/**
 * Get board-level multiplier for a colour given its tile count.
 * Uses the highest step where tilesRequired <= count.
 */
export function getColorMultiplier(
    color: Color,
    count: number,
    config: RgsMathConfig
): number {
    const steps = config.colorMultipliers[color] || [];
    let best = 1;

    for (const step of steps) {
        if (count >= step.tilesRequired && step.multiplier >= best) {
            best = step.multiplier;
        }
    }

    return best;
}

/**
 * Compute mean coin multiplier μ from the configured weighted list.
 */
export function getMeanCoinMultiplier(config: RgsMathConfig): number {
    const entries = config.coinMultipliers;
    let weightSum = 0;
    let weightedValueSum = 0;

    for (const entry of entries) {
        weightSum += entry.weight;
        weightedValueSum += entry.value * entry.weight;
    }

    if (weightSum === 0) {
        // Fallback to avoid NaN; treat as 1x
        return 1;
    }

    return weightedValueSum / weightSum;
}

/**
 * Sample a coin multiplier from the configured weighted distribution.
 */
export function sampleCoinMultiplier(
    config: RgsMathConfig,
    rng: () => number
): number {
    const entries = config.coinMultipliers;
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight <= 0) {
        return 1;
    }

    let t = rng() * totalWeight;
    for (const entry of entries) {
        if (t < entry.weight) {
            return entry.value;
        }
        t -= entry.weight;
    }

    // Numeric safety fallback
    return entries[entries.length - 1].value;
}

/**
 * Compute dynamic coin probability p_coin for this board state,
 * given the desired base RTP.
 *
 * E[win]/bet = baseRtp = p_coin * r * μ * [G*M_G + O*M_O]
 */
export function getCoinProbabilityForState(
    greenCount: number,
    orangeCount: number,
    config: RgsMathConfig
): number {
    const { baseRtp, matchProbability, maxCoinProbability = 0.9 } = config;

    const mu = getMeanCoinMultiplier(config);
    const M_G = getColorMultiplier("GREEN", greenCount, config);
    const M_O = getColorMultiplier("ORANGE", orangeCount, config);

    const denom = matchProbability * mu * (greenCount * M_G + orangeCount * M_O);

    if (denom <= 0) {
        // No meaningful way to compute; fallback to 0 (no coins)
        return 0;
    }

    const pCoin = baseRtp / denom;

    return clamp(pCoin, 0, maxCoinProbability);
}

/**
 * Resolve a single spin.
 *
 * boardColors: array of length rows*cols, row-major.
 */
export function resolveSpin(
    boardColors: Color[],
    bet: number,
    config: RgsMathConfig,
    rng: () => number = Math.random
): SpinResult {
    const totalTiles = config.rows * config.cols;
    if (boardColors.length !== totalTiles) {
        throw new Error("boardColors length does not match rows * cols");
    }

    // 1. Count tiles by colour
    let greenCount = 0;
    let orangeCount = 0;

    for (const c of boardColors) {
        if (c === "GREEN") greenCount++;
        else orangeCount++;
    }

    // 2. Colour multipliers
    const M_G = getColorMultiplier("GREEN", greenCount, config);
    const M_O = getColorMultiplier("ORANGE", orangeCount, config);

    // 3. Coin probability for this state
    const pCoin = getCoinProbabilityForState(
        greenCount,
        orangeCount,
        config
    );

    const matchProb = config.matchProbability;

    const coinGrid: CoinSymbol[][] = [];
    const updatedBoardColors: Color[] = [...boardColors];

    let totalWin = 0;
    let index = 0;

    for (let row = 0; row < config.rows; row++) {
        const rowSymbols: CoinSymbol[] = [];

        for (let col = 0; col < config.cols; col++, index++) {
            const tileColor = updatedBoardColors[index];
            let symbol: CoinSymbol = { type: "EMPTY" };

            const u = rng();
            if (u < pCoin) {
                // A coin will appear
                const u2 = rng();
                const coinMatchesTile = u2 < matchProb;

                let coinColor: Color;
                if (coinMatchesTile) {
                    coinColor = tileColor;
                } else {
                    coinColor = tileColor === "GREEN" ? "ORANGE" : "GREEN";
                }

                const coinMultiplier = sampleCoinMultiplier(config, rng);

                // Map color to symbol type
                let symbolType: SymbolType;
                if (coinColor === "GREEN") symbolType = "GREEN_COIN";
                else symbolType = "ORANGE_COIN";

                symbol = {
                    type: symbolType,
                    multiplier: coinMultiplier
                };

                // Determine payout
                if (coinColor === tileColor) {
                    const M_color = tileColor === "GREEN" ? M_G : M_O;
                    const winTile = bet * coinMultiplier * M_color;
                    totalWin += winTile;
                } else {
                    // Opposite-colour coin -> flips tile colour
                    updatedBoardColors[index] =
                        tileColor === "GREEN" ? "ORANGE" : "GREEN";
                }
            }

            rowSymbols.push(symbol);
        }

        coinGrid.push(rowSymbols);
    }

    return {
        totalWin,
        coinGrid,
        updatedBoardColors
    };
}
```

---

## 5. dummyRgs.ts

```ts
// dummyRgs.ts

import {
  Color,
  RgsMathConfig,
  SpinResult,
  resolveSpin
} from "./math";

export interface GameState {
  boardColors: Color[];
  balance: number;
}

export class DummyRgs {
  private config: RgsMathConfig;
  private state: GameState;

  constructor(config: RgsMathConfig, initialBalance: number) {
    this.config = config;

    // Initial 15/15 split (could be randomised if you like)
    const total = config.rows * config.cols;
    const initialBoard: Color[] = [];

    for (let i = 0; i < total; i++) {
      initialBoard.push(i < total / 2 ? "GREEN" : "ORANGE");
    }

    this.state = {
      boardColors: initialBoard,
      balance: initialBalance
    };
  }

  public getState(): GameState {
    return { ...this.state, boardColors: [...this.state.boardColors] };
  }

  public spin(bet: number): SpinResult {
    if (bet <= 0) {
      throw new Error("Bet must be positive");
    }
    if (this.state.balance < bet) {
      throw new Error("Insufficient balance");
    }

    // Deduct bet
    this.state.balance -= bet;

    // Resolve spin
    const spinResult = resolveSpin(
      this.state.boardColors,
      bet,
      this.config
    );

    // Apply win
    this.state.balance += spinResult.totalWin;

    // Update board for next spin
    this.state.boardColors = spinResult.updatedBoardColors;

    return spinResult;
  }
}

```
```ts
// config.ts

import { RgsMathConfig } from "./math";

export const defaultMathConfig: RgsMathConfig = {
    baseRtp: 0.95,
    rows: 5,
    cols: 6,
    matchProbability: 1.0,
    maxCoinProbability: 0.9,
    coinMultipliers: [
        { value: 1,   weight: 50 },
        { value: 2,   weight: 30 },
        { value: 3,   weight: 15 },
        { value: 25,  weight: 4 },
        { value: 50,  weight: 1 },
        { value: 100, weight: 0.5 }
    ],
    colorMultipliers: {
        GREEN: [
            { tilesRequired: 0,  multiplier: 1 },
            { tilesRequired: 16, multiplier: 2 },
            { tilesRequired: 18, multiplier: 3 },
            { tilesRequired: 20, multiplier: 5 },
            { tilesRequired: 25, multiplier: 10 }
        ],
        ORANGE: [
            { tilesRequired: 0,  multiplier: 1 },
            { tilesRequired: 14, multiplier: 2 },
            { tilesRequired: 20, multiplier: 3 },
            { tilesRequired: 25, multiplier: 5 },
            { tilesRequired: 30, multiplier: 10 }
        ]
    }
};
```

---

## 6. Example Config
```ts
export const defaultMathConfig = {
  baseRtp: 0.95,
  rows: 5,
  cols: 6,
  matchProbability: 1.0,
  maxCoinProbability: 0.9,
  coinMultipliers: [
    { value: 1, weight: 50 },
    { value: 2, weight: 30 },
    { value: 3, weight: 15 },
    { value: 25, weight: 4 },
    { value: 50, weight: 1 },
    { value: 100, weight: 0.5 }
  ],
  colorMultipliers: {
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
```

---

## 7. Output Format
```
{
  totalWin: number;
  coinGrid: CoinSymbol[][];
  updatedBoardColors: Color[];
}
```

---

## 8. Notes
- RTP is enforced dynamically per board state  
- System is extendable for additional multipliers  
- Supports tile conversions, volatility tuning via weights  
- Current build implements this math path in `LocalRgsClient` using `resolveMathSpin` (coins + flips only). Soldier and tank generation are stubbed for future activation; their animation/order hooks remain in the engine.  
- Default math config lives in `src/config/mathConfig.ts`; update there to tune RTP, multiplier steps, or coin weights.
