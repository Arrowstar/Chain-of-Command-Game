import type {
  PostCombatResult, TraumaGained, ScarGained, FleetFavorConversionResult,
  EventResolution, EventEffect, CombatModifiers,
  DrydockResult, DrydockMutation, MarketInventory,
  SectorTransition, ShipReplacementConfig,
  EventRequirement,
  EventRequirementContext,
  EventOption,
  EventOptionAvailability,
  ExperimentalTech,
  PendingEconomicBuffs,
} from '../types/campaignTypes';
import type {
  OfficerState, OfficerData, ShipState, PlayerState,
  CriticalDamageCard, ScarEffect, TraumaEffect, SkillDieTier,
} from '../types/game';
import { getEventById } from '../data/eventNodes';
import { getTechById, drawRandomTech, drawMultipleRandomTech } from '../data/experimentalTech';
import { getHullPatchCost, PSYCH_EVAL_COST, DEEP_REPAIR_COST, OFFICER_TRAINING_COSTS, SCRAP_SUBSYSTEM_GAIN, generateMarketInventory } from '../data/drydock';
import { getChassisById } from '../data/shipChassis';
import { getWeaponById } from '../data/weapons';
import { getSubsystemById } from '../data/subsystems';
import { applyAutoDocOverride } from './techEffects';

// ══════════════════════════════════════════════════════════════════
// Campaign Engine — Pure Functions
// All functions are side-effect free for easy unit testing.
// ══════════════════════════════════════════════════════════════════

import { drawRandomTrauma } from '../data/traumaTraits';
import { getMaxStress } from './stress';

interface ApplyEventResolutionParams {
  resolution: EventResolution;
  requisitionPoints: number;
  fleetFavor: number;
  experimentalTech: ExperimentalTech[];
  nextCombatModifiers: CombatModifiers | null;
  canSkipNode: boolean;
  persistedPlayers: PlayerState[];
  persistedShips: ShipState[];
  stashedWeapons: string[];
  stashedSubsystems: string[];
  pendingEconomicBuffs: PendingEconomicBuffs;
}

export interface AppliedEventState {
  requisitionPoints: number;
  fleetFavor: number;
  experimentalTech: ExperimentalTech[];
  nextCombatModifiers: CombatModifiers | null;
  canSkipNode: boolean;
  persistedPlayers: PlayerState[];
  persistedShips: ShipState[];
  stashedWeapons: string[];
  stashedSubsystems: string[];
  pendingEconomicBuffs: PendingEconomicBuffs;
  grantedWeapons: string[];
  grantedSubsystems: string[];
  autoDocConsumed: boolean;
}

// ─── Scar Templates ──────────────────────────────────────────────
// Crits become Scars during damage consolidation.

const SCAR_MAP: Record<string, { name: string; effect: string }> = {
  'thrusters-offline': {
    name: 'Scorched Thrusters',
    effect: 'Max Speed is permanently reduced by 1 until repaired at a Drydock.',
  },
  'coolant-leak': {
    name: 'Compromised Cooling',
    effect: 'Engineering actions cost +1 Stress until repaired.',
  },
  'bridge-hit': {
    name: 'Damaged Bridge',
    effect: 'CT generation permanently reduced by 1 until repaired.',
  },
  'shield-generator-offline': {
    name: 'Scorched Relays',
    effect: 'Primary weapon range is reduced by 1 until repaired.',
  },
  'targeting-array-damaged': {
    name: 'Degraded Targeting',
    effect: 'Tactical Volley Pools are reduced by one die until repaired.',
  },
  'sensor-mast-damaged': {
    name: 'Warped Sensor Mast',
    effect: 'Sensors actions cost +1 Stress until repaired.',
  },
  'weapon-mount-warped': {
    name: 'Warped Cannon Mount',
    effect: 'The first primary weapon fired each round loses 1 weapon die until repaired.',
  },
  'structural-spine-buckled': {
    name: 'Buckled Structural Spine',
    effect: 'Actual Speed is capped at 2 until repaired.',
  },
  'power-bus-leak': {
    name: 'Leaking Power Bus',
    effect: 'The first assigned station action each round costs +1 CT until repaired.',
  },
  'command-spine-exposed': {
    name: 'Command Spine Exposure',
    effect: 'The Helm officer gains +1 Stress at the start of each round until repaired.',
  },
};

