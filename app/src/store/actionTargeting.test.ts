import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, EnemyShipState, StationState, ObjectiveMarkerState } from '../types/game';

// ─── Helper: reset to a known test state ────────────────────────────────────
function buildBaseState() {
  useGameStore.setState({
    phase: 'execution',
    round: 1,
    activeRoE: null,
    currentTactic: null,
    tacticHazards: [],
    targetingPackages: [],
    tacticalOverrideShipIds: [],
    tachyonMatrixUsedThisScenario: false,
    experimentalTech: [],
    fighterTokens: [],
    torpedoTokens: [],
    stations: [
      {
        id: 'st1',
        name: 'Hegemony Platform',
        stationId: 'hegemony-platform',
        position: { q: 2, r: 0 },
        facing: 3,
        shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
        currentHull: 10,
        maxHull: 10,
        armorDie: 'd4',
        baseEvasion: 1,
        targetLocks: [],
        criticalDamage: [],
        isDestroyed: false,
        hasDroppedBelow50: false,
      } as unknown as StationState,
    ],
    objectiveMarkers: [
      {
        name: 'Objective Beacon',
        position: { q: 1, r: 1 },
        hull: 5,
        maxHull: 5,
        shieldsPerSector: 0,
        isDestroyed: false,
        isCollected: false,
      } as unknown as ObjectiveMarkerState,
    ],
    players: [
      {
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        commandTokens: 3,
        officers: [
          {
            officerId: 'vance',
            station: 'tactical',
            currentStress: 0,
            currentTier: 'veteran',
            traumas: [],
            usedSurgicalStrikeThisRound: false,
          },
        ],
        assignedActions: [
          { id: 'a-target-enemy',  station: 'tactical', actionId: 'target-lock',   resolved: false },
          { id: 'a-target-station',station: 'tactical', actionId: 'target-lock',   resolved: false },
          { id: 'a-fire-station',  station: 'tactical', actionId: 'fire-primary',  resolved: false },
          { id: 'a-fire-marker',   station: 'tactical', actionId: 'fire-primary',  resolved: false },
          { id: 'a-cyber-station', station: 'tactical', actionId: 'cyber-warfare', resolved: false },
        ],
      } as unknown as PlayerState,
    ],
    playerShips: [
      {
        id: 's1',
        name: 'Resolute',
        chassisId: 'frigate',
        ownerId: 'p1',
        position: { q: 0, r: 0 },
        facing: 0,
        equippedWeapons: ['plasma-battery'],
        equippedSubsystems: [],
        scars: [],
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        currentHull: 10,
        maxHull: 10,
        armorDie: 'd6',
        baseEvasion: 2,
        currentSpeed: 2,
        isDestroyed: false,
        firedWeaponThisRound: false,
        firedWeaponIndicesThisRound: [],
        disabledWeaponIndices: [],
        pdcDisabled: false,
        isJammed: false,
        predictiveVolleyActive: false,
        spoofedFireControlActive: false,
        evasiveManeuvers: 0,
        evasionModifiers: 0,
        ordnanceLoadedStatus: {},
        ordnanceLoadedIndicesThisRound: [],
        fighterLaunchCounts: {},
      } as unknown as ShipState,
    ],
    enemyShips: [
      {
        id: 'e1',
        name: 'Enemy Cruiser',
        adversaryId: 'cruiser',
        position: { q: 1, r: 0 },
        facing: 3,
        shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
        currentHull: 8,
        targetLocks: [],
        criticalDamage: [],
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        isAllied: false,
      } as unknown as EnemyShipState,
    ],
    terrainMap: new Map(),
    log: [],
  } as any);
}

describe('resolveAction — Station and Objective Marker Targeting', () => {
  beforeEach(() => {
    buildBaseState();
  });

  // ─── Target Lock ──────────────────────────────────────────────────────────

  it('target-lock: resolves against an enemy ship', () => {
    useGameStore.getState().resolveAction('p1', 's1', 'a-target-enemy', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    const enemy = state.enemyShips.find(s => s.id === 'e1')!;
    expect(enemy.targetLocks).toBeDefined();
    expect(enemy.targetLocks!.length).toBeGreaterThan(0);
    expect(state.players[0].assignedActions.find(a => a.id === 'a-target-enemy')!.resolved).toBe(true);
  });

  it('target-lock: resolves against a StationState (was silently failing)', () => {
    useGameStore.getState().resolveAction('p1', 's1', 'a-target-station', { targetShipId: 'st1' });

    const state = useGameStore.getState();
    const station = state.stations.find(s => s.id === 'st1')!;
    expect(station.targetLocks).toBeDefined();
    expect(station.targetLocks!.length).toBeGreaterThan(0);
    expect(state.players[0].assignedActions.find(a => a.id === 'a-target-station')!.resolved).toBe(true);
    // Should log that the lock was acquired
    expect(state.log.some(l => l.message.includes('Hegemony Platform'))).toBe(true);
  });

  // ─── Fire Primary ─────────────────────────────────────────────────────────

  it('fire-primary: resolves against a StationState and fires weapon (was silently failing)', () => {
    const stationBefore = useGameStore.getState().stations.find(s => s.id === 'st1')!.currentHull;

    useGameStore.getState().resolveAction('p1', 's1', 'a-fire-station', { targetShipId: 'st1' });

    const state = useGameStore.getState();
    expect(state.players[0].assignedActions.find(a => a.id === 'a-fire-station')!.resolved).toBe(true);
    // Combat log must be present for the station
    expect(state.log.some(l => l.type === 'combat' && l.message.includes('Hegemony Platform'))).toBe(true);
    // Hull should have changed (some damage should have occurred)
    const stationAfter = state.stations.find(s => s.id === 'st1')!.currentHull;
    expect(stationAfter).toBeLessThanOrEqual(stationBefore);
  });

  it('fire-primary: resolves against an ObjectiveMarker and fires weapon (was silently failing)', () => {
    const markerHullBefore = useGameStore.getState().objectiveMarkers.find(m => m.name === 'Objective Beacon')!.hull;

    useGameStore.getState().resolveAction('p1', 's1', 'a-fire-marker', { targetShipId: 'Objective Beacon' });

    const state = useGameStore.getState();
    expect(state.players[0].assignedActions.find(a => a.id === 'a-fire-marker')!.resolved).toBe(true);
    expect(state.log.some(l => l.type === 'combat' && l.message.includes('Objective Beacon'))).toBe(true);
    const markerHullAfter = state.objectiveMarkers.find(m => m.name === 'Objective Beacon')!.hull;
    expect(markerHullAfter).toBeLessThanOrEqual(markerHullBefore);
  });

  // ─── Cyber Warfare ────────────────────────────────────────────────────────

  it('cyber-warfare: strips shields on a StationState', () => {
    // Give the station shields first
    useGameStore.setState(s => ({
      stations: s.stations.map(st =>
        st.id === 'st1' ? { ...st, shields: { ...st.shields, fore: 2 } } : st
      ),
    }));

    useGameStore.getState().resolveAction('p1', 's1', 'a-cyber-station', { targetShipId: 'st1', sector: 'fore' });

    const state = useGameStore.getState();
    const station = state.stations.find(s => s.id === 'st1')!;
    expect(station.shields.fore).toBe(0);
    expect(state.players[0].assignedActions.find(a => a.id === 'a-cyber-station')!.resolved).toBe(true);
  });
});
