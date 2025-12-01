import { Howl } from 'howler';

export class SoundManager {
  private sounds: Record<string, Howl> = {};

  public register(id: string, src: string): void {
    this.sounds[id] = new Howl({ src: [src] });
  }

  public play(id: string): void {
    this.sounds[id]?.play();
  }
}
