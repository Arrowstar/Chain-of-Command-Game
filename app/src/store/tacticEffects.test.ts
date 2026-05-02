import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { EnemyShipState, PlayerState, ShipState } from '../types/game';
import { TACTIC_DECK } from '../data/tacticDeck';

function makePlayerShip(): ShipState {
  return {
    id: 's1',
    name: 'Resolute',
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 2,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    equippedWeapons: [],
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

function makeEnemyShip(overrides: Partial<EnemyShipState> = {}): EnemyShipState {
  return {
    id: 'e1',
    name: 'Enemy Ship',
    adversaryId: 'carrier',
    position: { q: 5, r: 0 },
    facing: 3 as any,
    currentSpeed: 1,
    currentHull: 18,
    maxHull: 18,
    shields: { fore: 1, foreStarboard: 1, aftStarboard: 1, aft: 1, aftPort: 1, forePort: 1 },
    maxShieldsPerSector: 2,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 3,
    armorDie: 'd6',
    evasionModifiers: 0,
    ...overrides,
  };
}

function makePlayer(): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId: 's1',
    commandTokens: 5,
    maxCommandTokens: 5,
    assignedActions: [],
    pendingCommandTokenBonus: 0,
    briefingCommandTokenBonus: 0,
    officers: [
      { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'boomer-hayes', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'chatter-singh', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
    ],
  };
}

describe('enemy tactic effects', () => {
  beforeEach(() => {
    useGameStore.setState({
      round: 1,
      phase: 'setup',
      players: [makePlayer()],
      playerShips: [makePlayerShip()],
      enemyShips: [makeEnemyShip()],
      fighterTokens: [],
      torpedoTokens: [],
      terrainMap: new Map([
        ['0,0', 'open'],
        ['1,0', 'open'],
        ['0,1', 'open'],
        ['1,-1', 'open'],
        ['2,0', 'open'],
        ['0,2', 'open'],
        ['2,-1', 'open'],
        ['3,0', 'open'],
        ['4,0', 'open'],
        ['5,0', 'open'],
        ['6,0', 'open'],
        ['5,1', 'open'],
        ['4,1', 'open'],
        ['5,-1', 'open'],
        ['6,-1', 'open'],
      ]),
      tacticDeck: [],
      tacticHazards: [],
      fumbleDeck: [],
      playerCritDeck: [],
      enemyCritDeck: [],
      activeRoE: null,
      roeOverridden: false,
      currentTactic: null,
      objectiveMarkers: [],
      fleetFavor: 0,
      log: [],
      fleetAssetRoundUses: {},
      fleetAssetScenarioUses: {},
      fleetAssetShipRoundUses: {},
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      exposedEnemyShipId: null,
      flakUmbrellaShipId: null,
      extractionWindowShipIds: [],
      pendingSpawns: [],
    });
  });

  it('deploys reserve fighters when Reserve Squadron Launch is drawn', () => {
    const tactic = TACTIC_DECK.find(card => card.id === 'reserve-squadron-launch')!;
    useGameStore.setState({ tacticDeck: [tactic] });

    useGameStore.getState().executeBriefingPhase();
    const state = useGameStore.getState();

    expect(state.currentTactic?.id).toBe('reserve-squadron-launch');
    expect(state.fighterTokens.length).toBeGreaterThan(0);
  });

  it('restores enemy shields when a shield tactic is drawn', () => {
    const tactic = TACTIC_DECK.find(card => card.id === 'shield-harmonics')!;
    useGameStore.setState({ tacticDeck: [tactic] });

    useGameStore.getState().executeBriefingPhase();
    const enemy = useGameStore.getState().enemyShips[0];

    expect(enemy.shields.fore).toBe(2);
    expect(enemy.shields.aft).toBe(2);
  });

  it('creates mine hazards when Minefield Calibration is drawn', () => {
    const tactic = TACTIC_DECK.find(card => card.id === 'minefield-calibration')!;
    useGameStore.setState({ tacticDeck: [tactic] });

    useGameStore.getState().executeBriefingPhase();
    const state = useGameStore.getState();

    expect(state.currentTactic?.id).toBe('minefield-calibration');
    expect(state.tacticHazards).toHaveLength(3);
  });

  it('strips shields from player ships and enemies inside an ion nebula at briefing', () => {
    const tactic = TACTIC_DECK.find(card => card.id === 'minefield-calibration')!;
    useGameStore.setState({
      tacticDeck: [tactic],
      playerShips: [
        {
          ...makePlayerShip(),
          position: { q: 0, r: 0 },
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        },
      ],
      enemyShips: [
        {
          ...makeEnemyShip({
            position: { q: 5, r: 0 },
            shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
          }),
        },
      ],
      terrainMap: new Map([
        ['0,0', 'ionNebula'],
        ['5,0', 'ionNebula'],
      ]),
    });

    useGameStore.getState().executeBriefingPhase();
    const state = useGameStore.getState();

    expect(state.playerShips[0].shields.fore).toBe(0);
    expect(state.enemyShips[0].shields.fore).toBe(0);
  });
});
