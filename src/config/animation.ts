export interface AnimationSettings {
  columnDelayMs: number;
  symbolStaggerMs: number;
  fallDurationMs: number;
  startOffsetTiles: number;
  easingPower: number;
  stackDelayMs: number;
  offscreenOffsetPx: number;
  tremorDurationMs: number;
  tremorOffsetPx: number;
  totalWinDisplayMs: number;
}

export const defaultAnimation: AnimationSettings = {
  columnDelayMs: 90,
  symbolStaggerMs: 60,
  fallDurationMs: 420,
  startOffsetTiles: 1.5,
  easingPower: 2,
  stackDelayMs: 200,
  offscreenOffsetPx: 500,
  tremorDurationMs: 50,
  tremorOffsetPx: 2,
  totalWinDisplayMs: 1000
};
