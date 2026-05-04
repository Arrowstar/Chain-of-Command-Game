import { describe, it, expect } from 'vitest';
import { checkGameOverConditions } from './GameStateMachine';
import type { GameState } from './GameStateMachine';
import type { ShipState, EnemyShipState, ObjectiveMarkerState } from '../types/game';

// ── Fixtures ─────────────────────────────────────────────────────

function makeInitialState(objective: string = ''): Partial<GameState> {
  return {
    phase: 'execution',
    round: 1,
    fleetFavor: 0,
    maxRounds: 10,
    playerShips: [],
    enemyShips: [],
    objectiveType: objective,
    objectiveMarkers: [],
    warpedOutShipIds: [],
    successfulEscapes: 0,
    salvageCratesCollected: 0,
    dataSiphonedRelayNames: [],
    gameOver: false,
    victory: null,
  };
}

function makeShip(id: string, isDestroyed = false, warpedOut = false): ShipState {
  return {
    id,
    name: id,
    isDestroyed,
    warpedOut,
    position: { q: 0, r: 0 },
    currentHull: isDestroyed ? 0 : 10,
    maxHull: 10,
    // ... other properties truncated or defaulted for state machine test
  } as any;
}

function makeEnemy(id: string, isDestroyed = false, name: string = id): EnemyShipState {
  return {
    id,
    name,
    isDestroyed,
    position: { q: 0, r: 5 },
    currentHull: isDestroyed ? 0 : 10,
  } as any;
}

function makeMarker(name: string, isDestroyed = false): ObjectiveMarkerState {
  return {
    name,
    isDestroyed,
    position: { q: 4, r: 0 },
    hull: isDestroyed ? 0 : 10,
    maxHull: 10,
  } as any;
}

// ══════════════════════════════════════════════════════════════════
// Game State Machine Tests
// ══════════════════════════════════════════════════════════════════

