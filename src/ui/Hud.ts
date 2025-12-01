import { GameState } from '@core/types';

export class Hud {
  private balanceEl: HTMLElement | null;
  private totalWinEl: HTMLElement | null;
  private betEl: HTMLElement | null;
  private spinsEl: HTMLElement | null;
  private tilesEl: HTMLElement | null;
  private multsEl: HTMLElement | null;
  private spinButton: HTMLButtonElement | null;
  private onSpin?: () => void;

  constructor(onSpin?: () => void) {
    this.balanceEl = document.getElementById('hud-balance');
    this.totalWinEl = document.getElementById('hud-totalwin');
    this.betEl = document.getElementById('hud-bet');
    this.spinsEl = document.getElementById('hud-spins');
    this.tilesEl = document.getElementById('hud-tiles');
    this.multsEl = document.getElementById('hud-mults');
    this.spinButton = document.getElementById('hud-spin') as HTMLButtonElement | null;
    this.onSpin = onSpin;
    this.bind();
  }

  private bind(): void {
    if (this.spinButton) {
      this.spinButton.onclick = () => this.onSpin?.();
    }
  }

  public update(state: GameState): void {
    this.balanceEl && (this.balanceEl.textContent = state.balance.toString());
    this.totalWinEl && (this.totalWinEl.textContent = state.totalWin.toString());
    this.betEl && (this.betEl.textContent = state.bet.toString());
    this.spinsEl &&
      (this.spinsEl.textContent = `${state.remainingSpins}/${state.maxSpinsPerRound}`);
    this.tilesEl &&
      (this.tilesEl.textContent = `${state.greenTileCount}G / ${state.orangeTileCount}O`);
    this.multsEl &&
      (this.multsEl.textContent = `${state.multipliers.GREEN}x / ${state.multipliers.ORANGE}x`);
  }
}
