import { Board } from './Board';
import { SymbolSource, countSymbolType } from './SymbolSource';
import {
  CoinSymbol,
  GameConfig,
  GameState,
  Multipliers,
  Symbol,
  SymbolType
} from './types';

const ROWS = 5;
const COLS = 6;
const TILE_COUNT = ROWS * COLS;

export class GameEngine {
  private board: Board;
  private config: GameConfig;
  private symbolSource: SymbolSource;
  private state: GameState;

  constructor(config: GameConfig, symbolSource: SymbolSource) {
    this.config = config;
    this.symbolSource = symbolSource;
    this.board = new Board();
    this.state = this.initState();
  }

  public getState(): GameState {
    return {
      ...this.state,
      tiles: this.board.getTiles()
    };
  }

  public setBet(bet: number): void {
    const clamped = Math.max(this.config.bet.min, Math.min(this.config.bet.max, bet));
    this.state.bet = clamped;
  }

  public startNewRound(): GameState {
    if (this.state.roundActive) {
      return this.getState();
    }
    if (this.state.balance < this.state.bet) {
      throw new Error('Insufficient balance to start round.');
    }

    this.state.balance -= this.state.bet;
    this.state.freeSpinActive = false;
    this.state.remainingSpins = 1;
    this.state.maxSpinsPerRound = 1;
    this.state.totalWin = 0;
    this.state.lastSpinWin = 0;
    this.state.lastRoundWin = undefined;
    this.state.lastSpinPayouts = [];
    this.state.roundActive = true;
    this.board.clearSymbols();
    this.updateTileCountsAndMultipliers();
    return this.getState();
  }

  public spin(): GameState {
    if (!this.state.roundActive) {
      this.startNewRound();
    }

    if (this.state.remainingSpins <= 0) {
      throw new Error('No spins remaining.');
    }

    this.state.remainingSpins -= 1;
    this.state.lastSpinWin = 0;
    this.state.lastSpinPayouts = [];

    const symbols = this.symbolSource.generateSymbols(ROWS, COLS);
    this.applySymbolsToBoard(symbols);
    this.resolveSymbols(symbols);
    this.applySpinResetRules(symbols);
    this.updateTileCountsAndMultipliers();
    this.finishRoundIfNeeded();
    return this.getState();
  }

  private initState(): GameState {
    const counts = this.board.countColours();
    return {
      tiles: this.board.getTiles(),
      balance: this.config.startingBalance,
      bet: this.config.bet.defaultBet,
      totalWin: 0,
      lastSpinWin: 0,
      lastRoundWin: undefined,
      lastSpinPayouts: [],
      freeSpinActive: false,
      remainingSpins: 0,
      maxSpinsPerRound: 1,
      greenTileCount: counts.GREEN,
      orangeTileCount: counts.ORANGE,
      multipliers: this.calculateMultipliers(counts),
      roundActive: false
    };
  }

  private applySymbolsToBoard(symbols: Symbol[]): void {
    if (symbols.length !== TILE_COUNT) {
      throw new Error('Symbol count must match tile count.');
    }
    const tiles = this.board.getTiles();
    for (let i = 0; i < TILE_COUNT; i++) {
      this.board.setTileSymbol(tiles[i].id, symbols[i]);
    }
  }

  private resolveSymbols(symbols: Symbol[]): void {
    this.applyCoins(symbols);
    this.applySoldiers();
    this.applyTanks(symbols);
  }

  private applyCoins(symbols: Symbol[]): void {
    const tiles = this.board.getTiles();
    symbols.forEach((symbol, index) => {
      if (symbol.type !== 'COIN') {
        return;
      }
      const tile = tiles[index];
      if (!tile) {
        return;
      }
      const onOwnColour = tile.colour === symbol.colour;
      const coinValue = symbol.value ?? this.pickCoinValue(symbol.colour, onOwnColour);
      // Persist the effective coin value on the board symbol so UI can display it.
      this.board.setTileSymbol(tile.id, { ...symbol, value: coinValue });
      if (tile.colour === symbol.colour) {
        const multiplier = this.state.multipliers[symbol.colour];
        const win = this.state.bet * multiplier * coinValue;
        this.state.totalWin += win;
        this.state.lastSpinWin = (this.state.lastSpinWin ?? 0) + win;
        this.state.lastSpinPayouts?.push({ tileId: tile.id, amount: win });
      } else {
        this.board.setTileColour(tile.id, symbol.colour);
      }
    });
  }

