import { describe, expect, it, vi } from 'vitest';
import { moveTorpedo, resolveTorpedoAttack } from './torpedoMovement';
import type { TorpedoToken, TerrainType } from '../types/game';
import { hexKey } from './hexGrid';

// Mock rollVolley
vi.mock('../utils/diceRoller', () => ({
  rollVolley: vi.fn((pool, tn) => ({
    totalHits: pool.length, // hit by default
    dice: pool.map(() => ({ rolls: [10] })),
  })),
}));

describe('Torpedo Movement & Physics', () => {
  const makeTorpedo = (overrides: Partial<TorpedoToken> = {}): TorpedoToken => ({
    id: 't1',
    name: 'Seeker 1',
    allegiance: 'allied',
    sourceShipId: 's1',
    targetShipId: 'e1',
    position: { q: 0, r: 0 },
    facing: 0,
    currentHull: 1,
    maxHull: 1,
    speed: 4,
    baseEvasion: 5,
    hasMoved: false,
    isDestroyed: false,
    ...overrides,
  });

  describe('moveTorpedo', () => {
    it('moves along a straight line toward target', () => {
      const torpedo = makeTorpedo({ position: { q: 0, r: 0 }, speed: 4 });
      const targetPos = { q: 5, r: 0 };
      
      const result = moveTorpedo(torpedo, targetPos, new Map());
      
      expect(result.newPosition).toEqual({ q: 4, r: 0 }); // Moved 4 hexes
      expect(result.reachedTarget).toBe(false);
      expect(result.traversedHexes.length).toBe(4);
    });

    it('stops exactly at target if speed is sufficient', () => {
      const torpedo = makeTorpedo({ position: { q: 0, r: 0 }, speed: 4 });
      const targetPos = { q: 2, r: 0 };
      
      const result = moveTorpedo(torpedo, targetPos, new Map());
      
      expect(result.newPosition).toEqual(targetPos);
      expect(result.reachedTarget).toBe(true);
      expect(result.traversedHexes.length).toBe(2);
    });

    it('is destroyed when entering a debris field', () => {
      const torpedo = makeTorpedo({ position: { q: 0, r: 0 }, speed: 4 });
      const targetPos = { q: 5, r: 0 };
      const terrainMap = new Map([[hexKey({ q: 2, r: 0 }), 'debrisField' as TerrainType]]);
      
      const result = moveTorpedo(torpedo, targetPos, terrainMap);
      
      expect(result.isDestroyed).toBe(true);
      expect(result.newPosition).toEqual({ q: 1, r: 0 }); // Stopped BEFORE the debris field hex
      expect(result.traversedHexes.length).toBe(1);
    });

    it('does not move if hasMoved is true', () => {
        const torpedo = makeTorpedo({ position: { q: 0, r: 0 }, hasMoved: true });
        const result = moveTorpedo(torpedo, { q: 5, r: 0 }, new Map());
        expect(result.newPosition).toEqual({ q: 0, r: 0 });
        expect(result.traversedHexes.length).toBe(0);
    });
  });

  describe('resolveTorpedoAttack', () => {
    it('deals 3 hull damage on hit', () => {
      const torpedo = makeTorpedo();
      const result = resolveTorpedoAttack(torpedo, 5);
      
      expect(result.hit).toBe(true);
      expect(result.hullDamage).toBe(3);
    });
  });
});
