import { Application } from 'pixi.js';
import { GameConfigLoader } from '@config/GameConfigLoader';
import { GameEngine } from '@core/GameEngine';
import { WeightedSymbolSource } from '@core/SymbolSource';
import { MainUI } from '@ui/MainUI';
import { Hud } from '@ui/Hud';
import { RoundModal } from '@ui/RoundModal';

const canvasParent = document.getElementById('app');

if (!canvasParent) {
  throw new Error('Mount point #app not found');
}

const initialRect = canvasParent.getBoundingClientRect();
const initialWidth = Math.max(320, initialRect.width || window.innerWidth || 320);
const initialHeight = Math.max(280, initialRect.height || window.innerHeight || 280);

const app = new Application({
  width: initialWidth,
  height: initialHeight,
  backgroundColor: 0x101820
});

const config = GameConfigLoader.load();
const engine = new GameEngine(
  config,
  new WeightedSymbolSource(config.symbolDistribution, config.coinValueDistribution, config.tankReelWeights)
);
const hud = new Hud(config, () => ui.spin());
const modal = new RoundModal();
const ui = new MainUI(engine, app, hud, modal);

const view = app.view as HTMLCanvasElement;
view.style.width = '100%';
view.style.height = '100%';
view.style.display = 'block';
const canvasContainer = document.getElementById('canvas-container') ?? canvasParent;
canvasContainer.appendChild(view);

const resize = (): void => {
  const rect = canvasContainer.getBoundingClientRect();
  const width = Math.max(320, (rect.width || window.innerWidth || 320) * 0.9);
  const height = Math.max(280, (rect.height || window.innerHeight || 280) * 0.8);
  ui.resize(width, height);
};

resize();
window.addEventListener('resize', resize);
const triggerSpinOrSkip = () => {
  const state = engine.getState();
  if (ui.isAnimating()) {
    ui.skipAnimation();
    return;
  }
  if (!state.roundActive || state.remainingSpins > 0) {
    ui.spin();
  }
};

view.addEventListener('click', triggerSpinOrSkip);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    triggerSpinOrSkip();
  }
});
