import { Application } from 'pixi.js';
import { GameConfigLoader } from '@config/GameConfigLoader';
import { GameEngine } from '@core/GameEngine';
import { WeightedSymbolSource } from '@core/SymbolSource';
import { MainUI } from '@ui/MainUI';

const canvasParent = document.getElementById('app');

if (!canvasParent) {
  throw new Error('Mount point #app not found');
}

const app = new Application({
  width: 320,
  height: 280,
  backgroundColor: 0x101820
});

const config = GameConfigLoader.load();
const engine = new GameEngine(
  config,
  new WeightedSymbolSource(config.symbolDistribution, config.coinValueDistribution)
);
new MainUI(engine, app);

canvasParent.appendChild(app.view as HTMLCanvasElement);
