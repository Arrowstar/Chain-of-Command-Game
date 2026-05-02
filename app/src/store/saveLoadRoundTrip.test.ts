import { describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

function serializeGameState(state: ReturnType<typeof useGameStore.getState>): string {
  return JSON.stringify(state, (_key, value) => {
    if (value instanceof Map) {
      return { __type: 'Map', entries: Array.from(value.entries()) };
    }
    if (typeof value === 'function') {
      return undefined;
    }
    return value;
  });
}

function deserializeGameState(serialized: string) {
  return JSON.parse(serialized, (_key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Map') {
      return new Map(value.entries);
    }
    return value;
  });
}

function takeSerializableSnapshot() {
  return deserializeGameState(serializeGameState(useGameStore.getState()));
}

describe('Game state persistence round-trip', () => {
  it('restores a large combat state exactly, including ordnance load status and round data', () => {
    useGameStore.setState({
      round: 4,
      phase: 'execution',
      fleetFavor: 7,
      startingFleetFavor: 3,
      objectiveType: 'Breakout',
      activeRoE: {
        id: 'roe-1',
        name: 'Silent Running',
        rule: 'No ship may fire unless target locked.',
        reward: '+2 Fleet Favor',
        penalty: '-3 Fleet Favor to override',
        mechanicalEffect: { forwardArcOnly: true },
      },
      roeOverridden: true,
      currentTactic: {
        id: 'tactic-1',
        name: 'Signal Fog',
        effect: 'Jamming interference blankets the field.',
        mechanicalEffect: { extraDice: ['d6'] },
      },
      players: [
        {
          id: 'p1',
          name: 'Captain One',
          shipId: 's1',
          commandTokens: 4,
          maxCommandTokens: 6,
          pendingCommandTokenBonus: 1,
          assignedActions: [
            { id: 'a1', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1, resolved: false },
            { id: 'a2', station: 'sensors', actionId: 'target-lock', ctCost: 1, stressCost: 0, resolved: true },
          ],
          officers: [
            { officerId: 'vane', station: 'tactical', currentStress: 2, currentTier: 'elite', isLocked: false, lockDuration: 0, traumas: [{ id: 'gun-shy', name: 'Gun-Shy', effect: '+1 CT to fire-primary' }], hasFumbledThisRound: false, actionsPerformedThisRound: 1 },
            { officerId: 'vance', station: 'sensors', currentStress: 1, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [{ id: 'hyper-vigilant', name: 'Hyper Vigilant', effect: '+1 stress on sensors actions' }], hasFumbledThisRound: false, actionsPerformedThisRound: 2 },
          ],
        },
      ],
      playerShips: [
        {
          id: 's1',
          name: 'Resolute',
          chassisId: 'manticore',
          ownerId: 'p1',
          position: { q: 2, r: -1 },
          positionAtStartOfRound: { q: 1, r: -1 },
          facing: 0,
          currentSpeed: 2,
          currentHull: 7,
          maxHull: 10,
          shields: { fore: 1, foreStarboard: 0, aftStarboard: 2, aft: 3, aftPort: 1, forePort: 0 },
          maxShieldsPerSector: 4,
          equippedWeapons: ['heavy-railgun', 'seeker-torpedoes', 'flak-artillery'],
          equippedSubsystems: ['auto-loader', 'fighter-hangar'],
          criticalDamage: [{ id: 'crit-1', name: 'Shattered Relay', effect: 'Sensors offline', isRepaired: false }],
          scars: [{ id: 'scar-1', name: 'Warped Mount', effect: 'Lose one die on first shot', fromCriticalId: 'crit-1' }],
          armorDie: 'd4',
          baseEvasion: 5,
          evasionModifiers: 2,
          isDestroyed: false,
          hasDroppedBelow50: true,
          hasDrifted: true,
          firedWeaponThisRound: true,
          firedWeaponPreviousRound: false,
          firedWeaponIndicesThisRound: [0, 2],
          ordnanceLoadedStatus: { 0: false, 1: true },
          ordnanceLoadedIndicesThisRound: [1],
          targetLocks: ['e1'],
          predictiveVolleyActive: true,
          spoofedFireControlActive: true,
          fighterLaunchCounts: { 0: 1 },
          pdcDisabled: true,
          armorDisabled: true,
        } as any,
      ],
      enemyShips: [
        {
          id: 'e1',
          name: 'Interdictor',
          adversaryId: 'hegemony-interdictor',
          position: { q: 5, r: -1 },
          facing: 3,
          currentSpeed: 1,
          currentHull: 6,
          maxHull: 10,
          shields: { fore: 0, foreStarboard: 1, aftStarboard: 1, aft: 0, aftPort: 0, forePort: 1 },
          maxShieldsPerSector: 2,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: true,
          hasDrifted: false,
          targetLocks: [],
          baseEvasion: 6,
          armorDie: 'd4',
          evasionModifiers: 1,
          predictiveVolleyActive: false,
          spoofedFireControlActive: true,
        } as any,
      ],
      fighterTokens: [
        {
          id: 'f1',
          name: 'Sabre Wing',
          classId: 'strike-fighter',
          allegiance: 'allied',
          sourceShipId: 's1',
          position: { q: 3, r: -1 },
          facing: 0,
          currentHull: 1,
          maxHull: 1,
          speed: 4,
          baseEvasion: 8,
          volleyPool: ['d4', 'd4', 'd4'],
          weaponRangeMax: 1,
          behavior: 'escort',
          isDestroyed: false,
          hasDrifted: false,
          hasActed: true,
          assignedTargetId: 'e1',
        },
      ],
      torpedoTokens: [
        {
          id: 't1',
          name: 'Seeker',
          allegiance: 'allied',
          sourceShipId: 's1',
          targetShipId: 'e1',
          position: { q: 4, r: -1 },
          facing: 0,
          currentHull: 1,
          maxHull: 1,
          speed: 4,
          baseEvasion: 5,
          isDestroyed: false,
          hasMoved: true,
        },
      ],
      objectiveMarkers: [
        { name: 'Relay Alpha', position: { q: 6, r: -2 }, hull: 2, maxHull: 2, isDestroyed: false, isCollected: false },
      ],
      terrainMap: new Map([
        ['2,-1', 'ionNebula'],
        ['4,-1', 'asteroids'],
        ['5,-1', 'debrisField'],
      ]),
      log: [
        { type: 'combat', message: 'Volley exchanged.' },
        { type: 'system', message: 'Ordnance status updated.' },
      ],
      tacticalOverrideShipIds: ['s1'],
      targetingPackages: [{ attackerShipId: 's1', targetShipId: 'e1', mode: 'tn' }],
      exposedEnemyShipId: 'e1',
      flakUmbrellaShipId: 's1',
      extractionWindowShipIds: ['s1'],
      pendingSpawns: [{ turn: 5, adversaryIds: ['hunter-killer'], description: 'Reinforcements inbound' }],
      tacticHazards: [{ id: 'mine-1', name: 'Mine', position: { q: 3, r: -2 }, damage: 2, expiresAfterRound: 5 }],
      salvageCratesCollected: 2,
      dataSiphonedRelayNames: ['Relay Alpha'],
      successfulEscapes: 1,
      warpedOutShipIds: ['s9'],
      smallShipsDestroyedThisMission: 3,
    } as any);

    const originalSnapshot = takeSerializableSnapshot();
    const serialized = serializeGameState(useGameStore.getState());

    useGameStore.getState().resetGame();
    useGameStore.setState(deserializeGameState(serialized));

    expect(takeSerializableSnapshot()).toEqual(originalSnapshot);
    expect(useGameStore.getState().playerShips[0].ordnanceLoadedStatus).toEqual({ 0: false, 1: true });
  });
});
