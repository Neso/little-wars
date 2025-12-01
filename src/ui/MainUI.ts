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
  private animating = false;

  constructor(engine: GameEngine, app: Application, hud?: Hud, modal?: RoundModal) {
    this.engine = engine;
    this.spinController = new SpinController(() => this.handleSpin());
    this.betController = new BetController((bet) => this.engine.setBet(bet));
    this.balanceController = new BalanceController();
    this.totalWinController = new TotalWinController();
    this.topBar = new TopBar();
    this.gameMachine = new GameMachine(app);
    this.hud = hud;
    this.modal = modal;
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

  public isAnimating(): boolean {
    return this.animating;
  }

  private async handleSpin(): Promise<void> {
    if (this.animating) {
      return;
    }
    this.animating = true;
    this.gameMachine.setOpacity(true);
    const prevTiles = this.engine.getState().tiles;
    const newState = this.engine.spin();
    this.syncUI(newState, { skipBoard: true });
    await this.gameMachine.animateSpin(newState.tiles, newState.lastSpinPayouts, prevTiles, newState.multipliers);
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
    if (!state.roundActive && state.lastRoundWin !== undefined) {
      this.modal?.show(state.lastRoundWin);
    } else {
      this.modal?.hide();
    }
  }
}
