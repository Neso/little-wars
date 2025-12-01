export class BetController {
  private bet = 0;
  private onChange?: (bet: number) => void;

  constructor(onChange?: (bet: number) => void) {
    this.onChange = onChange;
  }

  public update(bet: number): void {
    this.bet = bet;
    this.onChange?.(bet);
  }

  public getBet(): number {
    return this.bet;
  }
}
