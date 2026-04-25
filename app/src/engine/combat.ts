import type {
  HexCoord,
  ShipState,
  EnemyShipState,
  ShieldState,
  ShipArc,
  DieType,
  WeaponModule,
  TerrainType,
  VolleyResult,
  OfficerState,
  VolleyDieInput,
  ShipSize,
} from '../types/game';
import { SKILL_DIE_MAP, HexFacing, isSmallCraftSize } from '../types/game';
import { hexDistance, getRangeModifier, determineStruckShieldSector, checkLineOfSight, hexKey, isInFiringArc } from './hexGrid';
import { rollVolley, rollDie, stepUpDie } from '../utils/diceRoller';
import { TERRAIN_DATA } from '../data/terrain';

// ═══════════════════════════════════════════════════════════════════
// Combat Engine — TN Calculation, Volley Resolution, Damage
// ═══════════════════════════════════════════════════════════════════

export interface TNBreakdown {
  baseEvasion: number;
  rangeModifier: number;
  terrainModifier: number;
  evasiveManeuvers: number;
  targetLockModifier: number;
  trackingBonus: number; // New: -1 TN for PDCs vs Small Craft
  otherModifiers: number;
  total: number;
}

export function getAntiSmallCraftTNModifier(weapon: WeaponModule, targetSize?: ShipSize): number {
  if (!isSmallCraftSize(targetSize)) return 0;
  if (weapon.tags.includes('pointDefense')) return -4; // base -1 tracking plus fighter vulnerability
  if (weapon.tags.includes('areaOfEffect')) return -3;
  return 0;
}

/**
 * Calculate the Target Number (TN) for an attack.
 *
 * TN = Base Evasion + Range Modifier + Terrain Modifier + Active Maneuvers + Tracking
 */
export function calculateTN(
  defenderEvasion: number,
  distance: number,
  defenderTerrain: TerrainType | undefined,
  evasiveManeuvers: number,
  targetLockModifier: number,
  trackingBonus: number = 0,
  otherModifiers: number = 0,
  ignoreRangePenalty: boolean = false,
  attackerIsJammed: boolean = false,
): TNBreakdown {
  let rangeModifier = getRangeModifier(distance);
  // Optional Manticore Override: Advanced Telemetry
  if (ignoreRangePenalty && distance >= 5) {
    rangeModifier = 0;
  }

  let terrainModifier = 0;
  if (defenderTerrain && defenderTerrain !== 'open') {
    terrainModifier = TERRAIN_DATA[defenderTerrain]?.tnModifier ?? 0;
  }

  const finalOtherModifiers = otherModifiers + (attackerIsJammed ? 2 : 0);
  const total = defenderEvasion + rangeModifier + terrainModifier + evasiveManeuvers + targetLockModifier + trackingBonus + finalOtherModifiers;

  return {
    baseEvasion: defenderEvasion,
    rangeModifier,
    terrainModifier,
    evasiveManeuvers,
    targetLockModifier,
    trackingBonus,
    otherModifiers: finalOtherModifiers,
    total: Math.max(1, total), // minimum TN of 1
  };
}

/**
 * Assemble the volley pool for an attack.
 * Weapon dice + Tactical Officer's Skill Die.
 */
export function assembleVolleyPool(
  weapon: WeaponModule,
  tacticalOfficer: OfficerState,
  hasTargetingArrayDamage: boolean = false,
  upgradeOneDie: boolean = false,
): VolleyDieInput[] {
  const pool: VolleyDieInput[] = weapon.volleyPool.map(dt => ({ type: dt, source: 'weapon' }));

  // Add tactical officer's skill die unless Targeting Array is damaged
  if (!hasTargetingArrayDamage) {
    const skillDie = SKILL_DIE_MAP[tacticalOfficer.currentTier];
    pool.push({ type: skillDie, source: 'officer' });
  }

  if (upgradeOneDie && pool.length > 0) {
    // Upgrade the first die in the pool
    const firstDie = pool[0];
    const currentType = typeof firstDie === 'string' ? firstDie : firstDie.type;
    const upgradedType = stepUpDie(currentType);
    
    if (typeof firstDie === 'string') {
      pool[0] = upgradedType;
    } else {
      pool[0] = { ...firstDie, type: upgradedType };
    }
  }

  return pool;
}