describe('GameStateMachine — checkGameOverConditions', () => {

  describe('Universal Conditions', () => {
    it('triggers defeat if Fleet Favor is <= -5', () => {
      const state = { ...makeInitialState(), fleetFavor: -5 } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(false);
      expect(res.reason).toContain('Fleet Favor');
    });

    it('triggers defeat if all player ships are destroyed', () => {
      const s1 = makeShip('s1', true);
      const state = { ...makeInitialState(), playerShips: [s1] } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(false);
      expect(res.reason).toContain('destroyed');
    });

    it('triggers defeat if all player ships have retreated without winning', () => {
      const s1 = makeShip('s1', false, true); // warped out
      const state = {
        ...makeInitialState('Breakout'),
        playerShips: [s1],
        successfulEscapes: 0, // didn't use the zone
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(false);
      expect(res.reason).toContain('retreated to warp without completing the objective');
    });

    describe('Round Limit', () => {
      it('triggers defeat when round exceeds maxRounds', () => {
        const state = { ...makeInitialState(), maxRounds: 8, round: 9 } as GameState;
        const res = checkGameOverConditions(state);
        expect(res.gameOver).toBe(true);
        expect(res.victory).toBe(false);
        expect(res.reason).toContain('Tactical window expired');
      });

      it('does NOT trigger defeat if maxRounds is null (infinite rounds)', () => {
        const state = { ...makeInitialState(), maxRounds: null, round: 99, playerShips: [makeShip('s1')] } as GameState;
        const res = checkGameOverConditions(state);
        expect(res.gameOver).toBe(false);
      });

      it('does NOT trigger defeat if round is exactly maxRounds', () => {
        const state = { ...makeInitialState(), maxRounds: 8, round: 8, playerShips: [makeShip('s1')] } as GameState;
        const res = checkGameOverConditions(state);
        expect(res.gameOver).toBe(false);
      });
    });
  });

  describe('Search & Destroy', () => {
    it('wins when all enemies are destroyed', () => {
      const e1 = makeEnemy('e1', true);
      const state = {
        ...makeInitialState('Search & Destroy'),
        playerShips: [makeShip('s1')],
        enemyShips: [e1],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
    });
  });

  describe('Assassination', () => {
    it('wins when the flagship is destroyed', () => {
      const f = makeEnemy('e1', true, 'Dreadnought (Flagship)');
      const e = makeEnemy('e2', false);
      const state = {
        ...makeInitialState('Assassination'),
        playerShips: [makeShip('s1')],
        enemyShips: [f, e],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('Flagship eliminated');
    });

    it('continues if only regular escorts are destroyed', () => {
      const f = makeEnemy('e1', false, 'Dreadnought (Flagship)');
      const e = makeEnemy('e2', true);
      const state = {
        ...makeInitialState('Assassination'),
        playerShips: [makeShip('s1')],
        enemyShips: [f, e],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });

  describe('Breakout', () => {
    it('wins when 50% of fleet escapes via zone (2 ships, 1 needed)', () => {
      const s1 = makeShip('s1', false, true);
      const s2 = makeShip('s2', false, false);
      const state = {
        ...makeInitialState('Breakout'),
        playerShips: [s1, s2],
        successfulEscapes: 1,
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('successfully escaped through the zone');
    });

    it('continues if ships warped out but NOT enough via zone', () => {
      const s1 = makeShip('s1', false, true);
      const s2 = makeShip('s2', false, false);
      const state = {
        ...makeInitialState('Breakout'),
        playerShips: [s1, s2],
        successfulEscapes: 0, // warped out, but maybe it was a retreat?
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });

    it('triggers defeat if last ship on board retreats/dies without meeting goal', () => {
      const s1 = makeShip('s1', false, true); // warped out outside zone
      const state = {
        ...makeInitialState('Breakout'),
        playerShips: [s1],
        successfulEscapes: 0,
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(false);
    });
  });

  describe('Data Siphon', () => {
    it('wins when all 3 relays are siphoned', () => {
      const state = {
        ...makeInitialState('Data Siphon'),
        playerShips: [makeShip('s1')],
        dataSiphonedRelayNames: ['Comm Relay Alpha', 'Comm Relay Beta', 'Comm Relay Gamma'],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
    });

    it('continues if only 2 relays are siphoned', () => {
      const state = {
        ...makeInitialState('Data Siphon'),
        playerShips: [makeShip('s1')],
        dataSiphonedRelayNames: ['Comm Relay Alpha', 'Comm Relay Beta'],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });

  describe('Hold the Line', () => {
    it('wins at the end of Round 6 if player still has ships', () => {
      const state = {
        ...makeInitialState('Hold the Line'),
        round: 6,
        phase: 'cleanup',
        playerShips: [makeShip('s1')],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('The line held');
    });

    it('continues during Round 1-5', () => {
      const state = {
        ...makeInitialState('Hold the Line'),
        round: 5,
        playerShips: [makeShip('s1')],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });

  describe('Salvage Run', () => {
    it('wins when 3 crates collected AND at least one ship warped out', () => {
      const s1 = makeShip('s1', false, true);
      const state = {
        ...makeInitialState('Salvage Run'),
        playerShips: [s1],
        salvageCratesCollected: 3,
        warpedOutShipIds: ['s1'],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('salvaged');
    });

    it('continues if 3 crates collected but no ships jumped yet', () => {
      const s1 = makeShip('s1', false, false);
      const state = {
        ...makeInitialState('Salvage Run'),
        playerShips: [s1],
        salvageCratesCollected: 3,
        warpedOutShipIds: [],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(false);
    });
  });

  describe('Handcrafted Scenarios', () => {
    it('wins "Ambush at Kaelen-IV" when Comms Array is destroyed', () => {
      const array = makeMarker('Hegemony Comms Array', true);
      const state = {
        ...makeInitialState(),
        scenarioId: 'ambush-kaelen-iv',
        playerShips: [makeShip('s1')],
        objectiveMarkers: [array],
      } as GameState;
      const res = checkGameOverConditions(state);
      expect(res.gameOver).toBe(true);
      expect(res.victory).toBe(true);
      expect(res.reason).toContain('Comms Array destroyed');
    });
  });
});
