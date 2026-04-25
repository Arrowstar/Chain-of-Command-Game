import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { EnemyShipState, ObjectiveMarkerState, PlayerState, ShipState, TerrainType } from '../types/game';

describe('Destroyed ship debris fields', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 0,
          maxCommandTokens: 0,
          assignedActions: [],
          officers: [],
        } as PlayerState,
      ],
      playerShips: [
        {
          id: 's1',
          name: 'Player Ship',
          chassisId: 'vanguard',
          ownerId: 'p1',
          position: { q: 0, r: 0 },
          facing: 0 as any,
          currentSpeed: 0,
          currentHull: 5,
          maxHull: 5,
          shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 0,
          equippedWeapons: [],
          equippedSubsystems: [],
          criticalDamage: [],
          scars: [],
          armorDie: 'd6',
          baseEvasion: 5,
          evasionModifiers: 0,
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
        } as ShipState,
      ],
      enemyShips: [
        {
          id: 'e1',
          name: 'Enemy Ship',
          adversaryId: 'hunter-killer',
          position: { q: 2, r: 0 },
          facing: 3 as any,
          currentSpeed: 0,
          currentHull: 5,
          maxHull: 5,
          shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 0,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
          baseEvasion: 5,
          armorDie: 'd6',
        } as EnemyShipState,
      ],
      fighterTokens: [],
      torpedoTokens: [],
      objectiveMarkers: [] as ObjectiveMarkerState[],
      terrainMap: new Map<string, TerrainType>([
        ['0,0', 'open'],
        ['2,0', 'open'],
      ]),
      log: [],
      fleetFavor: 0,
      smallShipsDestroyedThisMission: 0,
    } as Partial<ReturnType<typeof useGameStore.getState>>);
  });

  it('spawns debris when a player ship is destroyed on an otherwise empty open hex', () => {
    useGameStore.getState().updatePlayerShip('s1', { currentHull: 0, isDestroyed: true });
    expect(useGameStore.getState().terrainMap.get('0,0')).toBe('debrisField');
  });

  it('spawns debris when an enemy ship is destroyed on an otherwise empty open hex', () => {
    useGameStore.getState().updateEnemyShip('e1', { currentHull: 0, isDestroyed: true });
    expect(useGameStore.getState().terrainMap.get('2,0')).toBe('debrisField');
  });

  it('does not spawn debris if the hex already contains non-open terrain', () => {
    useGameStore.setState(state => ({
      terrainMap: new Map(state.terrainMap).set('2,0', 'asteroids'),
    }));
    useGameStore.getState().updateEnemyShip('e1', { currentHull: 0, isDestroyed: true });
    expect(useGameStore.getState().terrainMap.get('2,0')).toBe('asteroids');
  });
});
