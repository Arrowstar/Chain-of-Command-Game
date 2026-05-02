import { describe, expect, it } from 'vitest';
import { applyAuraTNPenalty } from './traitEffects';
import type { EnemyShipState } from '../../types/game';

function makeEnemy(id: string, position: { q: number; r: number }, adversaryId = 'hegemony-interdictor'): EnemyShipState {
  return {
    id,
    name: id,
    adversaryId,
    position,
    facing: 0 as any,
    currentSpeed: 0,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    maxShieldsPerSector: 0,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 5,
    armorDie: 'd4',
    evasionModifiers: 0,
  };
}

describe('traitEffects aura handling', () => {
  it('stacks overlapping tnPenalty auras from multiple enemies', () => {
    const penalty = applyAuraTNPenalty(
      { q: 0, r: 0 },
      [
        makeEnemy('jammer-1', { q: 1, r: 0 }),
        makeEnemy('jammer-2', { q: 0, r: 2 }),
      ],
    );

    expect(penalty).toBe(2);
  });

  it('ignores destroyed or out-of-range aura sources', () => {
    const destroyed = makeEnemy('jammer-1', { q: 1, r: 0 });
    destroyed.isDestroyed = true;

    const penalty = applyAuraTNPenalty(
      { q: 0, r: 0 },
      [
        destroyed,
        makeEnemy('jammer-2', { q: 5, r: 0 }),
        makeEnemy('escort', { q: 1, r: 0 }, 'hegemony-escort'),
      ],
    );

    expect(penalty).toBe(0);
  });
});
