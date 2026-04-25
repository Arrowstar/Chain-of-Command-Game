import type { ExperimentalTech } from '../types/campaignTypes';
import type { ShipState, OfficerState, DieType, ShipSize } from '../types/game';
import { isCapitalShipSize, isSmallCraftSize } from '../types/game';

// ══════════════════════════════════════════════════════════════════
// Tech Effects — Combat Hooks for Experimental Tech Relics
//
// All functions are pure and side-effect free.
// They are called from useGameStore at appropriate hook points.
// ══════════════════════════════════════════════════════════════════

/** Helper: check if the fleet owns a specific (non-consumed) tech */
function hasTech(tech: ExperimentalTech[], id: string): boolean {
  return tech.some(t => t.id === id && !t.isConsumed);
}

// ══════════════════════════════════════════════════════════════════
// 1. Tactical Tech Hooks
// ══════════════════════════════════════════════════════════════════

/**
 * PLASMA ACCELERATORS
 * Increases rangeMax of all non-Ordnance weapons by 1.
 *
 * @param rangeMax  The weapon's base maximum range
 * @param isOrdnance  Whether the weapon has the 'torpedo' tag
 */
export function applyPlasmaAccelerators(
  rangeMax: number,
  isOrdnance: boolean,
  tech: ExperimentalTech[],
): number {
  if (!hasTech(tech, 'plasma-accelerators')) return rangeMax;
  if (isOrdnance) return rangeMax;
  return rangeMax === Infinity ? Infinity : rangeMax + 1;
}

/**
 * VOID-GLASS LENSES
 * If the tactical skill die rolled exactly 1, the caller may reroll once.
 * Returns true if a reroll is permitted.
 *
 * @param dieResult  The value rolled on the tactical skill die
 */
export function canRerollVoidGlass(
  dieResult: number,
  tech: ExperimentalTech[],
): boolean {
  return hasTech(tech, 'void-glass-lenses') && dieResult === 1;
}

/**
 * KINETIC SIPHON
 * When a player ship lands the killing blow on an Enemy Capital Ship
 * (size === 'medium' or 'large'), restore 1 shield to all 4 sectors.
 *
 * Returns the number of shield points to restore per sector (0 or 1).
 *
 * @param killedShipSize  Size of the ship that was just destroyed
 */
export function getKineticSiphonShieldRestore(
  killedShipSize: ShipSize,
  tech: ExperimentalTech[],
): number {
  if (!hasTech(tech, 'kinetic-siphon')) return 0;
  return isCapitalShipSize(killedShipSize) ? 1 : 0;
}

/**
 * TACHYON TARGETING MATRIX (Rare)
 * Once per combat, converts one standard hit into a critical hit.
 *
 * @param alreadyUsedThisScenario  Whether the ability was already triggered
 * Returns true if the conversion is permitted (and caller must set the flag).
 */
export function canUseTachyonMatrix(
  alreadyUsedThisScenario: boolean,
  tech: ExperimentalTech[],
): boolean {
  return hasTech(tech, 'tachyon-targeting-matrix') && !alreadyUsedThisScenario;
}

// ══════════════════════════════════════════════════════════════════
// 2. Engineering / Defensive Tech Hooks
// ══════════════════════════════════════════════════════════════════

/**
 * INERTIAL DAMPENERS
 * Negates the first collision/ramming damage instance per ship per scenario.
 *
 * @param shipId  The ship receiving collision damage
 * @param shipsAlreadyNegated  Set of ship IDs that already had their first hit negated
 * Returns the actual damage to apply (0 if negated, original value otherwise).
 */
export function applyInertialDampeners(
  incomingDamage: number,
  shipId: string,
  shipsAlreadyNegated: Set<string>,
  tech: ExperimentalTech[],
): { finalDamage: number; negated: boolean } {
  if (!hasTech(tech, 'inertial-dampeners')) {
    return { finalDamage: incomingDamage, negated: false };
  }
  if (shipsAlreadyNegated.has(shipId)) {
    return { finalDamage: incomingDamage, negated: false };
  }
  return { finalDamage: 0, negated: true };
}

/**
 * HARD-LIGHT PLATING
 * Reduces the very first hull damage point per ship per scenario to 0.
 *
 * @param shipId  The ship taking hull damage
 * @param shipsAlreadyTriggered  Set of ship IDs that already triggered Hard-Light
 * Returns { finalDamage, triggered } where triggered means the plating was consumed.
 */
