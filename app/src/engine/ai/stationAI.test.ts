import { describe, expect, it, vi } from 'vitest';
import { calculateStationAggroScores, executeStationTurn } from './stationAI';
import type { StationState, ShipState, EnemyShipState, TerrainType } from '../../types/game';

// Mock dependencies
vi.mock('../../utils/diceRoller', () => ({
  rollVolley: vi.fn((pool, tn) => ({
    totalHits: pool.length,
    totalCriticalHits: 0,
    totalStandardHits: pool.length,
    dice: pool.map(() => ({ rolls: [6], result: 'hit' })),
  })),
  rollDie: vi.fn(() => 1),
}));

vi.mock('../../data/stations', () => ({
  getStationById: vi.fn((id) => ({
    id,
    name: 'Test Station',
    hull: 20,
    shieldsPerSector: 5,
    armorDie: 'd6',
    baseEvasion: 3,
    weaponRangeMin: 1,
    weaponRangeMax: 5,
    volleyPool: ['d6', 'd6'],
    fighterHangar: {
        totalFighters: 10,
        fightersPerLaunch: 2,
    },
  })),
}));

vi.mock('../../data/fighters', () => ({
  pickEnemyFighterClass: vi.fn(() => ({
    fighterClass: {
        id: 'test-fighter',
        name: 'Test Fighter',
        hull: 1,
        speed: 3,
        baseEvasion: 5,
        volleyPool: ['d6', 'd6'],
        weaponRangeMax: 1,
    },
    behavior: 'attack',
  })),
}));

describe('Station AI', () => {
  const makeStation = (overrides: Partial<StationState> = {}): StationState => ({
    id: 's1',
    name: 'Outpost Alpha',
    stationId: 'outpost',
    position: { q: 0, r: 0 },
    facing: 0,
    currentHull: 20,
    maxHull: 20,
    shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
    maxShieldsPerSector: 5,
    armorDie: 'd6',
    baseEvasion: 3,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasActed: false,
    remainingFighters: 10,
    criticalDamage: [],
    ...overrides,
  });

  const makePlayerShip = (overrides: Partial<ShipState> = {}): ShipState => ({
    id: 'player-1',
    name: 'Resolute',
    chassisId: 'paladin',
    ownerId: 'player',
    position: { q: 2, r: 0 },
    facing: 3,
    currentSpeed: 0,
    currentHull: 12,
    maxHull: 12,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    maxShieldsPerSector: 3,
    criticalDamage: [],
    isDestroyed: false,
    baseEvasion: 5,
    evasionModifiers: 0,
    armorDie: 'd6',
    ...overrides,
  } as any);

  describe('calculateStationAggroScores', () => {
    it('prioritizes closest targets', () => {
      const station = makeStation({ position: { q: 0, r: 0 } });
      const t1 = makePlayerShip({ id: 't1', position: { q: 2, r: 0 } });
      const t2 = makePlayerShip({ id: 't2', position: { q: 5, r: 0 } });

      const scores = calculateStationAggroScores(station, [t1, t2]);
      expect(scores[0].targetId).toBe('t1');
    });

    it('prioritizes targets with stripped shields', () => {
        const station = makeStation({ position: { q: 0, r: 0 } });
        const t1 = makePlayerShip({ id: 't1', position: { q: 3, r: 0 }, shields: { fore: 0, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 } });
        const t2 = makePlayerShip({ id: 't2', position: { q: 3, r: 0 }, shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 } });

        const scores = calculateStationAggroScores(station, [t1, t2]);
        expect(scores[0].targetId).toBe('t1');
    });
  });

  describe('executeStationTurn', () => {
    it('attacks players in range', () => {
        const station = makeStation({ position: { q: 0, r: 0 } });
        const player = makePlayerShip({ position: { q: 2, r: 0 } });

        const result = executeStationTurn([station], [player], [], null, new Map(), [], 1);

        expect(result.actions.length).toBeGreaterThan(0);
        expect(result.actions.some(a => a.type === 'attack')).toBe(true);
        expect(result.playerDamage.length).toBeGreaterThan(0);
    });

    it('launches fighters if it has a hangar', () => {
        const station = makeStation({ position: { q: 0, r: 0 }, remainingFighters: 10 });
        const player = makePlayerShip({ position: { q: 10, r: 10 } }); // Out of range for attack

        const result = executeStationTurn([station], [player], [], null, new Map(), [], 1);

        expect(result.actions.some(a => a.type === 'launch')).toBe(true);
        expect(result.spawnedFighters.length).toBe(2); // 2 per launch in mock
        expect(result.stationUpdates.get(station.id)?.remainingFighters).toBe(8);
    });

    it('does not attack if no targets in range', () => {
        const station = makeStation({ position: { q: 0, r: 0 } });
        const player = makePlayerShip({ position: { q: 10, r: 0 } }); // Beyond range 5

        const result = executeStationTurn([station], [player], [], null, new Map(), [], 1);

        expect(result.actions.some(a => a.type === 'attack')).toBe(false);
    });
  });
});