export interface DamageResult {
  /** Total hits scored against shields */
  shieldHits: number;
  /** Shield sector that was struck */
  struckSector: ShipArc;
  /** Shield points remaining in struck sector after damage */
  shieldRemaining: number;
  /** Hits that overflowed past shields to hull */
  overflowHits: number;
  /** Armor roll value */
  armorRoll: number;
  /** Armor die type used */
  armorDie: DieType;
  /** Final hull damage dealt */
  hullDamage: number;
  /** Whether critical damage was triggered */
  criticalTriggered: boolean;
  /** The volley result for display purposes */
  volleyResult: VolleyResult;
  /** TN breakdown for display */
  tnBreakdown: TNBreakdown;
  /** True if the target was outside the weapon's firing arc */
  outOfArc?: boolean;
  /** True if the target was outside the weapon's effective range */
  outOfRange?: boolean;
  /**
   * True when the defender was inside an Ion Nebula.
   * Shields were bypassed (treated as 0) but NOT depleted — shieldRemaining
   * reflects the unchanged real sector value, not 0.
   */
  ionNebulaActive?: boolean;
}

/**
 * Resolve a full attack: TN → Volley → Shields → Armor → Hull.
 *
 * Rules:
 * - Hits >= TN are hits
 * - Max face value = Critical (explodes)
 * - Hits applied to struck shield sector
 * - Overflow → Hull
 * - Armor die mitigates hull damage (minimum 1 if any overflow)
 * - Critical Damage triggered if 3+ hull damage in one volley
 *   OR if hull drops below 50% for the first time
 */
