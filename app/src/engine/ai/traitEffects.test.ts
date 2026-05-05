import { describe, expect, it, vi } from 'vitest';
import { applyAuraTNPenalty, applyDefensiveTraits } from './traitEffects';
import type { EnemyShipState, AdversaryData, ShipState } from '../../types/game';

vi.mock('../../data/adversaries', () => ({
  getAdversaryById: vi.fn((id: string) => {
    if (id === 'hegemony-interdictor') {
      return {
        id: 'hegemony-interdictor',
        traits: [{ type: 'aura', effect: 'tnPenalty', radius: 3, amount: 1 }]
      };
    }
    return undefined;
  }),
}));

import { getAdversaryById } from '../../data/adversaries';

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

    expect(penalty).toHaveLength(2);
    expect(penalty.map(p => p.value).reduce((a, b) => a + b, 0)).toBe(2);
    expect(penalty[0].name).toBe('Aura Penalty');
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

    expect(penalty).toHaveLength(0);
  });
});

describe('applyDefensiveTraits', () => {
  const mockAdversary: AdversaryData = {
    id: 'test',
    name: 'Test',
    size: 'small' as any,
    hull: 10,
    shieldsPerSector: 2,
    shieldsAllSectors: true,
    armorDie: 'd4',
    speed: 3,
    baseEvasion: 5,
    volleyPool: [],
    weaponRangeMin: 1,
    weaponRangeMax: 5,
    aiTag: 'aggressive',
    traits: [
      { type: 'isolationConditional', radius: 3, evasionBonus: 2, name: 'Stealth Coating' },
      { type: 'terrainConditional', terrain: 'asteroids', evasionBonus: 1 }
    ]
  };

  it('applies isolation bonus when far from players', () => {
    const enemy = makeEnemy('e1', { q: 10, r: 10 });
    const modifiers = applyDefensiveTraits(enemy, mockAdversary, [], [], undefined);
    
    expect(modifiers).toContainEqual({ name: 'Stealth Coating', value: 2 });
  });

  it('uses fallback name for terrain bonus when name is missing', () => {
    const enemy = makeEnemy('e1', { q: 0, r: 0 });
    const modifiers = applyDefensiveTraits(enemy, mockAdversary, [], [], 'asteroids');
    
    expect(modifiers).toContainEqual({ name: 'Cover Tactics', value: 1 });
  });

  it('includes movement conditional bonuses', () => {
    const advWithMove: AdversaryData = {
      ...mockAdversary,
      traits: [{ type: 'movementConditional', minHexesMoved: 3, evasionBonus: 2 }]
    };
    const enemy = { ...makeEnemy('e1', { q: 0, r: 0 }), hexesMovedThisRound: 3 };
    
    const modifiers = applyDefensiveTraits(enemy, advWithMove, [], [], undefined);
    expect(modifiers).toContainEqual({ name: 'Hit and Run', value: 2 });
  });

  it('applies evasionBonus auras from other enemy ships', () => {
    const providerAdv: AdversaryData = {
      ...mockAdversary,
      id: 'provider',
      traits: [{ type: 'aura', effect: 'evasionBonus', radius: 2, amount: 1, name: 'Shield Projection' }]
    };
    const provider = makeEnemy('p1', { q: 1, r: 0 }, 'provider');
    const target = makeEnemy('t1', { q: 0, r: 0 }, 'test');

    vi.mocked(getAdversaryById).mockImplementation((id) => {
      if (id === 'provider') return providerAdv;
      return mockAdversary;
    });

    const modifiers = applyDefensiveTraits(target, mockAdversary, [provider], [], undefined);
    expect(modifiers).toContainEqual({ name: 'Shield Projection', value: 1 });
  });
});
