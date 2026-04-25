import type { RoECard } from '../types/game';

// ═══════════════════════════════════════════════════════════════════
// Admiral's Deck: Rules of Engagement
//
// One card is drawn at game setup and persists for the entire mission.
// Players may Override the RoE at the start of Phase 1 (Briefing)
// at a cost of -3 Fleet Favor. If never overridden, they earn +2 FF
// at end of game for exemplary obedience.
// ═══════════════════════════════════════════════════════════════════

export const ROE_DECK: RoECard[] = [

  // ─── Doctrine: Maximum Aggression ──────────────────────────────────
  {
    id: 'zero-tolerance-cowardice',
    name: 'Zero-Tolerance for Cowardice',
    doctrine: 'maximumAggression',
    flavorText: 'The Hegemony does not retreat. Hold the line or bear the consequences.',
    rule: 'If any Player Ship ends Phase 3 (Execution) at a Current Speed of 0, OR further from the nearest Enemy Ship than it started the round, the Helm Officer immediately suffers 2 Stress.',
    mechanicalEffect: {
      stressOnRetreatOrStationary: 2,
    },
  },
  {
    id: 'ramming-speed-authorized',
    name: 'Ramming Speed Authorized',
    doctrine: 'maximumAggression',
    flavorText: 'Ammunition is secondary to momentum. Your ship is a weapon.',
    rule: 'All collisions (ramming) now deal 2D6 unblockable Hull damage to both parties instead of 1D4. Tactical Note: If you brought heavy armor, use your ship as a weapon.',
    mechanicalEffect: {
      rammingDamageDice: ['d6', 'd6'],
      rammingUnblockable: true,
    },
  },
  {
    id: 'collateral-damage-approved',
    name: 'Collateral Damage Approved',
    doctrine: 'maximumAggression',
    flavorText: 'The target is the only thing that matters.',
    rule: 'All weapons with Area of Effect (Flak) or line-piercing capabilities deal +1 Damage. However, if a player\'s attack misses its intended target completely, it automatically strikes the nearest Allied unit in its line of sight.',
    mechanicalEffect: {
      aoePiercingBonusDamage: 1,
      missedShotFriendlyFire: true,
    },
  },

  // ─── Doctrine: Resource Starvation ─────────────────────────────────
  {
    id: 'ammunition-conservation',
    name: 'Ammunition Conservation Protocol',
    doctrine: 'resourceStarvation',
    flavorText: 'Every shot must count. There are no resupply ships in this sector.',
    rule: 'Whenever a Player Ship rolls an attack Volley Pool that results in zero hits, the Tactical Officer immediately suffers 2 Stress from the sheer panic of wasting ordnance.',
    mechanicalEffect: {
      stressOnWhiff: 2,
    },
  },
  {
    id: 'power-grid-rationing',
    name: 'Power Grid Rationing',
    doctrine: 'resourceStarvation',
    flavorText: 'High Command is throttling your reactor outputs. Win with less.',
    rule: 'Reduce the Base CT Generation of all Player Ships by 1.',
    mechanicalEffect: {
      ctGenerationMod: -1,
    },
  },
  {
    id: 'hold-together-duct-tape',
    name: '"Hold Together With Duct Tape"',
    doctrine: 'resourceStarvation',
    flavorText: 'Supply depots are empty. Guard every spare part.',
    rule: 'The Engineering "Damage Control" action (Hull Repair) now costs 3 CT instead of 2.',
    mechanicalEffect: {
      damageControlCostOverride: 3,
    },
  },

  // ─── Doctrine: Cruel Calculus ───────────────────────────────────────
  {
    id: 'acceptable-losses',
    name: 'Acceptable Losses',
    doctrine: 'cruelCalculus',
    flavorText: 'The Admiral expects casualties today. You are data.',
    rule: 'If a Player Capital Ship is destroyed (reduced to 0 Hull), the fleet does NOT suffer the standard -3 FF penalty. Instead, gain +1 FF for providing valuable combat data through your sacrifice.',
    mechanicalEffect: {
      destroyedShipFFOverride: 1,
    },
  },
  {
    id: 'live-fire-telemetry',
    name: 'Live-Fire Telemetry',
    doctrine: 'cruelCalculus',
    flavorText: 'High Command needs raw data on enemy shield impacts.',
    rule: 'For the first 3 Rounds of the game, players are strictly forbidden from targeting Enemy Shields. You may only fire on arcs where the enemy shields are already reduced to 0, or you must wait until Round 4 to fire freely.',
    mechanicalEffect: {
      shieldTargetBanRounds: 3,
    },
  },
  {
    id: 'overclocked-reactors',
    name: 'Overclocked Reactors',
    doctrine: 'cruelCalculus',
    flavorText: 'Safety limiters are disabled. Every erg is available — at a price.',
    rule: 'All Player Ships generate +1 CT per round. However, ANY time a Player Ship takes Hull damage (even 1 point), they must immediately draw a Critical Damage Card.',
    mechanicalEffect: {
      bonusCTPerRound: 1,
      hullDamageTriggersCrit: true,
    },
  },

  // ─── Doctrine: Total Control ────────────────────────────────────────
  {
    id: 'strict-radio-silence',
    name: 'Strict Radio Silence',
    doctrine: 'totalControl',
    flavorText: 'Comms are monitored and encrypted. Speak only when the Admiral permits.',
    rule: 'During Phase 2 (The Command Phase), players are completely forbidden from speaking or gesturing to each other while assigning Command Tokens. If a player speaks, report the violation — their ship\'s Sensors officer gains 1 Stress.',
    mechanicalEffect: {
      commsBlackoutDuringCommand: true,
      commsViolationStress: 1,
    },
  },
  {
    id: 'rigid-firing-lines',
    name: 'Rigid Firing Lines',
    doctrine: 'totalControl',
    flavorText: 'Formations must be maintained. No breaking the battle line.',
    rule: 'Player Ships may only target Enemy Ships that are located entirely within their Forward 180-degree arc (Fore, Fore-Port, Fore-Starboard). Firing backwards is considered a breakdown of the battle line and is forbidden.',
    mechanicalEffect: {
      forwardArcOnly: true,
    },
  },
];

/**
 * Draw a single random RoE card from the full deck.
 */
export function drawRoECard(): RoECard {
  const idx = Math.floor(Math.random() * ROE_DECK.length);
  return ROE_DECK[idx];
}

/**
 * Get a specific RoE card by ID (for testing / scenario overrides).
 */
export function getRoECardById(id: string): RoECard | undefined {
  return ROE_DECK.find(c => c.id === id);
}
