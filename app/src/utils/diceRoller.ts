import type { DieType, DieResult, SkillDieTier, VolleyResult, VolleyDieInput } from '../types/game';
import { DIE_MAX, SKILL_DIE_MAP } from '../types/game';

export interface SkillProcResult {
  dieType: DieType;
  roll: number;
  successThreshold: number;
  maxFace: number;
  isSuccess: boolean;
  isCritical: boolean;
}

/**
 * Roll a single polyhedral die and return its face value.
 */
export function rollDie(dieType: DieType): number {
  const max = DIE_MAX[dieType];
  return Math.floor(Math.random() * max) + 1;
}

/**
 * Roll a non-exploding skill proc die with a success threshold and rookie crit gate.
 */
export function rollSkillProc(dieType: DieType, successThreshold: number = 4): SkillProcResult {
  const maxFace = DIE_MAX[dieType];
  const roll = rollDie(dieType);

  return {
    dieType,
    roll,
    successThreshold,
    maxFace,
    isSuccess: roll >= successThreshold,
    isCritical: maxFace > successThreshold && roll === maxFace,
  };
}

export function rollOfficerSkillProc(currentTier: SkillDieTier, successThreshold: number = 4): SkillProcResult {
  return rollSkillProc(SKILL_DIE_MAP[currentTier], successThreshold);
}

/**
 * Roll a single die with exploding criticals.
 * A "critical" occurs when the die rolls its maximum face value.
 * On a critical, re-roll and add additional hits; repeat if max again.
 *
 * Returns a DieResult with all rolls tracked and hit/crit determination.
 */
export function rollDieExploding(dieType: DieType, targetNumber: number): DieResult {
  const max = DIE_MAX[dieType];
  const rolls: number[] = [];
  let isCritical = false;

  // Initial roll
  let value = rollDie(dieType);
  rolls.push(value);

  // Explode on max value
  if (value === max) {
    isCritical = true;
    while (value === max) {
      value = rollDie(dieType);
      rolls.push(value);
      // Each explosion that also hits max continues the chain
      if (value !== max) break;
    }
  }

  const total = rolls.reduce((sum, v) => sum + v, 0);

  // A die is a "hit" if its initial roll meets or exceeds TN
  // Each explosion adds an additional hit if it also meets TN
  const isHit = rolls[0] >= targetNumber;

  return {
    dieType,
    rolls,
    total,
    isHit,
    isCritical,
  };
}

/**
 * Count total hits from an exploding die result.
 * Each roll in the chain that meets TN counts as a hit.
 */
export function countHits(result: DieResult, targetNumber: number): number {
  return result.rolls.filter(r => r >= targetNumber).length;
}

/**
 * Roll a full volley pool (multiple dice) against a target number.
 * Each die explodes independently.
 */
export function rollVolley(
  pool: VolleyDieInput[],
  targetNumber: number,
  rerolls: number = 0,
  rerollTacticalOnes: boolean = false,
  spoofedFireControlActive: boolean = false,
): VolleyResult {
  const dice = pool.map(item => {
    const isObject = typeof item === 'object';
    const dt = isObject ? item.type : item;
    const source = isObject ? item.source : 'basic';
    let result = rollDieExploding(dt, targetNumber);

    if (spoofedFireControlActive && result.isHit && !result.isCritical) {
      // Apply Spoofed Fire Control: +2 to the primary result
      const originalRoll = result.rolls[0];
      const newRoll = originalRoll + 2;
      const max = DIE_MAX[dt];

      if (newRoll >= max) {
        // It's now a critical! Convert and resolve explosions.
        const explodingRolls = [max];
        let value = max;
        while (value === max) {
          value = rollDie(dt);
          explodingRolls.push(value);
          if (value !== max) break;
        }

        result = {
          ...result,
          rolls: explodingRolls,
          total: explodingRolls.reduce((sum, v) => sum + v, 0),
          isHit: true,
          isCritical: true,
        };
      } else {
        // Just a better standard hit.
        result.rolls[0] = newRoll;
        result.total = result.rolls.reduce((sum, v) => sum + v, 0);
        result.isHit = true;
      }
    }

    return { ...result, source };
  });

  if (rerollTacticalOnes) {
    const tacticalIndex = dice.findIndex(die => die.source === 'officer' && die.rolls[0] === 1);
    if (tacticalIndex !== -1) {
      const rerolled = rollDieExploding(dice[tacticalIndex].dieType, targetNumber);
      dice[tacticalIndex] = { ...rerolled, source: dice[tacticalIndex].source };
    }
  }

  let remainingRerolls = rerolls;
  if (remainingRerolls > 0) {
    // Find failed dice to reroll
    for (let i = 0; i < dice.length; i++) {
      if (remainingRerolls <= 0) break;
      if (!dice[i].isHit) {
        // Reroll this die!
        const dt = dice[i].dieType;
        const source = dice[i].source;
        const newResult = rollDieExploding(dt, targetNumber);
        dice[i] = { ...newResult, source };
        remainingRerolls--;
      }
    }
  }

  let totalHits = 0;
  let totalCrits = 0;
  let totalStandardHits = 0;
  let totalCriticalHits = 0;

  for (const die of dice) {
    // Count hits from all rolls in this die's chain
    const hits = countHits(die, targetNumber);
    totalHits += hits;
    if (die.isCritical) {
      totalCrits++;
      totalCriticalHits += hits;
    } else {
      totalStandardHits += hits;
    }
  }

  // Final sanity check for UI math
  if (totalHits !== (totalStandardHits + totalCriticalHits)) {
    console.warn(`Volley Math Discrepancy: Total(${totalHits}) != Std(${totalStandardHits}) + Crit(${totalCriticalHits})`);
    // Force consistency if something went wrong in the loop logic
    totalHits = totalStandardHits + totalCriticalHits;
  }

  return {
    dice,
    targetNumber,
    totalHits,
    totalCrits,
    totalStandardHits,
    totalCriticalHits,
  };
}

/**
 * Step a skill die up one tier.
 */
export function stepUpDie(dieType: DieType): DieType {
  const order: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const idx = order.indexOf(dieType);
  if (idx < order.length - 1) return order[idx + 1];
  return dieType; // already max
}

/**
 * Step a skill die down one tier.
 */
export function stepDownDie(dieType: DieType): DieType {
  const order: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const idx = order.indexOf(dieType);
  if (idx > 0) return order[idx - 1];
  return dieType; // already min
}
