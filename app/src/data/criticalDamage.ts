import type { CriticalDamageCard } from '../types/game';

// ─── Player Ship Critical Damage ────────────────────────────────

export const PLAYER_CRITICAL_DECK: CriticalDamageCard[] = [
  {
    id: 'thrusters-offline',
    name: 'Main Thrusters Offline',
    effect: 'Ship speed is reduced to 0 and it cannot move until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/thrusters-offline.png',
  },
  {
    id: 'coolant-leak',
    name: 'Coolant Leak',
    effect: 'Every time Engineering is used, the Engineering officer takes +1 additional Stress.',
    isRepaired: false,
    imagePath: '/assets/critical/coolant-leak.png',
  },
  {
    id: 'bridge-hit',
    name: 'Bridge Hit',
    effect: 'The Captain is injured. Maximum Command Tokens generated during the Briefing Phase is permanently reduced by 1.',
    isRepaired: false,
    imagePath: '/assets/critical/bridge-hit.png',
  },
  {
    id: 'magazine-explosion',
    name: 'Magazine Explosion',
    effect: 'Take an immediate, unpreventable 2 Hull Damage. Discard this card after resolving.',
    isRepaired: false,
    imagePath: '/assets/critical/magazine-explosion.png',
  },
  {
    id: 'shield-generator-offline',
    name: 'Shield Generator Offline',
    effect: 'Shields no longer naturally regenerate 1 point during the Cleanup Phase.',
    isRepaired: false,
    imagePath: '/assets/critical/shield-generator-offline.png',
  },
  {
    id: 'targeting-array-damaged',
    name: 'Targeting Array Damaged',
    effect: 'Tactical Volley Pools lose their Skill Die.',
    isRepaired: false,
    imagePath: '/assets/critical/targeting-array-damaged.png',
  },
  {
    id: 'sensor-mast-damaged',
    name: 'Sensor Mast Sheared',
    effect: 'Sensors actions cost +1 Stress until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/sensor-mast-damaged.png',
  },
  {
    id: 'weapon-mount-warped',
    name: 'Weapon Mount Warped',
    effect: 'The first primary weapon fired each round loses 1 weapon die until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/weapon-mount-warped.png',
  },
  {
    id: 'structural-spine-buckled',
    name: 'Structural Spine Buckled',
    effect: 'This ship cannot have an actual Speed above 2 until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/structural-spine-buckled.png',
  },
  {
    id: 'power-bus-leak',
    name: 'Power Bus Leak',
    effect: 'The first assigned station action each round costs +1 additional CT until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/power-bus-leak.png',
  },
  {
    id: 'command-spine-exposed',
    name: 'Command Spine Exposed',
    effect: 'The Helm officer gains +1 Stress at the start of each round until repaired.',
    isRepaired: false,
    imagePath: '/assets/critical/command-spine-exposed.png',
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
//   'enemy-targeting-disrupted' — aiTurn.ts: ignores tactic targeting overrides, forces closest player target. [WIRED]
//   'enemy-shield-collapse'    — immediate one-shot at crit draw: strips all shields to 0. [WIRED]
//   'enemy-reactor-overload'   — useGameStore cleanup: +1 pending CT per player per round. [WIRED]

export const ENEMY_CRITICAL_DECK: CriticalDamageCard[] = [

  // ── Weapons Systems ──────────────────────────────────────────
  {
    id: 'enemy-weapons-disabled',
    name: 'Weapons Disabled',
    effect: 'Ship cannot fire weapons during its next activation step. The weapons lockout clears automatically at the end of the Cleanup Phase.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-weapons-disabled.png',
  },
  {
    id: 'enemy-fire-control-slag',
    name: 'Fire Control Slagged',
    effect: 'The ship\'s targeting computers are severely compromised. All attacks made by this ship suffer +2 to their Target Number.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-fire-control-slag.png',
  },
  {
    id: 'enemy-point-defense-offline',
    name: 'Point Defense Offline',
    effect: 'This ship\'s point defense systems are disabled. It cannot intercept incoming Torpedoes for the rest of the battle.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-point-defense-offline.png',
  },

  // ── Propulsion ───────────────────────────────────────────────
  {
    id: 'enemy-thruster-lockout',
    name: 'Thruster Lockout',
    effect: 'Catastrophic damage to the drive manifold. This ship\'s effective speed is halved (rounded down) for the rest of the battle.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-thruster-lockout.png',
  },

  // ── Shields & Armor ──────────────────────────────────────────
  {
    id: 'enemy-generator-offline',
    name: 'Shield Generator Offline',
    effect: 'The shield emitter array is fused. This ship\'s shields no longer naturally regenerate during the Cleanup Phase.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-generator-offline.png',
  },
  {
    id: 'enemy-shield-collapse',
    name: 'Shield Collapse',
    effect: 'A feedback surge overloads every shield node simultaneously. All shield sectors on this ship are immediately reduced to 0. Discard after resolving.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-shield-collapse.png',
  },
  {
    id: 'armor-compromised',
    name: 'Armor Compromised',
    effect: 'Structural damage has shattered the reactive plating. This ship no longer rolls its Armor Die to mitigate overflow Hull damage.',
    isRepaired: false,
    imagePath: '/assets/critical/armor-compromised.png',
  },

  // ── Hull Integrity ───────────────────────────────────────────
  {
    id: 'enemy-engine-fire',
    name: 'Engine Fire',
    effect: 'Uncontrolled plasma fires rage through the engineering compartment. This ship takes 1 unblockable Hull damage at the start of each Cleanup Phase.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-engine-fire.png',
  },
  {
    id: 'enemy-hull-breach',
    name: 'Hull Breach',
    effect: 'A catastrophic structural tear is venting atmosphere. This ship takes 1 unblockable Hull damage at the start of each Cleanup Phase.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-hull-breach.png',
  },
  {
    id: 'enemy-reactor-overload',
    name: 'Reactor Overload',
    effect: 'The ship\'s reactor is spiking uncontrollably. The War Council gains +1 bonus Command Token at the start of each Briefing Phase while this critical remains active.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-reactor-overload.png',
  },

  // ── Crew & Command ───────────────────────────────────────────
  {
    id: 'enemy-comms-severed',
    name: 'Comms Severed',
    effect: 'The ship\'s command network is down. It ignores the current AI Tactic Card\'s bonuses and targeting overrides this round.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-comms-severed.png',
  },
  {
    id: 'enemy-crew-casualties',
    name: 'Crew Casualties',
    effect: 'A catastrophic internal explosion kills or injures critical bridge crew. This ship skips its entire activation step (movement and attack) this round. Discard after resolving.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-crew-casualties.png',
  },
  {
    id: 'enemy-targeting-disrupted',
    name: 'Targeting Disrupted',
    effect: 'Sensor damage scrambles the threat-assessment AI. This ship ignores tactic card targeting overrides and must target the closest valid player ship instead.',
    isRepaired: false,
    imagePath: '/assets/critical/enemy-targeting-disrupted.png',
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
