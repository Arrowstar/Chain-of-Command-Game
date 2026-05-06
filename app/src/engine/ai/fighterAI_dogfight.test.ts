import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveFighterAttack } from './fighterAI';
import type { FighterToken, EnemyShipState, ShipState } from '../../types/game';
import { ShipSize } from '../../types/game';

// Mock dependencies
const mockRollVolley = vi.fn((pool, tn) => ({
  totalHits: 1,
  totalCriticalHits: 0,
  totalStandardHits: 1,
  dice: [{ rolls: [6], isHit: true, isCritical: false }],
  targetNumber: tn,
}));

vi.mock('../../utils/diceRoller', () => ({
  rollVolley: (...args: any[]) => mockRollVolley(...args as [any, number]),
  rollDie: vi.fn(() => 1),
}));

// We need to mock adversaries and chassis because we'll be adding imports for them
vi.mock('../../data/adversaries', () => ({
  getAdversaryById: vi.fn((id) => {
    if (id === 'fighter-ship') return { size: ShipSize.Fighter, baseEvasion: 8 };
    if (id === 'small-ship') return { size: ShipSize.Small, baseEvasion: 5 };
    return null;
  }),
}));

vi.mock('../../data/shipChassis', () => ({
  getChassisById: vi.fn((id) => {
    if (id === 'player-fighter') return { size: ShipSize.Fighter, baseEvasion: 6 };
    return null;
  }),
}));

describe('Fighter AI Dogfighting Expansion', () => {
  beforeEach(() => {
    mockRollVolley.mockClear();
  });

  const attacker = {
    id: 'f1',
    name: 'Saber 1',
    classId: 'test-fighter',
    kind: 'fighter',
    faction: 'allied',
    position: { q: 1, r: 0 },
    facing: 0,
    currentHull: 1,
    maxHull: 1,
    speed: 3,
    baseEvasion: 5,
    volleyPool: ['d6'],
    weaponRangeMax: 1,
    behavior: 'attack',
    isDestroyed: false,
    assignedTargetId: 'target-1',
  } as unknown as FighterToken;

  it('applies dogfight bonus (-3 TN) to FighterToken targets', () => {
    const target = {
      id: 'target-1',
      kind: 'fighter',
    faction: 'hegemony',
      position: { q: 0, r: 0 },
      baseEvasion: 8,
      isDestroyed: false,
    } as unknown as FighterToken;

    resolveFighterAttack(attacker, [], [], [attacker, target]);

    // Expected TN = 8 - 3 = 5
    expect(mockRollVolley).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it('applies dogfight bonus (-3 TN) to EnemyShipState targets with size: fighter', () => {
    const target = {
      id: 'target-1',
      kind: 'ship',
      faction: 'hegemony',
      adversaryId: 'fighter-ship',
      position: { q: 0, r: 0 },
      baseEvasion: 8,
      isDestroyed: false,
      shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    } as unknown as any;

    resolveFighterAttack(attacker, [], [target], [attacker]);

    // Current implementation: uses baseEvasion 8
    // Target implementation: should use 8 - 3 = 5
    // This test will fail before the fix if we expect 5
    expect(mockRollVolley).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it('does NOT apply dogfight bonus to Small ships', () => {
    const target = {
      id: 'target-1',
      kind: 'ship',
      faction: 'hegemony',
      adversaryId: 'small-ship',
      position: { q: 0, r: 0 },
      baseEvasion: 5,
      isDestroyed: false,
      shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    } as unknown as any;

    resolveFighterAttack(attacker, [], [target], [attacker]);

    // TN should be baseEvasion 5
    expect(mockRollVolley).toHaveBeenCalledWith(expect.anything(), 5);
  });
});
