import { Application } from 'pixi.js';
import { GameEngine } from '@core/GameEngine';
import { GameState } from '@core/types';
import { BetController } from './BetController';
import { SpinController } from './SpinController';
import { BalanceController } from './BalanceController';
import { TotalWinController } from './TotalWinController';
import { TopBar } from './TopBar';
import { GameMachine } from './GameMachine';
import { Hud } from './Hud';
import { RoundModal } from './RoundModal';
import { Logger } from './Logger';

export class MainUI {
  private engine: GameEngine;
  private spinController: SpinController;
  private betController: BetController;
  private balanceController: BalanceController;
  private totalWinController: TotalWinController;
  private topBar: TopBar;
  private gameMachine: GameMachine;
  private hud?: Hud;
  private modal?: RoundModal;
  private logger: Logger;
  private animating = false;

  constructor(engine: GameEngine, app: Application, hud?: Hud, modal?: RoundModal) {
    this.engine = engine;
    this.spinController = new SpinController(() => this.handleSpin());
    this.betController = new BetController(engine['config']?.bet?.levels ?? [], (bet) =>
      this.engine.setBet(bet)
    );
    this.balanceController = new BalanceController();
    this.totalWinController = new TotalWinController();
    this.topBar = new TopBar();
    this.gameMachine = new GameMachine(app);
    this.hud = hud;
    this.modal = modal;
    this.logger = new Logger();
    this.syncUI(this.engine.getState());
  }

  public resize(width: number, height: number): void {
    this.gameMachine.setViewport(width, height);
    // Repaint at the new size with the latest state.
    this.gameMachine.update(this.engine.getState().tiles);
  }

  public spin(): void {
    this.handleSpin();
  }

  public skipAnimation(): void {
    if (this.animating) {
      this.gameMachine.skipAnimation();
    }
  }

  public betUp(): void {
    if (this.animating) return;
    const next = this.betController.increase();
    this.engine.setBet(next);
    this.syncUI(this.engine.getState());
  }

  public betDown(): void {
    if (this.animating) return;
    const next = this.betController.decrease();
    this.engine.setBet(next);
    this.syncUI(this.engine.getState());
  }

  public isAnimating(): boolean {
    return this.animating;
  }

  private async handleSpin(): Promise<void> {
    if (this.animating) {
      return;
    }
    const before = this.engine.getState();
    this.logger.log(`Game start - bet ${before.bet}, balance ${before.balance - before.bet}`);
    if (this.hud) {
      this.hud.update({
        ...before,
        totalWin: 0,
        roundWin: 0
      });
    }
    this.animating = true;
    this.gameMachine.setOpacity(true);
    const prevTiles = this.engine.getState().tiles;
    const newState = await this.engine.spin();
    this.logger.log(`Round start - bet ${newState.bet}`);
    this.syncUI(newState, { skipBoard: true });
    await this.gameMachine.animateSpin(newState.tiles, newState.lastSpinPayouts, prevTiles, newState.multipliers);
    if (newState.lastSpinWin && newState.lastSpinWin > 0) {
      this.gameMachine.showTotalWin(newState.lastSpinWin);
    }
    if (!newState.roundActive) {
      const rw = newState.lastRoundWin ?? 0;
      this.logger.log(`Round end - round win ${rw}`);
      this.logger.log(`Game end - paid ${rw} to balance ${newState.balance}`);
    } else if (newState.freeSpinActive) {
      this.logger.log(
        `Free spins continue - remaining ${newState.remainingSpins}, total win ${newState.totalWin}`
      );
    } else {
      this.logger.log(
        `Round result - win ${newState.roundWin}, total ${newState.totalWin}, balance ${newState.balance}`
      );
    }
    this.gameMachine.setOpacity(false);
    this.animating = false;
  }

  private syncUI(state: GameState, opts?: { skipBoard?: boolean }): void {
    this.balanceController.update(state.balance);
    this.totalWinController.update(state.totalWin);
    this.betController.update(state.bet);
    this.spinController.updateSpinsState({
      remainingSpins: state.remainingSpins,
      maxSpins: state.maxSpinsPerRound
    });
    this.topBar.update({
      greenTiles: state.greenTileCount,
      orangeTiles: state.orangeTileCount,
      multipliers: state.multipliers,
      maxTiles: state.greenTileCount + state.orangeTileCount
    });
    if (!opts?.skipBoard) {
      this.gameMachine.update(state.tiles, state.lastSpinPayouts, state.multipliers);
    }
    this.hud?.update(state);
    if (!state.roundActive && state.lastRoundWin !== undefined && state.lastRoundWasFreeSpin) {
      this.modal?.show(state.lastRoundWin);
    } else {
      this.modal?.hide();
    }
  }
}
