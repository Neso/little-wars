import defaultConfig from './config.json';
import { GameConfig } from '@core/types';

export class GameConfigLoader {
  public static load(): GameConfig {
    return defaultConfig as GameConfig;
  }
}
