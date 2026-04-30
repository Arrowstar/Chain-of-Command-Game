import type { ActionDefinition } from '../types/game';

/**
 * Standard action nodes available on every Captain's Dashboard.
 * Subsystem-granted actions are defined in subsystems.ts and added dynamically.
 */
export const STANDARD_ACTIONS: ActionDefinition[] = [
  // ─── Helm ──────────────────────────────────────────
  {
    id: 'adjust-speed',
    station: 'helm',
    name: 'Adjust Speed',
    ctCost: 1,
    stressCost: 0,
    effect: "Increase or decrease the ship's Current Speed by 1 (Minimum 0, up to Chassis Max Speed). Applies to the NEXT round's drift.",
  },
  {
    id: 'rotate',
    station: 'helm',
    name: 'Rotate',
    ctCost: 1,
    stressCost: 1,
    effect: 'Rotate the ship 60 degrees (one face) in either direction.',
  },
  {
    id: 'evasive-pattern',
    station: 'helm',
    name: 'Evasive Pattern',
    ctCost: 2,
    stressCost: 2,
    effect: '+2 Base Evasion (TN) for this round. Precision Maneuvering: roll Helm Skill Die on 4+ for +3 instead; crit refunds Stress.',
  },

  // ─── Tactical ──────────────────────────────────────
  {
    id: 'fire-primary',
    station: 'tactical',
    name: 'Fire Primary',
    ctCost: 1,
    stressCost: 1,
    effect: 'Select a weapon module and roll its Volley Pool at a valid target.',
    requiresTarget: true,
    requiresWeaponSlot: true,
  },
  {
    id: 'load-ordinance',
    station: 'tactical',
    name: 'Load Ordnance',
    ctCost: 1,
    stressCost: 0,
    effect: 'Reload a spent [Ordnance] weapon (Heavy Railgun, Torpedo Tubes) so it can be fired again next turn.',
    requiresWeaponSlot: true,
    hideIfNoOrdnance: true,
  },
  {
    id: 'vector-orders',
    station: 'tactical',
    name: 'Vector Orders',
    ctCost: 1,
    stressCost: 0,
    effect: 'Assign ONE of your Fighter squadrons to a new behavior and target. They will execute that behavior until reassigned or destroyed.',
    requiresTarget: true,
  },
  {
    id: 'rotate-shields',
    station: 'tactical',
    name: 'Rotate Shields',
    ctCost: 1,
    stressCost: 1,
    effect: 'Transfer 1 Shield point from any donor arc (must have 1+) to any receiver arc (must be below maximum).',
    requiresTwoShieldSectors: true,
  },

  // ─── Engineering ───────────────────────────────────
  {
    id: 'reinforce-shields',
    station: 'engineering',
    name: 'Reinforce Shields',
    ctCost: 1,
    stressCost: 1,
    effect: 'Restore 2 Shield points to any single Shield Sector.',
    requiresShieldSector: true,
  },
  {
    id: 'damage-control',
    station: 'engineering',
    name: 'Damage Control',
    ctCost: 2,
    stressCost: 2,
    effect: 'Repair 1 Hull point or attempt to clear a Critical Damage card (roll 4+ on D6). Miracle Work: hull repair rolls Engineering Skill Die on 4+ for 2 Hull; crit also grants +1 CT.',
  },
  {
    id: 'reroute-power',
    station: 'engineering',
    name: 'Reroute Power',
    ctCost: 1,
    stressCost: 3,
    effect: 'Gain +2 Command Tokens at the start of the next round.',
  },
  {
    id: 'steady-nerves',
    station: 'engineering',
    name: 'Steady Nerves',
    ctCost: 1,
    stressCost: 1,
    effect: 'During execution, choose one allied officer and reduce their Stress by 1.',
  },

  // ─── Sensors ───────────────────────────────────────
  {
    id: 'target-lock',
    station: 'sensors',
    name: 'Target Lock',
    ctCost: 1,
    stressCost: 0,
    effect: 'Decrease TN by 1 against a specific target for the rest of this round. Target Painting: roll Sensors Skill Die on 4+ to improve the lock by an additional 1 TN for the rest of the round; crit also grants one [Armor Piercing] volley.',
    requiresTarget: true,
  },
  {
    id: 'cyber-warfare',
    station: 'sensors',
    name: 'Cyber-Warfare',
    ctCost: 2,
    stressCost: 2,
    effect: 'Disable one enemy Shield Sector (reduce to 0) for the current round.',
    requiresTarget: true,
    requiresShieldSector: true,
  },

  // ─── Scenario Objectives ────────────────────────────────────────
  {
    id: 'jump-to-warp',
    station: 'helm',
    name: 'Jump to Warp',
    ctCost: 1,
    stressCost: 1,
    effect: 'Engage the warp drive and escape the engagement zone. The ship is removed from the board. Note: If this is a Breakout mission, jumping outside the escape zone (q − r ≥ 12) does not count toward the mission goal!',
  },
  {
    id: 'pickup-supply-crate',
    station: 'sensors',
    name: 'Pick Up Supply Crate',
    ctCost: 1,
    stressCost: 0,
    effect: '[Salvage Run] Collect a Supply Crate token on this ship\'s current hex. Requires the ship to be on the same hex as an uncollected crate.',
    hideUnlessObjective: 'Salvage Run',
  },
];


