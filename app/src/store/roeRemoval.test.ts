import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import { ROE_DECK } from '../data/roeDeck';
import type { EnemyShipState, PlayerState, ShipState } from '../types/game';

function makePlayer(): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId: 's1',
    commandTokens: 5,
    maxCommandTokens: 5,
    assignedActions: [],
    officers: [
      { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
    ],
  };
}

function makeShip(): ShipState {
  return {
    id: 's1',
    name: 'Ship 1',
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 2,
    currentHull: 10,
    maxHull: 12,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 4,
    equippedWeapons: ['plasma-battery'],
    equippedSubsystems: [],
    criticalDamage: [],
    scars: [],
    armorDie: 'd4',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    firedWeaponIndicesThisRound: [],
    ordnanceLoadedIndicesThisRound: [],
    targetLocks: [],
  };
}

function makeEnemy(): EnemyShipState {
  return {
    id: 'e1',
    name: 'Enemy 1',
    adversaryId: 'hunter-killer',
    position: { q: 1, r: 0 },
    facing: 3 as any,
    currentSpeed: 0,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 1,
    armorDie: 'd4',
    evasionModifiers: 0,
  };
}

describe('RoE Removal: Live-Fire Telemetry', () => {
  it('should not find Live-Fire Telemetry in the ROE_DECK', () => {
    const liveFire = ROE_DECK.find(card => card.id === 'live-fire-telemetry');
    expect(liveFire).toBeUndefined();
  });

  it('should allow targeting enemy shields in Round 1 (verifying logic removal)', () => {
    useGameStore.setState({
      round: 1,
      phase: 'execution',
      players: [
        {
          ...makePlayer(),
          assignedActions: [{ id: 'fire-1', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 }],
        },
      ],
      playerShips: [makeShip()],
      enemyShips: [makeEnemy()],
      activeRoE: null,
    } as any);

    useGameStore.getState().resolveAction('p1', 's1', 'fire-1', {
      targetShipId: 'e1',
      weaponId: 'plasma-battery',
      weaponIndex: 0,
    });

    expect(useGameStore.getState().playerShips[0].firedWeaponIndicesThisRound).toContain(0);
    
    const logs = useGameStore.getState().log;
    expect(logs.some(l => l.message.includes('LIVE-FIRE TELEMETRY'))).toBe(false);
  });
});
