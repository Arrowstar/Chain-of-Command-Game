import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import { HexFacing } from '../types/game';

describe('Weapon Discharge and Bypass Logic', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'execution',
      players: [{
        id: 'p1',
        shipId: 's1',
        officers: [
          { officerId: 'vance', station: 'tactical', currentStress: 0, currentTier: 'veteran' } as any,
        ],
        assignedActions: [
          { id: 'a1', station: 'tactical', actionId: 'fire-primary', resolved: false, weaponSlotIndex: 0 } as any,
        ],
      }],
      playerShips: [{
        id: 's1',
        position: { q: 0, r: 0 },
        facing: 0 as HexFacing,
        equippedWeapons: ['plasma-battery'],
        firedWeaponIndicesThisRound: [],
        ordnanceLoadedStatus: {},
        scars: [],
        currentSpeed: 0,
        currentHull: 10,
        maxHull: 10,
        shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
        maxShieldsPerSector: 5,
        criticalDamage: [],
      } as any],
      enemyShips: [],
      stations: [],
      objectiveMarkers: [],
      terrainMap: new Map(),
      log: [],
    } as any);
  });

  it('allows discharging a weapon even if valid targets exist (hostile or otherwise)', () => {
    // Add an enemy ship in range
    useGameStore.setState(state => ({
      enemyShips: [{
        id: 'e1',
        position: { q: 1, r: 0 }, // Adjacent, definitely in range/arc
        isDestroyed: false,
        isAllied: false,
        shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
        currentHull: 10,
        maxHull: 10,
        scars: [],
        criticalDamage: [],
      } as any]
    }));

    const state = useGameStore.getState();
    // Force discharge even though 'e1' is a valid target
    state.resolveAction('p1', 's1', 'a1', { discharge: true, weaponIndex: 0, weaponId: 'plasma-battery' });

    const updatedState = useGameStore.getState();
    const action = updatedState.players[0].assignedActions[0];
    expect(action.resolved).toBe(true);
    
    const lastLog = updatedState.log.find(l => l.message.includes('discharged'));
    expect(lastLog).toBeDefined();
    expect(lastLog?.message).toContain('discharged Mark IV Plasma Battery into deep space');
  });

  it('resolves an out-of-range shot as a miss instead of blocking', () => {
     // Add an enemy ship far away
    useGameStore.setState(state => ({
      enemyShips: [{
        id: 'e1',
        position: { q: 10, r: 0 }, // Out of range (plasma battery max is 4)
        isDestroyed: false,
        isAllied: false,
        shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
        currentHull: 10,
        maxHull: 10,
        scars: [],
        criticalDamage: [],
      } as any]
    }));

    const state = useGameStore.getState();
    // Resolve action against e1
    state.resolveAction('p1', 's1', 'a1', { targetShipId: 'e1', weaponIndex: 0, weaponId: 'plasma-battery' });

    const updatedState = useGameStore.getState();
    const action = updatedState.players[0].assignedActions[0];
    expect(action.resolved).toBe(true); // Action should still be resolved!
    
    const missLog = updatedState.log.find(l => l.message.includes('OUT OF RANGE'));
    expect(missLog).toBeDefined();
    expect(missLog?.message).toContain('OUT OF RANGE');
  });
});
