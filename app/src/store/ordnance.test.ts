import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, EnemyShipState } from '../types/game';

describe('Ordnance Mechanic', () => {
  beforeEach(() => {
    // Reset state before each test
    useGameStore.setState({
      round: 1,
      phase: 'execution',
      executionStep: 'mediumAllied',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 5,
          maxCommandTokens: 5,
          assignedActions: [
            { id: 'a1', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 },
            { id: 'a2', station: 'tactical', actionId: 'load-ordinance', ctCost: 1, stressCost: 0 }
          ],
          officers: [
            { 
                officerId: 'vance', 
                station: 'sensors', 
                currentStress: 0, 
                currentTier: 'veteran', 
                isLocked: false, 
                lockDuration: 0, 
                traumas: [], 
                hasFumbledThisRound: false, 
                actionsPerformedThisRound: 0 
            },
            { 
                officerId: 'slick-jones', 
                station: 'helm', 
                currentStress: 0, 
                currentTier: 'veteran', 
                isLocked: false, 
                lockDuration: 0, 
                traumas: [], 
                hasFumbledThisRound: false, 
                actionsPerformedThisRound: 0 
            },
            { 
                officerId: 'kane', 
                station: 'tactical', 
                currentStress: 0, 
                currentTier: 'veteran', 
                isLocked: false, 
                lockDuration: 0, 
                traumas: [], 
                hasFumbledThisRound: false, 
                actionsPerformedThisRound: 0 
            },
            { 
                officerId: 'holloway', 
                station: 'engineering', 
                currentStress: 0, 
                currentTier: 'veteran', 
                isLocked: false, 
                lockDuration: 0, 
                traumas: [], 
                hasFumbledThisRound: false, 
                actionsPerformedThisRound: 0 
            }
          ]
        } as PlayerState
      ],
      playerShips: [
        {
          id: 's1', name: 'Ship 1', chassisId: 'vanguard', ownerId: 'p1',
          position: { q: 0, r: 0 }, facing: 0 as any, currentSpeed: 0, currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 }, maxShieldsPerSector: 2,
          equippedWeapons: ['heavy-railgun', 'plasma-battery'], // Index 0: Ordnance, Index 1: Standard
          equippedSubsystems: [], criticalDamage: [], scars: [],
          armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false, hasDrifted: true, targetLocks: [],
          ordnanceLoadedStatus: {}
        } as ShipState
      ],
      enemyShips: [
        {
            id: 'e1', name: 'Enemy 1', adversaryId: 'reaper',
            position: { q: 3, r: 0 }, facing: 3 as any, currentSpeed: 0, currentHull: 10, maxHull: 10,
            shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
            criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
            baseEvasion: 5, armorDie: 'd6'
        } as unknown as EnemyShipState
      ],
      terrainMap: new Map(),
      log: [],
    });
  });

  it('ordnance weapon starts primed (implicitly)', () => {
    const ship = useGameStore.getState().playerShips[0];
    // ordnanceLoadedStatus is {} by default, which means slot 0 (Heavy Railgun) is primed
    expect(ship.ordnanceLoadedStatus?.[0]).toBeUndefined();
  });

  it('firing ordnance weapon sets loaded status to false', () => {
    const state = useGameStore.getState();
    
    // Fire the Heavy Railgun (Index 0)
    state.resolveAction('p1', 's1', 'a1', { targetShipId: 'e1', weaponIndex: 0 });
    
    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.ordnanceLoadedStatus?.[0]).toBe(false);
    expect(updatedShip.firedWeaponIndicesThisRound).toContain(0);
  });

  it('firing standard weapon does not affect ordnanceLoadedStatus', () => {
    const state = useGameStore.getState();
    
    // Fire the Plasma Battery (Index 1)
    state.resolveAction('p1', 's1', 'a1', { targetShipId: 'e1', weaponIndex: 1 });
    
    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.ordnanceLoadedStatus?.[0]).toBeUndefined();
    expect(updatedShip.ordnanceLoadedStatus?.[1]).toBeUndefined();
    expect(updatedShip.firedWeaponIndicesThisRound).toContain(1);
  });

  it('firing unloaded ordnance weapon is blocked', () => {
    // Manually set Railgun to unloaded
    useGameStore.setState(s => {
      const ships = [...s.playerShips];
      ships[0] = { ...ships[0], ordnanceLoadedStatus: { 0: false } };
      return { playerShips: ships };
    });

    const state = useGameStore.getState();
    
    // Attempt to fire the Heavy Railgun (Index 0)
    state.resolveAction('p1', 's1', 'a1', { targetShipId: 'e1', weaponIndex: 0 });
    
    const updatedShip = useGameStore.getState().playerShips[0];
    // It should NOT be in the fired indices
    expect(updatedShip.firedWeaponIndicesThisRound || []).not.toContain(0);
    // Status should still be false
    expect(updatedShip.ordnanceLoadedStatus?.[0]).toBe(false);
  });

  it('reloading ordnance weapon sets loaded status back to true', () => {
    // Manually set Railgun to unloaded
    useGameStore.setState(s => {
      const ships = [...s.playerShips];
      ships[0] = { ...ships[0], ordnanceLoadedStatus: { 0: false } };
      return { playerShips: ships };
    });

    const state = useGameStore.getState();
    
    // Resolve "Load Ordnance" action for Railgun (Index 0)
    state.resolveAction('p1', 's1', 'a2', { weaponIndex: 0 });
    
    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.ordnanceLoadedStatus?.[0]).toBe(true);
  });

  it('reloading logic can auto-find the first unloaded ordnance weapon', () => {
    // Manually set Railgun to unloaded
    useGameStore.setState(s => {
      const ships = [...s.playerShips];
      ships[0] = { ...ships[0], ordnanceLoadedStatus: { 0: false } };
      return { playerShips: ships };
    });

    const state = useGameStore.getState();
    
    // Resolve "Load Ordnance" action WITHOUT a specific weaponIndex
    state.resolveAction('p1', 's1', 'a2');
    
    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.ordnanceLoadedStatus?.[0]).toBe(true);
  });

  it('target lock effects persist through the round instead of being consumed by the next attack', () => {
    useGameStore.setState(s => {
      const enemies = [...s.enemyShips];
      enemies[0] = {
        ...enemies[0],
        targetLocks: [-1],
        targetLocksRerolls: 1,
      };
      return { enemyShips: enemies };
    });

    const state = useGameStore.getState();
    state.resolveAction('p1', 's1', 'a1', { targetShipId: 'e1', weaponIndex: 1 });

    let updatedEnemy = useGameStore.getState().enemyShips[0];
    expect(updatedEnemy.targetLocks).toEqual([-1]);
    expect(updatedEnemy.targetLocksRerolls).toBe(1);

    useGameStore.getState().executeCleanupPhase();

    updatedEnemy = useGameStore.getState().enemyShips[0];
    expect(updatedEnemy.targetLocks).toEqual([]);
    expect(updatedEnemy.targetLocksRerolls).toBe(0);
  });
});
