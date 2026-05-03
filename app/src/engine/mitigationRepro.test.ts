import { describe, it, expect, vi } from 'vitest';
import * as diceRoller from '../utils/diceRoller';
import { resolveAttack } from './combat';

describe('Mitigation Calculation Fix Verification', () => {
  it('should correctly calculate net overflow hits (remaining damage)', () => {
    // User reported scenario: 3 overflow hits, armor roll 1.
    // Expected: Net Overflow Hits = 2 (3 - 1).
    
    // We mock the volley pool results to get exactly 3 standard hits and no crits.
    const mockVolleyResult = {
      dice: [
        { dieType: 'd6', rolls: [4], total: 4, isHit: true, isCritical: false, source: 'weapon' },
        { dieType: 'd6', rolls: [4], total: 4, isHit: true, isCritical: false, source: 'weapon' },
        { dieType: 'd6', rolls: [4], total: 4, isHit: true, isCritical: false, source: 'weapon' }
      ],
      targetNumber: 4,
      totalHits: 3,
      totalCrits: 0,
      totalStandardHits: 3,
      totalCriticalHits: 0,
    };

    const rollVolleySpy = vi.spyOn(diceRoller, 'rollVolley').mockReturnValue(mockVolleyResult as any);
    const rollDieSpy = vi.spyOn(diceRoller, 'rollDie').mockReturnValue(1); // Armor roll of 1

    const weapon = {
      id: 'test-weapon',
      name: 'Test Weapon',
      rangeMin: 0,
      rangeMax: 10,
      volleyPool: ['d6', 'd6', 'd6'],
      arcs: ['fore'],
      tags: [],
    } as any;

    const result = resolveAttack(
      { q: 0, r: 0 }, 0,
      { q: 1, r: -1 }, 0,
      4, // defender evasion
      { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 }, // 0 shields to ensure overflow
      'd4', // armor die
      10, 10, false, // hull state
      weapon,
      [], // pool (mocked)
      'open',
      0, 0, false, false, false, true // ignore range
    );

    // Verify the fix: netOverflowHits should be the remaining damage (3 - 1 = 2)
    expect(result.overflowHits).toBe(3);
    expect(result.armorRoll).toBe(1);
    expect(result.netOverflowHits).toBe(2);
    expect(result.hullDamage).toBe(2);

    rollVolleySpy.mockRestore();
    rollDieSpy.mockRestore();
  });

  it('should respect the "Min 1" rule even when armor roll exceeds overflow hits', () => {
    // 1 overflow hit, armor roll 4.
    // Expected: Net Overflow Hits = 1 (clamped to 1).
    
    const mockVolleyResult = {
      dice: [{ dieType: 'd6', rolls: [4], total: 4, isHit: true, isCritical: false, source: 'weapon' }],
      targetNumber: 4,
      totalHits: 1,
      totalCrits: 0,
      totalStandardHits: 1,
      totalCriticalHits: 0,
    };

    const rollVolleySpy = vi.spyOn(diceRoller, 'rollVolley').mockReturnValue(mockVolleyResult as any);
    const rollDieSpy = vi.spyOn(diceRoller, 'rollDie').mockReturnValue(4); // Armor roll of 4

    const weapon = {
      id: 'test-weapon',
      name: 'Test Weapon',
      rangeMin: 0,
      rangeMax: 10,
      volleyPool: ['d6'],
      arcs: ['fore'],
      tags: [],
    } as any;

    const result = resolveAttack(
      { q: 0, r: 0 }, 0,
      { q: 1, r: -1 }, 0,
      4,
      { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
      'd4',
      10, 10, false,
      weapon,
      [],
      'open',
      0, 0, false, false, false, true
    );

    expect(result.overflowHits).toBe(1);
    expect(result.armorRoll).toBe(4);
    expect(result.netOverflowHits).toBe(1); // Min 1 rule
    expect(result.hullDamage).toBe(1);

    rollVolleySpy.mockRestore();
    rollDieSpy.mockRestore();
  });
});
