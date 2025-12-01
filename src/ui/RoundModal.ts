export class RoundModal {
  private modal: HTMLElement | null;
  private textEl: HTMLElement | null;
  private closeBtn: HTMLElement | null;

  constructor() {
    this.modal = document.getElementById('round-modal');
    this.textEl = document.getElementById('round-modal-text');
    this.closeBtn = document.getElementById('round-modal-close');
    this.bind();
  }

  private bind(): void {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.hide());
    }
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.hide();
        }
      });
    }
  }

  public show(win: number): void {
    if (this.modal) {
      this.modal.style.display = 'flex';
    }
    if (this.textEl) {
      this.textEl.textContent = `Total Win: ${win}`;
    }
  }

  public hide(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }
}
