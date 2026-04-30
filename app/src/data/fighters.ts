import type { FighterClassData } from '../types/game';

// ─── Player Fighter Class Definitions ────────────────────────────────────────
//
// Each entry's `imageKey` maps to a key in ASSET_MAP (pixiGraphics.ts).
// Set imageKey to the matching key once artwork is placed in:
//   app/art/ships/player/fighters/
// Leave imageKey undefined (or comment it out) to show the placeholder icon.
//
// KEY REFERENCE (Player):
//   'fighter-strike'         → art/ships/player/player_fighters.png  (DONE)
//   'fighter-heavy-bomber'   → art/ships/player/fighters/heavy_bomber.png
//   'fighter-ew'             → art/ships/player/fighters/ew_fighter.png
//   'fighter-intercept'      → art/ships/player/fighters/intercept_screen.png
//   'fighter-gunship'        → art/ships/player/fighters/armored_gunship.png
//
// KEY REFERENCE (Enemy / Hegemony):
//   'enemy-fighter-strike'   → art/ships/hegemony/fighters/heg_strike.png
//   'enemy-fighter-bomber'   → art/ships/hegemony/fighters/heg_bomber.png
//   'enemy-fighter-ew'       → art/ships/hegemony/fighters/heg_ew.png
//   'enemy-fighter-intercept'→ art/ships/hegemony/fighters/heg_intercept.png
//   'enemy-fighter-gunship'  → art/ships/hegemony/fighters/heg_gunship.png
// ─────────────────────────────────────────────────────────────────────────────

export const FIGHTER_CLASSES: Record<string, FighterClassData> = {
  'strike-fighter': {
    id: 'strike-fighter',
    name: 'Strike Fighter',
    role: 'Standard close-range combatant.',
    hull: 1,
    speed: 4,
    baseEvasion: 6,
    weaponRangeMax: 1,
    volleyPool: ['d4', 'd4', 'd4'],
    behavior: 'attack',
    imageKey: 'fighter-strike',       // ✅ Existing artwork (player_fighters.png)
  },
  'heavy-bomber': {
    id: 'heavy-bomber',
    name: 'Heavy Bomber',
    role: 'Long-range bombardment. High damage, but slow and vulnerable.',
    hull: 2,
    speed: 2,
    baseEvasion: 4,
    weaponRangeMax: 3,
    volleyPool: ['d8', 'd8'],
    behavior: 'harass',
    imageKey: 'fighter-heavy-bomber', // 📁 Place art at: art/ships/player/fighters/heavy_bomber.png
  },
  'ew-fighter': {
    id: 'ew-fighter',
    name: 'Electronic Warfare Fighter',
    role: 'Support and debuffing via proximity. Lowers target TN.',
    hull: 1,
    speed: 3,
    baseEvasion: 7,
    weaponRangeMax: 2,
    volleyPool: ['d4', 'd4'],
    behavior: 'harass',
    specialRules: 'Applies a temporary -1 TN to all friendly volleys against the target it is engaging.',
    imageKey: 'fighter-ew',           // 📁 Place art at: art/ships/player/fighters/ew_fighter.png
  },
  'interceptor': {
    id: 'interceptor',
    name: 'Interceptor',
    role: 'Extremely fast anti-torpedo and anti-fighter defense.',
    hull: 1,
    speed: 5,
    baseEvasion: 8,
    weaponRangeMax: 1,
    volleyPool: ['d4', 'd4', 'd4'],
    behavior: 'screen',
    imageKey: 'fighter-interceptor',    // 📁 Place art at: art/ships/player/fighters/interceptor.png
  },
  'armored-gunship': {
    id: 'armored-gunship',
    name: 'Armored Gunship',
    role: 'Durable close-range combatant.',
    hull: 2,
    speed: 3,
    baseEvasion: 3,
    weaponRangeMax: 1,
    volleyPool: ['d6', 'd6', 'd6'],
    behavior: 'attack',
    imageKey: 'fighter-gunship',      // 📁 Place art at: art/ships/player/fighters/armored_gunship.png
  },
};

export function getFighterClassById(id: string): FighterClassData | undefined {
  return FIGHTER_CLASSES[id] ?? ENEMY_FIGHTER_CLASSES[id];
}

