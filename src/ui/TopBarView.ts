import { Multipliers } from '@core/types';

export interface TopBarState {
  greenTiles: number;
  orangeTiles: number;
  multipliers: Multipliers;
  maxTiles: number;
  nextThresholds?: { GREEN?: number; ORANGE?: number };
}

export class TopBarView {
  private greenTilesEl: HTMLElement | null;
  private orangeTilesEl: HTMLElement | null;
  private multGreenEl: HTMLElement | null;
  private multOrangeEl: HTMLElement | null;
  private nextGreenEl: HTMLElement | null;
  private nextOrangeEl: HTMLElement | null;

  constructor() {
    this.greenTilesEl = document.getElementById('hud-tiles-green');
    this.orangeTilesEl = document.getElementById('hud-tiles-orange');
    this.multGreenEl = document.getElementById('hud-mult-green');
    this.multOrangeEl = document.getElementById('hud-mult-orange');
    this.nextGreenEl = document.getElementById('hud-next-green');
    this.nextOrangeEl = document.getElementById('hud-next-orange');
  }

  public update(state: TopBarState): void {
    this.greenTilesEl && (this.greenTilesEl.textContent = `${state.greenTiles}`);
    this.orangeTilesEl && (this.orangeTilesEl.textContent = `${state.orangeTiles}`);
    this.multGreenEl && (this.multGreenEl.textContent = `${state.multipliers.GREEN}x`);
    this.multOrangeEl && (this.multOrangeEl.textContent = `${state.multipliers.ORANGE}x`);
    this.nextGreenEl &&
      (this.nextGreenEl.textContent = state.nextThresholds?.GREEN
        ? `Next +1x at ${state.nextThresholds.GREEN}`
        : 'Max multiplier');
    this.nextOrangeEl &&
      (this.nextOrangeEl.textContent = state.nextThresholds?.ORANGE
        ? `Next +1x at ${state.nextThresholds.ORANGE}`
        : 'Max multiplier');
  }
}
