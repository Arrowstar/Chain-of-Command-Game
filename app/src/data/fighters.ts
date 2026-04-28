import type { FighterClassData } from '../types/game';

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
  },
};

export function getFighterClassById(id: string): FighterClassData | undefined {
  return FIGHTER_CLASSES[id];
}
