import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import { hexKey } from '../engine/hexGrid';
import type { PlayerState, ShipState, EnemyShipState, StationState, TerrainType } from '../types/game';

function basePlayerShip(overrides: Partial<ShipState> = {}): ShipState {
  return {
    kind: 'ship', faction: 'player', id: 's1', name: 'Vanguard',
    chassisId: 'vanguard', ownerId: 'p1',
    position: { q: 0, r: 0 }, facing: 0 as any,
    currentSpeed: 0, currentHull: 10, maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    equippedWeapons: [], equippedSubsystems: [],
    criticalDamage: [], scars: [],
    armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0,
    isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false,
    targetLocks: [], pdcDisabled: false,
    firedWeaponIndicesThisRound: [], ordnanceLoadedIndicesThisRound: [],
    ...overrides,
  } as unknown as ShipState;
}

function baseEnemyShip(overrides: Partial<EnemyShipState> = {}): EnemyShipState {
  return {
    kind: 'ship', faction: 'hegemony', id: 'e1', name: 'Raider',
    adversaryId: 'hunter-killer',
    position: { q: 3, r: 0 }, facing: 3 as any,
    currentSpeed: 0, currentHull: 12, maxHull: 12,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    maxShieldsPerSector: 3,
    criticalDamage: [], isDestroyed: false,
    hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
    baseEvasion: 5, armorDie: 'd6', evasionModifiers: 0,
    ...overrides,
  } as any;
}

describe('Ghost Contacts', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [] as PlayerState[],
      playerShips: [basePlayerShip()],
      enemyShips: [baseEnemyShip()],
      fighterTokens: [],
      torpedoTokens: [],
      stations: [],
      terrainMap: new Map(),
      ghostContacts: [],
      log: [],
      smallShipsDestroyedThisMission: 0,
    });
  });

  it('creates ghost contact for enemy in nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;

    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].entityId).toBe('e1');
    expect(ghostContacts[0].isIdentified).toBe(false);
    expect(ghostContacts[0].hex).toEqual({ q: 3, r: 0 });
  });

  it('does not create ghost contact for enemy NOT in nebula', () => {
    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('auto-reveals ghost contact when player ship is within range 1', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    // Move player ship to range 1 of enemy
    useGameStore.setState({
      playerShips: [basePlayerShip({ position: { q: 2, r: 0 } })],
      terrainMap,
    });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;

    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].isIdentified).toBe(true);
  });

  it('auto-reveals ghost contact when enemy has fired a weapon', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({
      enemyShips: [baseEnemyShip({ firedWeaponIndicesThisRound: [0] })],
      terrainMap,
    });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;

    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].isIdentified).toBe(true);
  });

  it('preserves isIdentified state from previous computation', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap, ghostContacts: [{ hex: { q: 3, r: 0 }, entityId: 'e1', isIdentified: true }] });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;

    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].isIdentified).toBe(true);
  });

  it('identifyGhostContact marks a ghost as identified', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts[0].isIdentified).toBe(false);

    useGameStore.getState().identifyGhostContact('e1');
    expect(useGameStore.getState().ghostContacts[0].isIdentified).toBe(true);
  });

  it('skips destroyed enemies', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({
      enemyShips: [baseEnemyShip({ isDestroyed: true })],
      terrainMap,
    });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('creates ghost contact when ship drifts into nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 5, r: 1 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap, enemyShips: [baseEnemyShip({ position: { q: 3, r: 0 } })] });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);

    // Ship moves into nebula
    useGameStore.getState().updateEnemyShip('e1', { position: { q: 5, r: 1 } });
    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;
    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].entityId).toBe('e1');
  });

  it('removes ghost contact when ship drifts out of nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(1);

    // Ship moves out of nebula
    useGameStore.getState().updateEnemyShip('e1', { position: { q: 0, r: 0 } });
    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('clears ghost contact when ship is destroyed in nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(1);

    // Ship destroyed while in nebula
    useGameStore.getState().updateEnemyShip('e1', { isDestroyed: true });
    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('handles multiple ships with mixed nebula positions', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    terrainMap.set(hexKey({ q: 5, r: 2 }), 'ionNebula' as TerrainType);
    useGameStore.setState({
      enemyShips: [
        baseEnemyShip({ id: 'e1', position: { q: 3, r: 0 } }), // in nebula
        baseEnemyShip({ id: 'e2', position: { q: 0, r: 0 } }), // not in nebula
        baseEnemyShip({ id: 'e3', position: { q: 5, r: 2 } }), // in nebula
      ],
      terrainMap,
    });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;
    expect(ghostContacts).toHaveLength(2);
    expect(ghostContacts.map(g => g.entityId).sort()).toEqual(['e1', 'e3']);

    // e1 drifts out, e2 drifts in
    useGameStore.getState().updateEnemyShip('e1', { position: { q: 0, r: 0 } });
    useGameStore.getState().updateEnemyShip('e2', { position: { q: 5, r: 2 } });
    useGameStore.getState().computeGhostContacts();
    const updated = useGameStore.getState().ghostContacts;
    expect(updated).toHaveLength(2);
    expect(updated.map(g => g.entityId).sort()).toEqual(['e2', 'e3']);
  });
});