export function getActionsByStation(station: string): ActionDefinition[] {
  return STANDARD_ACTIONS.filter(a => a.station === station);
}

export function getActionById(id: string): ActionDefinition | undefined {
  return STANDARD_ACTIONS.find(a => a.id === id);
}

import type { OfficerData, ShipChassis, TraumaEffect } from '../types/game';

export function calculateActionCosts(
  action: { actionId: string; ctCost: number; stressCost: number },
  officerData: OfficerData | null | undefined,
  priorAssignmentsCount: number,
  context?: Record<string, any>,
  usedMethodicalThisRound: boolean = false,
  traumas: TraumaEffect[] = [],
  isFirstActionAssignedThisRound: boolean = false,
): { ctCost: number; stressCost: number; usedMethodical: boolean } {
  let stressCost = action.stressCost;
  let ctCost = action.ctCost;
  let usedMethodical = usedMethodicalThisRound;

  // Trauma effects (CT and Stress modifications)
  const hasTrauma = (id: string) => traumas.some(t => t.id === id);

  if (hasTrauma('hyper-vigilant')) { // Hyper-Vigilant: every action on Sensors costs +1 Stress
    // We assume if this function is called, and they have this trauma, it's on Sensors station since that's where the trauma is.
    // To be perfectly safe, we'll just add +1 Stress.
    stressCost += 1;
  }
  if (hasTrauma('tunnel-vision') && action.actionId === 'rotate') { // Tunnel Vision: Rotate costs 2 Stress
    stressCost = 2; // overrides methodical if we apply it after, let's do it before methodical
  }
  if (hasTrauma('resource-hoarder') && action.actionId === 'damage-control') { // Resource Hoarder: Damage Control costs 3 CT
    ctCost = 3;
  }
  if (hasTrauma('micromanager') && isFirstActionAssignedThisRound) { // Micromanager: first CT assigned each round costs +1 CT
    ctCost += 1;
  }
  if (hasTrauma('gun-shy') && action.actionId === 'fire-primary') { // Gun-Shy: Primary Weapon attacks cost +1 CT
    ctCost += 1;
  }
  if (hasTrauma('trigger-happy') && action.actionId === 'fire-primary') { // Trigger Happy: Primary Weapon attacks cost -1 Stress
    stressCost = Math.max(0, stressCost - 1);
  }

  // Lethargic fatigue calculation
  const fatiguePenalty = hasTrauma('lethargic') ? 2 : 1;
  stressCost += priorAssignmentsCount * fatiguePenalty;

  if (!officerData) {
    return { ctCost, stressCost, usedMethodical };
  }

  // Trait overrides
  if (officerData.traitName === 'Methodical' && action.actionId === 'rotate' && !usedMethodical) {
    stressCost = 0; // Notice: this overrides tunnel vision, which is fine (traits > traumas? or traumas > traits?) Let's keep it here.
    usedMethodical = true;
  } else if (officerData.traitName === 'Paranoia' && action.actionId === 'evasive-pattern') {
    stressCost += 1;
  } else if (officerData.traitName === 'Lead Foot' && action.actionId === 'adjust-speed' && context?.delta && context.delta > 0) {
    stressCost = 0;
  } else if (officerData.traitName === 'Heavy Loader' && action.actionId === 'load-ordinance') {
    ctCost = 0;
  } else if (officerData.traitName === 'Synth-Logic' && action.actionId === 'damage-control') {
    // If Resource Hoarder is active, Synth-Logic's base cost is 3 anyway, so it doesn't matter.
    ctCost = 3;
  } else if (officerData.traitName === 'Hacker' && action.actionId === 'cyber-warfare') {
    ctCost -= 1;
  }

  return { ctCost, stressCost, usedMethodical };
}
