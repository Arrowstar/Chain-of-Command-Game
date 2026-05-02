import { describe, expect, it } from 'vitest';
import { ADVERSARIES } from '../adversaries';
import { STATIONS } from '../stations';
import { FIGHTER_CLASSES, ENEMY_FIGHTER_CLASSES } from '../fighters';
import { SHIP_CHASSIS } from '../shipChassis';
import { ASSET_MAP } from '../../engine/pixiGraphics';
import { EVENT_NODES } from '../eventNodes';
import { EXPERIMENTAL_TECH } from '../experimentalTech';
import { WEAPONS } from '../weapons';
import { SUBSYSTEMS } from '../subsystems';

describe('Cross-Reference Data Integrity', () => {
  describe('Asset Mapping', () => {
    it('every adversary has a valid entry in ASSET_MAP', () => {
      ADVERSARIES.forEach(adv => {
        // Some adversaries might be variants, but their ID should map to an asset
        expect(ASSET_MAP[adv.id], `Adversary ${adv.id} is missing from ASSET_MAP`).toBeDefined();
      });
    });

    it('every station has a valid imageKey mapping in ASSET_MAP', () => {
      STATIONS.forEach(station => {
        expect(station.imageKey, `Station ${station.id} is missing imageKey`).toBeDefined();
        expect(ASSET_MAP[station.imageKey!], `Station ${station.id} has invalid imageKey: ${station.imageKey}`).toBeDefined();
      });
    });

    it('every fighter class has a valid imageKey mapping in ASSET_MAP', () => {
      const allFighters = { ...FIGHTER_CLASSES, ...ENEMY_FIGHTER_CLASSES };
      Object.values(allFighters).forEach(fc => {
        expect(fc.imageKey, `Fighter class ${fc.id} is missing imageKey`).toBeDefined();
        expect(ASSET_MAP[fc.imageKey!], `Fighter class ${fc.id} has invalid imageKey: ${fc.imageKey}`).toBeDefined();
      });
    });

    it('every player ship chassis has a valid entry in ASSET_MAP', () => {
      SHIP_CHASSIS.forEach(chassis => {
        expect(ASSET_MAP[chassis.id], `Chassis ${chassis.id} is missing from ASSET_MAP`).toBeDefined();
      });
    });
  });

  describe('Event Node References', () => {
    it('all grantWeapon effects reference valid weapon IDs', () => {
      EVENT_NODES.forEach(node => {
        node.options.forEach(opt => {
          const effects = [...(opt.effects || []), ...(opt.goodEffects || []), ...(opt.badEffects || [])];
          effects.forEach(effect => {
            if (effect.type === 'grantWeapon' && 'weaponId' in effect) {
              const weaponExists = WEAPONS.some(w => w.id === effect.weaponId);
              expect(weaponExists, `Event ${node.id} references non-existent weapon: ${effect.weaponId}`).toBe(true);
            }
          });
        });
      });
    });

    it('all grantSubsystem effects reference valid subsystem IDs', () => {
      EVENT_NODES.forEach(node => {
        node.options.forEach(opt => {
          const effects = [...(opt.effects || []), ...(opt.goodEffects || []), ...(opt.badEffects || [])];
          effects.forEach(effect => {
            if (effect.type === 'grantSubsystem' && 'subsystemId' in effect) {
              const subExists = SUBSYSTEMS.some(s => s.id === effect.subsystemId);
              expect(subExists, `Event ${node.id} references non-existent subsystem: ${effect.subsystemId}`).toBe(true);
            }
          });
        });
      });
    });
  });

  describe('Adversary Spawner Traits', () => {
    it('every spawner trait references a valid enemy fighter class', () => {
      ADVERSARIES.forEach(adv => {
        (adv.traits || []).forEach(trait => {
          if (trait.type === 'spawner') {
            const classExists = !!ENEMY_FIGHTER_CLASSES[trait.tokenClass];
            expect(classExists, `Adversary ${adv.id} spawner trait references unknown class: ${trait.tokenClass}`).toBe(true);
          }
        });
      });
    });
  });

  describe('Procedural Roster (Sanity Check)', () => {
    it('common adversary IDs used in the generator exist', () => {
        // These IDs are used in scenarioGenerator.ts
        const usedIds = [
            'strike-fighter',
            'hegemony-corvette',
            'hunter-killer',
            'monitor',
            'hegemony-dreadnought'
        ];
        usedIds.forEach(id => {
            const exists = ADVERSARIES.some(a => a.id === id);
            expect(exists, `Scenario Generator references missing adversary ID: ${id}`).toBe(true);
        });
    });

    it('common station IDs used in the generator exist', () => {
        const usedIds = [
            'pdc-turret',
            'heavy-turret',
            'missile-turret',
            'outpost',
            'forward-base',
            'orbital-station'
        ];
        usedIds.forEach(id => {
            const exists = STATIONS.some(s => s.id === id);
            expect(exists, `Scenario Generator references missing station ID: ${id}`).toBe(true);
        });
    });
  });
});
