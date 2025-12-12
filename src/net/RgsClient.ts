import { GameState, RgsSpinResult, SpinAction } from '@core/types';

export interface RgsClient {
  getSpin(state: GameState, action?: SpinAction): Promise<RgsSpinResult>;
}