export function drawRandomScar(): { id: string; name: string; effect: string; fromCritId: string } {
  const keys = Object.keys(SCAR_MAP);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  const scarTemplate = SCAR_MAP[randomKey]!;
  return {
    id: `scar-${randomKey}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: scarTemplate.name,
    effect: scarTemplate.effect,
    fromCritId: randomKey,
  };
}

// ══════════════════════════════════════════════════════════════════
// 1. Post-Combat Loop (Section 3 of Campaign Progression doc)
// ══════════════════════════════════════════════════════════════════

/**
 * Executes the three-step At-Ease Phase after combat ends.
 *
 * Step 1: Convert accumulated Fleet Favor to RP (1 FF = 10 RP, minimum 0)
 * Step 2: Officers at max stress → gain Trauma, all others reset to 0
 * Step 3: Active Critical Damage Cards → become Ship Scars
 *
 * Returns a description of all mutations; callers apply them to state.
 */
export function convertFleetFavorToRP(fleetFavor: number, amount: number): FleetFavorConversionResult {
  const positiveFleetFavor = Math.max(0, fleetFavor);
  const ffSpent = Math.min(positiveFleetFavor, Math.max(0, Math.floor(amount)));
  return {
    ffSpent,
    rpGained: ffSpent * 10,
    remainingFleetFavor: fleetFavor - ffSpent,
  };
}

export function executePostCombatLoop(params: {
  players: PlayerState[];
  officerDataMap: Record<string, OfficerData>; // officerId → OfficerData
  playerShips: ShipState[];
}): PostCombatResult {
  const { players, officerDataMap, playerShips } = params;

  // ── Step 1: FF → RP conversion ────────────────────────────────
  // Only positive FF converts. Negative FF produces 0 RP.

  // ── Step 2: Trauma Assessment ─────────────────────────────────
  const traumasGained: TraumaGained[] = [];
  const officerStressResets: string[] = [];

  for (const player of players) {
    const ship = playerShips.find(s => s.id === player.shipId);
    if (!ship) continue;

    for (const officer of player.officers) {
      const data = officerDataMap[officer.officerId];
      if (!data || data.stressLimit === null) continue; // immune (Sparky)

      const maxStress = getMaxStress(officer, data);
      if (maxStress !== null && officer.currentStress >= maxStress) {
        // Officer is at max stress → gains Trauma, stress resets to 0
        const trauma = drawRandomTrauma();
        traumasGained.push({
          officerId: officer.officerId,
          shipId: ship.id,
          traumaId: trauma.id,
          traumaName: trauma.name,
          traumaEffect: trauma.effect,
        });
      }
      // All officers (whether traumatized or not) reset stress to 0
      officerStressResets.push(officer.officerId);
    }
  }

  // ── Step 3: Damage Consolidation ─────────────────────────────
  const scarsGained: ScarGained[] = [];

  for (const ship of playerShips) {
    for (const crit of ship.criticalDamage) {
      if (crit.isRepaired) continue; // already repaired, no scar

      const scarTemplate = SCAR_MAP[crit.id];
      if (!scarTemplate) continue;

      scarsGained.push({
        shipId: ship.id,
        scarId: `scar-${crit.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        fromCritId: crit.id,
        scarName: scarTemplate.name,
        scarEffect: scarTemplate.effect,
      });
    }
  }

  return { rpGained: 0, ffConverted: 0, traumasGained, scarsGained, officerStressResets };
}

// ══════════════════════════════════════════════════════════════════
// 2. Event Node Resolution
// ══════════════════════════════════════════════════════════════════

/**
 * Resolve a player's chosen option for an Event node.
 *
 * @param eventId   The ID of the event (e.g. 'event-01')
 * @param optionId  The option the players voted on
 * @param diceRoll  D6 result (1-6). Required if the option has requiresRoll=true.
 * @param ownedTechIds  Currently owned tech IDs (for no-duplicate tech draws)
 * @param forceSuccess  If true, a roll-required option uses its success branch without rolling.
 *
 * Returns an EventResolution describing all effects to apply.
 */
