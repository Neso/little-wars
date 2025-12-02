import { GameState, RgsSpinResult } from '@core/types';

export interface RgsClient {
  getSpin(state: GameState): Promise<RgsSpinResult>;
}
