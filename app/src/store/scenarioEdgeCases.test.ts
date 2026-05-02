import { describe, it, expect } from 'vitest';
import { checkGameOverConditions } from '../engine/GameStateMachine';
import type { GameState } from '../engine/GameStateMachine';
import type { StationState } from '../types/game';

function makeInitialState(objective: string = ''): GameState {
  return {
    phase: 'execution',
    round: 1,
    fleetFavor: 0,
    maxRounds: 10,
    playerShips: [{ id: 's1', isDestroyed: false, warpedOut: false }] as any,
    enemyShips: [],
    stations: [],
    objectiveType: objective,
    objectiveMarkers: [],
    warpedOutShipIds: [],
    successfulEscapes: 0,
    salvageCratesCollected: 0,
    dataSiphonedRelayNames: [],
    gameOver: false,
    victory: null,
  } as any;
}

function makeStation(id: string, isDestroyed = false): StationState {
  return {
    id,
    isDestroyed,
    stationId: 'outpost',
  } as any;
}

describe('Scenario Edge Cases', () => {
  describe('Station Siege', () => {
    it('wins when all stations are destroyed', () => {
      const s1 = makeStation('st1', true);
      const state = { 
        ...makeInitialState('Station Siege'), 
        stations: [s1] 
      } as GameState;
      
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('Primary station destroyed');
    });

    it('continues if station is still operational', () => {
      const s1 = makeStation('st1', false);
      const state = { 
        ...makeInitialState('Station Siege'), 
        stations: [s1] 
      } as GameState;
      
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });

  describe('Turret Breach', () => {
    it('wins when all turrets (stations) are destroyed', () => {
      const t1 = makeStation('t1', true);
      const t2 = makeStation('t2', true);
      const state = { 
        ...makeInitialState('Turret Breach'), 
        stations: [t1, t2] 
      } as GameState;
      
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('Defensive picket cleared');
    });

    it('continues if at least one turret remains', () => {
      const t1 = makeStation('t1', true);
      const t2 = makeStation('t2', false);
      const state = { 
        ...makeInitialState('Turret Breach'), 
        stations: [t1, t2] 
      } as GameState;
      
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });
});
