import type { EnemyShipState, PlayerState, ShipArc, ShipState, TacticCard } from '../../types/game';
import { determineStruckShieldSector, hexDistance, isInFiringArc } from '../hexGrid';
import { getChassisById } from '../../data/shipChassis';

// ═══════════════════════════════════════════════════════════════════
// AI Targeting — Aggro Score System
// ═══════════════════════════════════════════════════════════════════

export interface AggroEntry {
  targetId: string;
  score: number;
  distance: number;
  breakdown: Record<string, number>;
}

/**
 * Calculate the aggro score for all valid player targets from an AI ship's perspective.
 * Returns sorted array (highest score first). Ties broken by distance (closest first).
 */
export function calculateAggroScores(
  aiShip: EnemyShipState,
  targets: (ShipState | EnemyShipState)[],
  tacticCard: TacticCard | null,
  objectiveShipIds: string[] = [],
  players: PlayerState[] = [],
): AggroEntry[] {
  const entries: AggroEntry[] = [];

  for (const target of targets) {
    if (target.isDestroyed) continue;

    const distance = hexDistance(aiShip.position, target.position);
    
    // Wraith Cloaking Field Check
    const chassis = 'chassisId' in target ? getChassisById(target.chassisId) : null;
    if (chassis?.uniqueTraitName === 'Cloaking Field' && distance > 3 && !('firedWeaponPreviousRound' in target && target.firedWeaponPreviousRound)) {
        continue; // Cannot be targeted
    }
    const breakdown: Record<string, number> = {};
    let score = 0;

    // Distance scoring
    if (distance <= 2) { score += 3; breakdown['shortRange'] = 3; }
    else if (distance <= 4) { score += 2; breakdown['mediumRange'] = 2; }
    else { score += 1; breakdown['longRange'] = 1; }

    // Vulnerability: 0 shields in any facing
    const shieldValues = Object.values(target.shields);
    if (shieldValues.some(s => s === 0)) {
      score += 3;
      breakdown['strippedShields'] = 3;
    }

    // Vulnerability: critical hull damage
    if (target.criticalDamage.length > 0) {
      score += 2;
      breakdown['criticalDamage'] = 2;
    }

    // Strategic: player ship vs allied AI vs enemy AI
    if ('chassisId' in target) {
        score += 2;
        breakdown['playerShip'] = 2;
    } else {
        score += 1;
        breakdown['aiTarget'] = 1;
    }

    // Strategic: objective/VIP
    if (objectiveShipIds.includes(target.id)) {
      score += 4;
      breakdown['objectiveVIP'] = 4;
    }

    // Evasive maneuvers modifier
    if (target.evasionModifiers && target.evasionModifiers > 0) {
      score -= 2;
      breakdown['evasiveManeuvers'] = -2;
    }

    // Tactic card modifiers
    if (tacticCard) {
      const targetSector = determineStruckShieldSector(aiShip.position, target.position, target.facing);
      const hullRatio = target.currentHull / target.maxHull;
      const stressTotal = 'chassisId' in target
        ? (players.find(player => player.shipId === target.id)?.officers ?? []).reduce((sum, officer) => sum + officer.currentStress, 0)
        : 0;
      const adjacencyCount = targets.filter(other =>
        other.id !== target.id &&
        !other.isDestroyed &&
        hexDistance(other.position, target.position) === 1
      ).length;

      switch (tacticCard.mechanicalEffect.targetingOverride ?? tacticCard.id) {
        case 'highestHull':
        case 'target-the-bridge':
          if (hullRatio > 0.7) {
            score += 4;
            breakdown['tacticBonus'] = 4;
          }
          break;
        case 'lowestHull':
          if (hullRatio <= 0.5) {
            score += 5;
            breakdown['tacticBonus'] = 5;
          }
          break;
        case 'isolated':
          if ('chassisId' in target && adjacencyCount === 0) {
            score += 5;
            breakdown['tacticBonus'] = 5;
          }
          break;
        case 'closest':
          score += Math.max(0, 6 - distance);
          breakdown['tacticBonus'] = Math.max(0, 6 - distance);
          break;
        case 'frontArc':
          if (isInFiringArc(aiShip.position, aiShip.facing, target.position, ['fore', 'foreStarboard', 'forePort'] as ShipArc[])) {
            score += 4;
            breakdown['tacticBonus'] = 4;
          }
          break;
        case 'highestStress':
          if ('chassisId' in target) {
            score += stressTotal;
            breakdown['tacticBonus'] = stressTotal;
          }
          break;
        case 'flank':
          if (targetSector === 'aft' || targetSector === 'aftPort' || targetSector === 'aftStarboard') {
            score += 4;
            breakdown['tacticBonus'] = 4;
          }
          break;
      }
    }

    entries.push({ targetId: target.id, score, distance, breakdown });
  }

  // Sort by score descending, then distance ascending (tiebreaker)
  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distance - b.distance;
  });

  return entries;
}
