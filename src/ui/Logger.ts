export class Logger {
  private list: HTMLElement | null;

  constructor() {
    this.list = document.getElementById('log-list');
  }

  public log(message: string): void {
    if (!this.list) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    this.list.prepend(entry);
    // keep log to reasonable length
    while (this.list.children.length > 50) {
      this.list.removeChild(this.list.lastChild as ChildNode);
    }
  }
}
