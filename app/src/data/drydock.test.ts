import { generateMarketInventory } from './drydock';
import { getEventWeapons } from './weapons';
import { getEventSubsystems } from './subsystems';

describe('Drydock Market Generation', () => {
  it('should always return 3 weapons and 3 subsystems', () => {
    const inventory = generateMarketInventory();
    expect(inventory.weapons).toHaveLength(3);
    expect(inventory.subsystems).toHaveLength(3);
  });

  it('should include 1 or 2 event items in the market', () => {
    const eventWeapons = getEventWeapons().map(w => w.id);
    const eventSubsystems = getEventSubsystems().map(s => s.id);
    const allEventIds = [...eventWeapons, ...eventSubsystems];

    // Run multiple times to account for randomness (1 or 2 events)
    for (let i = 0; i < 20; i++) {
      const inventory = generateMarketInventory();
      const items = [...inventory.weapons, ...inventory.subsystems];
      const eventItemsFound = items.filter(id => allEventIds.includes(id));
      
      expect(eventItemsFound.length).toBeGreaterThanOrEqual(1);
      expect(eventItemsFound.length).toBeLessThanOrEqual(2);
    }
  });

  it('should respect excluded IDs', () => {
    const inventory = generateMarketInventory();
    const firstWeapon = inventory.weapons[0];
    const firstSubsystem = inventory.subsystems[0];

    const newInventory = generateMarketInventory([firstWeapon], [firstSubsystem]);
    expect(newInventory.weapons).not.toContain(firstWeapon);
    expect(newInventory.subsystems).not.toContain(firstSubsystem);
  });
});