export function resolveEventOption(
  eventId: string,
  optionId: string,
  diceRoll?: number,
  ownedTechIds: string[] = [],
  forceSuccess = false,
): EventResolution {
  const event = getEventById(eventId);
  if (!event) {
    throw new Error(`Unknown event: ${eventId}`);
  }

  const option = event.options.find(o => o.id === optionId);
  if (!option) {
    throw new Error(`Unknown option "${optionId}" for event "${eventId}"`);
  }

  let effectsApplied: EventEffect[] = [];
  let roll: number | undefined;
  let rolledGood: boolean | undefined;
  let techAwarded: string[] = [];
  let grantedWeapons: string[] = [];
  let grantedSubsystems: string[] = [];
  let transformsToCombat = false;
  let combatModifiers: CombatModifiers | undefined;
  let narrativeResult = '';

  if (option.requiresRoll) {
    const threshold = option.rollThreshold ?? 4;
    if (forceSuccess) {
      roll = undefined;
      rolledGood = true;
      effectsApplied = option.goodEffects ?? [];
      narrativeResult = 'Requirement met. The specialist option resolves automatically without a roll.';
    } else {
      roll = diceRoll ?? Math.ceil(Math.random() * 6);
      rolledGood = roll >= threshold;
      effectsApplied = rolledGood
        ? (option.goodEffects ?? [])
        : (option.badEffects ?? []);
      narrativeResult = `Rolled a ${roll} (needed ${threshold}+). ${rolledGood ? 'Success!' : 'Failure.'}`;
    }
  } else {
    effectsApplied = option.effects ?? [];
    narrativeResult = `Selected: "${option.label}"`;
  }

  // Extract tech awards and combat transforms from the effects list
  for (const effect of effectsApplied) {
    if (effect.type === 'tech') {
      const count = effect.value ?? 1;
      const drawn = drawMultipleRandomTech(count, [...ownedTechIds, ...techAwarded]);
      techAwarded = [...techAwarded, ...drawn.map(t => t.id)];
    }
    if (effect.type === 'grantWeapon' && effect.weaponId && getWeaponById(effect.weaponId)) {
      grantedWeapons.push(effect.weaponId);
    }
    if (effect.type === 'grantSubsystem' && effect.subsystemId && getSubsystemById(effect.subsystemId)) {
      grantedSubsystems.push(effect.subsystemId);
    }
    if (effect.type === 'transformToCombat' || effect.type === 'nextCombatModifier') {
      transformsToCombat = effect.type === 'transformToCombat';
      combatModifiers = { ...combatModifiers, ...(effect.combatModifiers ?? {}) };
    }
  }

  return {
    eventId,
    optionId,
    roll,
    rolledGood,
    effectsApplied,
    techAwarded,
    grantedWeapons,
    grantedSubsystems,
    transformsToCombat,
    combatModifiers,
    narrativeResult,
  };
}

function describeRequirement(requirement: EventRequirement): string {
  if (requirement.description) return requirement.description;

  switch (requirement.type) {
    case 'officerPresent':
      return requirement.officerId ? `Requires officer ${requirement.officerId}.` : 'Requires a specific officer.';
    case 'officerStationPresent':
      return requirement.officerStation ? `Requires a ${requirement.officerStation} officer.` : 'Requires a specific station.';
    case 'techOwned':
      return requirement.techId ? `Requires tech ${requirement.techId}.` : 'Requires a specific tech.';
    case 'minFleetFavor':
      return `Requires at least ${requirement.value ?? 0} Fleet Favor.`;
    case 'minRequisitionPoints':
      return `Requires at least ${requirement.value ?? 0} RP.`;
    default:
      return 'Requirement not met.';
  }
}

function requirementMet(requirement: EventRequirement, context: EventRequirementContext): boolean {
  switch (requirement.type) {
    case 'officerPresent':
      return requirement.officerId ? context.ownedOfficerIds.includes(requirement.officerId) : false;
    case 'officerStationPresent':
      return requirement.officerStation ? context.ownedOfficerStations.includes(requirement.officerStation) : false;
    case 'techOwned':
      return requirement.techId ? context.ownedTechIds.includes(requirement.techId) : false;
    case 'minFleetFavor':
      return context.fleetFavor >= (requirement.value ?? 0);
    case 'minRequisitionPoints':
      return context.requisitionPoints >= (requirement.value ?? 0);
    default:
      return false;
  }
}

export function buildEventRequirementContext(params: {
  players: PlayerState[];
  ownedTechIds: string[];
  requisitionPoints: number;
  fleetFavor: number;
}): EventRequirementContext {
  const ownedOfficerIds = params.players.flatMap(player => player.officers.map(officer => officer.officerId));
  const ownedOfficerStations = Array.from(new Set(
    params.players.flatMap(player => player.officers.map(officer => officer.station))
  ));

  return {
    ownedOfficerIds,
    ownedOfficerStations,
    ownedTechIds: params.ownedTechIds,
    requisitionPoints: params.requisitionPoints,
    fleetFavor: params.fleetFavor,
  };
}

