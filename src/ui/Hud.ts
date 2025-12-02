import { GameState } from '@core/types';
import { GameConfig } from '@core/types';

export class Hud {
  private config: GameConfig;
  private balanceEl: HTMLElement | null;
  private totalWinEl: HTMLElement | null;
  private spinWinEl: HTMLElement | null;
  private betEl: HTMLElement | null;
  private tilesGreenEl: HTMLElement | null;
  private tilesOrangeEl: HTMLElement | null;
  private nextGreenEl: HTMLElement | null;
  private nextOrangeEl: HTMLElement | null;
  private multGreenEl: HTMLElement | null;
  private multOrangeEl: HTMLElement | null;
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
    this.tilesGreenEl = document.getElementById('hud-tiles-green');
    this.tilesOrangeEl = document.getElementById('hud-tiles-orange');
    this.nextGreenEl = document.getElementById('hud-next-green');
    this.nextOrangeEl = document.getElementById('hud-next-orange');
    this.multGreenEl = document.getElementById('hud-mult-green');
    this.multOrangeEl = document.getElementById('hud-mult-orange');
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
    this.totalWinEl && (this.totalWinEl.textContent = state.totalWin.toString());
    this.spinWinEl && (this.spinWinEl.textContent = state.lastSpinWin?.toString() ?? '0');
    this.betEl && (this.betEl.textContent = state.bet.toString());
    this.tilesGreenEl && (this.tilesGreenEl.textContent = `${state.greenTileCount}`);
    this.tilesOrangeEl && (this.tilesOrangeEl.textContent = `${state.orangeTileCount}`);
    const nextGreen = this.nextThreshold('GREEN', state.greenTileCount);
    const nextOrange = this.nextThreshold('ORANGE', state.orangeTileCount);
    this.nextGreenEl &&
      (this.nextGreenEl.textContent = nextGreen ? `Next +1x at ${nextGreen}` : 'Max multiplier');
    this.nextOrangeEl &&
      (this.nextOrangeEl.textContent = nextOrange ? `Next +1x at ${nextOrange}` : 'Max multiplier');
    this.multGreenEl && (this.multGreenEl.textContent = `${state.multipliers.GREEN}x`);
    this.multOrangeEl && (this.multOrangeEl.textContent = `${state.multipliers.ORANGE}x`);
    if (this.betUpBtn)
      this.betUpBtn.disabled =
        !state.bet || (this.config.bet.levels?.length ? state.bet >= Math.max(...this.config.bet.levels) : false);
    if (this.betDownBtn)
      this.betDownBtn.disabled =
        !state.bet || (this.config.bet.levels?.length ? state.bet <= Math.min(...this.config.bet.levels) : false);
  }

  private nextThreshold(colour: 'GREEN' | 'ORANGE', count: number): number | null {
    const thresholds = [...this.config.multipliers[colour]].sort((a, b) => a.tilesRequired - b.tilesRequired);
    const next = thresholds.find((t) => t.tilesRequired > count);
    return next ? next.tilesRequired : null;
  }
}
