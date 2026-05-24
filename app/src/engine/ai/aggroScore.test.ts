import { describe, expect, it, vi } from 'vitest';
import { calculateAggroScores } from './aggroScore';
import type { EnemyShipState, ShipState, TacticCard, PlayerState } from '../../types/game';

vi.mock('../../data/shipChassis', () => ({
  getChassisById: vi.fn((id) => ({
    id,
    uniqueTraitName: id === 'wraith' ? 'Cloaking Field' : null,
  })),
}));

describe('AI Aggro Scoring', () => {
  const makeAIShip = (overrides: Partial<EnemyShipState> = {}): EnemyShipState => ({  
    id: 'ai-1',
    position: { q: 0, r: 0 },
    facing: 0,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    ...overrides,
  } as any);

  const makePlayerShip = (overrides: Partial<ShipState> = {}): ShipState => ({  
    id: 'player-1',
    chassisId: 'paladin',
    position: { q: 2, r: 0 },
    facing: 3,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    criticalDamage: [],
    ...overrides,
  } as any);

  it('scores closer targets higher', () => {
    const ai = makeAIShip({ position: { q: 0, r: 0 } });
    const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 } });
    const p2 = makePlayerShip({ id: 'p2', position: { q: 4, r: 0 } });

    const scores = calculateAggroScores(ai, [p1, p2], null);
    expect(scores[0].targetId).toBe('p1');
    expect(scores[0].score).toBeGreaterThan(scores[1].score);
  });

  it('scores targets with stripped shields higher', () => {
    const ai = makeAIShip({ position: { q: 0, r: 0 } });
    const p1 = makePlayerShip({ id: 'p1', position: { q: 3, r: 0 }, shields: { fore: 0, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 } });
    const p2 = makePlayerShip({ id: 'p2', position: { q: 3, r: 0 } });

    const scores = calculateAggroScores(ai, [p1, p2], null);
    expect(scores[0].targetId).toBe('p1');
  });

  it('respects Cloaking Field (Wraith) trait', () => {
    const ai = makeAIShip({ position: { q: 0, r: 0 } });
    const p1 = makePlayerShip({ id: 'p1', chassisId: 'wraith', position: { q: 5, r: 0 } }); // Distance 5 > 3
    const p2 = makePlayerShip({ id: 'p2', position: { q: 5, r: 0 } });

    const scores = calculateAggroScores(ai, [p1, p2], null);
    expect(scores.length).toBe(1);
    expect(scores[0].targetId).toBe('p2');
  });

  it('applies tactic card overrides (e.g., frontArc)', () => {
    const ai = makeAIShip({ position: { q: 0, r: 0 }, facing: 0 }); // Facing Fore (0)
    const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 } }); // Directly in front
    const p2 = makePlayerShip({ id: 'p2', position: { q: -2, r: 0 } }); // Directly behind

    const tactic: TacticCard = {
        id: 'frontArc',
        mechanicalEffect: { targetingOverride: 'frontArc' }
    } as any;

    const scores = calculateAggroScores(ai, [p1, p2], tactic);
    expect(scores[0].targetId).toBe('p1');
    expect(scores[0].breakdown.tacticBonus).toBe(4);
  });

  it('prioritizes objective/VIP targets', () => {
    const ai = makeAIShip({ position: { q: 0, r: 0 } });
    const p1 = makePlayerShip({ id: 'p1', position: { q: 3, r: 0 } });
    const p2 = makePlayerShip({ id: 'p2', position: { q: 3, r: 0 } });

    const scores = calculateAggroScores(ai, [p1, p2], null, ['p2']);
    expect(scores[0].targetId).toBe('p2');
    expect(scores[0].breakdown.objectiveVIP).toBe(4);
  });

  describe('ignoreTargetingOverride', () => {
    it('skips tactic card targeting overrides when true', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 }, facing: 0 });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 } });
      const p2 = makePlayerShip({ id: 'p2', position: { q: -2, r: 2 } });

      const tactic: TacticCard = {
        id: 'fortress-rotation',
        mechanicalEffect: { targetingOverride: 'frontArc' },
      } as any;

      const withOverride = calculateAggroScores(ai, [p1, p2], tactic);
      const withoutOverride = calculateAggroScores(ai, [p1, p2], tactic, [], [], true);

      const p1With = withOverride.find(e => e.targetId === 'p1')!;
      const p1Without = withoutOverride.find(e => e.targetId === 'p1')!;

      expect(p1With.breakdown.tacticBonus).toBe(4);
      expect(p1Without.breakdown.tacticBonus).toBeUndefined();
    });

    it('keeps other tactic effects when ignoreTargetingOverride is true (e.g., extraDice still applies)', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 } });

      const tactic: TacticCard = {
        id: 'overwhelming-firepower',
        mechanicalEffect: { targetingOverride: undefined, extraDice: ['d6', 'd6'] },
      } as any;

      const scores = calculateAggroScores(ai, [p1], tactic, [], [], true);
      expect(scores[0].targetId).toBe('p1');
    });
  });

  describe('forceClosestTarget', () => {
    it('forces the closest player ship to top when true, overriding normal preferences', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 3, r: 0 } });
      const p2 = makePlayerShip({ id: 'p2', position: { q: 5, r: 0 }, shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 } });

      const normal = calculateAggroScores(ai, [p1, p2], null);
      const forced = calculateAggroScores(ai, [p1, p2], null, [], [], false, true);

      expect(normal[0].targetId).toBe('p2');
      expect(forced[0].targetId).toBe('p1');
      expect(forced[0].breakdown.forcedClosestTarget).toBe(1000);
    });

    it('records forcedClosestTarget in breakdown for the closest player ship', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 } });
      const p2 = makePlayerShip({ id: 'p2', position: { q: 4, r: 0 } });

      const forced = calculateAggroScores(ai, [p1, p2], null, [], [], false, true);

      const p1Entry = forced.find(e => e.targetId === 'p1')!;
      const p2Entry = forced.find(e => e.targetId === 'p2')!;
      expect(p1Entry.breakdown.forcedClosestTarget).toBe(1000);
      expect(p2Entry.breakdown.forcedClosestTarget).toBeUndefined();
    });

    it('ignores non-player ships and does not force-target them', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const ally = makeAIShip({ id: 'ally-1', position: { q: 2, r: 0 } });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 5, r: 0 } });

      const forced = calculateAggroScores(ai, [ally, p1], null, [], [], false, true);
      expect(forced[0].targetId).toBe('p1');
    });

    it('has no effect when no player ships exist', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const ally1 = makeAIShip({ id: 'ally-1', position: { q: 2, r: 0 } });
      const ally2 = makeAIShip({ id: 'ally-2', position: { q: 4, r: 0 } });

      const forced = calculateAggroScores(ai, [ally1, ally2], null, [], [], false, true);
      expect(forced.length).toBe(2);
    });

    it('works alongside ignoreTargetingOverride for targeting-disrupted scenario', () => {
      const ai = makeAIShip({ position: { q: 0, r: 0 } });
      const p1 = makePlayerShip({ id: 'p1', position: { q: 2, r: 0 }, currentHull: 12, maxHull: 12 });
      const p2 = makePlayerShip({ id: 'p2', position: { q: 5, r: 0 }, currentHull: 4, maxHull: 12, shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 } });

      const tactic: TacticCard = {
        id: 'kill-confirmation',
        mechanicalEffect: { targetingOverride: 'lowestHull' },
      } as any;

      const normal = calculateAggroScores(ai, [p1, p2], tactic);
      const disrupted = calculateAggroScores(ai, [p1, p2], tactic, [], [], true, true);

      expect(normal[0].targetId).toBe('p2');
      expect(normal[0].breakdown.tacticBonus).toBe(5);
      expect(disrupted[0].targetId).toBe('p1');
      expect(disrupted[0].breakdown.forcedClosestTarget).toBe(1000);
      expect(disrupted[0].breakdown.tacticBonus).toBeUndefined();
    });
  });
});