export function getEventOptionAvailability(
  option: EventOption,
  context: EventRequirementContext
): EventOptionAvailability {
  const requirements = option.requirements ?? [];
  if (requirements.length === 0) {
    return {
      visible: true,
      enabled: true,
      requirementsMet: true,
      autoSuccess: option.autoSuccessWhenMet === true && option.requiresRoll === true,
      unmetRequirementText: [],
    };
  }

  const requirementResults = requirements.map(requirement => ({
    requirement,
    met: requirementMet(requirement, context),
  }));
  const mode = option.requirementMode ?? 'all';
  const requirementsMet = mode === 'any'
    ? requirementResults.some(result => result.met)
    : requirementResults.every(result => result.met);
  const unmetRequirementText = requirementResults
    .filter(result => !result.met)
    .map(result => describeRequirement(result.requirement));
  const visibility = option.visibility ?? 'always';

  return {
    visible: visibility === 'hiddenWhenUnmet' ? requirementsMet : true,
    enabled: visibility === 'disabledWhenUnmet' ? requirementsMet : true,
    requirementsMet,
    autoSuccess: requirementsMet && option.autoSuccessWhenMet === true && option.requiresRoll === true,
    unmetRequirementText,
  };
}

export function applyEventResolution(params: ApplyEventResolutionParams): AppliedEventState {
  const {
    resolution,
    requisitionPoints,
    fleetFavor,
    experimentalTech,
    nextCombatModifiers,
    canSkipNode,
    persistedPlayers,
    persistedShips,
    stashedWeapons,
    stashedSubsystems,
    pendingEconomicBuffs,
  } = params;

  let rp = requisitionPoints;
  let ff = fleetFavor;
  let tech = [...experimentalTech];
  let nextMods = nextCombatModifiers;
  let skipEnabled = canSkipNode;
  let updatedPlayers = [...persistedPlayers];
  let updatedShips = [...persistedShips];
  let weaponStash = [...stashedWeapons];
  let subsystemStash = [...stashedSubsystems];
  let economicBuffs = { ...pendingEconomicBuffs };
  let autoDocConsumed = false;
  const grantedWeapons: string[] = [];
  const grantedSubsystems: string[] = [];

  for (const effect of resolution.effectsApplied) {
    if (effect.type === 'rp') rp += effect.value ?? 0;
    if (effect.type === 'ff') ff += effect.value ?? 0;
    if (effect.type === 'nextCombatModifier' && effect.combatModifiers) {
      nextMods = { ...nextMods, ...effect.combatModifiers };
    }
    if (effect.type === 'skipNode') skipEnabled = true;

    const getTargetShips = (target?: string) => {
      if (!target || target === 'all' || target === 'fleet') return updatedShips;
      if (target === 'random') {
        const randomShip = updatedShips[Math.floor(Math.random() * updatedShips.length)];
        return randomShip ? [randomShip] : [];
      }
      return [];
    };

    const getTargetPlayers = (target?: string) => {
      if (!target || target === 'all' || target === 'fleet') return updatedPlayers;
      if (target === 'random') {
        const randomPlayer = updatedPlayers[Math.floor(Math.random() * updatedPlayers.length)];
        return randomPlayer ? [randomPlayer] : [];
      }
      return [];
    };

    if (effect.type === 'hull') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id)) {
          const nextHull = Math.max(0, s.currentHull - (effect.value ?? 1));
          return { ...s, currentHull: nextHull, isDestroyed: nextHull === 0 };
        }
        return s;
      });
    }

    if (effect.type === 'hullPatch') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id)) {
          return { ...s, currentHull: Math.min(s.maxHull, s.currentHull + 1) };
        }
        return s;
      });
    }

    if (effect.type === 'scar') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id)) {
          const scar = drawRandomScar();
          return { ...s, scars: [...s.scars, { id: scar.id, name: scar.name, effect: scar.effect, fromCriticalId: scar.fromCritId }] };
        }
        return s;
      });
    }

    if (effect.type === 'clearScar') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id) && s.scars.length > 0) {
          const randomIndex = Math.floor(Math.random() * s.scars.length);
          const newScars = [...s.scars];
          newScars.splice(randomIndex, 1);
          return { ...s, scars: newScars };
        }
        return s;
      });
    }

    if (effect.type === 'destroyWeapon') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id)) {
          const filledIndices = s.equippedWeapons.map((w, i) => w !== null ? i : -1).filter(i => i !== -1);
          if (filledIndices.length > 0) {
            const indexToDestroy = filledIndices[Math.floor(Math.random() * filledIndices.length)];
            const newWeapons = [...s.equippedWeapons];
            newWeapons[indexToDestroy] = null;
            return { ...s, equippedWeapons: newWeapons };
          }
        }
        return s;
      });
    }

    if (effect.type === 'grantWeapon' && effect.weaponId && getWeaponById(effect.weaponId)) {
      weaponStash.push(effect.weaponId);
      grantedWeapons.push(effect.weaponId);
    }

    if (effect.type === 'grantSubsystem' && effect.subsystemId && getSubsystemById(effect.subsystemId)) {
      subsystemStash.push(effect.subsystemId);
      grantedSubsystems.push(effect.subsystemId);
    }

    if (effect.type === 'nextStoreDiscount') {
      economicBuffs = {
        ...economicBuffs,
        nextStoreDiscountPercent: Math.max(economicBuffs.nextStoreDiscountPercent, effect.value ?? 0),
      };
    }

    if (effect.type === 'freeRepairAtNextStation') {
      economicBuffs = {
        ...economicBuffs,
        freeRepairAtNextStation: true,
        freeRepairConsumed: false,
      };
    }

    if (effect.type === 'maxHullReduction') {
      const targets = getTargetShips(effect.target);
      const reduction = effect.value ?? 1;
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id)) {
          const newMax = Math.max(1, s.maxHull - reduction);
          return { ...s, maxHull: newMax, currentHull: Math.min(s.currentHull, newMax) };
        }
        return s;
      });
    }

    if (effect.type === 'subsystemSlotReduction') {
      const targets = getTargetShips(effect.target);
      updatedShips = updatedShips.map(s => {
        if (targets.some(t => t.id === s.id) && s.equippedSubsystems.length > 0) {
          const newSubs = [...s.equippedSubsystems];
          newSubs.pop();
          return { ...s, equippedSubsystems: newSubs };
        }
        return s;
      });
    }

    if (effect.type === 'stress' || effect.type === 'stressRecover' || effect.type === 'trauma' || effect.type === 'officerUpgrade') {
      const players = getTargetPlayers(effect.target === 'all' || effect.target === 'random' ? effect.target : 'all');
      updatedPlayers = updatedPlayers.map(p => {
        if (players.some(tp => tp.id === p.id)) {
          let officers = [...p.officers];

          let validOfficers = officers;
          if (['helm', 'tactical', 'engineering', 'sensors'].includes(effect.target ?? '')) {
            validOfficers = officers.filter(o => o.station === effect.target);
          }

          let targetOfficers = validOfficers;
          if (effect.target === 'random' && validOfficers.length > 0) {
            targetOfficers = [validOfficers[Math.floor(Math.random() * validOfficers.length)]];
          }

          officers = officers.map(o => {
            if (targetOfficers.some(to => to.officerId === o.officerId)) {
              if (effect.type === 'stress') {
                return { ...o, currentStress: o.currentStress + (effect.value ?? 1) };
              }
              if (effect.type === 'stressRecover') {
                return { ...o, currentStress: effect.value === 999 ? 0 : Math.max(0, o.currentStress - (effect.value ?? 1)) };
              }
              if (effect.type === 'trauma') {
                const autoDoc = applyAutoDocOverride(tech);
                if (autoDoc.negated) {
                  autoDocConsumed = autoDoc.shouldConsume;
                  if (autoDoc.shouldConsume) {
                    tech = tech.map(item => item.id === 'auto-doc-override' ? { ...item, isConsumed: true } : item);
                  }
                  return o;
                }
                const trauma = drawRandomTrauma();
                return { ...o, traumas: [...o.traumas, { id: trauma.id, name: trauma.name, effect: trauma.effect }] };
              }
              if (effect.type === 'officerUpgrade') {
                const tiers: ('rookie' | 'veteran' | 'elite' | 'legendary')[] = ['rookie', 'veteran', 'elite', 'legendary'];
                const currentIdx = tiers.indexOf(o.currentTier);
                const nextTier = currentIdx < tiers.length - 1 ? tiers[currentIdx + 1] : o.currentTier;
                return { ...o, currentTier: nextTier };
              }
            }
            return o;
          });

          return { ...p, officers };
        }
        return p;
      });
    }

    if (effect.type === 'maxCTReduction') {
      const players = getTargetPlayers(effect.target);
      updatedPlayers = updatedPlayers.map(p => {
        if (players.some(tp => tp.id === p.id)) {
          return { ...p, maxCommandTokens: Math.max(1, p.maxCommandTokens - (effect.value ?? 1)) };
        }
        return p;
      });
    }
  }

  for (const techId of resolution.techAwarded ?? []) {
    const techItem = getTechById(techId);
    if (techItem && !tech.some(owned => owned.id === techItem.id)) tech.push(techItem);
  }

  if (autoDocConsumed) {
    tech = tech.map(item => item.id === 'auto-doc-override' ? { ...item, isConsumed: true } : item);
  }

  return {
    requisitionPoints: Math.max(0, rp),
    fleetFavor: ff,
    experimentalTech: tech,
    nextCombatModifiers: resolution.combatModifiers
      ? { ...(resolution.transformsToCombat ? {} : (nextMods ?? {})), ...resolution.combatModifiers }
      : nextMods,
    canSkipNode: skipEnabled,
    persistedPlayers: updatedPlayers,
    persistedShips: updatedShips,
    stashedWeapons: weaponStash,
    stashedSubsystems: subsystemStash,
    pendingEconomicBuffs: economicBuffs,
    grantedWeapons,
    grantedSubsystems,
    autoDocConsumed,
  };
}

