import { describe, expect, it } from 'vitest';
import { createShuffledTacticDeck, filterAvailableTactics } from './tacticDeck';
import type { EnemyShipState } from '../types/game';

function makeEnemyShip(overrides: Partial<EnemyShipState> = {}): EnemyShipState {
  return {
    id: 'enemy-1',
    name: 'Enemy',
    adversaryId: 'hunter-killer',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 3,
    currentHull: 6,
    maxHull: 6,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 6,
    armorDie: 'd4',
    evasionModifiers: 0,
    ...overrides,
  };
}

describe('tactic deck availability', () => {
  it('excludes Reserve Squadron Launch when no enemy carrier is present', () => {
    const available = filterAvailableTactics([makeEnemyShip()]);
    expect(available.some(card => card.id === 'reserve-squadron-launch')).toBe(false);
  });

  it('includes Reserve Squadron Launch when an enemy carrier is present', () => {
    const available = createShuffledTacticDeck([makeEnemyShip({ adversaryId: 'carrier' })]);
    expect(available.some(card => card.id === 'reserve-squadron-launch')).toBe(true);
  });
});
