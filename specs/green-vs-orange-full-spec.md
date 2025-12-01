# Spec: Green vs Orange Slot Game

## 1. Overview

This document defines the **game design** and **technical spec (TypeScript)** for a slot-style game with a **6×5 grid** (6 columns × 5 rows, 30 tiles total). Tiles are owned by one of two colours: **Green** or **Orange**.

### Key ideas

- Player starts with a **balance** and places a **bet**.
- A round costs one bet and grants **N spins** (default: 3).
- The grid starts with **15 green tiles and 15 orange tiles**.
- On each spin, symbols **tumble down** into tiles.
- **Coins** pay based on tile colour, symbol colour, symbol value, and multiplier.
- **Soldiers** behave like empty symbols (for now).
- Game state + multipliers are configurable via JSON.

---

## 2. Game Rules & Mechanics

### 2.1 Board

- Grid: **6 columns × 5 rows = 30 tiles**
- Tile includes:
  - `colour`: GREEN or ORANGE
  - Base ownership at start: 15 green, 15 orange
- Visual opacity:
  - **100%** when idle
  - **30%** during tumbling animation

### 2.2 Symbols

#### Empty Symbol
- `type: EMPTY`
- No effect.

#### Coin Symbol
- `type: COIN`
- `colour: GREEN | ORANGE`
- `value: number`
- Behaviour:
  - If coin colour **≠ tile colour** → tile flips to coin colour.
  - If coin colour **== tile colour** → payout:
    ```
    payout = betAmount * multiplierForThatColour * coinValue
    ```

#### Soldier Symbol
- `type: SOLDIER`
- `colour: GREEN | ORANGE`
- Currently behaves as EMPTY.
- Future: configurable effects.
- Can reset spin depending on configuration.

---

### 2.3 Colours, Ownership & Multipliers

- Each tile is coloured **Green** or **Orange**.
- Top bar tracks tile ownership.
- Multipliers depend on JSON thresholds (ownedTiles → multiplier).

#### Example (per colour)
- 1x at 0–17
- 2x at 18+
- 3x at 20+
- 5x at 25+
- 10x at 30

UI shows:
- Tile count (`X/30`)
- Current multiplier (`Nx`)
- Next threshold

---

### 2.4 Spin Flow (Single Spin)

#### Pre-spin
- First spin deducts bet.
- Next spins are free within the round.

#### Tiles Dim
- Opacity → 30%.

#### Tumbling Reels
- Each tile gets a symbol (EMPTY, COIN, SOLDIER).
- Future RNG/server integration supported.

#### Tiles Restore
- Opacity → 100%.

#### Symbol Execution
1. **Coins**
2. **Soldiers**

Updates:
- Tile ownership
- Tile counters
- Multipliers
- Total win

#### Spin Reset Rules
- Configurable.
- If a qualifying symbol lands → reset to spin 1.
- Otherwise → progress toward losing spin.
- **3 losing spins** → end of round.

#### End of Round
- Add `totalWin` to balance.
- Reset:
  - totalWin = 0
  - spin counter (`1 of N`)
- Tile colours persist by default.

---

## 3. Configuration (JSON)

### 3.1 High-Level Schema

```ts
export interface MultiplierThreshold {
  tilesRequired: number;
  multiplier: number;
}

export type Colour = 'GREEN' | 'ORANGE';
export type SymbolType = 'EMPTY' | 'COIN' | 'SOLDIER';

export interface SpinResetRule {
  symbolType: SymbolType;
  minCount: number;
  resetToSpins: number;
}

export interface GameConfig {
  startingBalance: number;
  bet: {
    min: number;
    max: number;
    step: number;
    defaultBet: number;
  };
  spinsPerRound: number;
  spinResetRules: SpinResetRule[];
  multipliers: {
    [colour in Colour]: MultiplierThreshold[];
  };
  symbolDistribution: {
    empty: number;    // probability 0-1
    coin: number;     // probability 0-1
    soldier: number;  // probability 0-1
  };
  coinValueDistribution: {
    GREEN: { value: number; weight: number }[];  // weights normalized internally
    ORANGE: { value: number; weight: number }[];
  };
}
```

