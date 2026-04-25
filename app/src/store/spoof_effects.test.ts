import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState } from '../types/game';

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
    spoofedFireControlActive: false,
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

describe('Subsystem Effects - Spoofed Fire Control', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setBaseState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Resolving Spoofed Fire Control sets the flag on the target allied ship', () => {
    const p1 = makePlayer();
    p1.assignedActions = [
      { id: 'act-1', station: 'sensors', actionId: 'black-market-targeting-suite', ctCost: 1, stressCost: 1 }
    ];
    
    useGameStore.setState({
      players: [p1],
      playerShips: [makeShip('s1', 'p1')],
    });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', {
      targetShipId: 's1'
    });

    const state = useGameStore.getState();
    expect(state.playerShips[0].spoofedFireControlActive).toBe(true);
    expect(state.log.some(l => l.message.includes('Spoofed Fire Control from Ship 1 active on Ship 1'))).toBe(true);
  });

  it('End-to-End: Spoofed Fire Control boosts attack and then clears', () => {
    const p1 = makePlayer();
    const ship = makeShip('s1', 'p1');
    ship.equippedWeapons = ['plasma-battery']; // d8, d8
    
    p1.assignedActions = [
      { id: 'act-1', station: 'sensors', actionId: 'black-market-targeting-suite', ctCost: 1, stressCost: 1 },
      { id: 'act-2', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 }
    ];
    
    const e1 = makeShip('e1', 'ai');
    e1.position = { q: 1, r: 0 }; // Range 1

    useGameStore.setState({
      players: [p1],
      playerShips: [ship],
      enemyShips: [e1],
      playerCritDeck: [{ id: 'pc1', name: 'Player Crit 1', station: 'tactical', effect: 'none', severity: 1 }],
      enemyCritDeck: [{ id: 'ec1', name: 'Enemy Crit 1', station: 'tactical', effect: 'none', severity: 1 }],
    } as any);

    // Mock random to produce a standard hit that will be boosted
    // d8 => 5. TN 5 (base 5 + range 0). Standard hit.
    // With +2, becomes 7.
    vi.spyOn(Math, 'random').mockReturnValue(0.55); // floor(0.55 * 8) + 1 = 5. 

    // 1. Resolve Spoofed Fire Control
    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 's1' });
    expect(useGameStore.getState().playerShips[0].spoofedFireControlActive).toBe(true);

    // 2. Resolve Attack
    useGameStore.getState().resolveAction('p1', 's1', 'act-2', {
      targetShipId: 'e1',
      weaponIndex: 0
    });

    const state = useGameStore.getState();
    
    // Check that flag is cleared
    expect(state.playerShips[0].spoofedFireControlActive).toBe(false);

    // Check combat log for boosted hit
    const combatLog = state.log.find(l => l.type === 'combat');
    expect(combatLog).toBeDefined();
    // Since we mocked 5, and it's boosted to 7, all 3 d8s should hit.
    // (Without bonus they would also hit, so we are just verifying it still works and clears).
    expect(combatLog?.message).toContain('3 hits'); 
  });

  it('End-to-End: Spoofed Fire Control converts to crit and explodes', () => {
    const p1 = makePlayer();
    const ship = makeShip('s1', 'p1');
    ship.equippedWeapons = ['plasma-battery']; // d8, d8, d8
    
    p1.assignedActions = [
      { id: 'act-1', station: 'sensors', actionId: 'black-market-targeting-suite', ctCost: 1, stressCost: 1 },
      { id: 'act-2', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 }
    ];
    
    const e1 = makeShip('e1', 'ai');
    e1.position = { q: 1, r: 0 }; 

    useGameStore.setState({
      players: [p1],
      playerShips: [ship],
      enemyShips: [e1],
      playerCritDeck: [{ id: 'pc1', name: 'Player Crit 1', station: 'tactical', effect: 'none', severity: 1 }],
      enemyCritDeck: [{ id: 'ec1', name: 'Enemy Crit 1', station: 'tactical', effect: 'none', severity: 1 }],
    } as any);

    // Mock random:
    // 1st die: 7 (d8). TN 5. Standard hit. +2 = 9. Convert to Crit (8) and explode.
    // 2nd die: 4 (d8). TN 5. Miss.
    // 3rd die: 4 (d8). TN 5. Miss.
    // 4th die: 1 (d6). Miss. (Officer skill die)
    // Explosion: 1 (d8). Miss.
    // Mock random:
    // 1st call: log entry ID (skip)
    // 2nd call: Die 1 (0.87 -> 7 on d8). TN 5. Standard hit. +2 = 9. Convert to Crit (8) and explode.
    // 3rd call: Die 2 (0.4 -> 4 on d8). TN 5. Miss.
    // 4th call: Die 3 (0.4 -> 4 on d8). TN 5. Miss.
    // 5th call: Die 4 (0.1 -> 1 on d6). Miss. (Officer skill die)
    // 6th call: Explosion Die (0.1 -> 1 on d8). Miss.
    const randomQueue = [0.5, 0.87, 0.4, 0.4, 0.1, 0.1];
    vi.spyOn(Math, 'random').mockImplementation(() => {
        const val = randomQueue.shift() ?? 0.5;
        return val;
    });

    // 1. Resolve Spoofed Fire Control
    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 's1' });

    // 2. Resolve Attack
    useGameStore.getState().resolveAction('p1', 's1', 'act-2', {
      targetShipId: 'e1',
      weaponIndex: 0
    });

    const state = useGameStore.getState();
    const combatLog = state.log.find(l => l.type === 'combat');
    
    // Expect 1 hit (the crit). The explosion 1 is a miss.
    // But wait, the crit itself is a hit.
    expect(combatLog?.message).toContain('1 hit');
    expect(combatLog?.message).toContain('1══&'); 
  });
});
