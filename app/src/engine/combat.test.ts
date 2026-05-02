import { describe, it, expect, vi } from 'vitest';
import { calculateTN, assembleVolleyPool, resolveAttack } from './combat';
import type { WeaponModule, OfficerState, ShieldState } from '../types/game';
import { HexFacing, TerrainType, ShipSize } from '../types/game';

describe('combat engine', () => {
  it('calculateTN computes correct target number', () => {
    // Range 3 (Medium: +1), Asteroids: +2, Evasive: +2
    const breakdown = calculateTN(5, 3, TerrainType.Asteroids, 2, 0);
    expect(breakdown.total).toBe(10); // 5 + 1 + 2 + 2
  });

  it('calculateTN applies ion nebula targeting reduction', () => {
    const breakdown = calculateTN(5, 3, TerrainType.IonNebula, 0, 0);
    expect(breakdown.terrainModifier).toBe(-1);
    expect(breakdown.total).toBe(5);
  });

  it('assembleVolleyPool combines weapon and tactical officer die', () => {
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8', 'd8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };
    const officer: OfficerState = {
      officerId: 'o1', station: 'tactical', currentStress: 0,
      currentTier: 'veteran', // d6
      isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0
    };

    const pool = assembleVolleyPool(weapon, officer);
    expect(pool).toEqual([
      { type: 'd8', source: 'weapon' },
      { type: 'd8', source: 'weapon' },
      { type: 'd6', source: 'officer' },
    ]);
  });

  it('assembleVolleyPool upgrades one die when upgradeOneDie is true', () => {
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };
    const officer: OfficerState = {
      officerId: 'o1', station: 'tactical', currentStress: 0,
      currentTier: 'veteran', // d6
      isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0
    };

    const pool = assembleVolleyPool(weapon, officer, false, true);
    // d8 weapon die should be upgraded to d10 (since it's first in the pool)
    expect((pool[0] as any).type).toBe('d10');
    expect((pool[1] as any).type).toBe('d6');
  });

  it('resolveAttack correctly applies hits, shields, and armor', () => {
    const shields: ShieldState = { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 };
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8', 'd8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };

    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd4', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
        { type: 'd6', source: 'officer' }
      ], undefined
    );

    expect(dmg.shieldHits).toBe(2);
    expect(dmg.overflowHits).toBe(0);
    expect(dmg.hullDamage).toBe(0);

    vi.restoreAllMocks();
  });

  it('resolveAttack bypasses armor for target-painted volleys', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8', 'd8', 'd8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };

    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)  // d8 => 5
      .mockReturnValueOnce(0.5)  // d8 => 5
      .mockReturnValueOnce(0.5)  // d8 => 5
      .mockReturnValueOnce(0.99); // d6 armor => 6, would fully block without AP

    const withoutPainting = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd6', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
      ], undefined
    );

    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // all three d8 => 5

    const withPainting = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd6', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
      ], undefined, 0, 0, false, false, true
    );

    expect(withoutPainting.hullDamage).toBe(1);
    expect(withoutPainting.armorRoll).toBe(6);
    expect(withPainting.hullDamage).toBe(3);
    expect(withPainting.armorRoll).toBe(0);

    vi.restoreAllMocks();
  });

  it('resolveAttack converts one standard hit into a crit when tachyon strike is active', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };

    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d8 => 5, a standard hit at TN 5

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd6', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' },
      ], undefined, 0, 0, false, false, false, false, undefined, false, true
    );

    expect(dmg.volleyResult.totalCrits).toBe(1);
    expect(dmg.volleyResult.totalStandardHits).toBe(0);
    expect(dmg.hullDamage).toBe(1);
    
    // Check for the visual upgrade flag we added
    const upgradedDie = dmg.volleyResult.dice.find(d => d.isConverted);
    expect(upgradedDie).toBeDefined();
    expect(upgradedDie?.isCritical).toBe(true);
    expect(upgradedDie?.isConverted).toBe(true);

    vi.restoreAllMocks();
  });

  it('applies the full fighter vulnerability modifier to point defense attacks', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'pdc', name: 'PDC', arcs: ['fore'], rangeMin: 1, rangeMax: 2,
      volleyPool: ['d6', 'd6'], rpCost: 10, dpCost: 10, effect: '', tags: ['pointDefense']
    };

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      8, shields, 'd4', 1, 1, false, weapon, [
        { type: 'd6', source: 'weapon' },
        { type: 'd6', source: 'weapon' },
      ], undefined, 0, 0, false, false, false, false, ShipSize.Fighter
    );

    expect(dmg.tnBreakdown.trackingBonus).toBe(-4);
    expect(dmg.tnBreakdown.total).toBe(4);
  });

  it('applies the fighter vulnerability modifier to flak attacks', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'flak', name: 'Flak', arcs: ['fore'], rangeMin: 1, rangeMax: 5,
      volleyPool: ['d8', 'd8'], rpCost: 10, dpCost: 10, effect: '', tags: ['areaOfEffect']
    };

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      8, shields, 'd4', 1, 1, false, weapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
      ], undefined, 0, -1, false, false, false, false, ShipSize.Fighter
    );

    expect(dmg.tnBreakdown.trackingBonus).toBe(-3);
    expect(dmg.tnBreakdown.total).toBe(4);
  });

  it('does not apply the small-craft tracking modifier to non-fighter small ships', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'flak', name: 'Flak', arcs: ['fore'], rangeMin: 1, rangeMax: 5,
      volleyPool: ['d8', 'd8'], rpCost: 10, dpCost: 10, effect: '', tags: ['areaOfEffect']
    };

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      8, shields, 'd4', 8, 8, false, weapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
      ], undefined, 0, -1, false, false, false, false, ShipSize.Small
    );

    expect(dmg.tnBreakdown.trackingBonus).toBe(0);
    expect(dmg.tnBreakdown.total).toBe(7);
  });

  it('resolveAttack sets isConverted for hits meeting a critThresholdOverride', () => {
    const shields: ShieldState = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const weapon: WeaponModule = {
      id: 'w1', name: 'W1', arcs: ['fore'], rangeMin: 1, rangeMax: 3,
      volleyPool: ['d8'], rpCost: 10, dpCost: 10, effect: '', tags: []
    };

    vi.spyOn(Math, 'random').mockReturnValue(0.5); // d8 => 5

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      3, shields, 'd4', 10, 10, false, weapon, [
        { type: 'd8', source: 'weapon' },
      ], undefined, 0, 0, false, false, false, false, undefined, false, false, false, 0, false, false, 5 // critThresholdOverride = 5
    );

    expect(dmg.volleyResult.totalCrits).toBe(1);
    const die = dmg.volleyResult.dice[0];
    expect(die.isCritical).toBe(true);
    expect(die.isConverted).toBe(true);

    vi.restoreAllMocks();
  });

  it('Ion Emitter Array critical hits deal 0 hull damage (shield breaker property)', () => {
    const shields: ShieldState = { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 };
    const ionWeapon: WeaponModule = {
      id: 'ion-emitter', name: 'Ion Emitter Array', arcs: ['fore'], rangeMin: 1, rangeMax: 4,
      volleyPool: ['d8', 'd8', 'd6'], rpCost: 30, dpCost: 16, effect: 'Shield Breaker. Every Standard Hit removes 2 Shield points instead of 1. However, Ion hits that overflow to the Hull deal 0 damage.',
      tags: ['shieldBreaker']
    };

    // Mock dice rolls to guarantee at least one critical hit
    // A die is critical ONLY if the INITIAL roll is max value (not explosions)
    // First die: standard hit on d8 (rolls 5, TN=5, not critical since 5 < 8) - (5-1)/8 = 0.5
    // Second die: critical hit on d8 (rolls 8, TN=5, max for d8) - (8-1)/8 = 0.875
    // Third die: standard hit on d6 (rolls 5, TN=5, not critical since 5 < 6) - (5-1)/6 = 0.666...
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.5)   // d8 => 5 (hit, not critical)
      .mockReturnValueOnce(0.875) // d8 => 8 (hit, critical)
      .mockReturnValueOnce(0.666) // d6 => 5 (hit, not critical)
      .mockReturnValue(0.1);      // any explosions => 1 (hit, but not critical)

    const dmg = resolveAttack(
      { q: 0, r: 0 }, HexFacing.Fore,
      { q: 1, r: -1 }, HexFacing.Aft,
      5, shields, 'd4', 10, 10, false, ionWeapon, [
        { type: 'd8', source: 'weapon' },
        { type: 'd8', source: 'weapon' },
        { type: 'd6', source: 'weapon' }
      ], undefined, 0, 0, false, true // isIonWeapon = true for ion weapons
    );

    // Debug output
    console.log('Ion weapon test results:', {
      hullDamage: dmg.hullDamage,
      shieldHits: dmg.shieldHits,
      shieldRemaining: dmg.shieldRemaining,
      overflowHits: dmg.overflowHits,
      volleyResult: dmg.volleyResult,
      struckSector: dmg.struckSector
    });

    // Should deal shield damage from ALL hits (ion strips 2 shields per hit, including crits now)
    // 3 hits * 2 = 6 shield damage. Initial shields 3.
    expect(dmg.shieldHits).toBe(3); // capped at initial shield? No, shieldHits records total potential before capping? 
    // Actually combat.ts does: shieldHits = Math.min(totalHits * 2, currentShield)
    expect(dmg.shieldHits).toBe(3); // 3 hits * 2 = 6, but shields only had 3. So 3.
    expect(dmg.shieldRemaining).toBe(0);
    expect(dmg.hullDamage).toBe(0); // Ion deals 0 hull damage even on crits
    expect(dmg.volleyResult.totalCrits).toBe(1); 

    vi.restoreAllMocks();
  });
});