export function resolveAttack(
  attackerPos: HexCoord,
  attackerFacing: HexFacing,
  defenderPos: HexCoord,
  defenderFacing: HexFacing,
  defenderEvasion: number,
  defenderShields: ShieldState,
  defenderArmorDie: DieType,
  defenderCurrentHull: number,
  defenderMaxHull: number,
  defenderHasDroppedBelow50: boolean,
  weapon: WeaponModule,
  volleyPool: VolleyDieInput[],
  defenderTerrain: TerrainType | undefined,
  evasiveManeuvers: number = 0,
  targetLockModifier: number = 0,
  armorDisabled: boolean = false,
  isIonWeapon: boolean = false,
  armorPiercingAttack: boolean = false,
  ignoreRangePenalty: boolean = false,
  defenderSize?: ShipSize,
  surgicalStrike: boolean = false,
  tachyonStrike: boolean = false,
  pdcDisabled: boolean = false,
  targetRerolls: number = 0,
  attackerIsJammed: boolean = false,
  rerollTacticalOnes: boolean = false,
  critThresholdOverride?: number,
  upgradeOneDie: boolean = false,
  spoofedFireControlActive: boolean = false,
): DamageResult {
  const distance = hexDistance(attackerPos, defenderPos);

  // Validate range
  if (distance < weapon.rangeMin || distance > weapon.rangeMax) {
    const emptyVolley: VolleyResult = { dice: [], targetNumber: 0, totalHits: 0, totalCrits: 0, totalStandardHits: 0, totalCriticalHits: 0 };
    return {
      shieldHits: 0,
      struckSector: 'fore',
      shieldRemaining: defenderShields['fore'],
      overflowHits: 0,
      armorRoll: 0,
      armorDie: defenderArmorDie,
      hullDamage: 0,
      criticalTriggered: false,
      volleyResult: emptyVolley,
      tnBreakdown: { baseEvasion: 0, rangeModifier: 0, terrainModifier: 0, evasiveManeuvers: 0, targetLockModifier: 0, trackingBonus: 0, otherModifiers: 0, total: 0 },
      outOfRange: true,
    };
  }

  // Validate firing arc
  if (!isInFiringArc(attackerPos, attackerFacing, defenderPos, weapon.arcs)) {
    // Target is outside weapon arc — return a zero-damage result
    const emptyVolley: VolleyResult = { dice: [], targetNumber: 0, totalHits: 0, totalCrits: 0, totalStandardHits: 0, totalCriticalHits: 0 };
    return {
      shieldHits: 0,
      struckSector: 'fore',
      shieldRemaining: defenderShields['fore'],
      overflowHits: 0,
      armorRoll: 0,
      armorDie: defenderArmorDie,
      hullDamage: 0,
      criticalTriggered: false,
      volleyResult: emptyVolley,
      tnBreakdown: { baseEvasion: 0, rangeModifier: 0, terrainModifier: 0, evasiveManeuvers: 0, targetLockModifier: 0, trackingBonus: 0, otherModifiers: 0, total: 0 },
      outOfArc: true,
    };
  }

  let trackingBonus = getAntiSmallCraftTNModifier(weapon, defenderSize);
  if (pdcDisabled) trackingBonus = 0;

  const tnBreakdown = calculateTN(
    defenderEvasion,
    distance,
    defenderTerrain,
    evasiveManeuvers,
    targetLockModifier,
    trackingBonus,
    0, // otherModifiers
    ignoreRangePenalty,
    attackerIsJammed
  );

  // Roll the volley
  const volleyResult = rollVolley(volleyPool, tnBreakdown.total, targetRerolls, rerollTacticalOnes, spoofedFireControlActive);
  if (critThresholdOverride !== undefined) {
    let convertedCrits = 0;
    for (const die of volleyResult.dice) {
      if (die.isHit && !die.isCritical && die.rolls[0] >= critThresholdOverride) {
        die.isCritical = true;
        convertedCrits += 1;
      }
    }
    if (convertedCrits > 0) {
      volleyResult.totalCrits += convertedCrits;
      volleyResult.totalCriticalHits += convertedCrits;
      volleyResult.totalStandardHits = Math.max(0, volleyResult.totalStandardHits - convertedCrits);
    }
  }
  let totalHits = volleyResult.totalHits;
  
  if ((surgicalStrike || tachyonStrike) && volleyResult.totalStandardHits > 0) {
    // Convert 1 standard hit to a crit
    volleyResult.totalCrits += 1;
    volleyResult.totalStandardHits -= 1;
    volleyResult.totalCriticalHits += 1;
  }

  // Option 2: Critical Hits Pierce
  // All Critical Hits (and their explosions) bypass shields and armor completely.
  // Standard Hits must go through shields, then remaining overflow is mitigated by armor.
  let piercingHits = volleyResult.totalCriticalHits;
  totalHits = volleyResult.totalStandardHits; // totalHits now represents only Standard Hits facing shields

  // Determine struck shield sector
  const struckSector = determineStruckShieldSector(attackerPos, defenderPos, defenderFacing);

  // ── Ion Nebula Rule: Shields disabled while inside ──────────────────────────
  // If the defender occupies an Ion Nebula hex, all shield sectors are treated as 0.
  // Every hit becomes overflow and goes straight to hull (armor still applies).
  const defenderInIonNebula = defenderTerrain === 'ionNebula';

  // Apply hits to shields
  const currentShield = defenderInIonNebula ? 0 : defenderShields[struckSector];
  let shieldHits: number;
  let overflowHits: number;

  if (isIonWeapon) {
    // Ion: each hit removes 2 shield points, no hull overflow
    shieldHits = Math.min(totalHits * 2, currentShield);
    overflowHits = 0; // Ion cannot damage hull
  } else {
    shieldHits = Math.min(totalHits, currentShield);
    overflowHits = totalHits - shieldHits;
  }

  // When inside an Ion Nebula the shield sector is bypassed but NOT depleted:
  // return the real (unchanged) sector value so the store write is a no-op.
  const shieldRemaining = defenderInIonNebula
    ? defenderShields[struckSector]
    : Math.max(0, currentShield - (isIonWeapon ? totalHits * 2 : totalHits));

  // Apply hull damage
  let armorRoll = 0;
  let hullDamage = 0;

  if (overflowHits > 0 && !isIonWeapon) {
    // Roll armor die to mitigate
    if (!armorDisabled && !weapon.tags.includes('armorPiercing') && !armorPiercingAttack) {
      armorRoll = rollDie(defenderArmorDie);
    }
    hullDamage = Math.max(1, overflowHits - armorRoll); // minimum 1 if any reached hull
  }

  // Add the piercing hits directly to hull damage (bypassing shields and armor)
  if (piercingHits > 0) {
    hullDamage += piercingHits;
  }

  // Check critical damage trigger
  const newHull = defenderCurrentHull - hullDamage;
  const below50 = newHull <= defenderMaxHull / 2;
  const criticalTriggered =
    hullDamage >= 3 ||
    (below50 && !defenderHasDroppedBelow50);

  return {
    // In Ion Nebula: shieldHits = 0 (no shields were actually struck)
    shieldHits: defenderInIonNebula ? 0 : (isIonWeapon ? Math.min(totalHits * 2, currentShield) : shieldHits),
    struckSector,
    shieldRemaining,
    overflowHits,
    armorRoll,
    armorDie: defenderArmorDie,
    hullDamage,
    criticalTriggered,
    volleyResult,
    tnBreakdown,
    ionNebulaActive: defenderInIonNebula || undefined,
  };
}

