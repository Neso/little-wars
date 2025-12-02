import { GameState } from '@core/types';
import { GameConfig } from '@core/types';

export class Hud {
  private config: GameConfig;
  private balanceEl: HTMLElement | null;
  private totalWinEl: HTMLElement | null;
  private spinWinEl: HTMLElement | null;
  private betEl: HTMLElement | null;
  private spinButton: HTMLButtonElement | null;
  private betUpBtn: HTMLButtonElement | null;
  private betDownBtn: HTMLButtonElement | null;
  private onSpin?: () => void;
  private onBetUp?: () => void;
  private onBetDown?: () => void;

  constructor(config: GameConfig, onSpin?: () => void, onBetUp?: () => void, onBetDown?: () => void) {
    this.config = config;
    this.balanceEl = document.getElementById('hud-balance');
    this.totalWinEl = document.getElementById('hud-totalwin');
    this.spinWinEl = document.getElementById('hud-spinwin');
    this.betEl = document.getElementById('hud-bet');
    this.spinButton = document.getElementById('hud-spin') as HTMLButtonElement | null;
    this.betUpBtn = document.getElementById('bet-up') as HTMLButtonElement | null;
    this.betDownBtn = document.getElementById('bet-down') as HTMLButtonElement | null;
    this.onSpin = onSpin;
    this.onBetUp = onBetUp;
    this.onBetDown = onBetDown;
    this.bind();
  }

  private bind(): void {
    if (this.spinButton) {
      this.spinButton.onclick = () => this.onSpin?.();
    }
    if (this.betUpBtn) {
      this.betUpBtn.onclick = () => this.onBetUp?.();
    }
    if (this.betDownBtn) {
      this.betDownBtn.onclick = () => this.onBetDown?.();
    }
  }

  public update(state: GameState): void {
    this.balanceEl && (this.balanceEl.textContent = state.balance.toString());
    const displayTotal = state.roundActive ? state.totalWin : state.lastRoundWin ?? state.totalWin;
    const displayRound = state.roundActive ? state.roundWin : state.lastRoundWin ?? state.roundWin;
    this.totalWinEl && (this.totalWinEl.textContent = displayTotal.toString());
    this.spinWinEl && (this.spinWinEl.textContent = displayRound.toString());
    this.betEl && (this.betEl.textContent = state.bet.toString());
    if (this.betUpBtn)
      this.betUpBtn.disabled =
        !state.bet || (this.config.bet.levels?.length ? state.bet >= Math.max(...this.config.bet.levels) : false);
    if (this.betDownBtn)
      this.betDownBtn.disabled =
        !state.bet || (this.config.bet.levels?.length ? state.bet <= Math.min(...this.config.bet.levels) : false);
  }

}
