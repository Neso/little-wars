export class BetController {
  private bet = 0;
  private onChange?: (bet: number) => void;
  private levels: number[];

  constructor(levels: number[], onChange?: (bet: number) => void) {
    this.onChange = onChange;
    this.levels = levels.sort((a, b) => a - b);
  }

  public update(bet: number): void {
    this.bet = bet;
    this.onChange?.(bet);
  }

  public getBet(): number {
    return this.bet;
  }

  public increase(): number {
    const idx = this.levels.findIndex((v) => v >= this.bet);
    const nextIdx = Math.min(this.levels.length - 1, idx + 1);
    const newBet = this.levels[Math.max(nextIdx, 0)];
    this.update(newBet);
    return newBet;
  }

  public decrease(): number {
    const idx = this.levels.findIndex((v) => v >= this.bet);
    const prevIdx = Math.max(0, idx - 1);
    const newBet = this.levels[prevIdx];
    this.update(newBet);
    return newBet;
  }

  public canIncrease(): boolean {
    return this.bet < this.levels[this.levels.length - 1];
  }

  public canDecrease(): boolean {
    return this.bet > this.levels[0];
  }
}