// ─── Hegemony (Enemy) Fighter Class Definitions ───────────────────────────────
//
// These are deliberately separate from the player classes so that:
//   1. They can have distinct imageKeys pointing to Hegemony-specific artwork.
//   2. pickEnemyFighterClass() only ever draws from this pool.
//
// Stats mirror their player counterparts by design — the visual distinction
// is purely cosmetic (tint colour + sprite).
// ─────────────────────────────────────────────────────────────────────────────

export const ENEMY_FIGHTER_CLASSES: Record<string, FighterClassData> = {
  'enemy-strike-fighter': {
    id: 'enemy-strike-fighter',
    name: 'Hegemony Strike Fighter',
    role: 'Standard Hegemony close-range combatant.',
    hull: 1,
    speed: 4,
    baseEvasion: 6,
    weaponRangeMax: 1,
    volleyPool: ['d4', 'd4', 'd4'],
    behavior: 'attack',
    imageKey: 'enemy-fighter-strike', // 📁 art/ships/hegemony/fighters/heg_strike.png (uses HegInterceptorWing.png as fallback)
  },
  'enemy-heavy-bomber': {
    id: 'enemy-heavy-bomber',
    name: 'Hegemony Heavy Bomber',
    role: 'Long-range bombardment. High damage, but slow and vulnerable.',
    hull: 2,
    speed: 2,
    baseEvasion: 4,
    weaponRangeMax: 3,
    volleyPool: ['d8', 'd8'],
    behavior: 'harass',
    imageKey: 'enemy-fighter-bomber', // 📁 art/ships/hegemony/fighters/heg_bomber.png
  },
  'enemy-ew-fighter': {
    id: 'enemy-ew-fighter',
    name: 'Hegemony Electronic Warfare Fighter',
    role: 'Support and debuffing via proximity.',
    hull: 1,
    speed: 3,
    baseEvasion: 7,
    weaponRangeMax: 2,
    volleyPool: ['d4', 'd4'],
    behavior: 'flanking',
    specialRules: 'Applies a temporary -1 TN to all friendly volleys against the target it is engaging.',
    imageKey: 'enemy-fighter-ew',     // 📁 art/ships/hegemony/fighters/heg_ew.png
  },
  'enemy-interceptor': {
    id: 'enemy-interceptor',
    name: 'Hegemony Interceptor',
    role: 'Extremely fast anti-torpedo and anti-fighter defense.',
    hull: 1,
    speed: 5,
    baseEvasion: 8,
    weaponRangeMax: 1,
    volleyPool: ['d4', 'd4', 'd4'],
    behavior: 'attack',
    imageKey: 'enemy-fighter-interceptor', // 📁 art/ships/hegemony/fighters/heg_intercept.png
  },
  'enemy-armored-gunship': {
    id: 'enemy-armored-gunship',
    name: 'Hegemony Armored Gunship',
    role: 'Durable close-range combatant.',
    hull: 2,
    speed: 3,
    baseEvasion: 3,
    weaponRangeMax: 1,
    volleyPool: ['d6', 'd6', 'd6'],
    behavior: 'attack',
    imageKey: 'enemy-fighter-gunship', // 📁 art/ships/hegemony/fighters/heg_gunship.png
  },
};

/**
 * Pick a random Hegemony fighter class for an enemy spawn and return it
 * alongside the appropriate AI behavior for that type.
 *
 * @param excludeIds  Optional list of class IDs to exclude from the pool
 *                    (e.g. to avoid spawning the same type twice in one wave).
 */
export function pickEnemyFighterClass(excludeIds: string[] = []): {
  fighterClass: FighterClassData;
  behavior: FighterClassData['behavior'];
} {
  const pool = Object.values(ENEMY_FIGHTER_CLASSES).filter(
    fc => !excludeIds.includes(fc.id),
  );
  // Fallback to full enemy pool if exclusions empty it
  const source = pool.length > 0 ? pool : Object.values(ENEMY_FIGHTER_CLASSES);
  const fighterClass = source[Math.floor(Math.random() * source.length)];
  // Each enemy class already has the correct behavior baked into its definition
  return { fighterClass, behavior: fighterClass.behavior };
}
