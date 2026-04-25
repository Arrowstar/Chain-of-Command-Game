/**
 * Deployment Point (DP) cost calculation utilities.
 *
 * These formulas match the "Deployment Point (DP) Balance System" design document.
 * All items are pre-computed in their respective data files; these functions exist
 * for future chassis/weapon generation and for unit testing.
 *
 * Standard budget: 100 DP per ship in campaign mode.
 */

import type { ShipChassis, WeaponModule, Subsystem, OfficerData, WeaponTag } from '../types/game';

// ─── Constants ────────────────────────────────────────────────────

const SIZE_MODIFIER: Record<string, number> = {
  small: 0,
  medium: 5,
  large: 10,
};

/** Die-face average = faces / 2 */
const DIE_AVERAGE: Record<string, number> = {
  d4: 2,
  d6: 3,
  d8: 4,
  d10: 5,
  d12: 6,
  d20: 10,
};

/** Tag DP bonuses (positive = premium, negative = restriction penalty) */
const TAG_DP_BONUS: Partial<Record<WeaponTag, number>> = {
  armorPiercing: 6,
  ordnance: 2,
  pointDefense: 4,
  broadside: -4,
  shieldBreaker: 5,
  areaOfEffect: 8,
  // 'standard', 'torpedo' have no bonus
};

/** Tier values for the officer formula */
const TIER_VALUE: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 6,
  3: 10,
};

/** Long-range threshold: rangeMax strictly greater than this grants +5 DP */
const LONG_RANGE_THRESHOLD = 4;

// ─── Formulas ─────────────────────────────────────────────────────

/**
 * Hull DP formula:
 *   (baseHull / 2) + (shieldsPerSector × 2.5) + (ctGeneration × 5) + sizeModifier + traitModifiers
 *
 * Trait modifiers:
 *   - Cloaking / Stealth unique trait: +10
 *   - Armor die of d6 or better: +8
 *
 * Note: The design doc uses simplified shield counts; the formula result may
 * differ slightly from the editorial values stored in `dpCost` on each chassis.
 */
export function calcChassisDp(chassis: ShipChassis): number {
  const sizeBonus = SIZE_MODIFIER[chassis.size] ?? 0;
  const hasCloaking = /cloak|stealth/i.test(chassis.uniqueTraitName + chassis.uniqueTraitEffect);
  const hasHeavyArmor = chassis.armorDie === 'd6' || chassis.armorDie === 'd8'
    || chassis.armorDie === 'd10' || chassis.armorDie === 'd12';

  return (
    chassis.baseHull / 2
    + chassis.shieldsPerSector * 2.5
    + chassis.ctGeneration * 5
    + sizeBonus
    + (hasCloaking ? 10 : 0)
    + (hasHeavyArmor ? 8 : 0)
  );
}

/**
 * Weapon DP formula:
 *   avgDamage + tagBonus + rangeBonus
 *
 *   avgDamage = sum of each die's average face value (die faces / 2)
 *   tagBonus  = sum of tag premiums / penalties
 *   rangeBonus = +5 if rangeMax > 4 hexes
 */
export function calcWeaponDp(weapon: WeaponModule): number {
  const avgDamage = weapon.volleyPool.reduce((sum, die) => sum + (DIE_AVERAGE[die] ?? 0), 0);
  const tagBonus = weapon.tags.reduce((sum, tag) => sum + (TAG_DP_BONUS[tag] ?? 0), 0);
  const rangeBonus = weapon.rangeMax > LONG_RANGE_THRESHOLD ? 5 : 0;
  return avgDamage + tagBonus + rangeBonus;
}

/**
 * Subsystem DP costs are fixed editorial values from the design document
 * and are stored directly on each Subsystem record. This function is a
 * passthrough for symmetry and testing.
 */
export function calcSubsystemDp(sub: Subsystem): number {
  return sub.dpCost;
}

/**
 * Officer DP formula:
 *   stressLimit + tierValue
 *
 *   Tier 1 (Utility):      +3
 *   Tier 2 (Specialist):   +6
 *   Tier 3 (Game Changer): +10
 *
 *   Stress-immune officers (stressLimit = null) use 0 for their stress component.
 */
export function calcOfficerDp(officer: OfficerData): number {
  const stressComponent = officer.stressLimit ?? 0;
  return stressComponent + TIER_VALUE[officer.traitTier];
}

// ─── Budget Summary ───────────────────────────────────────────────

export const DP_BUDGET = 100;

export interface DpBreakdown {
  chassis: number;
  officers: number;
  weapons: number;
  subsystems: number;
  total: number;
  isOverBudget: boolean;
}

export function computeDpBreakdown(
  chassisDp: number,
  officersDp: number[],
  weaponsDp: number[],
  subsystemsDp: number[],
  budget: number = DP_BUDGET
): DpBreakdown {
  const chassis = chassisDp;
  const officers = officersDp.reduce((a, b) => a + b, 0);
  const weapons = weaponsDp.reduce((a, b) => a + b, 0);
  const subsystems = subsystemsDp.reduce((a, b) => a + b, 0);
  const total = chassis + officers + weapons + subsystems;
  return { chassis, officers, weapons, subsystems, total, isOverBudget: total > budget };
}
