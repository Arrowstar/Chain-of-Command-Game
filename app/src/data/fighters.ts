import type { FighterClassData } from '../types/game';

// ─── Fighter Class Definitions ────────────────────────────────────────────────
//
// Each entry's `imageKey` maps to a key in ASSET_MAP (pixiGraphics.ts).
// Set imageKey to the matching key once artwork is placed in:
//   app/art/ships/player/fighters/
// Leave imageKey undefined (or comment it out) to show the placeholder icon.
//
// KEY REFERENCE:
//   'fighter-strike'         → art/ships/player/player_fighters.png  (DONE)
//   'fighter-heavy-bomber'   → art/ships/player/fighters/heavy_bomber.png
//   'fighter-ew'             → art/ships/player/fighters/ew_fighter.png
//   'fighter-intercept'      → art/ships/player/fighters/intercept_screen.png
//   'fighter-gunship'        → art/ships/player/fighters/armored_gunship.png
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
  'intercept-screen': {
    id: 'intercept-screen',
    name: 'Intercept Screen Fighter',
    role: 'Extremely fast anti-torpedo and anti-fighter defense.',
    hull: 1,
    speed: 5,
    baseEvasion: 6,
    weaponRangeMax: 1,
    volleyPool: ['d4'],
    behavior: 'screen',
    imageKey: 'fighter-intercept',    // 📁 Place art at: art/ships/player/fighters/intercept_screen.png
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
  return FIGHTER_CLASSES[id];
}

// ─── Enemy Fighter Randomisation ─────────────────────────────────────────────
//
// Maps each fighter class to the behavior the enemy AI should use when
// deploying that type.  These deliberately differ from the player defaults in
// a couple of cases:
//
//   ew-fighter      → 'flanking'  (close to a flank position to apply debuff)
//   intercept-screen→ 'attack'    (no allied ships to screen, so target nearest)
//
// ─────────────────────────────────────────────────────────────────────────────

const ENEMY_BEHAVIOR_OVERRIDES: Record<string, FighterClassData['behavior']> = {
  'strike-fighter':   'attack',
  'heavy-bomber':     'harass',
  'ew-fighter':       'flanking',
  'intercept-screen': 'attack',
  'armored-gunship':  'attack',
};

/**
 * Pick a random fighter class for an enemy spawn and return it alongside
 * the enemy-appropriate behavior override for that class.
 *
 * @param excludeIds  Optional list of class IDs to exclude from the pool
 *                    (e.g. to avoid spawning the same type twice in one wave).
 */
export function pickEnemyFighterClass(excludeIds: string[] = []): {
  fighterClass: FighterClassData;
  behavior: FighterClassData['behavior'];
} {
  const pool = Object.values(FIGHTER_CLASSES).filter(
    fc => !excludeIds.includes(fc.id),
  );
  // Fallback to full pool if exclusions empty it
  const source = pool.length > 0 ? pool : Object.values(FIGHTER_CLASSES);
  const fighterClass = source[Math.floor(Math.random() * source.length)];
  const behavior = ENEMY_BEHAVIOR_OVERRIDES[fighterClass.id] ?? 'attack';
  return { fighterClass, behavior };
}
