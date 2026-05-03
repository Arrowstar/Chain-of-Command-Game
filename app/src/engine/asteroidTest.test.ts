
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeDrift } from '../engine/movement';
import { applyGravityWellPull } from '../engine/gravityWell';
import { HexFacing, TerrainType, ShipState, EnemyShipState } from '../types/game';

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

  it('Drift: entering asteroid field triggers D6 roll and potential damage', () => {
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set('1,-1', TerrainType.Asteroids);

    // Mock Math.random to guarantee a '1' on D6 and '3' on D4
    // D6: Math.floor(0 * 6) + 1 = 1
    // D4: Math.floor(0.5 * 4) + 1 = 3
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0); // D6 roll
    randomSpy.mockReturnValueOnce(0.5); // D4 damage

    const result = executeDrift(dummyShip, occupied, terrain, false);

    expect(result.finalPosition).toEqual({ q: 1, r: -1 });
    expect(result.terrainDamage).toBe(3);
    expect(result.resultingSpeed).toBe(0);
  });

  it('Gravity Well: pulling into asteroid field SHOULD trigger roll (but currently does not?)', () => {
    const playerShips = [dummyShip];
    const enemyShips: EnemyShipState[] = [];
    const gravityWellHexes = [{ q: 2, r: -2 }]; // 2 steps away in Fore direction
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set('1,-1', TerrainType.Asteroids); // Pulled into this hex

    // If it triggers a roll, we should see Math.random calls
    const randomSpy = vi.spyOn(Math, 'random');

    const results = applyGravityWellPull(playerShips, enemyShips, gravityWellHexes, occupied);

    expect(results[0].toPos).toEqual({ q: 1, r: -1 });
    // CURRENT BEHAVIOR: No roll, no damage field in results
    // GravityPullResult only has collisionDamage, not terrainDamage.
    expect(randomSpy).not.toHaveBeenCalled(); 
  });
});
