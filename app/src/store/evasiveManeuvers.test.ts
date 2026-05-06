import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { ShipState, PlayerState, OfficerState } from '../types/game';

describe('Evasive Maneuvers (Evasive Pattern) Separation', () => {
  beforeEach(() => {
    // Reset store state before each test
    // For simplicity in this environment, we'll just manipulate the current state
  });

  it('sets evasiveManeuvers property when Evasive Pattern is resolved', async () => {
    const store = useGameStore.getState();
    
    // 1. Setup a ship and officer
    const shipId = 'test-ship';
    const playerId = 'test-player';
    
    const mockShip: ShipState = { kind: 'ship', faction: 'player', /* @ts-ignore */  id: shipId,
      name: 'Test Ship',
      chassisId: 'vanguard',
      position: { q: 0, r: 0 },
      facing: 0,
      currentSpeed: 2,
      currentHull: 10,
      maxHull: 10,
      shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
      maxShieldsPerSector: 5,
      armorDie: 'd6',
      baseEvasion: 5,
      evasionModifiers: 0,
      evasiveManeuvers: 0,
      isDestroyed: false,
      hasDroppedBelow50: false,
      hasDrifted: false,
      criticalDamage: [],
      scars: [],
      ownerId: playerId,
      firedWeaponIndicesThisRound: [],
      targetLocks: [],
      equippedWeapons: [],
      equippedSubsystems: []
    };

    const mockOfficer: OfficerState = {
      officerId: 'officer-helm',
      station: 'helm',
      currentStress: 0,
      currentTier: 'veteran',
      isLocked: false,
      lockDuration: 0,
      traumas: [],
      hasFumbledThisRound: false,
      actionsPerformedThisRound: 0
    };

    const mockPlayer: PlayerState = {
      id: playerId,
      name: 'Test Player',
      shipId: shipId,
      commandTokens: 5,
      maxCommandTokens: 5,
      officers: [mockOfficer],
      assignedActions: [
        {
          id: 'action-1',
          actionId: 'evasive-pattern',
          station: 'helm',
          ctCost: 2,
          stressCost: 2,
          resolved: false
        }
      ],
      pendingCommandTokenBonus: 0
    };

    // Update store state
    useGameStore.setState({
      playerShips: [mockShip],
      players: [mockPlayer],
      enemyShips: [],
      stations: []
    });

    // 2. Resolve the action
    // Signature: resolveAction(playerId, shipId, assignedActionId, context)
    store.resolveAction(playerId, shipId, mockPlayer.assignedActions[0].id);

    // 3. Verify state
    const updatedShip = useGameStore.getState().playerShips.find(s => s.id === shipId)!;
    
    // Should be 2 (normal success) or 3 (precision success)
    expect(updatedShip.evasiveManeuvers).toBeGreaterThanOrEqual(2);
    expect(updatedShip.evasiveManeuvers).toBeLessThanOrEqual(3);
    
    // Generic evasionModifiers should remain 0
    expect(updatedShip.evasionModifiers).toBe(0);
  });

  it('resets evasiveManeuvers at the end of the round', () => {
    const store = useGameStore.getState();
    
    // 1. Setup a ship with existing maneuvers
    const shipId = 'test-ship';
    const mockShip: any = {
      id: shipId,
      evasiveManeuvers: 3,
      evasionModifiers: 1,
      shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
      maxShieldsPerSector: 5,
      criticalDamage: [],
      position: { q: 0, r: 0 },
      targetLocks: []
    };

    useGameStore.setState({
      playerShips: [mockShip],
      enemyShips: [],
      stations: [],
      terrainMap: new Map(),
      phase: 'cleanup',
      warpedOutShipIds: [],
      successfulEscapes: 0,
      extractionWindowShipIds: [],
      scenarioRules: []
    });

    // 2. Trigger cleanup (run the cleanup logic)
    // In the store, cleanup is part of executeCleanupPhase()
    store.executeCleanupPhase();

    // 3. Verify reset
    const updatedShip = useGameStore.getState().playerShips.find(s => s.id === shipId)!;
    expect(updatedShip.evasiveManeuvers).toBe(0);
    expect(updatedShip.evasionModifiers).toBe(0);
  });
});