// ══════════════════════════════════════════════════════════════════
// 3. Drydock Services
// ══════════════════════════════════════════════════════════════════

export function purchaseHullPatch(params: {
  shipId: string;
  currentHull: number;
  maxHull: number;
  currentRP: number;
  hasSmugglerManifest: boolean;
}): DrydockResult {
  const { shipId, currentHull, maxHull, currentRP, hasSmugglerManifest } = params;
  const cost = getHullPatchCost(hasSmugglerManifest);

  if (currentRP < cost) {
    return { success: false, failureReason: `Not enough RP (need ${cost}, have ${currentRP})`, rpDelta: 0, mutations: [] };
  }
  if (currentHull >= maxHull) {
    return { success: false, failureReason: 'Ship is already at maximum Hull.', rpDelta: 0, mutations: [] };
  }

  return {
    success: true,
    rpDelta: -cost,
    mutations: [{ type: 'hullRestore', shipId, amount: 1 }],
  };
}

export function scrapItem(params: {
  shipId: string;
  slotIndex: number;
  isWeapon: boolean;
  currentRP: number;
}): DrydockResult {
  const { shipId, slotIndex, isWeapon } = params;
  return {
    success: true,
    rpDelta: SCRAP_SUBSYSTEM_GAIN,
    mutations: [{
      type: isWeapon ? 'weaponScrapped' : 'subsystemScrapped',
      shipId,
      slotIndex,
    }],
  };
}

