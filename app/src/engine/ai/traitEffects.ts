import type {
  AdversaryData,
  EnemyShipState,
  ShipState,
  ShipArc,
  TerrainType,
  VolleyDieInput,
} from '../../types/game';
import { hexDistance } from '../hexGrid';
import { getAdversaryById } from '../../data/adversaries';

// ═══════════════════════════════════════════════════════════════════
// Trait Effect Helpers — pure functions, no side effects
// ═══════════════════════════════════════════════════════════════════

/**
 * Applies attack-time traits to an AI ship's volley pool before it rolls.
 * Handles: rangeConditional, flankingConditional, hullThresholdConditional,
 *           stationaryConditional.
 *
 * @returns modified pool and whether armor-piercing is active this shot.
 */
export function applyAttackTraits(
  adversary: AdversaryData,
  basePool: VolleyDieInput[],
  dist: number,
  struckSector: ShipArc,
  hullRatio: number,      // currentHull / maxHull
  hasMovedThisRound: boolean,
): { pool: VolleyDieInput[]; armorPiercing: boolean } {
  const pool: VolleyDieInput[] = [...basePool];
  let armorPiercing = false;

  for (const trait of adversary.traits ?? []) {
    switch (trait.type) {
      case 'rangeConditional':
        if (dist >= trait.minRange && dist <= trait.maxRange && trait.extraVolley) {
          pool.push(...trait.extraVolley.map(dt => ({ type: dt, source: 'trait' } as VolleyDieInput)));
        }
        break;

      case 'flankingConditional':
        if ((trait.requiredArcs as ShipArc[]).includes(struckSector)) {
          pool.push(...trait.extraVolley.map(dt => ({ type: dt, source: 'trait' } as VolleyDieInput)));
        }
        break;

      case 'hullThresholdConditional':
        if (hullRatio <= trait.threshold) {
          pool.push(...trait.extraVolley.map(dt => ({ type: dt, source: 'trait' } as VolleyDieInput)));
        }
        break;

      case 'stationaryConditional':
        if (!hasMovedThisRound && trait.grantsArmorPiercing) {
          armorPiercing = true;
        }
        break;

      default:
        break;
    }
  }

  return { pool, armorPiercing };
}

/**
 * Calculates the total evasion bonus the player should add to a target's evasion
 * due to that target's own defensive traits (isolationConditional, terrainConditional,
 * movementConditional) and aura bonuses from neighbouring enemies (aura evasionBonus).
 *
 * Call this when the PLAYER attacks an enemy ship.
 *
 * @param target        The enemy ship being attacked.
 * @param targetAdv     Adversary data for the target.
 * @param allEnemies    All living enemy ships (for aura checks from other ships).
 * @param playerShips   All player ships (for isolation checks).
 * @param targetTerrain Terrain type at the target's hex.
 */
export function applyDefensiveTraits(
  target: EnemyShipState,
  targetAdv: AdversaryData,
  allEnemies: EnemyShipState[],
  playerShips: ShipState[],
  targetTerrain: TerrainType | undefined,
): number {
  let bonus = 0;

  // ── Target's own traits ──────────────────────────────────────────
  for (const trait of targetAdv.traits ?? []) {
    switch (trait.type) {
      case 'isolationConditional': {
        const nearestPlayer = playerShips
          .filter(p => !p.isDestroyed)
          .reduce((min, p) => Math.min(min, hexDistance(target.position, p.position)), Infinity);
        if (nearestPlayer > trait.radius) {
          bonus += trait.evasionBonus;
        }
        break;
      }

      case 'terrainConditional':
        if (targetTerrain === trait.terrain) {
          bonus += trait.evasionBonus;
        }
        break;

      case 'movementConditional':
        if ((target.hexesMovedThisRound ?? 0) >= trait.minHexesMoved) {
          bonus += trait.evasionBonus;
        }
        break;

      default:
        break;
    }
  }

  // ── Aura evasionBonus from other enemy ships ─────────────────────
  for (const other of allEnemies) {
    if (other.id === target.id || other.isDestroyed) continue;
    const otherAdv = getAdversaryById(other.adversaryId);
    if (!otherAdv) continue;
    for (const trait of otherAdv.traits ?? []) {
      if (
        trait.type === 'aura' &&
        trait.effect === 'evasionBonus' &&
        hexDistance(other.position, target.position) <= trait.radius
      ) {
        bonus += trait.amount;
      }
    }
  }

  return bonus;
}

/**
 * Calculates the TN penalty to add to a PLAYER attack caused by
 * enemy Interdictor-style aura (tnPenalty).
 *
 * @param targetPosition  Hex of the target being attacked by the player.
 * @param allEnemies      All living enemy ships.
 */
export function applyAuraTNPenalty(
  targetPosition: EnemyShipState['position'],
  allEnemies: EnemyShipState[],
): number {
  let penalty = 0;

  for (const other of allEnemies) {
    if (other.isDestroyed) continue;
    const otherAdv = getAdversaryById(other.adversaryId);
    if (!otherAdv) continue;
    for (const trait of otherAdv.traits ?? []) {
      if (
        trait.type === 'aura' &&
        trait.effect === 'tnPenalty' &&
        hexDistance(other.position, targetPosition) <= trait.radius
      ) {
        penalty += trait.amount;
      }
    }
  }

  return penalty;
}
