export class TotalWinController {
  private totalWin = 0;

  public update(totalWin: number): void {
    this.totalWin = totalWin;
  }

  public getTotalWin(): number {
    return this.totalWin;
  }
}