### 3.2 Example `config.json`

```json
{
  "startingBalance": 1000,
  "bet": {
    "min": 1,
    "max": 100,
    "step": 10,
    "defaultBet": 1
  },
  "spinsPerRound": 3,
  "spinResetRules": [
    { "symbolType": "COIN", "minCount": 1, "resetToSpins": 1 },
    { "symbolType": "SOLDIER", "minCount": 1, "resetToSpins": 1 }
  ],
  "symbolDistribution": {
    "empty": 0.7,
    "coin": 0.15,
    "soldier": 0.15
  },
  "coinValueDistribution": {
    "GREEN": [
      { "value": 1, "weight": 0.3 },
      { "value": 2, "weight": 0.25 },
      { "value": 3, "weight": 0.25 },
      { "value": 25, "weight": 0.1 },
      { "value": 50, "weight": 0.05 },
      { "value": 100, "weight": 0.05 }
    ],
    "ORANGE": [
      { "value": 1, "weight": 0.3 },
      { "value": 2, "weight": 0.25 },
      { "value": 3, "weight": 0.25 },
      { "value": 25, "weight": 0.1 },
      { "value": 50, "weight": 0.05 },
      { "value": 100, "weight": 0.05 }
    ]
  },
  "multipliers": {
    "GREEN": [
      { "tilesRequired": 0, "multiplier": 1 },
      { "tilesRequired": 18, "multiplier": 2 },
      { "tilesRequired": 20, "multiplier": 3 },
      { "tilesRequired": 25, "multiplier": 5 },
      { "tilesRequired": 30, "multiplier": 10 }
    ],
    "ORANGE": [
      { "tilesRequired": 0, "multiplier": 1 },
      { "tilesRequired": 18, "multiplier": 2 },
      { "tilesRequired": 20, "multiplier": 3 },
      { "tilesRequired": 25, "multiplier": 5 },
      { "tilesRequired": 30, "multiplier": 10 }
    ]
  }
}
```

---

## 4. Technical Architecture (TypeScript)

### 4.1 Modules

- **core/**
  - GameEngine
  - Board
  - Tile
  - SymbolFactory
  - RNG/server integration (future)
- **ui/**
  - MainUI
  - BetController
  - SpinController
  - BalanceController
  - TotalWinController
  - TopBar
  - GameMachine
- **config/**
  - GameConfigLoader
- **net/**
  - GameServerClient (stub)

---

## 4.2 Data Models

```ts
export type Colour = 'GREEN' | 'ORANGE';
export type SymbolType = 'EMPTY' | 'COIN' | 'SOLDIER';

export interface BaseSymbol { type: SymbolType; }

export interface EmptySymbol extends BaseSymbol { type: 'EMPTY'; }

export interface CoinSymbol extends BaseSymbol {
  type: 'COIN';
  colour: Colour;
  value: number;
}

export interface SoldierSymbol extends BaseSymbol {
  type: 'SOLDIER';
  colour: Colour;
}

export type Symbol = EmptySymbol | CoinSymbol | SoldierSymbol;

export interface Tile {
  id: string;
  row: number;
  col: number;
  colour: Colour;
  symbol: Symbol | null;
}

export interface GameState {
  tiles: Tile[];
  balance: number;
  bet: number;
  totalWin: number;
  lastSpinWin?: number;
  remainingSpins: number;
  maxSpinsPerRound: number;
  greenTileCount: number;
  orangeTileCount: number;
  multipliers: { GREEN: number; ORANGE: number };
}
```

---

## 4.3 GameEngine

Responsibilities:

- Manage state  
- Apply config  
- Handle spin logic  
- Execute symbols  
- Update multipliers  
- Determine spin reset  
- Handle round lifecycle  

```ts
export class GameEngine {
  private state: GameState;
  private config: GameConfig;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.initState();
  }

  private initState(): GameState { /* ... */ }

  public getState(): GameState { return this.state; }

  public setBet(bet: number): void { /* clamp */ }

  public startNewRound(): void { /* deduct bet, init spins */ }

  public spin(): GameState {
    /* full spin flow */
  }

  private generateSymbolsForBoard(): Symbol[] {}
  private applyCoins(): void {}
  private applySoldiers(): void {}
  private updateTileCountsAndMultipliers(): void {}
  private applySpinResetRules(symbols: Symbol[]): void {}

  public isRoundActive(): boolean {}
}
```

---

## 5. UI Structure

### 5.1 MainUI

```ts
export class MainUI {
  private engine: GameEngine;