export function applyHardLightPlating(
  incomingDamage: number,
  shipId: string,
  shipsAlreadyTriggered: Set<string>,
  tech: ExperimentalTech[],
): { finalDamage: number; triggered: boolean } {
  if (!hasTech(tech, 'hard-light-plating')) {
    return { finalDamage: incomingDamage, triggered: false };
  }
  if (shipsAlreadyTriggered.has(shipId) || incomingDamage <= 0) {
    return { finalDamage: incomingDamage, triggered: false };
  }
  // Reduce first point to 0 — subsequent damage applies normally
  return { finalDamage: Math.max(0, incomingDamage - 1), triggered: true };
}

/**
 * RECYCLED COOLANT
 * Once per round, one officer may ignore the +1 Fatigue Penalty.
 *
 * @param baseFatiguePenalty  The +1 fatigue cost that would normally apply
 * @param coolantUsedThisRound  Whether the coolant perk was already consumed this round
 * Returns the effective fatigue penalty (0 if coolant absorbs it, original otherwise).
 */
export function applyRecycledCoolant(
  baseFatiguePenalty: number,
  coolantUsedThisRound: boolean,
  tech: ExperimentalTech[],
): { finalPenalty: number; consumed: boolean } {
  if (!hasTech(tech, 'recycled-coolant') || coolantUsedThisRound || baseFatiguePenalty <= 0) {
    return { finalPenalty: baseFatiguePenalty, consumed: false };
  }
  return { finalPenalty: Math.max(0, baseFatiguePenalty - 1), consumed: true };
}

/**
 * AUTO-DOC OVERRIDE (Consumable)
 * Intercepts the very first Trauma Trait gained by any officer in the fleet.
 * The relic is then destroyed.
 *
 * Returns { negated, shouldConsume }
 */
export function applyAutoDocOverride(
  tech: ExperimentalTech[],
): { negated: boolean; shouldConsume: boolean } {
  if (!hasTech(tech, 'auto-doc-override')) {
    return { negated: false, shouldConsume: false };
  }
  return { negated: true, shouldConsume: true };
}

// ══════════════════════════════════════════════════════════════════
// 3. Command & Logistics Hooks
// ══════════════════════════════════════════════════════════════════

/**
 * ADMIRAL'S BLACK-BOX
 * Returns the bonus FF the fleet should start each combat scenario with.
 */
export function getAdmiralBlackBoxFF(tech: ExperimentalTech[]): number {
  return hasTech(tech, 'admirals-black-box') ? 1 : 0;
}

/**
 * SALVAGER DRONES
 * Returns bonus RP earned for each small-craft kill.
 *
 * @param killedShipSize  Size of the ship destroyed
 */
export function getSalvagerDronesRP(
  killedShipSize: ShipSize,
  tech: ExperimentalTech[],
): number {
  if (!hasTech(tech, 'salvager-drones')) return 0;
  return killedShipSize === 'small' || isSmallCraftSize(killedShipSize) ? 5 : 0;
}

/**
 * HEGEMONY ENCRYPTION KEY
 * Returns true if all Elite and Event nodes on the sector map should be revealed.
 */
export function shouldRevealEliteAndEventNodes(tech: ExperimentalTech[]): boolean {
  return hasTech(tech, 'hegemony-encryption-key');
}

// ══════════════════════════════════════════════════════════════════
// 4. Crew & Psychology Hooks
// ══════════════════════════════════════════════════════════════════

/**
 * COMBAT STIM-INJECTORS
 * Returns the bonus added to each officer's max stress limit.
 */
export function getStimInjectorBonus(tech: ExperimentalTech[]): number {
  return hasTech(tech, 'combat-stim-injectors') ? 1 : 0;
}

/**
 * ASTRO-CAF SYNTHESIZER
 * At end of Phase 4, if a ship took zero hull damage that round,
 * the player may remove 1 stress from any of their officers.
 *
 * Returns true if the perk is available for a ship that took no hull damage.
 *
 * @param shipTookHullDamageThisRound  Whether the ship took ≥1 hull damage
 */
export function canUseAstroCaf(
  shipTookHullDamageThisRound: boolean,
  tech: ExperimentalTech[],
): boolean {
  return hasTech(tech, 'astro-caf-synthesizer') && !shipTookHullDamageThisRound;
}

/**
 * NEURAL LINK UPLINK
 * When an officer resolves an action costing ≥3 total stress,
 * immediately grant 1 CT to that player's pool.
 *
 * @param totalStressCost  The final stress cost of the resolved action (including fatigue)
 * Returns bonus CT to grant (0 or 1).
 */
export function getNeuralLinkCT(
  totalStressCost: number,
  tech: ExperimentalTech[],
): number {
  if (!hasTech(tech, 'neural-link-uplink')) return 0;
  return totalStressCost >= 3 ? 1 : 0;
}
