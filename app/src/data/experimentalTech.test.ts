import { describe, it, expect } from 'vitest';
import {
  EXPERIMENTAL_TECH,
  getAllTech, getTechById, getTechByCategory, drawRandomTech, drawMultipleRandomTech,
} from './experimentalTech';

describe('Experimental Tech Data Integrity', () => {
  it('contains exactly 15 techs', () => {
    expect(getAllTech()).toHaveLength(15);
  });

  it('every tech has a unique ID', () => {
    const ids = EXPERIMENTAL_TECH.map(t => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(15);
  });

  it('every tech has required string fields', () => {
    for (const t of EXPERIMENTAL_TECH) {
      expect(t.name.length, `${t.id} missing name`).toBeGreaterThan(0);
      expect(t.effect.length, `${t.id} missing effect`).toBeGreaterThan(0);
      expect(t.flavorText.length, `${t.id} missing flavorText`).toBeGreaterThan(0);
    }
  });

  it('category distribution: 4 tactical, 4 engineering, 4 command, 3 crew', () => {
    const counts = { tactical: 0, engineering: 0, command: 0, crew: 0 };
    for (const t of EXPERIMENTAL_TECH) counts[t.category]++;
    expect(counts.tactical).toBe(4);
    expect(counts.engineering).toBe(4);
    expect(counts.command).toBe(4);
    expect(counts.crew).toBe(3);
  });

  it('only Auto-Doc Override is consumable', () => {
    const consumable = EXPERIMENTAL_TECH.filter(t => t.isConsumable);
    expect(consumable).toHaveLength(1);
    expect(consumable[0].id).toBe('auto-doc-override');
  });

  it('all techs start with isConsumed = false', () => {
    for (const t of getAllTech()) {
      expect(t.isConsumed, `${t.id} should start unconsumed`).toBe(false);
    }
  });

  it('rarity: 3 rare, 12 common', () => {
    const rare = EXPERIMENTAL_TECH.filter(t => t.rarity === 'rare');
    const common = EXPERIMENTAL_TECH.filter(t => t.rarity === 'common');
    expect(rare).toHaveLength(3);
    expect(common).toHaveLength(12);
  });

  it('the 3 rare techs are the named Rare items from the spec', () => {
    const rareIds = EXPERIMENTAL_TECH.filter(t => t.rarity === 'rare').map(t => t.id);
    expect(rareIds).toContain('tachyon-targeting-matrix');
    expect(rareIds).toContain('hegemony-encryption-key');
    expect(rareIds).toContain('neural-link-uplink');
  });
});

describe('getTechById', () => {
  it('returns the correct tech', () => {
    const t = getTechById('plasma-accelerators');
    expect(t).toBeDefined();
    expect(t!.name).toBe('Plasma Accelerators');
  });

  it('returns undefined for unknown ID', () => {
    expect(getTechById('nonexistent')).toBeUndefined();
  });

  it('returns a copy (mutation does not affect source)', () => {
    const t = getTechById('recycled-coolant')!;
    t.isConsumed = true;
    expect(getTechById('recycled-coolant')!.isConsumed).toBe(false);
  });
});

describe('getTechByCategory', () => {
  it('returns exactly 4 tactical techs', () => {
    expect(getTechByCategory('tactical')).toHaveLength(4);
  });

  it('returns exactly 3 crew techs', () => {
    expect(getTechByCategory('crew')).toHaveLength(3);
  });
});

describe('drawRandomTech', () => {
  it('returns a valid tech when pool is not empty', () => {
    const t = drawRandomTech();
    expect(t).not.toBeNull();
    expect(t!.id.length).toBeGreaterThan(0);
  });

  it('never returns an excluded tech', () => {
    const excludeIds = EXPERIMENTAL_TECH.slice(1).map(t => t.id); // exclude all but first
    const drawn = drawRandomTech(excludeIds);
    expect(drawn?.id).toBe(EXPERIMENTAL_TECH[0].id);
  });

  it('returns null when all techs are excluded', () => {
    const allIds = EXPERIMENTAL_TECH.map(t => t.id);
    expect(drawRandomTech(allIds)).toBeNull();
  });
});

describe('drawMultipleRandomTech', () => {
  it('draws the requested count', () => {
    const drawn = drawMultipleRandomTech(3, []);
    expect(drawn).toHaveLength(3);
  });

  it('returns unique techs', () => {
    const drawn = drawMultipleRandomTech(5, []);
    const ids = drawn.map(t => t.id);
    expect(new Set(ids).size).toBe(5);
  });

  it('respects the exclude list', () => {
    const allIds = EXPERIMENTAL_TECH.map(t => t.id);
    const keepOne = allIds.slice(1); // exclude all but first
    const drawn = drawMultipleRandomTech(2, keepOne);
    expect(drawn).toHaveLength(1); // only 1 available
    expect(drawn[0].id).toBe(EXPERIMENTAL_TECH[0].id);
  });

  it('draws 2 for Event 24 scenario (alien ruin)', () => {
    const drawn = drawMultipleRandomTech(2);
    expect(drawn).toHaveLength(2);
    expect(drawn[0].id).not.toBe(drawn[1].id);
  });
});
