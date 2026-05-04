import type { DrydockService, MarketInventory } from '../types/campaignTypes';
import { getPurchasableWeapons, getEventWeapons } from './weapons';
import { getPurchasableSubsystems, getEventSubsystems } from './subsystems';

// ══════════════════════════════════════════════════════════════════
// Drydock Services — Hidden Drydock (Haven) Node
// ══════════════════════════════════════════════════════════════════

/**
 * Base costs for drydock services.
 * Note: Hull Patch is reduced to 3 RP if fleet has Smuggler's Manifest.
 */
export const HULL_PATCH_BASE_COST = 5;
export const HULL_PATCH_MANIFEST_COST = 3;
export const SCRAP_SUBSYSTEM_GAIN = 15;
export const PSYCH_EVAL_COST = 20;
export const DEEP_REPAIR_COST = 30;

export const OFFICER_TRAINING_COSTS: Record<string, number> = {
  'rookie-to-veteran': 15,
  'veteran-to-elite': 30,
};

export const DRYDOCK_SERVICES: DrydockService[] = [
  {
    id: 'hull-patch',
    name: 'Hull Patch',
    rpCost: HULL_PATCH_BASE_COST,
    description: 'Restore 1 Hull point to one ship. (3 RP with Smuggler\'s Manifest)',
  },
  {
    id: 'scrap-subsystem',
    name: 'Scrap Subsystem',
    rpCost: 0,
    rpGain: SCRAP_SUBSYSTEM_GAIN,
    description: 'Sell an equipped weapon or subsystem you no longer want for +15 RP.',
  },
  {
    id: 'psych-eval',
    name: 'Psych Eval',
    rpCost: PSYCH_EVAL_COST,
    description: 'Cure one Officer\'s Trauma Trait.',
  },
  {
    id: 'deep-repair',
    name: 'Deep Repair',
    rpCost: DEEP_REPAIR_COST,
    description: 'Remove one Ship Scar.',
  },
];

// ── Officer Training ──────────────────────────────────────────────

export const OFFICER_TRAINING: DrydockService[] = [
  {
    id: 'train-rookie-to-veteran',
    name: 'Officer Training: Rookie → Veteran',
    rpCost: OFFICER_TRAINING_COSTS['rookie-to-veteran'],
    description: 'Upgrade one officer from Rookie (D4) to Veteran (D6): 15 RP',
  },
  {
    id: 'train-veteran-to-elite',
    name: 'Officer Training: Veteran → Elite',
    rpCost: OFFICER_TRAINING_COSTS['veteran-to-elite'],
    description: 'Upgrade one officer from Veteran (D6) to Elite (D8): 30 RP',
  },
  // NOTE: Legendary tier is reserved for narrative rewards only — no drydock purchase
];

// ══════════════════════════════════════════════════════════════════
// Market Generator
// ══════════════════════════════════════════════════════════════════

/**
 * Generate a randomly-stocked market inventory for the Drydock.
 * Draws a baseline of 3 weapon cards and 3 subsystem cards, then
 * replaces 1-2 of those with random "Event" availability items.
 *
 * Total inventory remains 6 items (3 weapons, 3 subsystems).
 */
export function generateMarketInventory(
  excludeWeaponIds: string[] = [],
  excludeSubsystemIds: string[] = [],
): MarketInventory {
  // 1. Generate baseline pools (3 weapons, 3 subsystems)
  const weaponPool = getPurchasableWeapons().filter(w => !excludeWeaponIds.includes(w.id));
  const subsystemPool = getPurchasableSubsystems().filter(s => !excludeSubsystemIds.includes(s.id));

  const shuffledWeapons = [...weaponPool].sort(() => Math.random() - 0.5);
  const shuffledSubsystems = [...subsystemPool].sort(() => Math.random() - 0.5);

  const marketWeapons = shuffledWeapons.slice(0, 3).map(w => w.id);
  const marketSubsystems = shuffledSubsystems.slice(0, 3).map(s => s.id);

  // 2. Identify Event items
  const eventWeaponPool = getEventWeapons().filter(w => !excludeWeaponIds.includes(w.id));
  const eventSubsystemPool = getEventSubsystems().filter(s => !excludeSubsystemIds.includes(s.id));

  const combinedEventPool = [
    ...eventWeaponPool.map(w => ({ id: w.id, isWeapon: true })),
    ...eventSubsystemPool.map(s => ({ id: s.id, isWeapon: false })),
  ];

  // 3. Replace 1-2 slots with Events
  if (combinedEventPool.length > 0) {
    const numEvents = Math.floor(Math.random() * 2) + 1; // 1 or 2
    const shuffledEvents = [...combinedEventPool].sort(() => Math.random() - 0.5);
    const selectedEvents = shuffledEvents.slice(0, numEvents);

    // Track replacements
    let weaponsReplaced = 0;
    let subsystemsReplaced = 0;

    selectedEvents.forEach((event) => {
      if (event.isWeapon && weaponsReplaced < 3) {
        marketWeapons[weaponsReplaced] = event.id;
        weaponsReplaced++;
      } else if (!event.isWeapon && subsystemsReplaced < 3) {
        marketSubsystems[subsystemsReplaced] = event.id;
        subsystemsReplaced++;
      }
    });
  }

  return {
    weapons: marketWeapons,
    subsystems: marketSubsystems,
    techOffer: null,
  };
}

/**
 * Get the effective hull patch cost, accounting for Smuggler's Manifest.
 */
export function getHullPatchCost(hasSmugglerManifest: boolean): number {
  return hasSmugglerManifest ? HULL_PATCH_MANIFEST_COST : HULL_PATCH_BASE_COST;
}
