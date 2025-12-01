export interface SpinState {
  remainingSpins: number;
  maxSpins: number;
}

export class SpinController {
  public onSpin?: () => void;
  private state: SpinState = { remainingSpins: 0, maxSpins: 0 };

  constructor(onSpin?: () => void) {
    this.onSpin = onSpin;
  }

  public triggerSpin(): void {
    this.onSpin?.();
  }

  public updateSpinsState(state: SpinState): void {
    this.state = state;
  }

  public getState(): SpinState {
    return this.state;
  }
}
