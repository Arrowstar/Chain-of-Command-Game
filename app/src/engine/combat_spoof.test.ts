import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveAttack } from './combat';
import { HexFacing, ShipSize, TerrainType } from '../types/game';

describe('combat engine Spoofed Fire Control', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const shields = { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 };
  const weapon = {
    id: 'w1', name: 'W1', arcs: ['fore'] as any, rangeMin: 1, rangeMax: 3,
    volleyPool: ['d8'] as any, rpCost: 10, dpCost: 10, effect: '', tags: [] as any
  };

  it('resolveAttack passes spoofedFireControlActive to rollVolley', () => {
    // Mock random for rollVolley: d8 => 5 (Standard hit at TN 5)
    // d6 armor => 6
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // d8 weapon => 5
      .mockReturnValueOnce(0.99); // d6 armor => 6

    // Without spoofing: 1 standard hit, blocked by armor? 
    // Wait, 5 hits TN 5. 1 hit. Armor 6. 1 - 6 = 1 (min 1).
    // Actually, resolveAttack logic: overflowHits = 1. armorRoll = 6. hullDamage = max(1, 1-6) = 1.

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd6', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' }
      ], undefined, 0, 0, false, false, false, false, undefined, false, false, false, 0, false, false, undefined, false, true
    );

    // With spoofing (true as last arg): 5+2 = 7.
    // 7 on d8 is still a standard hit (max is 8).
    // So 1 standard hit.
    expect(dmg.volleyResult.totalStandardHits).toBe(1);
    expect(dmg.volleyResult.dice[0].rolls[0]).toBe(7);
  });

  it('resolveAttack fixes the critThresholdOverride bug', () => {
    // Before fix: die.isCrit and die.value were used, which are undefined on DieResult.
    // After fix: die.isCritical and die.rolls[0] should be used.
    
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d8 => 5. TN 5. Standard hit.
    
    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd6', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' }
      ], undefined, 0, 0, false, false, false, false, undefined, false, false, false, 0, false, false, 5 // Crit threshold 5
    );

    // If bug is fixed, 5 should be converted to a crit.
    expect(dmg.volleyResult.totalCriticalHits).toBe(1);
    expect(dmg.volleyResult.totalStandardHits).toBe(0);
  });
});