function baseStation(overrides: Partial<StationState> = {}): StationState {
  return {
    kind: 'station', faction: 'hegemony', id: 'st1', name: 'Outpost',
    stationId: 'hegemony-station-outpost',
    position: { q: 3, r: 0 }, facing: 0 as any,
    currentHull: 20, maxHull: 20,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    maxShieldsPerSector: 3,
    armorDie: 'd8', baseEvasion: 2,
    isDestroyed: false, hasDroppedBelow50: false, hasActed: false,
    remainingFighters: 0, criticalDamage: [],
    ...overrides,
  } as any;
}

describe('Station Ghost Contacts', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [] as PlayerState[],
      playerShips: [basePlayerShip()],
      enemyShips: [],
      stations: [baseStation()],
      fighterTokens: [],
      torpedoTokens: [],
      terrainMap: new Map(),
      ghostContacts: [],
      log: [],
      smallShipsDestroyedThisMission: 0,
    });
  });

  it('creates ghost contact for station in nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;

    expect(ghostContacts).toHaveLength(1);
    expect(ghostContacts[0].entityId).toBe('st1');
    expect(ghostContacts[0].isIdentified).toBe(false);
  });

  it('does not create ghost contact for station NOT in nebula', () => {
    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('removes ghost contact when station is destroyed in nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(1);

    useGameStore.setState(s => ({
      stations: s.stations.map(st => st.id === 'st1' ? { ...st, isDestroyed: true } : st),
    }));
    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts).toHaveLength(0);
  });

  it('handles mixed ships and stations in nebula', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    terrainMap.set(hexKey({ q: 5, r: 2 }), 'ionNebula' as TerrainType);
    useGameStore.setState({
      enemyShips: [
        baseEnemyShip({ id: 'e1', position: { q: 3, r: 0 } }),
        baseEnemyShip({ id: 'e2', position: { q: 0, r: 0 } }),
      ],
      stations: [
        baseStation({ id: 'st1', position: { q: 5, r: 2 } }),
        baseStation({ id: 'st2', position: { q: 1, r: 0 } }),
      ],
      terrainMap,
    });

    useGameStore.getState().computeGhostContacts();
    const ghostContacts = useGameStore.getState().ghostContacts;
    expect(ghostContacts).toHaveLength(2);
    expect(ghostContacts.map(g => g.entityId).sort()).toEqual(['e1', 'st1']);
  });

  it('identifyGhostContact works for stations', () => {
    const terrainMap = new Map<string, TerrainType>();
    terrainMap.set(hexKey({ q: 3, r: 0 }), 'ionNebula' as TerrainType);
    useGameStore.setState({ terrainMap });

    useGameStore.getState().computeGhostContacts();
    expect(useGameStore.getState().ghostContacts[0].isIdentified).toBe(false);

    useGameStore.getState().identifyGhostContact('st1');
    expect(useGameStore.getState().ghostContacts[0].isIdentified).toBe(true);
  });
});
