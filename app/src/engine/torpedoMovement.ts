import type { TorpedoToken, HexCoord, TerrainType, ShipState, EnemyShipState, DieType } from '../types/game';
import { hexDistance, hexLineDraw, hexKey } from './hexGrid';
import { rollVolley } from '../utils/diceRoller';

// ═══════════════════════════════════════════════════════════════════
// Torpedo Movement & Resolution
// ═══════════════════════════════════════════════════════════════════

export interface TorpedoMoveResult {
  newPosition: HexCoord;
  reachedTarget: boolean;
  isDestroyed: boolean;
  traversedHexes: HexCoord[];
}

export interface TorpedoAttackResult {
  targetId: string;
  hullDamage: number;
}

/**
 * Move the torpedo up to its speed (4 hexes) along a straight line toward its target.
 * Rule 5: Cannot enter or pass through Debris Fields. Destroyed if it does.
 */
export function moveTorpedo(
  torpedo: TorpedoToken,
  targetPos: HexCoord,
  terrainMap: Map<string, TerrainType>,
): TorpedoMoveResult {
  if (torpedo.hasMoved) return { newPosition: torpedo.position, reachedTarget: false, isDestroyed: false, traversedHexes: [] };

  const path = hexLineDraw(torpedo.position, targetPos);
  
  // path[0] is current position.
  // Check each step for Debris Fields
  let finalPos = torpedo.position;
  let reachedTarget = false;
  let isDestroyed = false;
  const traversedHexes: HexCoord[] = [];

  const stepsToTake = Math.min(torpedo.speed, path.length - 1);

  for (let i = 1; i <= stepsToTake; i++) {
    const stepHex = path[i];
    const terrain = terrainMap.get(hexKey(stepHex));

    if (terrain === 'debrisField') {
      isDestroyed = true;
      // Position is the hex before the debris field, or stays at start if step 1 is debris
      break;
    }

    finalPos = stepHex;
    traversedHexes.push(stepHex);
    if (hexDistance(finalPos, targetPos) === 0) {
      reachedTarget = true;
      break;
    }
  }

  return { newPosition: finalPos, reachedTarget, isDestroyed, traversedHexes };
}

/**
 * Resolve the torpedo attack when it reaches the target hex.
 * Seeker Torpedoes: roll 1xD20 against the target's evasion TN.
 * If hit, deals exactly 3 flat hull damage.
 */
export function resolveTorpedoAttack(
  torpedo: TorpedoToken,
  targetEvasionTN: number
): { hit: boolean; rolls: number[]; hullDamage: number; targetNumber: number } {
  // Roll D20
  const volley = rollVolley([{ type: 'd20', source: 'torpedo' }], targetEvasionTN);
  const hit = volley.totalHits > 0;
  
  const allRolls = volley.dice.flatMap(d => d.rolls);
  const hullDamage = hit ? 3 : 0; // Flat damage on hit

  return { hit, rolls: allRolls, hullDamage, targetNumber: targetEvasionTN };
}
