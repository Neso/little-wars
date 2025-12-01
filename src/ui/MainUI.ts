import { Application } from 'pixi.js';
import { GameEngine } from '@core/GameEngine';
import { GameState } from '@core/types';
import { BetController } from './BetController';
import { SpinController } from './SpinController';
import { BalanceController } from './BalanceController';
import { TotalWinController } from './TotalWinController';
import { TopBar } from './TopBar';
import { GameMachine } from './GameMachine';

export class MainUI {
  private engine: GameEngine;
  private spinController: SpinController;
  private betController: BetController;
  private balanceController: BalanceController;
  private totalWinController: TotalWinController;
  private topBar: TopBar;
  private gameMachine: GameMachine;

  constructor(engine: GameEngine, app: Application) {
    this.engine = engine;
    this.spinController = new SpinController(() => this.handleSpin());
    this.betController = new BetController((bet) => this.engine.setBet(bet));
    this.balanceController = new BalanceController();
    this.totalWinController = new TotalWinController();
    this.topBar = new TopBar();
    this.gameMachine = new GameMachine(app);
    this.syncUI(this.engine.getState());
  }

  private handleSpin(): void {
    const newState = this.engine.spin();
    this.syncUI(newState);
  }

  private syncUI(state: GameState): void {
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
    this.gameMachine.update(state.tiles);
  }
}
