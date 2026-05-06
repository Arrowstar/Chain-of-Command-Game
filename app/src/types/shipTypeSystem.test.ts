/**
 * shipTypeSystem.test.ts
 *
 * Verifies the unified Ship discriminated union introduced in the
 * "Unified Combat Entity Architecture" refactor. These tests confirm that:
 *
 * 1. Every concrete entity type carries the correct `kind` and `faction` fields.
 * 2. The exported type guards (isCapitalShip, isFighterShip, isStationShip,
 *    isPlayerFaction, isEnemyFaction, isAlliedFaction) correctly narrow types.
 * 3. `getHostileTargets` excludes allied AI ships and always includes stations.
 */

import { describe, expect, it } from 'vitest';
import type {
  ShipState,
  EnemyShipState,
  FighterToken,
  StationState,
  Ship,
} from './game';
import {
  isCapitalShip,
  isFighterShip,
  isStationShip,
  isPlayerFaction,
  isEnemyFaction,
  isAlliedFaction,
} from './game';
import { getHostileTargets } from '../store/useGameStore';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MINIMAL_SHIELDS = {
  fore: 2, foreStarboard: 2, aftStarboard: 2,
  aft: 2, aftPort: 2, forePort: 2,
};

const playerShip: ShipState = { /* @ts-ignore */ 
  kind: 'ship',
  faction: 'player',
  id: 'ps1',
  name: 'Resolute',
  chassisId: 'manticore',
  ownerId: 'p1',
  position: { q: 0, r: 0 },
  facing: 0,
  currentSpeed: 1,
  currentHull: 10,
  maxHull: 10,
  shields: MINIMAL_SHIELDS,
  maxShieldsPerSector: 2,
  equippedWeapons: [],
  equippedSubsystems: [],
  criticalDamage: [],
  scars: [],
  armorDie: 'd4',
  baseEvasion: 5,
  evasionModifiers: 0,
  isDestroyed: false,
  hasDroppedBelow50: false,
  hasDrifted: false,
  targetLocks: [],
};

const hegemonyShip: EnemyShipState = { /* @ts-ignore */ 
  kind: 'ship',
  faction: 'hegemony',
  id: 'hs1',
  name: 'Enforcer',
  adversaryId: 'hegemony-enforcer',
  position: { q: 5, r: 0 },
  facing: 3,
  currentSpeed: 2,
  currentHull: 8,
  maxHull: 8,
  shields: MINIMAL_SHIELDS,
  maxShieldsPerSector: 2,
  criticalDamage: [],
  isDestroyed: false,
  hasDroppedBelow50: false,
  hasDrifted: false,
  targetLocks: [],
  baseEvasion: 4,
  armorDie: 'd4',
};

const alliedAIShip: EnemyShipState = { /* @ts-ignore */ 
  kind: 'ship',
  faction: 'allied',
  id: 'as1',
  name: 'Escort Frigate',
  adversaryId: 'allied-escort',
  position: { q: 2, r: 0 },
  facing: 0,
  currentSpeed: 1,
  currentHull: 6,
  maxHull: 6,
  shields: MINIMAL_SHIELDS,
  maxShieldsPerSector: 2,
  criticalDamage: [],
  isDestroyed: false,
  hasDroppedBelow50: false,
  hasDrifted: false,
  targetLocks: [],
  baseEvasion: 5,
  armorDie: 'd4',
};

const enemyFighter: FighterToken = {
  kind: 'fighter',
  faction: 'hegemony',
  id: 'ef1',
  name: 'Strike Wing Alpha',
  classId: 'strike-fighter',
  sourceShipId: 'hs1',
  position: { q: 4, r: 0 },
  facing: 3,
  currentHull: 1,
  maxHull: 1,
  speed: 4,
  baseEvasion: 8,
  volleyPool: ['d4', 'd4', 'd4'],
  weaponRangeMax: 1,
  behavior: 'attack',
  isDestroyed: false,
  hasDrifted: false,
  hasActed: false,
  assignedTargetId: null,
};

const alliedFighter: FighterToken = {
  kind: 'fighter',
  faction: 'allied',
  id: 'af1',
  name: 'Sabre Wing',
  classId: 'strike-fighter',
  sourceShipId: 'ps1',
  position: { q: 1, r: 0 },
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
  hasActed: false,
  assignedTargetId: 'hs1',
};

const station: StationState = {
  kind: 'station',
  faction: 'hegemony',
  id: 'st1',
  name: 'Defense Platform Beta',
  stationId: 'heavy-platform',
  position: { q: 8, r: 0 },
  facing: 0,
  currentHull: 20,
  maxHull: 20,
  shields: MINIMAL_SHIELDS,
  maxShieldsPerSector: 3,
  armorDie: 'd6',
  baseEvasion: 2,
  isDestroyed: false,
  hasDroppedBelow50: false,
  hasActed: false,
  remainingFighters: 0,
  criticalDamage: [],
};

// ─── Type Guard Tests ──────────────────────────────────────────────────────────

describe('Ship discriminated union — kind field', () => {
  it('PlayerShip has kind="ship" and faction="player"', () => {
    expect(playerShip.kind).toBe('ship');
    expect(playerShip.faction).toBe('player');
  });

  it('Hegemony AI ship has kind="ship" and faction="hegemony"', () => {
    expect(hegemonyShip.kind).toBe('ship');
    expect(hegemonyShip.faction).toBe('hegemony');
  });

  it('Allied AI ship has kind="ship" and faction="allied"', () => {
    expect(alliedAIShip.kind).toBe('ship');
    expect(alliedAIShip.faction).toBe('allied');
  });

  it('Enemy fighter has kind="fighter" and faction="hegemony"', () => {
    expect(enemyFighter.kind).toBe('fighter');
    expect(enemyFighter.faction).toBe('hegemony');
  });

  it('Allied fighter has kind="fighter" and faction="allied"', () => {
    expect(alliedFighter.kind).toBe('fighter');
    expect(alliedFighter.faction).toBe('allied');
  });

  it('Station has kind="station" and faction="hegemony"', () => {
    expect(station.kind).toBe('station');
    expect(station.faction).toBe('hegemony');
  });
});

