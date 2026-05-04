import { describe, it, expect } from 'vitest';
import { ROE_DECK, drawRoECard, getRoECardById } from './roeDeck';

describe('Rules of Engagement Deck', () => {
  it('contains exactly 10 cards', () => {
    expect(ROE_DECK).toHaveLength(10);
  });

  it('contains cards with valid structures', () => {
    ROE_DECK.forEach(card => {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('doctrine');
      expect(card).toHaveProperty('flavorText');
      expect(card).toHaveProperty('rule');
      expect(card).toHaveProperty('mechanicalEffect');
    });
  });

  it('includes all four doctrines', () => {
    const doctrines = new Set(ROE_DECK.map(c => c.doctrine));
    expect(doctrines.has('maximumAggression')).toBe(true);
    expect(doctrines.has('resourceStarvation')).toBe(true);
    expect(doctrines.has('cruelCalculus')).toBe(true);
    expect(doctrines.has('totalControl')).toBe(true);
  });

  describe('drawRoECard', () => {
    it('returns a valid card from the deck', () => {
      const card = drawRoECard();
      expect(ROE_DECK.some(c => c.id === card.id)).toBe(true);
    });
  });

  describe('getRoECardById', () => {
    it('returns the correct card by ID', () => {
      const card = getRoECardById('zero-tolerance-cowardice');
      expect(card).toBeDefined();
      expect(card?.name).toBe('Zero-Tolerance for Cowardice');
    });

    it('returns undefined for non-existent IDs', () => {
      expect(getRoECardById('non-existent-card')).toBeUndefined();
    });
  });
});
