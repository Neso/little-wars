import { Board } from '@core/Board';
import { SymbolSource, countSymbolType } from '@core/SymbolSource';
import {
  Colour,
  GameConfig,
  GameState,
  Multipliers,
  RgsSpinResult,
  Symbol,
  SymbolType
} from '@core/types';
import { RgsClient } from './RgsClient';

const ROWS = 5;
const COLS = 6;

export class LocalRgsClient implements RgsClient {
  private config: GameConfig;
  private symbolSource: SymbolSource;

  constructor(config: GameConfig, symbolSource: SymbolSource) {
    this.config = config;
    this.symbolSource = symbolSource;
  }

  public async getSpin(state: GameState): Promise<RgsSpinResult> {
    const board = new Board(state.tiles);
    const originalColours = new Map<string, Colour>();
    board.getTiles().forEach((t) => originalColours.set(t.id, t.colour));
    const symbols = this.symbolSource.generateSymbols(ROWS, COLS);
    this.applySymbolsToBoard(board, symbols);

    // Stage 1: payouts only for coins on matching colours, using pre-change multipliers.
    const baseCounts = board.countColours();
    const baseMultipliers = this.calculateMultipliers(baseCounts);
    let totalWin = state.totalWin;
    let roundWin = state.roundWin;
    const lastSpinPayouts: { tileId: string; amount: number }[] = [];
    const pendingFlips: { tileId: string; colour: Colour }[] = [];

    symbols.forEach((symbol, index) => {
      const tile = board.getTiles()[index];
      if (!tile || symbol.type !== 'COIN') return;
      const startingColour = originalColours.get(tile.id) ?? tile.colour;
      const onOwn = startingColour === symbol.colour;
      const coinValue = symbol.value;
      if (onOwn) {
        const win = state.bet * baseMultipliers[symbol.colour] * coinValue;
        totalWin += win;
        roundWin = totalWin;
        lastSpinPayouts.push({ tileId: tile.id, amount: win });
      } else {
        pendingFlips.push({ tileId: tile.id, colour: symbol.colour });
      }
    });

    // Stage 2: apply flips, soldiers, tanks, then update multipliers.
    pendingFlips.forEach(({ tileId, colour }) => board.setTileColour(tileId, colour));
    this.applySoldiers(board);
    this.applyTanks(board, symbols);

    const counts = board.countColours();
    const multipliers = this.calculateMultipliers(counts);
    const freeSpinConfig = this.config.freeSpinMode;
    let freeSpinActive = state.freeSpinActive;
    let lastRoundWasFreeSpin = state.lastRoundWasFreeSpin;
    let remainingSpins = state.remainingSpins;
    let maxSpinsPerRound = state.maxSpinsPerRound;

    if (freeSpinConfig?.enabled && freeSpinConfig.triggerSymbol) {
      const trigger = countSymbolType(symbols, freeSpinConfig.triggerSymbol as SymbolType);
      if (trigger > 0) {
        freeSpinActive = true;
        lastRoundWasFreeSpin = true;
        maxSpinsPerRound = freeSpinConfig.spinsPerRound;
        remainingSpins = freeSpinConfig.spinsPerRound;
      }
    }

    if (!freeSpinActive) {
      remainingSpins = 0;
    } else {
      let updatedSpins = remainingSpins;
      this.config.spinResetRules.forEach((rule) => {
        const count = countSymbolType(symbols, rule.symbolType as SymbolType);
        if (count >= rule.minCount) {
          const target = Math.min(rule.resetToSpins, maxSpinsPerRound);
          updatedSpins = Math.max(updatedSpins, target);
        }
      });
      remainingSpins = updatedSpins;
      remainingSpins = Math.max(0, remainingSpins - 1);
    }

    let balance = state.balance;
    let lastRoundWin: number | undefined = undefined;
    let freeSpinStillActive = freeSpinActive;
    if (!freeSpinActive || remainingSpins <= 0) {
      lastRoundWin = totalWin;
      balance += totalWin;
      totalWin = 0;
      roundWin = 0;
      freeSpinStillActive = false;
      maxSpinsPerRound = 1;
      remainingSpins = 0;
    }

    return {
      tiles: board.getTiles(),
      balance,
      totalWin,
      roundWin,
      lastRoundWin,
      freeSpinActive: freeSpinStillActive,
      lastRoundWasFreeSpin: freeSpinStillActive || lastRoundWasFreeSpin,
      initialCounts: baseCounts,
      initialMultipliers: baseMultipliers,
      remainingSpins,
      maxSpinsPerRound,
      lastSpinPayouts
    };
  }

  private applySymbolsToBoard(board: Board, symbols: Symbol[]): void {
    const tiles = board.getTiles();
    symbols.forEach((symbol, idx) => {
      board.setTileSymbol(tiles[idx].id, symbol);
    });
  }

  private applySoldiers(board: Board): void {
    const tiles = board.getTiles();
    tiles.forEach((tile) => {
      const symbol = tile.symbol;
      if (!symbol || symbol.type !== 'SOLDIER') return;
      const adjacents = board.getAdjacent(tile.id);
      if (tile.colour === symbol.colour) {
        const target =
          adjacents.find((t) => t.colour !== symbol.colour) || adjacents.find(() => true);
        if (target) {
          board.setTileColour(target.id, symbol.colour);
        }
      } else {
        board.setTileColour(tile.id, symbol.colour);
      }
    });
  }

  private applyTanks(board: Board, symbols: Symbol[]): void {
    const tiles = board.getTiles();
    symbols.forEach((symbol, index) => {
      if (symbol.type !== 'TANK') return;
      const tile = tiles[index];
      if (!tile) return;
      const targetRow = tile.row;
      tiles
        .filter((t) => t.row === targetRow && t.col >= tile.col)
        .forEach((t) => board.setTileColour(t.id, symbol.colour));
    });
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
}