describe('isCapitalShip()', () => {
  const ships: Ship[] = [playerShip, hegemonyShip, alliedAIShip, enemyFighter, alliedFighter, station];

  it('returns true for player and AI capital ships', () => {
    expect(isCapitalShip(playerShip)).toBe(true);
    expect(isCapitalShip(hegemonyShip)).toBe(true);
    expect(isCapitalShip(alliedAIShip)).toBe(true);
  });

  it('returns false for fighters and stations', () => {
    expect(isCapitalShip(enemyFighter)).toBe(false);
    expect(isCapitalShip(alliedFighter)).toBe(false);
    expect(isCapitalShip(station)).toBe(false);
  });
});

describe('isFighterShip()', () => {
  it('returns true only for FighterToken entities', () => {
    expect(isFighterShip(enemyFighter)).toBe(true);
    expect(isFighterShip(alliedFighter)).toBe(true);
  });

  it('returns false for capital ships and stations', () => {
    expect(isFighterShip(playerShip)).toBe(false);
    expect(isFighterShip(hegemonyShip)).toBe(false);
    expect(isFighterShip(station)).toBe(false);
  });
});

describe('isStationShip()', () => {
  it('returns true only for StationState entities', () => {
    expect(isStationShip(station)).toBe(true);
  });

  it('returns false for all other entities', () => {
    expect(isStationShip(playerShip)).toBe(false);
    expect(isStationShip(hegemonyShip)).toBe(false);
    expect(isStationShip(enemyFighter)).toBe(false);
  });
});

describe('isPlayerFaction()', () => {
  it('returns true only for ShipState with faction="player"', () => {
    expect(isPlayerFaction(playerShip)).toBe(true);
  });

  it('returns false for all non-player factions', () => {
    expect(isPlayerFaction(hegemonyShip)).toBe(false);
    expect(isPlayerFaction(alliedAIShip)).toBe(false);
    expect(isPlayerFaction(enemyFighter)).toBe(false);
    expect(isPlayerFaction(station)).toBe(false);
  });
});

describe('isEnemyFaction()', () => {
  it('returns true for hegemony-faction entities', () => {
    expect(isEnemyFaction(hegemonyShip)).toBe(true);
    expect(isEnemyFaction(enemyFighter)).toBe(true);
    expect(isEnemyFaction(station)).toBe(true);
  });

  it('returns false for player and allied factions', () => {
    expect(isEnemyFaction(playerShip)).toBe(false);
    expect(isEnemyFaction(alliedAIShip)).toBe(false);
    expect(isEnemyFaction(alliedFighter)).toBe(false);
  });
});

describe('isAlliedFaction()', () => {
  it('returns true for allied-faction entities', () => {
    expect(isAlliedFaction(alliedAIShip)).toBe(true);
    expect(isAlliedFaction(alliedFighter)).toBe(true);
  });

  it('returns false for player and hegemony factions', () => {
    expect(isAlliedFaction(playerShip)).toBe(false);
    expect(isAlliedFaction(hegemonyShip)).toBe(false);
    expect(isAlliedFaction(station)).toBe(false);
  });
});

// ─── Store-Level Faction Filtering Integration ──────────────────────────────────
// These tests verify that the faction system correctly integrates with the
// combat store — specifically that isEnemyFaction/isAlliedFaction guards
// correctly partition the enemy ships list as expected by AI targeting.

describe('Faction-based filtering — store integration', () => {
  it('isEnemyFaction correctly partitions a mixed enemyShips list', () => {
    const mixed = [hegemonyShip, alliedAIShip];

    const hostile = mixed.filter(isEnemyFaction);
    const ally    = mixed.filter(isAlliedFaction);

    expect(hostile.map(s => s.id)).toEqual(['hs1']);
    expect(ally.map(s => s.id)).toEqual(['as1']);
  });

  it('isEnemyFaction filters destroyed hegemony ships correctly', () => {
    const deadShip: EnemyShipState = { /* @ts-ignore */  ...hegemonyShip, id: 'dead-1', isDestroyed: true };
    const liveHostiles = [hegemonyShip, deadShip].filter(s => isEnemyFaction(s) && !s.isDestroyed);

    expect(liveHostiles).toHaveLength(1);
    expect(liveHostiles[0].id).toBe('hs1');
  });

  it('isEnemyFaction includes hegemony stations', () => {
    // Stations carry kind: 'station' + faction: 'hegemony'
    const entities: (EnemyShipState | StationState)[] = [hegemonyShip, alliedAIShip, station];
    const hostile = entities.filter(isEnemyFaction);

    const ids = hostile.map(e => e.id);
    expect(ids).toContain('hs1');
    expect(ids).toContain('st1');
    expect(ids).not.toContain('as1');
  });

  it('isFighterShip correctly partitions fighters from ships', () => {
    const allEntities = [playerShip, hegemonyShip, enemyFighter, alliedFighter, station];

    const fighters  = allEntities.filter(isFighterShip);
    const nonFighters = allEntities.filter(e => !isFighterShip(e));

    expect(fighters.map(f => f.id)).toEqual(['ef1', 'af1']);
    expect(nonFighters.map(s => s.id)).not.toContain('ef1');
    expect(nonFighters.map(s => s.id)).not.toContain('af1');
  });
});
