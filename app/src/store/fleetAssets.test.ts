import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import { ROE_DECK } from '../data/roeDeck';
import type { EnemyShipState, PlayerState, ShipState, TacticCard, TorpedoToken } from '../types/game';

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

function setBaseState(extra: Record<string, unknown> = {}) {
  useGameStore.setState({
    round: 1,
    phase: 'command',
    players: [makePlayer()],
    playerShips: [makeShip()],
    enemyShips: [makeEnemy()],
    fighterTokens: [],
    torpedoTokens: [],
    terrainMap: new Map(),
    tacticDeck: [],
    fumbleDeck: [],
    playerCritDeck: [],
    enemyCritDeck: [],
    activeRoE: null,
    roeOverridden: false,
    currentTactic: null,
    fleetAssetRoundUses: {},
    fleetAssetScenarioUses: {},
    fleetAssetShipRoundUses: {},
    tacticalOverrideShipIds: [],
    targetingPackages: [],
    exposedEnemyShipId: null,
    flakUmbrellaShipId: null,
    extractionWindowShipIds: [],
    fleetFavor: 5,
    startingFleetFavor: 5,
    log: [],
    scenarioId: 'test-scenario',
    maxRounds: null,
    gameOver: false,
    victory: null,
    gameOverReason: '',
    objectiveType: 'Breakout',
    objectiveMarkers: [],
    scenarioRules: [],
    pendingSpawns: [],
    warpedOutShipIds: [],
    salvageCratesCollected: 0,
    dataSiphonedRelayNames: [],
    successfulEscapes: 0,
    ...extra,
  } as any);
}

describe('Fleet Assets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setBaseState();
  });

  it('Emergency Reinforcement grants +1 CT and respects per-ship and per-round limits', () => {
    const store = useGameStore.getState();

    expect(store.useFleetAsset('emergency-reinforcement', { shipId: 's1' })).toBe(true);
    let state = useGameStore.getState();
    expect(state.players[0].commandTokens).toBe(6);
    expect(state.fleetFavor).toBe(4);

    expect(state.useFleetAsset('emergency-reinforcement', { shipId: 's1' })).toBe(false);

    useGameStore.setState({
      players: [
        useGameStore.getState().players[0],
        {
          ...makePlayer(),
          id: 'p2',
          name: 'Player 2',
          shipId: 's2',
        },
      ],
      playerShips: [
        useGameStore.getState().playerShips[0],
        {
          ...makeShip(),
          id: 's2',
          name: 'Ship 2',
          ownerId: 'p2',
        },
      ],
    });

    expect(useGameStore.getState().useFleetAsset('emergency-reinforcement', { shipId: 's2' })).toBe(true);
    state = useGameStore.getState();
    expect(state.players[1].commandTokens).toBe(6);
    expect(state.useFleetAsset('emergency-reinforcement', { shipId: 's2' })).toBe(false);
  });

  it('blocks fleet assets when the fleet lacks enough Fleet Favor and does not deduct anything', () => {
    useGameStore.setState({ fleetFavor: 0 });

    const result = useGameStore.getState().useFleetAsset('tactical-override', { shipId: 's1' });

    expect(result).toBe(false);
    expect(useGameStore.getState().fleetFavor).toBe(0);
    expect(useGameStore.getState().tacticalOverrideShipIds).toEqual([]);
    expect(useGameStore.getState().log.some(l => l.message.includes('not enough Fleet Favor'))).toBe(true);
  });


  it('Intel Feed can cancel the current tactic card', () => {
    const tactic: TacticCard = {
      id: 'overwhelming-firepower',
      name: 'Overwhelming Firepower',
      effect: 'All AI weapons gain +1 Skill Die.',
      mechanicalEffect: { extraDice: ['d6'] },
    };
    useGameStore.setState({ currentTactic: tactic });

    expect(useGameStore.getState().useFleetAsset('intel-feed', { mode: 'cancel-tactic' })).toBe(true);
    const state = useGameStore.getState();
    expect(state.currentTactic).toBeNull();
    expect(state.fleetFavor).toBe(4);
    expect(state.useFleetAsset('intel-feed', { mode: 'cancel-tactic' })).toBe(false);
  });

  it('Escort / Support Call interceptor screen destroys an incoming enemy torpedo', () => {
    const torpedo: TorpedoToken = {
      id: 'torp-1',
      name: 'Enemy Torpedo',
      allegiance: 'enemy',
      sourceShipId: 'e1',
      targetShipId: 's1',
      position: { q: 0, r: 1 },
      facing: 3 as any,
      currentHull: 1,
      maxHull: 1,
      speed: 2,
      baseEvasion: 5,
      isDestroyed: false,
      hasMoved: false,
    };
    useGameStore.setState({ torpedoTokens: [torpedo] });

    expect(useGameStore.getState().useFleetAsset('escort-support-call', { mode: 'interceptor-screen', torpedoId: 'torp-1' })).toBe(true);
    const state = useGameStore.getState();
    expect(state.torpedoTokens[0].isDestroyed).toBe(true);
    expect(state.torpedoTokens[0].hasMoved).toBe(true);
  });

  it('Extraction Window lets a ship count as a safe warp-out outside the breakout zone', () => {
    useGameStore.setState({
      phase: 'execution',
      playerShips: [
        {
          ...makeShip(),
          position: { q: 0, r: 0 },
        },
      ],
      players: [
        {
          ...makePlayer(),
          assignedActions: [{ id: 'warp-1', station: 'helm', actionId: 'jump-to-warp', ctCost: 1, stressCost: 1 }],
        },
      ],
    });

    expect(useGameStore.getState().useFleetAsset('extraction-window', { shipId: 's1' })).toBe(true);
    useGameStore.getState().resolveAction('p1', 's1', 'warp-1');

    const state = useGameStore.getState();
    expect(state.playerShips[0].warpedOut).toBe(true);
    expect(state.successfulEscapes).toBe(1);
    expect(state.warpedOutShipIds).toContain('s1');
  });
});