  private applySoldiers(): void {
    const tiles = this.board.getTiles();
    tiles.forEach((tile) => {
      const symbol = tile.symbol;
      if (!symbol || symbol.type !== 'SOLDIER') return;
      const adjacents = this.board.getAdjacent(tile.id);
      if (tile.colour === symbol.colour) {
        const target =
          adjacents.find((t) => t.colour !== symbol.colour) || adjacents.find(() => true);
        if (target) {
          this.board.setTileColour(target.id, symbol.colour);
        }
      } else {
        this.board.setTileColour(tile.id, symbol.colour);
      }
    });
  }

  private applyTanks(symbols: Symbol[]): void {
    const tiles = this.board.getTiles();
    symbols.forEach((symbol, index) => {
      if (symbol.type !== 'TANK') return;
      const tile = tiles[index];
      if (!tile) return;
      const targetRow = tile.row;
      tiles
        .filter((t) => t.row === targetRow && t.col >= tile.col)
        .forEach((t) => this.board.setTileColour(t.id, symbol.colour));
    });
  }

  private updateTileCountsAndMultipliers(): void {
    const counts = this.board.countColours();
    this.state.greenTileCount = counts.GREEN;
    this.state.orangeTileCount = counts.ORANGE;
    this.state.multipliers = this.calculateMultipliers(counts);
  }

  private calculateMultipliers(counts: { GREEN: number; ORANGE: number }): Multipliers {
    const result: Multipliers = { GREEN: 1, ORANGE: 1 };
    (['GREEN', 'ORANGE'] as const).forEach((colour) => {
      const thresholds = [...this.config.multipliers[colour]].sort(
        (a, b) => a.tilesRequired - b.tilesRequired
      );
      const applicable = thresholds.filter((t) => counts[colour] >= t.tilesRequired);
      const best = applicable.length ? applicable[applicable.length - 1].multiplier : 1;
      result[colour] = best;
    });
    return result;
  }

  private applySpinResetRules(symbols: Symbol[]): void {
    const freeSpinConfig = this.config.freeSpinMode;
    if (freeSpinConfig?.enabled && freeSpinConfig.triggerSymbol) {
      const triggerCount = countSymbolType(symbols, freeSpinConfig.triggerSymbol as SymbolType);
      if (triggerCount > 0) {
        this.state.freeSpinActive = true;
        this.state.maxSpinsPerRound = freeSpinConfig.spinsPerRound;
        this.state.remainingSpins = freeSpinConfig.spinsPerRound;
      }
    }

    if (!this.state.freeSpinActive) {
      // No free spins; round completes immediately
      this.state.remainingSpins = 0;
      return;
    }

    let updatedSpins = this.state.remainingSpins;
    this.config.spinResetRules.forEach((rule) => {
      const count = countSymbolType(symbols, rule.symbolType as SymbolType);
      if (count >= rule.minCount) {
        const target = Math.min(rule.resetToSpins, this.state.maxSpinsPerRound);
        updatedSpins = Math.max(updatedSpins, target);
      }
    });
    this.state.remainingSpins = updatedSpins;
  }

  private pickCoinValue(colour: 'GREEN' | 'ORANGE', onOwn: boolean): number {
    const dist = onOwn
      ? this.config.coinValueDistribution[colour].onOwn
      : this.config.coinValueDistribution[colour].onOpposite;
    const total = dist.reduce((sum, c) => sum + c.weight, 0);
    let roll = Math.random() * total;
    for (const entry of dist) {
      if (roll < entry.weight) {
        return entry.value;
      }
      roll -= entry.weight;
    }
    return dist[dist.length - 1].value;
  }

  private finishRoundIfNeeded(): void {
    if (this.state.remainingSpins > 0) {
      // If not in free spins, a single spin ends the round immediately
      if (!this.state.freeSpinActive) {
        this.state.remainingSpins = 0;
      } else {
        return;
      }
    }
    this.state.lastRoundWin = this.state.totalWin;
    this.state.balance += this.state.totalWin;
    this.state.totalWin = 0;
    this.state.freeSpinActive = false;
    this.state.maxSpinsPerRound = 1;
    this.state.roundActive = false;
  }
}
