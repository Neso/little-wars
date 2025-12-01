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

const TILE_COUNT = 30;

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
    this.state.remainingSpins = this.config.spinsPerRound;
    this.state.maxSpinsPerRound = this.config.spinsPerRound;
    this.state.totalWin = 0;
    this.state.lastSpinWin = 0;
    this.state.lastRoundWin = undefined;
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

    const symbols = this.symbolSource.generateSymbols(TILE_COUNT);
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
      remainingSpins: 0,
      maxSpinsPerRound: this.config.spinsPerRound,
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
      if (tile.colour === symbol.colour) {
        const multiplier = this.state.multipliers[symbol.colour];
        const win = this.state.bet * multiplier * symbol.value;
        this.state.totalWin += win;
        this.state.lastSpinWin = (this.state.lastSpinWin ?? 0) + win;
      } else {
        this.board.setTileColour(tile.id, symbol.colour);
      }
    });
  }

  private applySoldiers(): void {
    // Soldiers behave as EMPTY for now. Hook for future effects.
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

  private finishRoundIfNeeded(): void {
    if (this.state.remainingSpins > 0) {
      return;
    }
    this.state.lastRoundWin = this.state.totalWin;
    this.state.balance += this.state.totalWin;
    this.state.totalWin = 0;
    this.state.roundActive = false;
  }
}
