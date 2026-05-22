import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';
import type { FumbleCard, PlayerState, QueuedAction } from '../types/game';

vi.mock('../engine/ai/aiTurn', () => ({
  executeAITier: vi.fn()
}));

vi.mock('../components/board/CombatToastContainer', () => ({
  fireCombatToast: vi.fn()
}));

// Provide basic state for tests
function resetGameState() {
  vi.useFakeTimers();
  useUIStore.getState().resetUI();
  useGameStore.setState({
    round: 1,
    phase: 'command',
    players: [
      {
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
        ]
      } as PlayerState
    ],
    playerShips: [{ kind: 'ship', faction: 'player', id: 's1', name: 'Ship 1', chassisId: 'c1', ownerId: 'p1',
        position: { q: 0, r: 0 }, facing: 0 as import('../types/game').HexFacing, currentSpeed: 2, currentHull: 10, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 }, maxShieldsPerSector: 2,
        equippedWeapons: ['w1'], equippedSubsystems: [], criticalDamage: [], scars: [],
        armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
      }
    ],
    enemyShips: [{ kind: 'ship', faction: 'hegemony', id: 'e1', name: 'Enemy 1', adversaryId: 'hunter-killer', position: { q: 5, r: 0 }, facing: 3 as import('../types/game').HexFacing,
        currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2,
        criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [], baseEvasion: 5, armorDie: 'd6'
      }
    ],
    terrainMap: new Map(),
    tacticDeck: [],
    fumbleDeck: [],
    playerCritDeck: [],
    enemyCritDeck: [],
    activeRoE: null,
    currentTactic: null,
    roeOverridden: false,
    log: [],
    fleetFavor: 2,
  });
}

function runFumbleTest(mechanicalEffect: Partial<import('../types/game').FumbleMechanicalEffect>, setupModifier?: (state: any) => void) {
  const testFumble: FumbleCard = {
    id: 'test-fumble',
    name: 'Test Fumble',
    category: 'general',
    flavorText: 'Test',
    effect: 'Test Effect',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      ...mechanicalEffect
    }
  };

  vi.spyOn(Math, 'random').mockReturnValue(0.99); // Pass trauma roll

  useGameStore.setState(state => {
    const p = state.players[0];
    p.officers[2].currentStress = 6; // Force tactical officer to fumble
    const newState: any = {
      players: [p],
      fumbleDeck: [testFumble],
      playerShips: state.playerShips
    };
    if (setupModifier) {
      setupModifier(newState);
    }
    return newState;
  });

  useGameStore.getState().evaluateCommandPhaseFumbles();
}

