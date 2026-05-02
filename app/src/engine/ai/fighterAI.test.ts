import { describe, expect, it, vi } from 'vitest';
import { resolveFighterMovement, resolveFighterAttack, buildCarrierFighters } from './fighterAI';
import type { FighterToken, ShipState, EnemyShipState, StationState, TerrainType } from '../../types/game';
import { hexKey } from '../hexGrid';

// Mock dependencies
vi.mock('../../utils/diceRoller', () => ({
  rollVolley: vi.fn((pool, tn) => ({
    totalHits: pool.length, // Guarantee hits for testing
    totalCriticalHits: 0,
    totalStandardHits: pool.length,
    dice: pool.map(() => ({ rolls: [6], result: 'hit' })),
  })),
  rollDie: vi.fn(() => 1),
}));

vi.mock('../../data/fighters', () => ({
  getFighterClassById: vi.fn((id) => ({
    id,
    name: 'Test Fighter',
    hull: 1,
    speed: 3,
    baseEvasion: 5,
    volleyPool: ['d6', 'd6'],
    weaponRangeMax: 1,
  })),
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

describe('Fighter AI', () => {
  const makeFighter = (overrides: Partial<FighterToken> = {}): FighterToken => ({
    id: 'f1',
    name: 'Saber 1',
    classId: 'test-fighter',
    allegiance: 'allied',
    sourceShipId: 'carrier-1',
    position: { q: 0, r: 0 },
    facing: 0,
    currentHull: 1,
    maxHull: 1,
    speed: 3,
    baseEvasion: 5,
    volleyPool: ['d6', 'd6'],
    weaponRangeMax: 1,
    behavior: 'attack',
    isDestroyed: false,
    hasDrifted: false,
    hasActed: false,
    assignedTargetId: 'enemy-1',
    ...overrides,
  });

  const makeEnemyShip = (overrides: Partial<EnemyShipState> = {}): EnemyShipState => ({
    id: 'enemy-1',
    name: 'Enemy',
    adversaryId: 'hunter-killer',
    position: { q: 2, r: 0 },
    facing: 0,
    currentSpeed: 0,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 5,
    armorDie: 'd4',
    ...overrides,
  });

  describe('resolveFighterMovement', () => {
    it('moves toward assigned target in attack behavior', () => {
      const fighter = makeFighter({ position: { q: 0, r: 0 }, behavior: 'attack', assignedTargetId: 'enemy-1' });
      const enemy = makeEnemyShip({ position: { q: 2, r: 0 } });
      
      const result = resolveFighterMovement(fighter, [], [enemy], [fighter], new Map(), [], []);
      
      expect(result.moved).toBe(true);
      expect(result.newPosition).toEqual({ q: 2, r: 0 });
    });

    it('respects stacking limits (max 3 per hex)', () => {
        const goal = { q: 1, r: 0 };
        const otherFighters = [
            makeFighter({ id: 'f2', position: goal }),
            makeFighter({ id: 'f3', position: goal }),
            makeFighter({ id: 'f4', position: goal }),
        ];
        const fighter = makeFighter({ id: 'f1', position: { q: 0, r: 0 }, behavior: 'attack', assignedTargetId: 'enemy-1' });
        const enemy = makeEnemyShip({ position: goal });

        const result = resolveFighterMovement(fighter, [], [enemy], [fighter, ...otherFighters], new Map(), [], []);

        expect(result.newPosition).not.toEqual(goal);
        expect(result.newPosition).toEqual({ q: 0, r: 0 }); // Stays put because goal is full and no other path
    });

    it('navigates around debris fields', () => {
        const fighter = makeFighter({ position: { q: 0, r: 0 }, behavior: 'attack', assignedTargetId: 'enemy-1' });
        const enemy = makeEnemyShip({ position: { q: 2, r: 0 } });
        const terrainMap = new Map([[hexKey({ q: 1, r: 0 }), 'debrisField' as TerrainType]]);

        const result = resolveFighterMovement(fighter, [], [enemy], [fighter], terrainMap, [], []);

        expect(result.moved).toBe(true);
        expect(result.newPosition).not.toEqual({ q: 1, r: 0 });
        expect(result.traversedHexes).not.toContainEqual({ q: 1, r: 0 });
    });

    it('handles escort behavior (stays near source ship)', () => {
        const sourceShip: ShipState = { id: 'carrier-1', position: { q: 0, r: 0 } } as any;
        const fighter = makeFighter({ 
            allegiance: 'allied', 
            sourceShipId: 'carrier-1', 
            position: { q: 3, r: 0 }, 
            behavior: 'escort' 
        });

        const result = resolveFighterMovement(fighter, [sourceShip], [], [fighter], new Map(), [], []);

        expect(result.moved).toBe(true);
        expect(result.newPosition.q).toBeLessThan(3); // Moving toward (0,0)
    });

    it('handles screen behavior (targets nearby threats)', () => {
        const sourceShip: ShipState = { id: 'carrier-1', position: { q: 0, r: 0 } } as any;
        const fighter = makeFighter({ 
            allegiance: 'allied', 
            sourceShipId: 'carrier-1', 
            position: { q: 1, r: 0 }, 
            behavior: 'screen' 
        });
        const enemyFighter = makeFighter({ id: 'ef1', allegiance: 'enemy', position: { q: 1, r: 1 } });

        const result = resolveFighterMovement(fighter, [sourceShip], [], [fighter, enemyFighter], new Map(), [], []);

        expect(result.newPosition).toEqual({ q: 1, r: 1 }); // Chases the enemy fighter within 2 of source
    });
  });

  describe('resolveFighterAttack', () => {
    it('deals damage to capital ships', () => {
      const fighter = makeFighter({ position: { q: 1, r: 0 }, weaponRangeMax: 1, assignedTargetId: 'enemy-1' });
      const enemy = makeEnemyShip({ id: 'enemy-1', position: { q: 0, r: 0 }, shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 } });

      const result = resolveFighterAttack(fighter, [], [enemy], [fighter]);

      expect(result).not.toBeNull();
      expect(result?.hits).toBeGreaterThan(0);
      expect(result?.shieldDamage).toBeGreaterThan(0);
    });

    it('performs dogfighting against other fighters', () => {
        const fighter = makeFighter({ position: { q: 1, r: 0 }, weaponRangeMax: 1, assignedTargetId: 'enemy-f1' });
        const enemyFighter = makeFighter({ id: 'enemy-f1', allegiance: 'enemy', position: { q: 0, r: 0 } });

        const result = resolveFighterAttack(fighter, [], [], [fighter, enemyFighter]);

        expect(result).not.toBeNull();
        expect(result?.targetId).toBe('enemy-f1');
        expect(result?.sector).toBe('hull');
        expect(result?.hullDamage).toBeGreaterThan(0);
    });

    it('bypasses shields in Ion Nebula', () => {
        const fighter = makeFighter({ position: { q: 1, r: 0 }, assignedTargetId: 'enemy-1' });
        const enemy = makeEnemyShip({ id: 'enemy-1', position: { q: 0, r: 0 }, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 } });
        const terrainMap = new Map([[hexKey({ q: 0, r: 0 }), 'ionNebula' as TerrainType]]);

        const result = resolveFighterAttack(fighter, [], [enemy], [fighter], terrainMap);

        expect(result?.ionNebulaActive).toBe(true);
        expect(result?.shieldDamage).toBe(0);
        expect(result?.hullDamage).toBe(1); 
    });
  });

  describe('buildCarrierFighters', () => {
    it('creates two fighters in valid hexes', () => {
        const shipPos = { q: 0, r: 0 };
        const result = buildCarrierFighters('carrier-1', shipPos, 0, new Map(), new Map(), 'wave1');

        expect(result.length).toBe(2);
        expect(result[0].sourceShipId).toBe('carrier-1');
        expect(result[0].position).not.toEqual(shipPos);
    });
  });
});
