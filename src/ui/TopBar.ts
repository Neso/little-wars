import { Multipliers } from '@core/types';

export interface TopBarState {
  greenTiles: number;
  orangeTiles: number;
  multipliers: Multipliers;
  maxTiles: number;
  nextThresholds?: { GREEN?: number; ORANGE?: number };
}

export class TopBar {
  private state: TopBarState = {
    greenTiles: 0,
    orangeTiles: 0,
    multipliers: { GREEN: 1, ORANGE: 1 },
    maxTiles: 30
  };

  public update(state: TopBarState): void {
    this.state = state;
  }

  public getState(): TopBarState {
    return this.state;
  }
}
