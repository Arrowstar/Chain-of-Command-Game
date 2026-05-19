import { describe, it, expect } from 'vitest';
import { buildTutorialGameConfig } from '../data/tutorialScenario';
import { getWeaponById } from '../data/weapons';
import { getSubsystemById } from '../data/subsystems';

describe('Tutorial Scenario Integrity Verification', () => {
  it('should have all equipped weapons defined in the weapon registry', () => {
    const config = buildTutorialGameConfig();
    expect(config.playerShips).toBeDefined();
    
    config.playerShips.forEach(ship => {
      ship.equippedWeapons.forEach(weaponId => {
        if (weaponId) {
          const weapon = getWeaponById(weaponId);
          expect(weapon).toBeDefined();
          expect(weapon?.id).toBe(weaponId);
        }
      });
    });
  });

  it('should have all equipped subsystems defined in the subsystem registry', () => {
    const config = buildTutorialGameConfig();
    config.playerShips.forEach(ship => {
      ship.equippedSubsystems.forEach(subId => {
        if (subId) {
          const subsystem = getSubsystemById(subId);
          expect(subsystem).toBeDefined();
          expect(subsystem?.id).toBe(subId);
        }
      });
    });
  });
});
