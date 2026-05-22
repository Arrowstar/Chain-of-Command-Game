import { describe, it, expect } from 'vitest';
import { drawFumbleCard, FUMBLE_DECK } from '../fumbleDeck';

describe('fumbleDeck logic', () => {
  it('drawFumbleCard properly filters by station', () => {
    // Only put one engineering card and one tactical card in the deck
    const deck = [
      FUMBLE_DECK.find(c => c.category === 'tactical')!,
      FUMBLE_DECK.find(c => c.category === 'engineering')!
    ];
    
    // Test that drawing for engineering correctly skips the tactical card
    const result = drawFumbleCard([...deck], 'engineering');
    expect(result.card.category).toBe('engineering');
    expect(result.remainingDeck.length).toBe(1);
    expect(result.remainingDeck[0].category).toBe('tactical');
  });

  it('drawFumbleCard falls back to general cards if station card is not first, or returns general if encountered first', () => {
    // If the deck is [tactical, general, engineering] and we draw for engineering
    const deck = [
      FUMBLE_DECK.find(c => c.category === 'tactical')!,
      FUMBLE_DECK.find(c => c.category === 'general')!,
      FUMBLE_DECK.find(c => c.category === 'engineering')!
    ];
    
    // It should pick the general card, because 'general' matches ANY station if it's earlier in the deck?
    // Yes, it will pick general!
    const result = drawFumbleCard([...deck], 'engineering');
    expect(result.card.category).toBe('general');
  });
  
  it('drawFumbleCard reshuffles if deck is empty', () => {
    const result = drawFumbleCard([], 'tactical');
    expect(result.card).toBeDefined();
    // Shuffled deck has length FUMBLE_DECK.length, so remaining is FUMBLE_DECK.length - 1
    expect(result.remainingDeck.length).toBe(FUMBLE_DECK.length - 1);
  });
});
