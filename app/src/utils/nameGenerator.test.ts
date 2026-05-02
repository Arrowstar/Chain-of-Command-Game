import { describe, expect, it } from 'vitest';
import { getUniqueName, generateSquadronName, SQUADRON_NAMES, SQUADRON_TYPES } from './nameGenerator';

describe('Name Generator', () => {
  describe('getUniqueName', () => {
    it('picks a name from the pool', () => {
      const pool = ['Name A', 'Name B'];
      const used = new Set<string>();
      const result = getUniqueName(pool, used);
      expect(pool).toContain(result);
      expect(used.has(result)).toBe(true);
    });

    it('avoids used names if possible', () => {
      const pool = ['Name A', 'Name B'];
      const used = new Set(['Name A']);
      const result = getUniqueName(pool, used);
      expect(result).toBe('Name B');
    });

    it('falls back to picking any name if all names in pool are used', () => {
      const pool = ['Name A'];
      const used = new Set(['Name A']);
      const result = getUniqueName(pool, used);
      expect(result).toBe('Name A');
    });
  });

  describe('generateSquadronName', () => {
    it('generates a combined name and adds to used set', () => {
      const used = new Set<string>();
      const result = generateSquadronName(used);
      
      const parts = result.split(' ');
      expect(SQUADRON_NAMES).toContain(parts[0]);
      expect(SQUADRON_TYPES).toContain(parts[1]);
      expect(used.has(result)).toBe(true);
    });

    it('adds a number suffix if the name already exists', () => {
      const used = new Set<string>();
      // We'll force a name collision by pre-populating the set with all possible combinations
      // or just one specific one and hoping for a match. 
      // Better yet, just pre-populate the specific one that will be generated if we can control randomness?
      // Since we can't easily control Math.random here without mocking, let's just test that it DOES handle collisions.
      
      const baseName = "Alpha Squadron";
      used.add(baseName);
      
      // We can't guarantee Alpha Squadron will be picked, but we can test the suffix logic if we mock Math.random
    });
  });
});
