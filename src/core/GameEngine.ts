import { Board } from './Board';
import { RgsClient } from '@net/RgsClient';
import {
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
  private rgsClient: RgsClient;
  private state: GameState;

  constructor(config: GameConfig, rgsClient: RgsClient) {
    this.config = config;
    this.rgsClient = rgsClient;
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
    const levels = this.config.bet.levels ?? [];
    const nearest =
      levels.find((lvl) => lvl >= bet) ??
      (levels.length ? levels[levels.length - 1] : Math.max(this.config.bet.min, Math.min(this.config.bet.max, bet)));
    this.state.bet = nearest;
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
    this.state.lastRoundWasFreeSpin = false;
    this.state.remainingSpins = 1;
    this.state.maxSpinsPerRound = 1;
    this.state.totalWin = 0;
    this.state.roundWin = 0;
    this.state.lastRoundWin = undefined;
    this.state.lastSpinPayouts = [];
    this.state.roundActive = true;
    this.board.clearSymbols();
    this.updateTileCountsAndMultipliers();
    return this.getState();
  }

  public async spin(): Promise<GameState> {
    if (!this.state.roundActive) {
      this.startNewRound();
    }

    if (this.state.remainingSpins <= 0) {
      throw new Error('No spins remaining.');
    }

    this.state.remainingSpins -= 1;
    this.state.roundWin = 0;
    this.state.lastSpinPayouts = [];

    const result = await this.playWithRgs();
    this.applyRgsResult(result);
    return this.getState();
  }

  private initState(): GameState {
    const counts = this.board.countColours();
    return {
      tiles: this.board.getTiles(),
      balance: this.config.startingBalance,
      bet: this.config.bet.defaultBet,
      totalWin: 0,
      roundWin: 0,
      lastRoundWin: undefined,
      lastSpinPayouts: [],
      freeSpinActive: false,
      lastRoundWasFreeSpin: false,
      remainingSpins: 0,
      maxSpinsPerRound: 1,
      greenTileCount: counts.GREEN,
      orangeTileCount: counts.ORANGE,
      multipliers: this.calculateMultipliers(counts),
      roundActive: false
    };
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

  private async playWithRgs() {
    const result = await this.rgsClient.getSpin(this.getState());
    return result;
  }

  private applyRgsResult(result: Awaited<ReturnType<typeof this.playWithRgs>>) {
    this.state.tiles = result.tiles;
    this.board = new Board(result.tiles);
    this.state.balance = result.balance;
    this.state.totalWin = result.totalWin;
    this.state.roundWin = result.roundWin;
    this.state.lastRoundWin = result.lastRoundWin;
    this.state.freeSpinActive = result.freeSpinActive;
    this.state.lastRoundWasFreeSpin = result.lastRoundWasFreeSpin;
    this.state.initialCounts = result.initialCounts;
    this.state.initialMultipliers = result.initialMultipliers;
    this.state.remainingSpins = result.remainingSpins;
    this.state.maxSpinsPerRound = result.maxSpinsPerRound;
    this.state.lastSpinPayouts = result.lastSpinPayouts;
    this.updateTileCountsAndMultipliers();
    this.state.roundActive = this.state.remainingSpins > 0;
  }

  private finishRoundIfNeeded(): void {
    if (this.state.remainingSpins > 0) {
      if (this.state.freeSpinActive) {
        return;
      }
    }
    const roundWin = this.state.totalWin;
    this.state.lastRoundWin = roundWin;
    this.state.roundWin = 0;
    this.state.balance += roundWin;
    this.state.totalWin = 0;
    this.state.lastRoundWasFreeSpin = this.state.freeSpinActive;
    this.state.freeSpinActive = false;
    this.state.maxSpinsPerRound = 1;
    this.state.remainingSpins = 0;
    this.state.roundActive = false;
  }
}
