import { describe, it, expect, vi } from 'vitest';
import { resolveFighterAttack } from './fighterAI';
import type { FighterToken, ShipState, EnemyShipState, DieType } from '../../types/game';
import * as diceRoller from '../../utils/diceRoller';

describe('Fighter Piercing Damage', () => {
  const mockFighter: FighterToken = {
    kind: 'fighter',
    faction: 'allied',
    id: 'f1',
    name: 'Strike Squadron',
    classId: 'strike',
    
    sourceShipId: 's1',
    position: { q: 0, r: 0 },
    facing: 0,
    currentHull: 1,
    maxHull: 1,
    speed: 3,
    baseEvasion: 5,
    volleyPool: ['d4', 'd4'],
    weaponRangeMax: 2,
    behavior: 'attack',
    isDestroyed: false,
    hasDrifted: false,
    hasActed: false,
    assignedTargetId: 'e1',
  };

  const mockEnemy: EnemyShipState = {
    kind: 'ship',
    faction: 'hegemony',
    id: 'e1',
    name: 'Enemy Corvette',
    adversaryId: 'corvette',
    position: { q: 1, r: 0 },
    facing: 0,
    currentSpeed: 0,
    currentHull: 5,
    maxHull: 5,
    shields: {
      fore: 2,
      foreStarboard: 2,
      aftStarboard: 2,
      aft: 2,
      aftPort: 2,
      forePort: 2,
    },
    maxShieldsPerSector: 2,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    baseEvasion: 2, // TN 2
    armorDie: 'd6',
    targetLocks: [],
  };

  it('should bypass shields when a fighter rolls a critical hit', () => {
    // Mock rollVolley to return 1 critical hit (piercing) and 0 standard hits
    vi.spyOn(diceRoller, 'rollVolley').mockReturnValue({
      dice: [
        { dieType: 'd4', rolls: [4], total: 4, isHit: true, isCritical: true, source: 'fighter' },
      ],
      targetNumber: 2,
      totalHits: 1,
      totalCrits: 1,
      totalStandardHits: 0,
      totalCriticalHits: 1,
    });

    const result = resolveFighterAttack(mockFighter, [], [mockEnemy], [mockFighter]);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.hits).toBe(1);
      expect(result.piercingHits).toBe(1);
      expect(result.shieldDamage).toBe(0);
      expect(result.hullDamage).toBe(1);
      expect(result.overflowHits).toBe(0);
    }
    
    vi.restoreAllMocks();
  });

  it('should be absorbed by shields when a fighter rolls a standard hit', () => {
    // Mock rollVolley to return 1 standard hit
    vi.spyOn(diceRoller, 'rollVolley').mockReturnValue({
      dice: [
        { dieType: 'd4', rolls: [2], total: 2, isHit: true, isCritical: false, source: 'fighter' },
      ],
      targetNumber: 2,
      totalHits: 1,
      totalCrits: 0,
      totalStandardHits: 1,
      totalCriticalHits: 0,
    });

    const result = resolveFighterAttack(mockFighter, [], [mockEnemy], [mockFighter]);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.hits).toBe(1);
      expect(result.piercingHits).toBe(0);
      expect(result.shieldDamage).toBe(1);
      expect(result.hullDamage).toBe(0);
      expect(result.overflowHits).toBe(0); // overflow is standardHits - shieldDmg = 1 - 1 = 0
    }

    vi.restoreAllMocks();
  });

  it('should deal hull damage only after shields are depleted by standard hits', () => {
    // Mock rollVolley to return 3 standard hits against 2 shields
    vi.spyOn(diceRoller, 'rollVolley').mockReturnValue({
      dice: [
        { dieType: 'd4', rolls: [2], total: 2, isHit: true, isCritical: false, source: 'fighter' },
        { dieType: 'd4', rolls: [3], total: 3, isHit: true, isCritical: false, source: 'fighter' },
        { dieType: 'd4', rolls: [2], total: 2, isHit: true, isCritical: false, source: 'fighter' },
      ],
      targetNumber: 2,
      totalHits: 3,
      totalCrits: 0,
      totalStandardHits: 3,
      totalCriticalHits: 0,
    });

    const result = resolveFighterAttack(mockFighter, [], [mockEnemy], [mockFighter]);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.hits).toBe(3);
      expect(result.shieldDamage).toBe(2);
      expect(result.overflowHits).toBe(1); // 3 hits - 2 shields = 1 overflow
      expect(result.hullDamage).toBe(1); // 1 hull max for standard hits
    }

    vi.restoreAllMocks();
  });

  it('should combine standard overflow and piercing hits', () => {
    // Mock rollVolley to return:
    // - 3 standard hits (against 2 shields -> 1 overflow -> 1 hull)
    // - 1 piercing hit (+1 hull)
    // Total Hull Damage should be 2
    vi.spyOn(diceRoller, 'rollVolley').mockReturnValue({
      dice: [
        { dieType: 'd4', rolls: [2], total: 2, isHit: true, isCritical: false, source: 'fighter' },
        { dieType: 'd4', rolls: [3], total: 3, isHit: true, isCritical: false, source: 'fighter' },
        { dieType: 'd4', rolls: [2], total: 2, isHit: true, isCritical: false, source: 'fighter' },
        { dieType: 'd4', rolls: [4], total: 4, isHit: true, isCritical: true, source: 'fighter' },
      ],
      targetNumber: 2,
      totalHits: 4,
      totalCrits: 1,
      totalStandardHits: 3,
      totalCriticalHits: 1,
    });

    const result = resolveFighterAttack(mockFighter, [], [mockEnemy], [mockFighter]);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.hits).toBe(4);
      expect(result.shieldDamage).toBe(2);
      expect(result.overflowHits).toBe(1); // 3 standard hits - 2 shields = 1 overflow
      expect(result.piercingHits).toBe(1);
      expect(result.hullDamage).toBe(2); // 1 (overflow) + 1 (piercing)
    }

    vi.restoreAllMocks();
  });
});
