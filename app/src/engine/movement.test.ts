import { afterEach, describe, it, expect, vi } from 'vitest';
import { executeDrift, rotateShip, adjustSpeed, canOccupyHex } from './movement';
import type { ShipState } from '../types/game';
import { HexFacing, TerrainType } from '../types/game';

const dummyShip: ShipState = {
  id: 'ship-1',
  name: 'Test Vessel',
  chassisId: 'vanguard',
  ownerId: 'player-1',
  position: { q: 0, r: 0 },
  facing: HexFacing.Fore,
  currentSpeed: 2,
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

describe('movement engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('executeDrift moves the ship cleanly in open space', () => {
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    const result = executeDrift(dummyShip, occupied, terrain, false);
    
    expect(result.collision).toBe(false);
    expect(result.path.length).toBe(2);
    expect(result.finalPosition).toEqual({ q: 2, r: -2 }); // Fore direction twice
    expect(result.resultingSpeed).toBe(2);
  });

  it('executeDrift Halts and damages on collision', () => {
    const occupied = new Set<string>();
    occupied.add('2,-2'); // Blocking the second step
    const terrain = new Map<string, TerrainType>();
    
    const result = executeDrift(dummyShip, occupied, terrain, false);
    
    expect(result.collision).toBe(true);
    // Stops at first step
    expect(result.finalPosition).toEqual({ q: 1, r: -1 });
    expect(result.collidedWithHex).toEqual({ q: 2, r: -2 });
    expect(result.resultingSpeed).toBe(0);
    // Expect damage roll, usually > 0
    expect(result.collisionDamage).toBeGreaterThanOrEqual(1);
    expect(result.collisionDamage).toBeLessThanOrEqual(4);
  });

  it('executeDrift Halts on asteroids (ship enters asteroid hex)', () => {
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set('1,-1', TerrainType.Asteroids); // Asteroid on first step

    const result = executeDrift(dummyShip, occupied, terrain, false);

    expect(result.collision).toBe(false);
    // Rule fix: ship ENTERS the asteroid hex then halts (not before it)
    expect(result.finalPosition).toEqual({ q: 1, r: -1 });
    expect(result.resultingSpeed).toBe(0);
    expect(result.hazards.length).toBeGreaterThan(0);
    // terrainDamage is 0 unless the D6 entry roll was a 1 — just verify it's non-negative
    expect(result.terrainDamage).toBeGreaterThanOrEqual(0);
  });

  it('executeDrift applies asteroid hull damage after a failed entry roll', () => {
    const occupied = new Set<string>();
    const terrain = new Map<string, TerrainType>();
    terrain.set('1,-1', TerrainType.Asteroids);

    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.74);

    const result = executeDrift(dummyShip, occupied, terrain, false);

    expect(result.finalPosition).toEqual({ q: 1, r: -1 });
    expect(result.resultingSpeed).toBe(0);
    expect(result.terrainDamage).toBe(3);
  });

  it('rotateShip rotates correctly', () => {
    expect(rotateShip(HexFacing.Fore, 'clockwise')).toBe(HexFacing.ForeStarboard);
    expect(rotateShip(HexFacing.Fore, 'counterclockwise')).toBe(HexFacing.ForePort);
  });

  it('adjustSpeed clamps correctly', () => {
    expect(adjustSpeed(2, 1, 3)).toBe(3);
    expect(adjustSpeed(2, 2, 3)).toBe(3); // capped
    expect(adjustSpeed(2, -3, 3)).toBe(0); // floored
  });

  it('canOccupyHex allows small craft stacking up to 3', () => {
    const occupiedCapitals = new Set<string>();
    const smallCounts = new Map<string, number>();
    smallCounts.set('0,0', 2);
    
    expect(canOccupyHex({ q: 0, r: 0 }, occupiedCapitals, smallCounts, true)).toBe(true);
    
    smallCounts.set('0,0', 3);
    expect(canOccupyHex({ q: 0, r: 0 }, occupiedCapitals, smallCounts, true)).toBe(false);
  });
});
