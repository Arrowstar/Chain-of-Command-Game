import type { CriticalDamageCard } from '../types/game';

// ─── Player Ship Critical Damage ────────────────────────────────

export const PLAYER_CRITICAL_DECK: CriticalDamageCard[] = [
  {
    id: 'thrusters-offline',
    name: 'Main Thrusters Offline',
    effect: 'Ship cannot move forward. Helm "Ahead Standard" action is locked.',
    isRepaired: false,
  },
  {
    id: 'coolant-leak',
    name: 'Coolant Leak',
    effect: 'Every time Engineering is used, the Engineering officer takes +1 additional Stress.',
    isRepaired: false,
  },
  {
    id: 'bridge-hit',
    name: 'Bridge Hit',
    effect: 'The Captain is injured. Maximum Command Tokens generated during Phase 1 is permanently reduced by 1.',
    isRepaired: false,
  },
  {
    id: 'magazine-explosion',
    name: 'Magazine Explosion',
    effect: 'Take an immediate, unpreventable 2 Hull Damage. Discard this card after resolving.',
    isRepaired: false,
  },
  {
    id: 'shield-generator-offline',
    name: 'Shield Generator Offline',
    effect: 'Shields no longer naturally regenerate 1 point during Phase 4.',
    isRepaired: false,
  },
  {
    id: 'targeting-array-damaged',
    name: 'Targeting Array Damaged',
    effect: 'Tactical Volley Pools lose their Skill Die.',
    isRepaired: false,
  },
  {
    id: 'sensor-mast-damaged',
    name: 'Sensor Mast Sheared',
    effect: 'Sensors actions cost +1 Stress until repaired.',
    isRepaired: false,
  },
  {
    id: 'weapon-mount-warped',
    name: 'Weapon Mount Warped',
    effect: 'The first primary weapon fired each round loses 1 weapon die until repaired.',
    isRepaired: false,
  },
  {
    id: 'structural-spine-buckled',
    name: 'Structural Spine Buckled',
    effect: 'This ship cannot have an actual Speed above 2 until repaired.',
    isRepaired: false,
  },
  {
    id: 'power-bus-leak',
    name: 'Power Bus Leak',
    effect: 'The first assigned station action each round costs +1 additional CT until repaired.',
    isRepaired: false,
  },
  {
    id: 'command-spine-exposed',
    name: 'Command Spine Exposed',
    effect: 'The Helm officer gains +1 Stress at the start of each round until repaired.',
    isRepaired: false,
  },
];

// ─── Enemy Ship Critical Damage ─────────────────────────────────
//
// ENGINE WIRING NOTES:
//   'enemy-weapons-disabled'   — aiTurn.ts: skips the attack step entirely for this ship.
//   'enemy-generator-offline'  — useGameStore cleanup: suppresses shield regen for this ship.
//   'enemy-engine-fire'        — useGameStore cleanup: deals 1 unblockable hull damage each round. [WIRED]
//   'enemy-comms-severed'      — aiTurn.ts: passes null effectiveTacticCard for this ship. [WIRED]
//   'armor-compromised'        — aiTurn.ts line 352: armor die is NOT rolled for incoming overflow damage. [WIRED]
//   'enemy-thruster-lockout'   — aiTurn.ts: ship's speed is halved (round down). [WIRED]
//   'enemy-fire-control-slag'  — aiTurn.ts: +2 to TN namedModifiers for all attacks. [WIRED]
//   'enemy-crew-casualties'    — aiTurn.ts: ship skips activation, card discarded immediately. [WIRED]
//   'enemy-hull-breach'        — useGameStore cleanup: deals 1 unblockable hull damage each round. [WIRED]
//   'enemy-point-defense-offline' — display-only (enemy PDC interception not yet implemented).
//   'enemy-targeting-disrupted' — display-only (tactic targeting override system not yet implemented).
//   'enemy-shield-collapse'    — immediate one-shot at crit draw: strips all shields to 0. [WIRED]
//   'enemy-reactor-overload'   — useGameStore cleanup: +1 pending CT per player per round. [WIRED]

