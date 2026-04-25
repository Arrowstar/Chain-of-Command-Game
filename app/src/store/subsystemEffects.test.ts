import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, EnemyShipState } from '../types/game';

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

function makeShip(id = 's1', ownerId = 'p1'): ShipState {
  return {
    id,
    name: 'Ship 1',
    chassisId: 'vanguard',
    ownerId,
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
    predictiveVolleyActive: false,
  };
}

function setBaseState(extra: Record<string, unknown> = {}) {
  useGameStore.setState({
    round: 1,
    phase: 'execution',
    players: [makePlayer()],
    playerShips: [makeShip()],
    enemyShips: [],
    fighterTokens: [],
    torpedoTokens: [],
    terrainMap: new Map(),
    log: [],
    ...extra,
  } as any);
}

describe('Subsystem Effects - Predictive Volley', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setBaseState();
  });

  it('Resolving Predictive Volley sets the flag on the target ship', () => {
    const p1 = makePlayer();
    p1.assignedActions = [
      { id: 'act-1', station: 'tactical', actionId: 'salvaged-ai-coprocessor', ctCost: 2, stressCost: 0 }
    ];
    
    useGameStore.setState({
      players: [p1],
      playerShips: [makeShip('s1', 'p1')],
    });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', {
      targetShipId: 's1'
    });

    const state = useGameStore.getState();
    expect(state.playerShips[0].predictiveVolleyActive).toBe(true);
    expect(state.log.some(l => l.message.includes('Predictive Volley from Ship 1 active on Ship 1'))).toBe(true);
  });

  it('Resolving Predictive Volley fails if target is out of range', () => {
    const p1 = makePlayer();
    p1.assignedActions = [
      { id: 'act-1', station: 'tactical', actionId: 'salvaged-ai-coprocessor', ctCost: 2, stressCost: 0 }
    ];
    
    const s2 = makeShip('s2', 'p2');
    s2.position = { q: 10, r: 0 }; // out of range (max 4)

    useGameStore.setState({
      players: [p1],
      playerShips: [makeShip('s1', 'p1'), s2],
    });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', {
      targetShipId: 's2'
    });

    const state = useGameStore.getState();
    expect(state.playerShips[1].predictiveVolleyActive).toBe(false);
    expect(state.log.some(l => l.message.includes('Predictive Volley failed — target Ship 1 out of range'))).toBe(true);
  });

  it('End-to-End: Predictive Volley upgrades die and then clears', () => {
    const p1 = makePlayer();
    const ship = makeShip('s1', 'p1');
    ship.equippedWeapons = ['heavy-railgun']; // Heavy Railgun has d12, d10
    
    p1.assignedActions = [
      { id: 'act-1', station: 'tactical', actionId: 'salvaged-ai-coprocessor', ctCost: 2, stressCost: 0 },
      { id: 'act-2', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 }
    ];
    
    const e1 = makeShip('e1', 'ai');
    e1.position = { q: 3, r: 0 };

    useGameStore.setState({
      players: [p1],
      playerShips: [ship],
      enemyShips: [e1], // Add an enemy to target at range 3
    } as any);

    const store = useGameStore.getState();
    
    // 1. Resolve Predictive Volley
    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 's1' });
    expect(useGameStore.getState().playerShips[0].predictiveVolleyActive).toBe(true);

    // 2. Resolve Fire Primary
    useGameStore.getState().resolveAction('p1', 's1', 'act-2', {
      targetShipId: 'e1',
      weaponId: 'heavy-railgun',
      weaponIndex: 0
    });

    const state = useGameStore.getState();
    
    // Check that flag is cleared
    expect(state.playerShips[0].firedWeaponThisRound).toBe(true);
    expect(state.playerShips[0].predictiveVolleyActive).toBe(false);

    // Check that the attack log exists
    const combatLog = state.log.find(l => l.type === 'combat');
    expect(combatLog).toBeDefined();
  });
});
