import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';

describe('Station Combat Mechanics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.getState().resetUI();
    useGameStore.setState({
      round: 1,
      phase: 'command',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 5,
          assignedActions: [],
          officers: [
            { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', traumas: [], actionsPerformedThisRound: 0, isLocked: false, lockDuration: 0, usedMethodicalThisRound: false },
            { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', traumas: [], actionsPerformedThisRound: 0, isLocked: false, lockDuration: 0, usedMethodicalThisRound: false },
            { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', traumas: [], actionsPerformedThisRound: 0, isLocked: false, lockDuration: 0, usedMethodicalThisRound: false },
          ]
        } as any
      ],
      playerShips: [
        {
          id: 's1', name: 'Ship 1', chassisId: 'c1', ownerId: 'p1',
          position: { q: 0, r: 0 }, facing: 0, currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
          maxShieldsPerSector: 2,
          equippedWeapons: ['plasma-battery'], equippedSubsystems: [], criticalDamage: [], scars: [], targetLocks: [], targetLocksRerolls: 0, targetLockArmorPiercingShots: 0,
          baseEvasion: 5, evasionModifiers: 0, currentSpeed: 0, isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, ordnanceJammed: false, navLockout: false, disabledWeaponIndices: []
        } as any
      ],
      enemyShips: [],
      stations: [
        {
          id: 'st1', name: 'Station 1', stationId: 'outpost', position: { q: 1, r: 0 },
          currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
          maxShieldsPerSector: 2,
          isDestroyed: false, targetLocks: [], targetLocksRerolls: 0, targetLockArmorPiercingShots: 0, criticalDamage: [], hasActed: false
        } as any
      ],
      terrainMap: new Map(),
      log: [],
      scenarioRules: [],
      activeRoE: null,
      roeOverridden: false,
      experimentalTech: [],
      shipsWithHullDamageThisRound: [],
      extractionWindowShipIds: [],
      fumbleDeck: [],
      tacticHazards: [],
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      inertialDampenersTriggeredShipIds: [],
    });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('Target Lock on a station is consumed after an attack', () => {
    useGameStore.setState(state => {
      const st = { ...state.stations[0], targetLocks: [-2], targetLockArmorPiercingShots: 1 };
      return { stations: [st] };
    });

    useGameStore.setState(state => {
      const p = { ...state.players[0] };
      p.assignedActions = [{ id: 'atk-1', station: 'tactical', actionId: 'fire-primary', targetShipId: 'st1', ctCost: 1, stressCost: 1, resolved: false }];
      return { players: [p], phase: 'execution' };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'atk-1', { targetShipId: 'st1' });

    const station = useGameStore.getState().stations[0];
    
    expect(station.targetLocks).toEqual([-2]);
    expect(station.targetLockArmorPiercingShots).toBe(0);
  });

  it('Target Lock on a station is cleared during Cleanup Phase', () => {
    useGameStore.setState(state => {
      const st = { ...state.stations[0], targetLocks: [-2], targetLockArmorPiercingShots: 1 };
      return { stations: [st] };
    });

    useGameStore.getState().executeCleanupPhase();

    const station = useGameStore.getState().stations[0];
    expect(station.targetLocks).toEqual([]);
    expect(station.targetLockArmorPiercingShots).toBe(0);
  });

  it('Damage Control log correctly reports repaired amount', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    
    useGameStore.setState(state => {
      const ship = { ...state.playerShips[0], currentHull: 5 };
      const p = { ...state.players[0] };
      p.assignedActions = [{ id: 'rep-1', station: 'engineering', actionId: 'damage-control', targetShipId: 's1', ctCost: 1, stressCost: 1, resolved: false }];
      return { playerShips: [ship], players: [p], phase: 'execution' };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'rep-1', { targetShipId: 's1' });

    const log = useGameStore.getState().log;
    const repairLog = log.find(l => l.type === 'repair');
    
    expect(repairLog).toBeDefined();
    expect(repairLog?.message).toContain('Repaired 2 hull');
    spy.mockRestore();
  });
});
