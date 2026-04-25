import { describe, it, expect } from 'vitest';
import { hexDistance, getRangeBand, determineStruckShieldSector, hexNeighbor, computeDriftPath, checkLineOfSight } from './hexGrid';
import type { ShipArc } from '../types/game';
import { TerrainType } from '../types/game';

describe('hexGrid', () => {
  it('hexDistance computes correctly', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(hexDistance({ q: -2, r: 2 }, { q: 2, r: -2 })).toBe(4);
  });

  it('getRangeBand returns correct bands', () => {
    expect(getRangeBand(1)).toBe('short');
    expect(getRangeBand(4)).toBe('medium');
    expect(getRangeBand(5)).toBe('long');
  });

  it('hexNeighbor returns correct neighbor', () => {
    const origin = { q: 0, r: 0 };
    expect(hexNeighbor(origin, 0)).toEqual({ q: 1, r: -1 }); // 0 = Fore
    expect(hexNeighbor(origin, 3)).toEqual({ q: -1, r: 1 }); // 3 = Aft
  });

  it('computeDriftPath returns correct path', () => {
    const start = { q: 0, r: 0 };
    const path = computeDriftPath(start, 1, 2); // 1 = ForeStarboard
    expect(path.length).toBe(2);
    expect(path[0]).toEqual({ q: 1, r: 0 });
    expect(path[1]).toEqual({ q: 2, r: 0 });
  });

  it('determineStruckShieldSector calculates correctly', () => {
    const center = { q: 0, r: 0 };
    const foreNeighbor = { q: 1, r: -1 };
    
    // Attacker is exactly at Fore 
    let sector = determineStruckShieldSector(foreNeighbor, center, 0); // 0 = Fore
    expect(sector).toBe('fore');

    // Defender facing Aft, attacker at Fore of map (which is Aft relative to defender's facing)
    sector = determineStruckShieldSector(foreNeighbor, center, 3); // 3 = Aft
    expect(sector).toBe('aft');
  });

  it('checkLineOfSight detects blocking terrain', () => {
    const terrainMap = new Map<string, TerrainType>();
    // Asteroid between (0,0) and (2,-2) -> at (1,-1)
    terrainMap.set('1,-1', TerrainType.Asteroids);

    const result = checkLineOfSight({ q: 0, r: 0 }, { q: 2, r: -2 }, terrainMap);
    expect(result.clear).toBe(false);
    expect(result.blockedBy).toEqual({ q: 1, r: -1 });
  });

  it('checkLineOfSight ignores non-blocking terrain', () => {
    const terrainMap = new Map<string, TerrainType>();
    // Nebula between (0,0) and (2,-2) -> at (1,-1)
    terrainMap.set('1,-1', TerrainType.IonNebula);

    const result = checkLineOfSight({ q: 0, r: 0 }, { q: 2, r: -2 }, terrainMap);
    expect(result.clear).toBe(true);
    expect(result.blockedBy).toBeNull();
  });
});