export const ENEMY_CRITICAL_DECK: CriticalDamageCard[] = [

  // ── Weapons Systems ──────────────────────────────────────────
  {
    id: 'enemy-weapons-disabled',
    name: 'Weapons Disabled',
    effect: 'Ship cannot fire weapons during its next activation step. The weapons lockout clears automatically at the end of Phase 4.',
    isRepaired: false,
  },
  {
    id: 'enemy-fire-control-slag',
    name: 'Fire Control Slagged',
    effect: 'The ship\'s targeting computers are severely compromised. All attacks made by this ship suffer +2 to their Target Number.',
    isRepaired: false,
  },
  {
    id: 'enemy-point-defense-offline',
    name: 'Point Defense Offline',
    effect: 'This ship\'s point defense systems are disabled. It cannot intercept incoming Torpedoes for the rest of the battle.',
    isRepaired: false,
  },

  // ── Propulsion ───────────────────────────────────────────────
  {
    id: 'enemy-thruster-lockout',
    name: 'Thruster Lockout',
    effect: 'Catastrophic damage to the drive manifold. This ship\'s effective speed is halved (rounded down) for the rest of the battle.',
    isRepaired: false,
  },

  // ── Shields & Armor ──────────────────────────────────────────
  {
    id: 'enemy-generator-offline',
    name: 'Shield Generator Offline',
    effect: 'The shield emitter array is fused. This ship\'s shields no longer naturally regenerate during the Cleanup Phase.',
    isRepaired: false,
  },
  {
    id: 'enemy-shield-collapse',
    name: 'Shield Collapse',
    effect: 'A feedback surge overloads every shield node simultaneously. All shield sectors on this ship are immediately reduced to 0. Discard after resolving.',
    isRepaired: false,
  },
  {
    id: 'armor-compromised',
    name: 'Armor Compromised',
    effect: 'Structural damage has shattered the reactive plating. This ship no longer rolls its Armor Die to mitigate overflow Hull damage.',
    isRepaired: false,
  },

  // ── Hull Integrity ───────────────────────────────────────────
  {
    id: 'enemy-engine-fire',
    name: 'Engine Fire',
    effect: 'Uncontrolled plasma fires rage through the engineering compartment. This ship takes 1 unblockable Hull damage at the start of each Cleanup Phase.',
    isRepaired: false,
  },
  {
    id: 'enemy-hull-breach',
    name: 'Hull Breach',
    effect: 'A catastrophic structural tear is venting atmosphere. This ship takes 1 unblockable Hull damage at the start of each Cleanup Phase.',
    isRepaired: false,
  },
  {
    id: 'enemy-reactor-overload',
    name: 'Reactor Overload',
    effect: 'The ship\'s reactor is spiking uncontrollably. The War Council gains +1 bonus Command Token at the start of each Briefing Phase while this critical remains active.',
    isRepaired: false,
  },

  // ── Crew & Command ───────────────────────────────────────────
  {
    id: 'enemy-comms-severed',
    name: 'Comms Severed',
    effect: 'The ship\'s command network is down. It ignores the current AI Tactic Card\'s bonuses and targeting overrides this round.',
    isRepaired: false,
  },
  {
    id: 'enemy-crew-casualties',
    name: 'Crew Casualties',
    effect: 'A catastrophic internal explosion kills or injures critical bridge crew. This ship skips its entire activation step (movement and attack) this round. Discard after resolving.',
    isRepaired: false,
  },
  {
    id: 'enemy-targeting-disrupted',
    name: 'Targeting Disrupted',
    effect: 'Sensor damage scrambles the threat-assessment AI. This ship ignores tactic card targeting overrides and must target the closest valid player ship instead.',
    isRepaired: false,
  },
];

export function createShuffledPlayerCritDeck(): CriticalDamageCard[] {
  return [...PLAYER_CRITICAL_DECK].map(c => ({ ...c })).sort(() => Math.random() - 0.5);
}

export function createShuffledEnemyCritDeck(): CriticalDamageCard[] {
  return [...ENEMY_CRITICAL_DECK].map(c => ({ ...c })).sort(() => Math.random() - 0.5);
}

export function drawCriticalCard(deck: CriticalDamageCard[], type: 'player' | 'enemy' = 'player'): {
  card: CriticalDamageCard;
  remainingDeck: CriticalDamageCard[];
} {
  if (deck.length === 0) {
    // Reshuffle from template
    const template = type === 'enemy' ? ENEMY_CRITICAL_DECK : PLAYER_CRITICAL_DECK;
    const reshuffled = [...template].map(c => ({ ...c })).sort(() => Math.random() - 0.5);
    return { card: reshuffled[0], remainingDeck: reshuffled.slice(1) };
  }
  const card = { ...deck[0] };
  return { card, remainingDeck: deck.slice(1) };
}