export function purchasePsychEval(params: {
  officerId: string;
  shipId: string;
  traumas: TraumaEffect[];
  currentRP: number;
}): DrydockResult {
  const { officerId, shipId, traumas, currentRP } = params;

  if (currentRP < PSYCH_EVAL_COST) {
    return { success: false, failureReason: `Not enough RP (need ${PSYCH_EVAL_COST}, have ${currentRP})`, rpDelta: 0, mutations: [] };
  }
  if (traumas.length === 0) {
    return { success: false, failureReason: 'Officer has no Trauma Traits to cure.', rpDelta: 0, mutations: [] };
  }

  // Remove the most recently acquired trauma
  const traumaToRemove = traumas[traumas.length - 1];
  return {
    success: true,
    rpDelta: -PSYCH_EVAL_COST,
    mutations: [{ type: 'traumaRemoved', officerId, shipId, itemId: traumaToRemove.id }],
  };
}

export function purchaseDeepRepair(params: {
  shipId: string;
  scars: ScarEffect[];
  scarId: string;
  currentRP: number;
}): DrydockResult {
  const { shipId, scars, scarId, currentRP } = params;

  if (currentRP < DEEP_REPAIR_COST) {
    return { success: false, failureReason: `Not enough RP (need ${DEEP_REPAIR_COST}, have ${currentRP})`, rpDelta: 0, mutations: [] };
  }
  if (!scars.some(s => s.id === scarId)) {
    return { success: false, failureReason: 'Ship does not have that Scar.', rpDelta: 0, mutations: [] };
  }

  return {
    success: true,
    rpDelta: -DEEP_REPAIR_COST,
    mutations: [{ type: 'scarRemoved', shipId, itemId: scarId }],
  };
}

