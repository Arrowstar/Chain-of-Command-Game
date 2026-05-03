
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeDrift, resolveAsteroidEntry } from '../engine/movement';
import { applyGravityWellPull } from '../engine/gravityWell';
import { planAIMovement } from './ai/behaviors';
import { HexFacing, TerrainType, type ShipState, type EnemyShipState } from '../types/game';
import { hexKey } from './hexGrid';

const dummyShip: ShipState = {
  id: 'ship-1',
  name: 'Test Vessel',
  chassisId: 'vanguard',
  ownerId: 'player-1',
  position: { q: 0, r: 0 },
  facing: HexFacing.Fore,
  currentSpeed: 1,
  currentHull: 10,
  maxHull: 12,
  shields: { fore: 4, foreStarboard: 4, aftStarboard: 4, aft: 4, aftPort: 4, forePort: 4 },
  maxShieldsPerSector: 4,
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

describe('Asteroid Entry Logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Drift: entering asteroid field triggers D6 roll and returns result', () => {
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set(hexKey({ q: 1, r: -1 }), 'asteroids' as any);

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0); // D6 roll = 1
    randomSpy.mockReturnValueOnce(0.5); // D4 damage = 3

    const result = executeDrift(dummyShip, occupied, terrain, false);

    expect(result.finalPosition).toEqual({ q: 1, r: -1 });
    expect(result.asteroidRoll?.entryRoll).toBe(1);
    expect(result.asteroidRoll?.damage).toBe(3);
    expect(result.terrainDamage).toBe(3);
  });

  it('Gravity Well: pulling into asteroid field now triggers roll and returns result', () => {
    const playerShips = [dummyShip];
    const enemyShips: EnemyShipState[] = [];
    const gravityWellHexes = [{ q: 2, r: -2 }];
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set(hexKey({ q: 1, r: -1 }), 'asteroids' as any);

    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0); // D6 roll = 1
    randomSpy.mockReturnValueOnce(0.5); // D4 damage = 3

    const results = applyGravityWellPull(playerShips, enemyShips, gravityWellHexes, occupied, terrain);

    expect(results[0].toPos).toEqual({ q: 1, r: -1 });
    expect(results[0].asteroidRoll?.entryRoll).toBe(1);
    expect(results[0].asteroidRoll?.damage).toBe(3);
  });

  it('AI Pathfinding: capital ships can now enter asteroids but are halted', () => {
    const aiPos = { q: 0, r: 0 };
    const aiFacing = HexFacing.Fore;
    const targetPos = { q: 2, r: -2 };
    const terrain = new Map<string, TerrainType>();
    terrain.set(hexKey({ q: 1, r: -1 }), 'asteroids' as any);
    
    const plan = planAIMovement(aiPos, aiFacing, 2, targetPos, 'aggressive', 1, new Set(), terrain, 0, false);

    // Should stop at (1,-1) because it's an asteroid
    expect(plan.targetHex).toEqual({ q: 1, r: -1 });
  });

  it('AI Pathfinding: prefers avoiding asteroids if a clean path is available', () => {
    const aiPos = { q: 0, r: 0 };
    const aiFacing = HexFacing.Fore;
    const targetPos = { q: 1, r: 0 }; // Change target to something closer
    const terrain = new Map<string, TerrainType>();
    terrain.set(hexKey({ q: 1, r: -1 }), 'asteroids' as any);
    
    // Path 1: (0,0) -> (1,-1) [Asteroids, HALT, dist to target = 1]
    // Path 2: (0,0) -> turn CW(1) -> (1,0) [Open, dist to target = 0]
    
    const plan = planAIMovement(aiPos, aiFacing, 2, targetPos, 'aggressive', 1, new Set(), terrain, 0, false);

    expect(plan.targetHex).toEqual({ q: 1, r: 0 });
  });
});
