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

export const ENEMY_CRITICAL_DECK: CriticalDamageCard[] = [
  {
    id: 'enemy-weapons-disabled',
    name: 'Weapons Disabled',
    effect: 'Ship cannot fire during its next activation step. Discard after 1 round.',
    isRepaired: false,
  },
  {
    id: 'enemy-engine-fire',
    name: 'Engine Fire',
    effect: 'Ship takes 1 unblockable Hull damage at the start of Phase 4.',
    isRepaired: false,
  },
  {
    id: 'enemy-comms-severed',
    name: 'Comms Severed',
    effect: 'Ship ignores the current AI Tactic Card.',
    isRepaired: false,
  },
  {
    id: 'enemy-generator-offline',
    name: 'Shield Generator Offline',
    effect: 'Ship shields no longer naturally regenerate each Cleanup Phase until this critical is cleared.',
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
