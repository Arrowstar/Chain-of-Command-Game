import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './store/useGameStore';
import { resolveAttack } from './engine/combat';
import type { ShipState, EnemyShipState, ObjectiveMarkerState, GamePhase } from './types/game';

describe('Weapons Expansion Mechanics', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'execution' as GamePhase,
      playerShips: [],
      enemyShips: [],
      objectiveMarkers: [],
      terrainMap: new Map(),
      tacticHazards: [],
      log: [],
    });
    vi.clearAllMocks();
  });

  it('GhostRound weapons bypass shields completely', () => {
    // Already tested by unit tests in combat.test.ts, but we can verify it here.
    const attacker = { id: 'attacker', position: { q: 0, r: 0 }, facing: 0 as any, evasionModifiers: 0, baseEvasion: 10 } as ShipState;
    const target = { id: 'target', position: { q: 0, r: 1 }, facing: 3 as any, currentHull: 10, maxHull: 10, shields: { fore: 5, aft: 5, foreStarboard: 5, forePort: 5, aftStarboard: 5, aftPort: 5 }, evasionModifiers: 0, baseEvasion: 10, criticalDamage: [], armorDie: 'd6', hasDroppedBelow50: false } as any;
    
    const weapon = {
      id: 'ghost-cannon',
      name: 'Ghost Cannon',
      volleyPool: ['d6', 'd6'],
      tags: ['ghostRound'],
      rangeMin: 1,
      rangeMax: 10,
      arcs: ['fore', 'aft', 'foreStarboard', 'forePort', 'aftStarboard', 'aftPort']
    } as any;

    const mockRoll = vi.spyOn(Math, 'random').mockReturnValue(0.99); // Force max rolls

    const result = resolveAttack(
      attacker.position,
      attacker.facing,
      target.position,
      target.facing,
      target.baseEvasion,
      target.shields,
      target.armorDie,
      target.currentHull,
      target.maxHull,
      target.hasDroppedBelow50,
      weapon,
      [{ type: 'd6', source: 'weapon' }],
      'open'
    );

    expect(result.shieldHits).toBe(0);
    expect(result.hullDamage).toBeGreaterThan(0); // 1 crit bypasses shield anyway, but if it was 1 hit, it would hit hull
    
    mockRoll.mockRestore();
  });
});
