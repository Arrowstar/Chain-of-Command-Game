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
});
