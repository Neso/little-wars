export class BalanceController {
  private balance = 0;

  public update(balance: number): void {
    this.balance = balance;
  }

  public getBalance(): number {
    return this.balance;
  }
}
