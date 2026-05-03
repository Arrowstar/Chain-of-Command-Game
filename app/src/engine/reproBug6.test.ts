import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as diceRoller from '../utils/diceRoller';
import { resolveAttack } from './combat';

describe('Bug 6 Deep Dive', () => {
  it('should correctly handle a critical die that explodes into another hit', () => {
    // Manually construct the volley result to see if resolveAttack handles it correctly
    const mockVolleyResult = {
      dice: [
        {
          dieType: 'd6' as const,
          rolls: [3],
          total: 3,
          isHit: true,
          isCritical: false,
          source: 'weapon'
        },
        {
          dieType: 'd6' as const,
          rolls: [1],
          total: 1,
          isHit: false,
          isCritical: false,
          source: 'weapon'
        },
        {
          dieType: 'd4' as const,
          rolls: [1],
          total: 1,
          isHit: false,
          isCritical: false,
          source: 'weapon'
        },
        {
          dieType: 'd4' as const,
          rolls: [3],
          total: 3,
          isHit: true,
          isCritical: false,
          source: 'weapon'
        },
        {
          dieType: 'd4' as const,
          rolls: [4, 3], // Exploded!
          total: 7,
          isHit: true,
          isCritical: true,
          source: 'officer'
        }
      ],
      targetNumber: 2,
      totalHits: 4,
      totalCrits: 1,
      totalStandardHits: 2,
      totalCriticalHits: 2 // BOTH 4 and 3 are hits and should be piercing
    };

    // Spy on rollVolley to return our controlled result
    const rollVolleySpy = vi.spyOn(diceRoller, 'rollVolley').mockReturnValue(mockVolleyResult as any);
    const rollDieSpy = vi.spyOn(diceRoller, 'rollDie').mockReturnValue(2); // Armor roll

    const weapon = {
      id: 'pdc',
      name: 'PDC',
      rangeMin: 0,
      rangeMax: 2,
      volleyPool: ['d6', 'd6', 'd4', 'd4'],
      arcs: ['fore'],
      tags: ['pointDefense'],
      rpCost: 0,
      dpCost: 0,
      effect: ''
    } as any;

    const result = resolveAttack(
      { q: 0, r: 0 }, 0,
      { q: 1, r: -1 }, 0,
      8,
      { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
      'd4',
      1, 1, false,
      weapon,
      [], // pool (doesn't matter since we mock rollVolley)
      'open',
      0, 0, false, false, false, true
    );

    console.log('Result:', {
      totalHits: result.volleyResult.totalHits,
      overflowHits: result.overflowHits,
      piercingHits: result.piercingHits,
      hullDamage: result.hullDamage,
      mitigatedDamage: result.mitigatedDamage,
      armorRoll: result.armorRoll
    });

    expect(result.volleyResult.totalHits).toBe(4);
    expect(result.overflowHits).toBe(2);
    expect(result.piercingHits).toBe(2);
    expect(result.hullDamage).toBe(3); // 1 (from overflow 2-2) + 2 (piercing) = 3
    
    rollVolleySpy.mockRestore();
    rollDieSpy.mockRestore();
  });
});
