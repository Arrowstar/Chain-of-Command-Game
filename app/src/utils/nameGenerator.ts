/**
 * Utility for generating flavor names for various game entities.
 */

export const SHIP_NAMES = [
  'Iron Decree', 'Solar Inquisitor', 'Hand of the Hegemon', 'Obsidian Arbiter',
  'Silent Sovereign', 'Unyielding Will', 'Grasp of Tyranny', 'Vengeance of Sol',
  'Eternal Vigil', 'Dread Bastion', 'Absolute Authority', 'Steel Apostle',
  'Crown of Obsidian', 'Grim Sanction', 'Apex Sentinel', 'Void Hammer',
  'Imperial Scourge', 'Final Verdict', 'Hallowed Spear', "Zenith's Wrath",
  'Cold Justice', 'Resolute Command', "Titan's Decree", 'Obsidian Throne',
  'Solar Apex', 'Silent Enforcer', "Hegemony's Reach", 'Dark Constellation',
  'Sovereign Guard', 'Iron Gospel', 'Vindicator Prime', 'Eclipse of Mercy',
  'Lawbringer IX', 'Abyssal Warden', 'Purity of Flame', 'Dread Herald',
  'Unspoken Law', 'Iron Sanctity', 'Hammer of Penance', "Sol's Retribution",
  'Obsidian Shield', 'Silent Crusader', "Dominion's Edge", 'Righteous Fury',
  'Grave Authority', 'Starlight Inquisitor', 'Eternal Sanction', 'Iron Crown',
  "Hegemon's Fist", 'Void Arbiter', 'Pillar of Orthodoxy', 'The Golden Mandate',
  "Sol's Unblinking Eye", 'Scepter of the Hegemon', 'Obsidian Vanguard',
  "Zenith's Hammer", 'The Law of Iron', 'Arbitrator Prime', 'Cold Solace',
  'Steel Sacrament', 'The Silent Verdict', 'Radiant Oppression', 'Bastion of Purity',
  'Flare of Judgment', 'The Inflexible Will', 'Obsidian Monolith', "Sol's Harsh Dawn",
  'Eternal Gavel', 'Scepter of Dust', 'Iron Orthodoxy', "Zenith's Sentinel",
  'The Final Amen', 'Stellar Inquisitor', 'The Unmaking Force', 'Penance of the Void',
  'Obsidian Sentry', "The Hegemon's Breath", "Sol's Silent Wrath", 'Indomitable Spires',
  'Verdict of the Stars', 'Steel Covenant', 'The Iron Sentinel', 'Corona of Authority',
  'The Obsidian Shard', "Zenith's Requiem", 'Scepter of the Sun', 'Immutable Sanction',
  "Sol's Iron Halo", 'Silent Watcher', 'Obsidian Fortress', 'Unyielding Pillar',
  "Zenith's Fury", 'Law of the Stars', 'Steel Resolve', 'Mandate of the Iron Heavens',
  "Sol's Blinding Grace", 'Obsidian Anchor', "Zenith's Clarion", 'Final Proclamation',
  "Hegemon's Eternity",
];

export const STATION_NAMES = [
  'Aegis Station', 'Vanguard Outpost', 'Sol\'s Lookout', 'Iron Bastion',
  'Obsidian Hub', 'Zenith Reach', 'Silent Watchtower', 'Imperial Gate',
  'Dread Spire', 'Eternal Anchor', 'Authority Prime', 'Steel Citadel',
  'Hallowed Fortress', 'Vengeance Point', 'Sentinel Hub', 'Solar Outpost',
  'Grasp Station', 'Lawbringer Base', 'Arbiter Node', 'Sovereign Point',
];

export const PLATFORM_NAMES = [
  'Sentry Alpha', 'Sentry Beta', 'Sentry Gamma', 'Sentry Delta',
  'Sentinel 1', 'Sentinel 2', 'Sentinel 3', 'Sentinel 4',
  'Aegis Picket', 'Iron Sentry', 'Void Guard', 'Solar Shield',
  'Watchman IX', 'Guardian Prime', 'Bastion Picket', 'Steel Watcher',
];

export const SQUADRON_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Omega',
  'Red', 'Blue', 'Gold', 'Black', 'Ghost', 'Phantom',
  'Vampire', 'Hellhound', 'Reaper', 'Spectre', 'wraith',
  'Titan', 'Gorgon', 'Hydra', 'Vindicator', 'Interceptor',
  'Iron', 'Steel', 'Obsidian', 'Solar', 'Void',
];

export const SQUADRON_TYPES = [
  'Squadron', 'Wing', 'Flight', 'Group', 'Detachment',
];

/**
 * Generates a random name from a pool, avoiding duplicates if possible.
 */
export function getUniqueName(pool: string[], usedNames: Set<string>): string {
  const available = pool.filter(name => !usedNames.has(name));
  const selectionPool = available.length > 0 ? available : pool;
  const name = selectionPool[Math.floor(Math.random() * selectionPool.length)];
  usedNames.add(name);
  return name;
}

/**
 * Generates a squadron name like "Red Wing" or "Alpha Squadron".
 */
export function generateSquadronName(usedNames: Set<string>): string {
  const namePart = SQUADRON_NAMES[Math.floor(Math.random() * SQUADRON_NAMES.length)];
  const typePart = SQUADRON_TYPES[Math.floor(Math.random() * SQUADRON_TYPES.length)];
  const fullName = `${namePart} ${typePart}`;
  
  if (usedNames.has(fullName)) {
    // Try adding a number if already exists
    let i = 2;
    while (usedNames.has(`${fullName} ${i}`)) {
      i++;
    }
    const numberedName = `${fullName} ${i}`;
    usedNames.add(numberedName);
    return numberedName;
  }
  
  usedNames.add(fullName);
  return fullName;
}
