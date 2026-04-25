import type { ExperimentalTech, TechCategory } from '../types/campaignTypes';

// ══════════════════════════════════════════════════════════════════
// Experimental Tech (Campaign Relics)
// All 15 passive relics from Content Database: Experimental Tech
// ══════════════════════════════════════════════════════════════════

export const EXPERIMENTAL_TECH: ExperimentalTech[] = [

  // ── 1. Tactical & Ordnance Tech ──────────────────────────────

  {
    id: 'plasma-accelerators',
    name: 'Plasma Accelerators',
    category: 'tactical',
    effect: 'The maximum range of all non-[Ordnance] weapon modules equipped by the fleet is increased by 1 Hex.',
    flavorText: '"We bypassed the safety regulators. The coils will melt eventually, but today, we outrange them."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'void-glass-lenses',
    name: 'Void-Glass Lenses',
    category: 'tactical',
    effect: 'Whenever an officer rolls their Tactical Skill Die in a Volley Pool, a result of exactly 1 may be rerolled once.',
    flavorText: '"Perfectly focuses the beam. Just don\'t look directly at the emitter when it fires."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'kinetic-siphon',
    name: 'Kinetic Siphon',
    category: 'tactical',
    effect: 'Whenever a player ship lands the killing blow on an Enemy Capital Ship, that player immediately restores 1 Shield point to all four of their ship\'s sectors.',
    flavorText: '"It converts the enemy\'s reactor death-throe into a localized electromagnetic surge."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'tachyon-targeting-matrix',
    name: 'Tachyon Targeting Matrix',
    category: 'tactical',
    effect: 'Once per combat scenario, during Phase 3, the War Council may declare a "Tachyon Strike." Choose one standard Hit just rolled in any Volley Pool and manually convert it into a Critical Hit (which then explodes as normal).',
    flavorText: '"It calculates the firing solution before the enemy even knows they\'re in combat."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'rare',
  },

  // ── 2. Engineering & Defensive Tech ──────────────────────────

  {
    id: 'inertial-dampeners',
    name: 'Inertial Dampeners',
    category: 'engineering',
    effect: 'The first time each player ship would take Collision/Ramming damage in a scenario, completely negate that damage.',
    flavorText: '"Brace for impact... actually, never mind. We barely felt it."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'hard-light-plating',
    name: 'Hard-Light Plating',
    category: 'engineering',
    effect: 'The very first point of Hull damage taken by each player ship during a combat scenario is reduced to 0.',
    flavorText: '"An experimental Hegemony prototype. It shatters after one hit, but it absorbs the kinetic shock perfectly."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'recycled-coolant',
    name: 'Recycled Coolant',
    category: 'engineering',
    effect: 'Once per round, any single Officer in the fleet may ignore the +1 Fatigue Penalty when activating a node they have already used this round.',
    flavorText: '"It smells like ozone and bleach, but it keeps the consoles from catching fire."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'auto-doc-override',
    name: 'Auto-Doc Override',
    category: 'engineering',
    effect: 'The first time any Bridge Officer in the fleet would gain a permanent Trauma Trait, they do not. The trauma is negated, and this relic is destroyed and removed from the fleet\'s inventory.',
    flavorText: '"A highly illegal cocktail of combat stims and memory-wipes. Only good for one dose."',
    isConsumable: true,
    isConsumed: false,
    rarity: 'common',
  },

  // ── 3. Command & Logistics ────────────────────────────────────

  {
    id: 'admirals-black-box',
    name: "The Admiral's Black-Box",
    category: 'command',
    effect: 'The fleet starts every combat scenario with +1 Fleet Favor (FF) already on the track.',
    flavorText: '"We spoofed their IFF codes. High Command thinks we\'re just a loyal patrol fleet... for the first three minutes, anyway."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'salvager-drones',
    name: 'Salvager Drones',
    category: 'command',
    effect: 'The fleet earns a bonus +5 RP at the end of the mission for every Hegemony Small Craft (Corvette or Interceptor Wing) destroyed during the combat.',
    flavorText: '"Release the swarm. Strip them down to the bolts before they even cool."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'smugglers-manifest',
    name: "Smuggler's Manifest",
    category: 'command',
    effect: 'At all [Haven] Drydock nodes, the "Hull Patch" service costs 3 RP instead of 5 RP.',
    flavorText: '"Turns out, if you know the right black market frequencies, titanium plating is dirt cheap."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'hegemony-encryption-key',
    name: 'Hegemony Encryption Key',
    category: 'command',
    effect: 'Upon entering a new Sector, immediately reveal the specific details of all [Elite] and [Event] nodes on the Sector Map.',
    flavorText: '"We have their deployment schedules. We know exactly where the traps are set."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'rare',
  },

  // ── 4. Crew & Psychology ──────────────────────────────────────

  {
    id: 'combat-stim-injectors',
    name: 'Combat Stim-Injectors',
    category: 'crew',
    effect: 'Every Bridge Officer in the fleet increases their Maximum Stress Limit by +1.',
    flavorText: '"Legal? No. Effective? Very. Just ignore the twitching."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'astro-caf-synthesizer',
    name: 'Astro-Caf Synthesizer',
    category: 'crew',
    effect: "At the end of Phase 4, if a player's ship took absolutely no Hull damage that round, that player may remove 1 Stress from any of their Bridge Officers.",
    flavorText: '"It tastes like battery acid, but it\'s the only thing keeping the graveyard shift awake."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
  },
  {
    id: 'neural-link-uplink',
    name: 'Neural Link Uplink',
    category: 'crew',
    effect: 'Whenever an officer resolves an action that costs 3 or more Stress (including Fatigue Penalties), immediately gain 1 Command Token (CT) into that player\'s unspent pool.',
    flavorText: '"The interface translates sheer panic into raw processing power."',
    isConsumable: false,
    isConsumed: false,
    rarity: 'rare',
  },
];

// ══════════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════════

/** Returns the full tech roster */
export function getAllTech(): ExperimentalTech[] {
  return EXPERIMENTAL_TECH.map(t => ({ ...t }));
}

/** Look up a tech by ID */
export function getTechById(id: string): ExperimentalTech | undefined {
  const tech = EXPERIMENTAL_TECH.find(t => t.id === id);
  return tech ? { ...tech } : undefined;
}

/** Get all tech in a given category */
export function getTechByCategory(category: TechCategory): ExperimentalTech[] {
  return EXPERIMENTAL_TECH.filter(t => t.category === category).map(t => ({ ...t }));
}

/**
 * Draw one random Experimental Tech from the pool.
 * Excludes any tech IDs already owned by the fleet to prevent duplicates.
 * Returns null if the entire pool is exhausted.
 */
export function drawRandomTech(excludeIds: string[] = []): ExperimentalTech | null {
  const available = EXPERIMENTAL_TECH.filter(t => !excludeIds.includes(t.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return { ...available[idx] };
}

/**
 * Draw N unique random techs from the pool, excluding already-owned IDs.
 * If the pool doesn't have enough, returns what's available.
 */
export function drawMultipleRandomTech(count: number, excludeIds: string[] = []): ExperimentalTech[] {
  const available = EXPERIMENTAL_TECH.filter(t => !excludeIds.includes(t.id));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(t => ({ ...t }));
}