export function purchaseOfficerTraining(params: {
  officerId: string;
  shipId: string;
  currentTier: SkillDieTier;
  currentRP: number;
}): DrydockResult {
  const { officerId, shipId, currentTier, currentRP } = params;

  const tierMap: Record<string, { key: string; toTier: SkillDieTier }> = {
    rookie: { key: 'rookie-to-veteran', toTier: 'veteran' },
    veteran: { key: 'veteran-to-elite', toTier: 'elite' },
  };

  const upgrade = tierMap[currentTier];
  if (!upgrade) {
    return { success: false, failureReason: 'Officer cannot be upgraded (already Elite or Legendary).', rpDelta: 0, mutations: [] };
  }

  const cost = OFFICER_TRAINING_COSTS[upgrade.key];
  if (currentRP < cost) {
    return { success: false, failureReason: `Not enough RP (need ${cost}, have ${currentRP})`, rpDelta: 0, mutations: [] };
  }

  return {
    success: true,
    rpDelta: -cost,
    mutations: [{ type: 'officerUpgraded', officerId, shipId, fromTier: currentTier, toTier: upgrade.toTier }],
  };
}

export { generateMarketInventory };

// ══════════════════════════════════════════════════════════════════
// 3b. New Drydock Services — Chassis, Market, Stash
// ══════════════════════════════════════════════════════════════════

/**
 * Purchase a ship chassis upgrade. The new chassis replaces the current one.
 * Excess equipped items (beyond new slot counts) are moved to the fleet stash.
 * Officers carry over unchanged.
 */
export function purchaseChassisUpgrade(params: {
  shipId: string;
  currentChassisId: string;
  newChassisId: string;
  equippedWeapons: (string | null)[];
  equippedSubsystems: (string | null)[];
  currentRP: number;
  currentStashedWeapons: string[];
  currentStashedSubsystems: string[];
}): DrydockResult & { newStashedWeapons: string[]; newStashedSubsystems: string[] } {
  const { shipId, currentChassisId, newChassisId, equippedWeapons, equippedSubsystems,
    currentRP, currentStashedWeapons, currentStashedSubsystems } = params;

  if (newChassisId === currentChassisId) {
    return { success: false, failureReason: 'Already using this chassis.', rpDelta: 0, mutations: [], newStashedWeapons: currentStashedWeapons, newStashedSubsystems: currentStashedSubsystems };
  }

  const newChassis = getChassisById(newChassisId);
  if (!newChassis) {
    return { success: false, failureReason: `Unknown chassis: ${newChassisId}`, rpDelta: 0, mutations: [], newStashedWeapons: currentStashedWeapons, newStashedSubsystems: currentStashedSubsystems };
  }

  if (currentRP < newChassis.rpCost) {
    return { success: false, failureReason: `Not enough RP (need ${newChassis.rpCost}, have ${currentRP})`, rpDelta: 0, mutations: [], newStashedWeapons: currentStashedWeapons, newStashedSubsystems: currentStashedSubsystems };
  }

  // Items that fit in new slots carry over; excess goes to stash
  const excessWeapons = equippedWeapons.slice(newChassis.weaponSlots).filter((id): id is string => id !== null);
  const excessSubs = equippedSubsystems.slice(newChassis.internalSlots).filter((id): id is string => id !== null);

  const newStashedWeapons = [...currentStashedWeapons, ...excessWeapons];
  const newStashedSubsystems = [...currentStashedSubsystems, ...excessSubs];

  return {
    success: true,
    rpDelta: -newChassis.rpCost,
    mutations: [{ type: 'chassisUpgraded', shipId, newChassisId }],
    newStashedWeapons,
    newStashedSubsystems,
  };
}

/**
 * Purchase a weapon or subsystem from the drydock market and equip it to a slot.
 */
export function purchaseMarketItemFn(params: {
  itemId: string;
  itemType: 'weapon' | 'subsystem';
  shipId: string;
  slotIndex: number;
  currentRP: number;
}): DrydockResult {
  const { itemId, itemType, shipId, slotIndex, currentRP } = params;

  let cost = 0;
  if (itemType === 'weapon') {
    const weapon = getWeaponById(itemId);
    if (!weapon) return { success: false, failureReason: `Unknown weapon: ${itemId}`, rpDelta: 0, mutations: [] };
    cost = weapon.rpCost;
  } else {
    const sub = getSubsystemById(itemId);
    if (!sub) return { success: false, failureReason: `Unknown subsystem: ${itemId}`, rpDelta: 0, mutations: [] };
    cost = sub.rpCost;
  }

  if (currentRP < cost) {
    return { success: false, failureReason: `Not enough RP (need ${cost}, have ${currentRP})`, rpDelta: 0, mutations: [] };
  }

  const mutationType = itemType === 'weapon' ? 'weaponEquipped' : 'subsystemEquipped';
  return {
    success: true,
    rpDelta: -cost,
    mutations: [{ type: mutationType, shipId, slotIndex, itemId, itemType }],
  };
}

