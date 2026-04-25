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
    expect(pool[0].type).toBe('d10');
    expect(pool[1].type).toBe('d6');
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
});