  constructor(engine: GameEngine) { /* init */ }

  private handleSpin(): void { /* round + spin */ }

  private syncUI(state: GameState): void { /* push updates */ }
}
```

### 5.2 BetController

```ts
export class BetController {
  private bet: number;
  public update(bet: number): void {}
}
```

### 5.3 SpinController

```ts
export interface SpinState {
  remainingSpins: number;
  maxSpins: number;
}

export class SpinController {
  public onSpin?: () => void;
  public updateSpinsState(state: SpinState): void {}
}
```

### 5.4 BalanceController / TotalWinController

```ts
export class BalanceController {
  public update(balance: number): void {}
}

export class TotalWinController {
  public update(totalWin: number): void {}
}
```

### 5.5 TopBar

```ts
export interface TopBarState {
  greenTiles: number;
  orangeTiles: number;
  multipliers: { GREEN: number; ORANGE: number };
  maxTiles: number;
  nextThresholds?: { GREEN?: number; ORANGE?: number };
}
```

### 5.6 GameMachine

```ts
export class GameMachine {
  public setOpacity(dimmed: boolean): void {}
  public update(tiles: Tile[]): void {}
}
```

---

## 6. Remote Server Integration

### 6.1 Interface

```ts
export interface GameServerClient {
  getSpinOutcome(state: GameState): Promise<Symbol[]>;
  syncGameState(state: GameState): Promise<void>;
}
```

---

## 7. Acceptance Criteria

- 6×5 grid
- Correct multipliers
- Correct coin behaviour
- Correct tile ownership updates
- Correct spin reset logic

---

## 8. Project Setup (Implementation Notes)

- Tooling: **TypeScript + Vite** for dev/build, **Vitest** for unit tests, **Pixi.js** for rendering, **Howler.js** for audio stubs.
- Entry: `src/main.ts` bootstraps the `GameEngine` with the JSON config and hooks `MainUI`.
- Core modules live under `src/core` (engine, board, symbol source, types). UI scaffolding sits in `src/ui`, rendering helpers in `src/render`, audio stubs in `src/audio`, and configuration in `src/config`.
- Configurable thresholds and spin reset rules live in `src/config/config.json`; keep multipliers sorted by `tilesRequired`.
- Symbol PAR reel probabilities live in `config.json` under `symbolDistribution`. Default is 70% EMPTY, 15% COIN, 15% SOLDIER; values must sum to 1.
- Coin value probabilities live in `coinValueDistribution` per colour; default weights align with 1 (30%), 2 (25%), 3 (25%), 25 (10%), 50 (5%), 100 (5%) for both GREEN and ORANGE. Weights are normalized internally.
- Rendering is responsive: the Pixi canvas resizes to its parent, and the 6×5 grid scales to fill available space while preserving aspect ratio.
- Tests live in `tests` and should favour deterministic symbol sources for predictable outcomes.
- HUD shows balance, total win, current spin win, bet, spins, tiles, and multipliers; top bar highlights tiles/multipliers, bottom bar carries other values and spin control. Cascading spins dim tiles and drop symbols per column; click on the grid to skip animation.
- Correct end-of-round behaviour
- Correct UI updating
- Bet constraints enforced

---

## 8. Extensibility

- Soldier powers
- New symbol types
- RTP balancing
- Server RNG integration