/**
 * Move an item between a ship equipment slot and the fleet stash. Free operation.
 */
export function swapStashItem(params: {
  shipId: string;
  slotIndex: number;
  itemId: string;
  itemType: 'weapon' | 'subsystem';
  action: 'equip' | 'stash';
}): DrydockResult {
  const { shipId, slotIndex, itemId, itemType, action } = params;
  const mutationType = action === 'equip' ? 'itemUnstashed' : 'itemStashed';
  return {
    success: true,
    rpDelta: 0,
    mutations: [{ type: mutationType, shipId, slotIndex, itemId, itemType }],
  };
}



// ══════════════════════════════════════════════════════════════════
// 4. Sector / Campaign Progression
// ══════════════════════════════════════════════════════════════════

/** RP payout for clearing the Sector Boss (massive payout per spec) */
const BOSS_RP_REWARD = 150;

/**
 * Handle the transition to the next Sector after clearing the Boss node.
 * Returns the new sector state; callers apply to campaign store.
 */
export function advanceToNextSector(currentSector: number): SectorTransition {
  const newSector = currentSector + 1;
  const campaignVictory = currentSector >= 3; // Cleared sector 3 = win

  return {
    newSector,
    newMapSeed: Math.random(),
    rpBonus: BOSS_RP_REWARD,
    shieldRestored: true,
    epicWeaponDrop: null, // TODO: implement epic weapon pool when weapon system expands
    campaignVictory,
  };
}

/**
 * Check if the entire fleet has been wiped out.
 */
export function checkTotalWipe(playerShips: ShipState[]): boolean {
  return playerShips.length > 0 && playerShips.every(s => s.isDestroyed);
}

/**
 * Configuration to rebuild a destroyed player's ship with starter gear.
 * Per spec: issued a basic Vanguard Cruiser with starting weapons and Rookie officers.
 *
 * TODO: Wire into campaign store to actually replace the ship at the next node start.
 */
export function getShipReplacementConfig(): ShipReplacementConfig {
  return {
    newChassisId: 'vanguard',
    startingWeapons: ['plasma-battery'],
    startingOfficerTiers: {
      helm: 'rookie',
      tactical: 'rookie',
      engineering: 'rookie',
      sensors: 'rookie',
    },
  };
}

/**
 * Rebuilds a destroyed ship and its officers using the replacement config.
 */
export function applyShipReplacement(
  ship: ShipState,
  player: PlayerState
): { rebuiltShip: ShipState; rebuiltPlayer: PlayerState } {
  const config = getShipReplacementConfig();
  const chassis = getChassisById(config.newChassisId);
  if (!chassis) throw new Error(`Unknown replacement chassis: ${config.newChassisId}`);

  const rebuiltShip: ShipState = {
    ...ship,
    chassisId: chassis.id,
    isDestroyed: false,
    currentHull: chassis.baseHull,
    maxHull: chassis.baseHull,
    maxShieldsPerSector: chassis.shieldsPerSector,
    shields: {
      fore: chassis.shieldsPerSector ?? 0,
      forePort: chassis.shieldsPerSector ?? 0,
      foreStarboard: chassis.shieldsPerSector ?? 0,
      aft: chassis.shieldsPerSector ?? 0,
      aftPort: chassis.shieldsPerSector ?? 0,
      aftStarboard: chassis.shieldsPerSector ?? 0,
    },
    currentSpeed: 1,
    equippedWeapons: Array.from({ length: chassis.weaponSlots }).map((_, i) => config.startingWeapons[i] || null),
    equippedSubsystems: Array.from({ length: chassis.internalSlots }).map(() => null),
    criticalDamage: [],
    scars: [],
    // Reset position variables just in case
    position: { q: 0, r: 0 },
    facing: 0,
  };

  const rebuiltPlayer: PlayerState = {
    ...player,
    officers: player.officers.map(officer => ({
      ...officer,
      currentTier: config.startingOfficerTiers[officer.station] ?? 'rookie',
      currentStress: 0,
      traumas: [],
      hasNerveCollapse: false,
      isLocked: false,
      lockDuration: 0,
      actionsPerformedThisRound: 0,
    })),
  };

  return { rebuiltShip, rebuiltPlayer };
}
