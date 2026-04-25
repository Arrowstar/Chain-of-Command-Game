import { drawCriticalCard, PLAYER_CRITICAL_DECK, ENEMY_CRITICAL_DECK } from './criticalDamage';

describe('drawCriticalCard', () => {
  it('should draw a card and return the rest of the deck', () => {
    const deck = [...PLAYER_CRITICAL_DECK];
    const { card, remainingDeck } = drawCriticalCard(deck);
    expect(card).toBeDefined();
    expect(remainingDeck.length).toBe(deck.length - 1);
  });

  it('should reshuffle from PLAYER_CRITICAL_DECK if deck is empty (default)', () => {
    const { card, remainingDeck } = drawCriticalCard([]);
    expect(PLAYER_CRITICAL_DECK.some(c => c.id === card.id)).toBe(true);
    expect(remainingDeck.length).toBe(PLAYER_CRITICAL_DECK.length - 1);
  });

  it('should reshuffle from ENEMY_CRITICAL_DECK if deck is empty and type is enemy', () => {
    const { card, remainingDeck } = drawCriticalCard([], 'enemy');
    expect(ENEMY_CRITICAL_DECK.some(c => c.id === card.id)).toBe(true);
    expect(remainingDeck.length).toBe(ENEMY_CRITICAL_DECK.length - 1);
    // Ensure it's NOT a player card (though some IDs might overlap, we know these decks are distinct in this project)
    expect(PLAYER_CRITICAL_DECK.some(c => c.id === card.id)).toBe(false);
  });
});
