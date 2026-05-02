import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ADVERSARIES } from '../adversaries';
import { SHIP_CHASSIS } from '../shipChassis';
import { WEAPONS } from '../weapons';
import { SUBSYSTEMS } from '../subsystems';
import { FIGHTER_CLASSES, ENEMY_FIGHTER_CLASSES } from '../fighters';
import { STATIONS } from '../stations';
import { SCENARIOS } from '../scenarios';
import { EXPERIMENTAL_TECH } from '../experimentalTech';
import { TACTIC_DECK } from '../tacticDeck';
import { ROE_DECK } from '../roeDeck';
import { FUMBLE_DECK } from '../fumbleDeck';
import { PLAYER_CRITICAL_DECK, ENEMY_CRITICAL_DECK } from '../criticalDamage';
import { OFFICERS } from '../officers';

const projectRoot = process.cwd();

function publicAssetExists(imagePath: string): boolean {
  const normalized = imagePath.replace(/^\/+/, '').replace(/\//g, '\\');
  return existsSync(join(projectRoot, 'public', normalized));
}

function importedAssetExists(assetUrl: string, folders: string[]): boolean {
  const filename = basename(assetUrl);
  return folders.some(folder => existsSync(join(projectRoot, folder, filename)));
}

describe('Data Integrity', () => {
  const collections = [
    { name: 'Adversaries', data: ADVERSARIES },
    { name: 'Ship Chassis', data: SHIP_CHASSIS },
    { name: 'Weapons', data: WEAPONS },
    { name: 'Subsystems', data: SUBSYSTEMS },
    { name: 'Fighter Classes', data: Object.values(FIGHTER_CLASSES) },
    { name: 'Enemy Fighter Classes', data: Object.values(ENEMY_FIGHTER_CLASSES) },
    { name: 'Stations', data: STATIONS },
    { name: 'Scenarios', data: SCENARIOS },
    { name: 'Experimental Tech', data: EXPERIMENTAL_TECH },
    { name: 'Tactic Deck', data: TACTIC_DECK },
    { name: 'RoE Deck', data: ROE_DECK },
    { name: 'Fumble Deck', data: FUMBLE_DECK },
    { name: 'Player Critical Damage Deck', data: PLAYER_CRITICAL_DECK },
    { name: 'Enemy Critical Damage Deck', data: ENEMY_CRITICAL_DECK },
  ];

  describe('Unique IDs', () => {
    collections.forEach(({ name, data }) => {
      it(`ensures all ${name} have unique IDs`, () => {
        const ids = data.map((item: any) => item.id);
        const uniqueIds = new Set(ids);
        expect(ids.length, `Duplicate IDs found in ${name}`).toBe(uniqueIds.size);
        
        // Find duplicates for better error messages
        if (ids.length !== uniqueIds.size) {
            const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
            console.error(`Duplicate IDs in ${name}:`, duplicates);
        }
      });
    });
  });

  describe('Adversary Integrity', () => {
    it('ensures all adversaries have valid stats', () => {
      ADVERSARIES.forEach(adv => {
        expect(adv.hull).toBeGreaterThan(0);
        expect(adv.speed).toBeGreaterThanOrEqual(0);
        expect(adv.weaponRangeMax).toBeGreaterThanOrEqual(adv.weaponRangeMin);
        expect(adv.volleyPool.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Scenario Integrity', () => {
    it('ensures all scenarios reference valid adversaries', () => {
      const adversaryIds = new Set(ADVERSARIES.map(a => a.id));
      const fighterClassIds = new Set([
          ...Object.keys(FIGHTER_CLASSES),
          ...Object.keys(ENEMY_FIGHTER_CLASSES)
      ]);

      SCENARIOS.forEach(scenario => {
        scenario.enemySpawns.forEach(spawn => {
          const isValid = adversaryIds.has(spawn.adversaryId) || fighterClassIds.has(spawn.adversaryId);
          expect(isValid, `Scenario ${scenario.id} references unknown adversary/fighter: ${spawn.adversaryId}`).toBe(true);
        });

        if (scenario.stationSpawns) {
            const stationIds = new Set(STATIONS.map(s => s.id));
            scenario.stationSpawns.forEach(spawn => {
                expect(stationIds.has(spawn.stationId), `Scenario ${scenario.id} references unknown station: ${spawn.stationId}`).toBe(true);
            });
        }
      });
    });
  });

  describe('Weapon Integrity', () => {
    it('ensures all weapons have valid range and pool', () => {
      WEAPONS.forEach(w => {
        expect(w.rangeMax).toBeGreaterThanOrEqual(w.rangeMin);
        expect(w.volleyPool.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Fighter Integrity', () => {
      it('ensures all fighter behaviors are valid', () => {
          const validBehaviors = ['attack', 'escort', 'screen', 'harass', 'flanking', 'hit_and_run'];
          [...Object.values(FIGHTER_CLASSES), ...Object.values(ENEMY_FIGHTER_CLASSES)].forEach(fc => {
              expect(validBehaviors).toContain(fc.behavior);
          });
      });
  });

  describe('Asset Mapping', () => {
    it('ensures all player ships have an image defined', () => {
        SHIP_CHASSIS.forEach(chassis => {
            expect(chassis.image).toBeDefined();
            expect(chassis.image).not.toBe('');
        });
    });

    it('ensures all weapons and subsystems have an imagePath defined', () => {
        [...WEAPONS, ...SUBSYSTEMS].forEach(item => {
            expect(item.imagePath).toBeDefined();
            expect(item.imagePath!.length).toBeGreaterThan(0);
        });
    });

    it('ensures all defined ship, officer, weapon, and subsystem art assets exist in the project', () => {
        SHIP_CHASSIS.forEach(chassis => {
            const image = chassis.image ?? '';
            expect(
              importedAssetExists(image, ['art\\ships\\player']),
              `Missing ship image for ${chassis.id}: ${image}`,
            ).toBe(true);
        });

        OFFICERS.forEach(officer => {
            const avatar = officer.avatar ?? '';
            expect(
              importedAssetExists(avatar, ['art\\officers']),
              `Missing officer image for ${officer.id}: ${avatar}`,
            ).toBe(true);
        });

        [...WEAPONS, ...SUBSYSTEMS].forEach(item => {
            const imagePath = item.imagePath ?? '';
            expect(
              publicAssetExists(imagePath),
              `Missing public asset for ${item.id}: ${imagePath}`,
            ).toBe(true);
        });
    });
  });
});
