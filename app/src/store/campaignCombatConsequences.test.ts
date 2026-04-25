import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { EnemyShipState, PlayerState, ShipState } from '../types/game';

function makePlayerShip(scars: ShipState['scars'] = []): ShipState {
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
    scars,
    armorDie: 'd6',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
  };
}

function makeEnemyShip(): EnemyShipState {
  return {
    id: 'e1',
    name: 'Enemy Ship',
    adversaryId: 'hunter-killer',
    position: { q: 2, r: -2 },
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
    baseEvasion: 5,
    armorDie: 'd6',
  };
}

function makePlayer(shipId: string): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId,
    commandTokens: 0,
    maxCommandTokens: 5,
    assignedActions: [],
    officers: [
      { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
    ],
  };
}

describe('combat consequences from campaign events', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('applies combat modifiers during mission initialization and round-one briefing', () => {
    useGameStore.getState().initializeGame({
      scenarioId: 'campaign-test',
      maxRounds: 8,
      startingRoEId: 'zero-tolerance-cowardice',
      players: [makePlayer('s1')],
      playerShips: [makePlayerShip()],
      enemyShips: [makeEnemyShip()],
      terrain: [],
      combatModifiers: {
        enemyShieldsZeroRound1: true,
        playerStartSpeed3: true,
        playerCTRound1Modifier: -1,
      },
    });
    useGameStore.getState().advancePhase();

    const state = useGameStore.getState();
    expect(state.playerShips[0].currentSpeed).toBe(3);
    expect(Object.values(state.enemyShips[0].shields).every(value => value === 0)).toBe(true);
    expect(state.players[0].commandTokens).toBe(4);
  });

  it('forces round-one CT to zero when required', () => {
    useGameStore.getState().initializeGame({
      scenarioId: 'campaign-test',
      maxRounds: 8,
      startingRoEId: 'zero-tolerance-cowardice',
      players: [makePlayer('s1')],
      playerShips: [makePlayerShip()],
      enemyShips: [makeEnemyShip()],
      terrain: [],
      combatModifiers: {
        playerCTZeroRound1: true,
      },
    });

    expect(useGameStore.getState().players[0].commandTokens).toBe(0);
  });

  it('makes bridge and cooling scars affect CT and engineering stress costs', () => {
    useGameStore.getState().initializeGame({
      scenarioId: 'campaign-test',
      maxRounds: 8,
      startingRoEId: 'zero-tolerance-cowardice',
      players: [makePlayer('s1')],
      playerShips: [makePlayerShip([
        { id: 'scar-bridge', name: 'Damaged Bridge', effect: '', fromCriticalId: 'bridge-hit' },
        { id: 'scar-coolant', name: 'Compromised Cooling', effect: '', fromCriticalId: 'coolant-leak' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrain: [],
    });

    const stateAfterInit = useGameStore.getState();
    expect(stateAfterInit.players[0].commandTokens).toBe(4);

    useGameStore.getState().assignToken('p1', {
      id: 'eng-1',
      station: 'engineering',
      actionId: 'reinforce-shields',
      ctCost: 1,
      stressCost: 1,
      context: { sector: 'fore' },
    });

    const action = useGameStore.getState().players[0].assignedActions[0];
    expect(action.stressCost).toBe(2);
  });

  it('caps speed when thrusters are scarred', () => {
    useGameStore.setState({
      phase: 'command',
      players: [{ ...makePlayer('s1'), commandTokens: 5 }],
      playerShips: [makePlayerShip([
        { id: 'scar-thrusters', name: 'Scorched Thrusters', effect: '', fromCriticalId: 'thrusters-offline' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrainMap: new Map(),
      log: [],
      combatModifiers: null,
    } as Partial<ReturnType<typeof useGameStore.getState>>);

    useGameStore.getState().assignToken('p1', {
      id: 'helm-1',
      station: 'helm',
      actionId: 'adjust-speed',
      ctCost: 1,
      stressCost: 0,
      context: { delta: 5 },
    });
    useGameStore.getState().resolveAction('p1', 's1', 'helm-1', { delta: 5 });

    expect(useGameStore.getState().playerShips[0].currentSpeed).toBe(2);
  });

  it('applies new command and sensors scar penalties during briefing and assignment', () => {
    useGameStore.getState().initializeGame({
      scenarioId: 'campaign-test',
      maxRounds: 8,
      startingRoEId: 'zero-tolerance-cowardice',
      players: [makePlayer('s1')],
      playerShips: [makePlayerShip([
        { id: 'scar-sensors', name: 'Warped Sensor Mast', effect: '', fromCriticalId: 'sensor-mast-damaged' },
        { id: 'scar-bus', name: 'Leaking Power Bus', effect: '', fromCriticalId: 'power-bus-leak' },
        { id: 'scar-command', name: 'Command Spine Exposure', effect: '', fromCriticalId: 'command-spine-exposed' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrain: [],
    });

    const stateAfterInit = useGameStore.getState();
    const helmOfficer = stateAfterInit.players[0].officers.find(officer => officer.station === 'helm');
    expect(helmOfficer?.currentStress).toBe(1);

    useGameStore.getState().assignToken('p1', {
      id: 'sen-1',
      station: 'sensors',
      actionId: 'target-lock',
      ctCost: 1,
      stressCost: 1,
      targetShipId: 'e1',
    });

    const action = useGameStore.getState().players[0].assignedActions[0];
    expect(action.ctCost).toBe(2);
    expect(action.stressCost).toBe(2);
  });

  it('prevents a first assignment when a CT penalty raises the real cost above available CT', () => {
    useGameStore.setState({
      phase: 'command',
      players: [{ ...makePlayer('s1'), commandTokens: 1 }],
      playerShips: [makePlayerShip([
        { id: 'scar-bus', name: 'Leaking Power Bus', effect: '', fromCriticalId: 'power-bus-leak' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrainMap: new Map(),
      log: [],
      activeRoE: null,
      combatModifiers: null,
      experimentalTech: [],
      recycledCoolantUsedThisRound: false,
    } as Partial<ReturnType<typeof useGameStore.getState>>);

    useGameStore.getState().assignToken('p1', {
      id: 'helm-penalty',
      station: 'helm',
      actionId: 'adjust-speed',
      ctCost: 1,
      stressCost: 0,
      context: { delta: 1 },
    });

    const state = useGameStore.getState();
    expect(state.players[0].commandTokens).toBe(1);
    expect(state.players[0].assignedActions).toHaveLength(0);
  });

  it('resolves Bleed Heat by restoring 1 CT up to the round maximum and removing 1 Engineering stress', () => {
    useGameStore.setState({
      phase: 'execution',
      round: 2,
      players: [{
        ...makePlayer('s1'),
        commandTokens: 4,
        assignedActions: [{
          id: 'eng-bleed',
          station: 'engineering',
          actionId: 'hermit-reactor-baffles',
          ctCost: 1,
          stressCost: 1,
          resolved: false,
        }],
        officers: makePlayer('s1').officers.map(officer =>
          officer.station === 'engineering' ? { ...officer, currentStress: 2 } : officer
        ),
      }],
      playerShips: [makePlayerShip()],
      enemyShips: [makeEnemyShip()],
      terrainMap: new Map(),
      log: [],
      activeRoE: null,
      combatModifiers: null,
    } as Partial<ReturnType<typeof useGameStore.getState>>);

    useGameStore.getState().resolveAction('p1', 's1', 'eng-bleed', {});

    const state = useGameStore.getState();
    const engineeringOfficer = state.players[0].officers.find(officer => officer.station === 'engineering');
    expect(state.players[0].commandTokens).toBe(5);
    expect(engineeringOfficer?.currentStress).toBe(1);
  });

  it('caps actual speed at 2 when the structural spine is buckled', () => {
    useGameStore.setState({
      phase: 'command',
      players: [{ ...makePlayer('s1'), commandTokens: 5 }],
      playerShips: [makePlayerShip([
        { id: 'scar-spine', name: 'Buckled Structural Spine', effect: '', fromCriticalId: 'structural-spine-buckled' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrainMap: new Map(),
      log: [],
      combatModifiers: null,
    } as Partial<ReturnType<typeof useGameStore.getState>>);

    useGameStore.getState().assignToken('p1', {
      id: 'helm-2',
      station: 'helm',
      actionId: 'adjust-speed',
      ctCost: 1,
      stressCost: 0,
      context: { delta: 5 },
    });
    useGameStore.getState().resolveAction('p1', 's1', 'helm-2', { delta: 5 });

    expect(useGameStore.getState().playerShips[0].currentSpeed).toBe(2);
  });

  it('logs the warped cannon mount penalty on the first primary shot each round', () => {
    useGameStore.setState({
      phase: 'execution',
      round: 1,
      players: [{
        ...makePlayer('s1'),
        assignedActions: [{
          id: 'tac-1',
          station: 'tactical',
          actionId: 'fire-primary',
          ctCost: 1,
          stressCost: 1,
          resolved: false,
        }],
      }],
      playerShips: [makePlayerShip([
        { id: 'scar-mount', name: 'Warped Cannon Mount', effect: '', fromCriticalId: 'weapon-mount-warped' },
      ])],
      enemyShips: [makeEnemyShip()],
      terrainMap: new Map(),
      log: [],
      activeRoE: null,
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      exposedEnemyShipId: null,
      flakUmbrellaShipId: null,
      experimentalTech: [],
      tachyonMatrixUsedThisScenario: false,
      objectiveMarkers: [],
    } as Partial<ReturnType<typeof useGameStore.getState>>);

    useGameStore.getState().resolveAction('p1', 's1', 'tac-1', {
      targetShipId: 'e1',
      weaponIndex: 0,
      weaponId: 'plasma-battery',
    });

    expect(useGameStore.getState().log.some(entry => entry.message.includes('Warped Cannon Mount'))).toBe(true);
  });
});