describe('Fumble Mechanical Effects', () => {
  beforeEach(() => {
    resetGameState();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('applies priorityTarget to the player ship', () => {
    runFumbleTest({ priorityTarget: true });
    expect(useGameStore.getState().playerShips[0].priorityTarget).toBe(true);
  });

  it('applies enemyTnReduction to the player ship', () => {
    runFumbleTest({ enemyTnReduction: 2 });
    expect(useGameStore.getState().playerShips[0].enemyTnReduction).toBe(2);
  });

  it('cancels action and refunds CT if configured', () => {
    let initialCT = 0;
    runFumbleTest({ actionCanceled: true, ctRefunded: true }, (state) => {
      const p = state.players[0];
      p.commandTokens = 2; // base CT
      p.assignedActions.push({ id: 'act1', station: 'tactical', actionId: 'fire-primary', ctCost: 2, stressCost: 1 } as QueuedAction);
      initialCT = p.commandTokens;
    });
    
    const player = useGameStore.getState().players[0];
    // Action should be removed
    expect(player.assignedActions.length).toBe(0);
    // CT should be refunded: 2 + 2 = 4
    expect(player.commandTokens).toBe(4);
  });

  it('cancels action without refunding CT', () => {
    runFumbleTest({ actionCanceled: true, ctRefunded: false }, (state) => {
      const p = state.players[0];
      p.commandTokens = 2; // base CT
      p.assignedActions.push({ id: 'act1', station: 'tactical', actionId: 'fire-primary', ctCost: 2, stressCost: 1 } as QueuedAction);
    });
    
    const player = useGameStore.getState().players[0];
    expect(player.assignedActions.length).toBe(0);
    // CT remains 2
    expect(player.commandTokens).toBe(2);
  });

  it('locks the station for lockDuration rounds', () => {
    runFumbleTest({ stationLocked: true, lockDuration: 2 });
    const officer = useGameStore.getState().players[0].officers[2];
    expect(officer.isLocked).toBe(true);
    expect(officer.lockDuration).toBe(2);
  });

  it('modifies fleet favor', () => {
    useGameStore.setState({ fleetFavor: 5 });
    runFumbleTest({ fleetFavorChange: -2 });
    expect(useGameStore.getState().fleetFavor).toBe(3);
  });

  it('applies stress to other officers', () => {
    runFumbleTest({ stressToOthers: 1 });
    const officers = useGameStore.getState().players[0].officers;
    expect(officers[0].currentStress).toBe(1); // Sensors
    expect(officers[1].currentStress).toBe(1); // Helm
    // Tactical had 6, half max (2) = 2. So it should be 2.
    expect(officers[2].currentStress).toBe(2);
    expect(officers[3].currentStress).toBe(1); // Engineering
  });

  it('steps down the skill die (Nerve Collapse)', () => {
    runFumbleTest({ skillDieStepDown: true });
    const officer = useGameStore.getState().players[0].officers[2];
    expect(officer.hasNerveCollapse).toBe(true);
    expect(officer.currentTier).toBe('rookie'); // Degraded from veteran
  });

  it('changes ship evasion', () => {
    runFumbleTest({ evasionChange: -1 });
    expect(useGameStore.getState().playerShips[0].evasionModifiers).toBe(-1);
  });

  it('removes CT from the player', () => {
    runFumbleTest({ ctLost: 2 }, (state) => {
      state.players[0].commandTokens = 5;
    });
    expect(useGameStore.getState().players[0].commandTokens).toBe(3);
  });

  it('causes random drift', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // For random drift facing
    runFumbleTest({ randomDrift: true });
    const ship = useGameStore.getState().playerShips[0];
    expect(ship.hasDrifted).toBe(true);
    // Initial position was 0,0, speed 2. Math.random()=0 means facing 0.
    // Hex drift will change its position.
    expect(ship.position.q !== 0 || ship.position.r !== 0).toBe(true);
  });

  it('inflicts hull damage directly', () => {
    runFumbleTest({ hullDamage: 3 });
    const ship = useGameStore.getState().playerShips[0];
    expect(ship.currentHull).toBe(7); // 10 - 3
  });

  it('disables armor', () => {
    runFumbleTest({ armorDisabled: true });
    expect(useGameStore.getState().playerShips[0].armorDisabled).toBe(true);
  });

  it('jams ordnance', () => {
    runFumbleTest({ ordnanceJammed: true });
    expect(useGameStore.getState().playerShips[0].ordnanceJammed).toBe(true);
  });

  it('locks out navigation', () => {
    runFumbleTest({ navLockout: true, navLockoutDuration: 2 });
    const ship = useGameStore.getState().playerShips[0];
    expect(ship.navLockout).toBe(true);
    expect(ship.navLockoutDuration).toBe(2);
  });

  it('causes a comms blackout', () => {
    runFumbleTest({ commsBlackout: true });
    const log = useGameStore.getState().log;
    const blackoutLog = log.find(l => l.message.includes('Comms Blackout'));
    expect(blackoutLog).toBeDefined();
  });

  it('strips the highest shield sector', () => {
    runFumbleTest({ shieldSectorStripped: true }, (state) => {
      state.playerShips[0].shields = { fore: 3, foreStarboard: 1, aftStarboard: 1, aft: 1, aftPort: 1, forePort: 1 };
    });
    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(0); // Best sector stripped
    expect(ship.shields.aft).toBe(1); // Others intact
  });

  it('boosts enemy evasion', () => {
    runFumbleTest({ enemyEvasionBoost: 1 });
    const enemy = useGameStore.getState().enemyShips[0];
    expect(enemy.evasionModifiers).toBe(1);
  });

  it('disables PDCs', () => {
    runFumbleTest({ pdcDisabled: true });
    expect(useGameStore.getState().playerShips[0].pdcDisabled).toBe(true);
  });

});
