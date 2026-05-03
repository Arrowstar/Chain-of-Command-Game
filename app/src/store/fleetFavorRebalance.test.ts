import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store/useGameStore';
import type { PlayerState, ShipState } from '../types/game';

function makePlayerShip(): ShipState {
  return {
    id: 's1',
    name: 'Player Ship',
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 0,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    equippedWeapons: ['plasma-battery'],
    equippedSubsystems: [],
    criticalDamage: [],
    scars: [],
    armorDie: 'd6',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
  };
}

function makePlayer(shipId: string): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId,
    commandTokens: 5,
    maxCommandTokens: 5,
    assignedActions: [],
    officers: [],
  };
}

describe('Fleet Favor Rebalancing', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('reduces Fleet Favor by 1 when a player ship is destroyed (standard penalty)', () => {
    const s1 = makePlayerShip();
    useGameStore.setState({
      playerShips: [s1],
      fleetFavor: 0,
    } as any);

    useGameStore.getState().updatePlayerShip('s1', { isDestroyed: true, currentHull: 0 });

    expect(useGameStore.getState().fleetFavor).toBe(-1);
  });

  it('reduces Fleet Favor by 2 when RoE is overridden', () => {
    useGameStore.setState({
      phase: 'briefing',
      activeRoE: { id: 'test-roe', name: 'Test RoE' },
      roeOverridden: false,
      fleetFavor: 0,
    } as any);

    useGameStore.getState().overrideRoE();

    expect(useGameStore.getState().fleetFavor).toBe(-2);
    expect(useGameStore.getState().roeOverridden).toBe(true);
  });

  it('reduces Fleet Favor by 1 on mission defeat', () => {
    useGameStore.setState({
      fleetFavor: 0,
      scenarioId: 'ambush-kaelen-iv',
      playerShips: [makePlayerShip()],
      enemyShips: [],
      objectiveMarkers: [],
      gameOver: false,
      victory: null,
      maxRounds: 8,
      round: 9, // Past maxRounds 8
    } as any);

    // checkGameOver handles the penalty when it detects defeat
    useGameStore.getState().checkGameOver();

    expect(useGameStore.getState().victory).toBe(false);
    expect(useGameStore.getState().fleetFavor).toBe(-1);
  });

  it('respects "Acceptable Losses" override (+1 FF instead of -1)', () => {
    const s1 = makePlayerShip();
    useGameStore.setState({
      playerShips: [s1],
      fleetFavor: 0,
      activeRoE: {
        id: 'acceptable-losses',
        name: 'Acceptable Losses',
        mechanicalEffect: { destroyedShipFFOverride: 1 }
      },
    } as any);

    useGameStore.getState().updatePlayerShip('s1', { isDestroyed: true, currentHull: 0 });

    expect(useGameStore.getState().fleetFavor).toBe(1);
  });
});