/**
 * Apply damage to a ship's shield state (mutating).
 * Returns the updated shields.
 */
export function applyShieldDamage(
  shields: ShieldState,
  sector: ShipArc,
  damage: number,
): ShieldState {
  const newShields = { ...shields };
  newShields[sector] = Math.max(0, newShields[sector] - damage);
  return newShields;
}

/**
 * Regenerate shields by 1 point per sector (Phase 4).
 * Capped at max shields per sector.
 */
export function regenerateShields(
  shields: ShieldState,
  maxPerSector: number,
  shieldGeneratorOffline: boolean = false,
): ShieldState {
  if (shieldGeneratorOffline) return { ...shields };

  const newShields = { ...shields };
  const sectors: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
  for (const sector of sectors) {
    newShields[sector] = Math.min(maxPerSector, newShields[sector] + 1);
  }
  return newShields;
}

/**
 * Reinforce a specific shield sector (Engineering action).
 * Restores 2 points (or 3 for Dr. Aris, fore/aft only).
 */
export function reinforceShieldSector(
  shields: ShieldState,
  sector: ShipArc,
  amount: number,
  maxPerSector: number,
): ShieldState {
  const newShields = { ...shields };
  newShields[sector] = Math.min(maxPerSector, newShields[sector] + amount);
  return newShields;
}

/**
 * Returns a list of strictly valid target IDs for a given weapon.
 * Validates range (min/max), firing arc, and Line of Sight (LoS).
 */
export function getValidTargetsForWeapon(
  attackerPos: HexCoord,
  attackerFacing: HexFacing,
  weapon: WeaponModule,
  potentialTargets: (ShipState | EnemyShipState)[],
  terrainMap: Map<string, TerrainType>
): string[] {
  const validIds: string[] = [];
  
  for (const target of potentialTargets) {
    if (target.isDestroyed) continue;
    
    const dist = hexDistance(attackerPos, target.position);
    
    if (dist < weapon.rangeMin || dist > weapon.rangeMax) continue;
    
    if (!isInFiringArc(attackerPos, attackerFacing, target.position, weapon.arcs)) continue;
    
    const losCheck = checkLineOfSight(attackerPos, target.position, terrainMap);
    if (!losCheck.clear) continue;
    
    validIds.push(target.id);
  }
  
  return validIds;
}
