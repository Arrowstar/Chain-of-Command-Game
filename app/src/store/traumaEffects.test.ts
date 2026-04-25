import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { executeAITier } from '../engine/ai/aiTurn';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';
import type { FumbleCard, PlayerState, QueuedAction } from '../types/game';

vi.mock('../engine/ai/aiTurn', () => ({
  executeAITier: vi.fn()
}));

describe('Trauma Effects', () => {
  beforeEach(() => {
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
      playerShips: [
        {
          id: 's1', name: 'Ship 1', chassisId: 'c1', ownerId: 'p1',
          position: { q: 0, r: 0 }, facing: 0 as any, currentSpeed: 2, currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 }, maxShieldsPerSector: 2,
          equippedWeapons: ['w1'], equippedSubsystems: [], criticalDamage: [], scars: [],
          armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
        }
      ],
      enemyShips: [
        {
          id: 'e1', name: 'Enemy 1', adversaryId: 'hunter-killer', position: { q: 5, r: 0 }, facing: 3 as any,
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
      roeOverridden: false,
      log: [],
      fleetFavor: 2,
    });
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('Gun-Shy increases primary weapon CT cost', () => {
    // Add gun-shy to tactical officer
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[2].traumas.push({ id: 'gun-shy', name: 'Gun-Shy', effect: '' });
      return { players: [p] };
    });

    useGameStore.getState().assignToken('p1', { id: 'act1', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 });
    const p1 = useGameStore.getState().players[0];
    
    // Base cost 1 + 1 (Gun-Shy) = 2
    expect(p1.commandTokens).toBe(3); // 5 - 2 = 3
  });

  it('Trigger-Happy decreases primary weapon Stress cost', () => {
    // Add trigger-happy to tactical officer
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[2].traumas.push({ id: 'trigger-happy', name: 'Trigger-Happy', effect: '' });
      return { players: [p] };
    });

    useGameStore.getState().assignToken('p1', { id: 'act1', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 });
    const p1 = useGameStore.getState().players[0];
    
    // Base cost 1 - 1 (Trigger-Happy) = 0 stress
    expect(p1.commandTokens).toBe(4); // 5 - 1 = 4
    expect(p1.assignedActions[0].stressCost).toBe(0); // wait, assigned action has the base cost stored, but we can check officer stress? 
    // Since assignToken only updates `assignedActions` and deducts CT, stress is applied when? Stress is applied later. Wait, stress is not applied on assign.
  });

  it('Analysis Paralysis changes Target Lock to provide rerolls instead of TN modifier', () => {
    // Add analysis-paralysis to sensors officer
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[0].traumas.push({ id: 'analysis-paralysis', name: 'Analysis Paralysis', effect: '' });
      const action: QueuedAction = { id: '1', station: 'sensors', actionId: 'target-lock', targetShipId: 'e1', ctCost: 1, stressCost: 1 };
      p.assignedActions.push(action);
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', '1');
    const enemy = useGameStore.getState().enemyShips[0];
    const modal = useUIStore.getState();
    
    // Should NOT have negative modifier
    expect(enemy.targetLocks).toEqual([]);
    // Should have 1 reroll
    expect(enemy.targetLocksRerolls).toBe(1);
    expect(enemy.targetLockArmorPiercingShots).toBeUndefined();
    expect(modal.activeModal).toBeNull();
    vi.restoreAllMocks();
  });

  it('Precision Maneuvering grants +3 evasion on success and refunds stress on a critical', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // veteran helm => 6 critical
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[1].currentStress = 2;
      p.assignedActions.push({ id: 'helm-1', station: 'helm', actionId: 'evasive-pattern', ctCost: 2, stressCost: 2 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'helm-1');

    const ship = useGameStore.getState().playerShips[0];
    const helmOfficer = useGameStore.getState().players[0].officers[1];
    const modal = useUIStore.getState();
    expect(ship.evasionModifiers).toBe(3);
    expect(helmOfficer.currentStress).toBe(0);
    expect(modal.activeModal).toBe('skill-proc');
    expect(modal.modalData?.data?.title).toBe('Precision Maneuvering');
    expect(modal.modalData?.data?.result?.isCritical).toBe(true);
    vi.restoreAllMocks();
  });

  it('Miracle Work repairs 2 hull on success and grants +1 CT on a critical', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // veteran engineering => 6 critical
    useGameStore.setState(state => {
      const p = state.players[0];
      p.commandTokens = 4;
      p.assignedActions.push({ id: 'eng-1', station: 'engineering', actionId: 'damage-control', targetShipId: 's1', ctCost: 2, stressCost: 2 });
      const ship = state.playerShips[0];
      ship.currentHull = 7;
      return { players: [p], playerShips: [ship] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng-1', { targetShipId: 's1' });

    const ship = useGameStore.getState().playerShips[0];
    const player = useGameStore.getState().players[0];
    const modal = useUIStore.getState();
    expect(ship.currentHull).toBe(9);
    expect(player.commandTokens).toBe(5);
    expect(modal.activeModal).toBe('skill-proc');
    expect(modal.modalData?.data?.title).toBe('Miracle Work');
    expect(modal.modalData?.data?.result?.isCritical).toBe(true);
    vi.restoreAllMocks();
  });

  it('Reroute Power grants a one-time CT bonus during the next round briefing instead of granting it immediately', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.commandTokens = 4;
      p.pendingCommandTokenBonus = 0;
      p.briefingCommandTokenBonus = 0;
      p.assignedActions.push({ id: 'eng-reroute', station: 'engineering', actionId: 'reroute-power', ctCost: 1, stressCost: 3 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng-reroute');

    let player = useGameStore.getState().players[0];
    expect(player.commandTokens).toBe(4);
    expect(player.pendingCommandTokenBonus).toBe(2);

    useGameStore.setState({ round: 1, activeRoE: null, combatModifiers: null });
    useGameStore.getState().executeBriefingPhase();

    player = useGameStore.getState().players[0];
    expect(player.commandTokens).toBe(7);
    expect(player.pendingCommandTokenBonus).toBe(0);
    expect(player.briefingCommandTokenBonus).toBe(2);
  });

  it('Target Painting upgrades Eagle Eye locks to -3 TN and adds one armor-piercing volley on a critical', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // veteran sensors => 6 critical
    useGameStore.setState(state => {
      const p = state.players[0];
      p.assignedActions.push({ id: 'sens-1', station: 'sensors', actionId: 'target-lock', targetShipId: 'e1', ctCost: 1, stressCost: 0 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'sens-1');

    const enemy = useGameStore.getState().enemyShips[0];
    const modal = useUIStore.getState();
    expect(enemy.targetLocks).toEqual([-3]);
    expect(enemy.targetLockArmorPiercingShots).toBe(1);
    expect(modal.activeModal).toBe('skill-proc');
    expect(modal.modalData?.data?.title).toBe('Target Painting');
    expect(modal.modalData?.data?.result?.isCritical).toBe(true);
    expect(modal.modalData?.data?.standardEffect).toBe('Target Lock improves from -2 TN to -3 TN for the rest of the round due to Eagle Eye.');
    vi.restoreAllMocks();
  });

  it('Eagle Eye keeps Target Lock at -2 TN even when Target Painting fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    useGameStore.setState(state => {
      const p = state.players[0];
      p.assignedActions.push({ id: 'sens-fail', station: 'sensors', actionId: 'target-lock', targetShipId: 'e1', ctCost: 1, stressCost: 0 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'sens-fail');

    const enemy = useGameStore.getState().enemyShips[0];
    const modal = useUIStore.getState();
    expect(enemy.targetLocks).toEqual([-2]);
    expect(modal.activeModal).toBe('skill-proc');
    expect(modal.modalData?.data?.result?.isSuccess).toBe(false);
    expect(modal.modalData?.data?.failureEffect).toBe('Base action resolves at -2 TN.');
    expect(modal.modalData?.data?.standardEffect).toBe('Target Lock improves from -2 TN to -3 TN for the rest of the round due to Eagle Eye.');
    vi.restoreAllMocks();
  });

  it('Comms-Phobic prevents cyber-warfare action', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[0].traumas.push({ id: 'comms-phobic', name: 'Comms-Phobic', effect: '' });
      return { players: [p] };
    });

    useGameStore.getState().assignToken('p1', { id: 'act1', station: 'sensors', actionId: 'cyber-warfare', ctCost: 1, stressCost: 1 });
    const p1 = useGameStore.getState().players[0];
    
    // CT should not be deducted, action should not be assigned
    expect(p1.commandTokens).toBe(5);
    expect(p1.assignedActions.length).toBe(0);
  });

  it('Xel reduces Cyber-Warfare to 1 CT from its base 2 CT cost', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[0].officerId = 'xel';
      return { players: [p] };
    });

    useGameStore.getState().assignToken('p1', { id: 'act1', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
    const p1 = useGameStore.getState().players[0];

    expect(p1.commandTokens).toBe(4);
    expect(p1.assignedActions).toHaveLength(1);
    expect(p1.assignedActions[0].ctCost).toBe(1);
  });

  it('Cyber-Warfare does not resolve against ships or arcs with no active shields', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.assignedActions.push({ id: 'act-cw', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
      const enemy = state.enemyShips[0];
      enemy.shields.fore = 0;
      return { players: [p], enemyShips: [enemy], phase: 'execution' };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'act-cw', { targetShipId: 'e1', sector: 'fore' });

    const enemy = useGameStore.getState().enemyShips[0];
    const lastLog = useGameStore.getState().log.at(-1);

    expect(enemy.shields.fore).toBe(0);
    expect(lastLog?.message).toContain('has no active FORE shields');
  });

  it('Claustrophobic gives +2 stress when ship ends Execution adjacent to hazardous terrain', () => {
    // Place the player ship adjacent to asteroids and give the engineering officer the trauma
    useGameStore.setState(state => {
      const p = state.players[0];
      // Give helm officer the trauma (any officer works)
      p.officers[1].traumas.push({ id: 'claustrophobic', name: 'Claustrophobic', effect: '' });
      // Put player ship adjacent to an asteroid hex
      const ship = state.playerShips[0];
      ship.position = { q: 0, r: 0 };
      // Add an asteroid hex at q=1, r=0 (adjacent)
      const terrainMap = new Map<string, any>(state.terrainMap);
      terrainMap.set('1,0', 'asteroids');
      return { players: [p], playerShips: [ship], terrainMap };
    });

    useGameStore.getState().executeCleanupPhase();
    vi.runAllTimers();
    const p1 = useGameStore.getState().players[0];

    // Helm officer (index 1) should have gained +2 Stress
    expect(p1.officers[1].currentStress).toBe(2);
  });

  it('Steady Nerves reduces stress on the selected officer during execution', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[0].currentStress = 2;
      p.assignedActions.push({ id: 'eng-steady', station: 'engineering', actionId: 'steady-nerves', ctCost: 1, stressCost: 1 });
      return { players: [p], phase: 'execution' };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng-steady', { targetOfficerId: 'vance' });

    const player = useGameStore.getState().players[0];
    expect(player.officers[0].currentStress).toBe(1);
    expect(player.assignedActions[0].resolved).toBe(true);
  });

  it('Medical Bay reduces the highest-stress non-engineering officer by 2', () => {
    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[0].currentStress = 2;
      p.officers[1].currentStress = 4;
      p.assignedActions.push({ id: 'med-1', station: 'engineering', actionId: 'medical-bay', ctCost: 2, stressCost: 1 });
      const ship = state.playerShips[0];
      ship.equippedSubsystems = ['medical-bay'];
      return { players: [p], playerShips: [ship], phase: 'execution' };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'med-1');

    const player = useGameStore.getState().players[0];
    expect(player.officers[1].currentStress).toBe(2);
    expect(player.officers[0].currentStress).toBe(2);
  });

  it('Officer fumbles reset the fumbler stress to half max, rounded down', () => {
    const testFumble: FumbleCard = {
      id: 'test-fumble',
      name: 'Test Fumble',
      category: 'tactical',
      flavorText: 'Test only.',
      effect: 'Simple station lock.',
      mechanicalEffect: {
        actionCanceled: false,
        ctRefunded: false,
        stationLocked: true,
        lockDuration: 1,
      },
    };

    useGameStore.setState(state => {
      const p = state.players[0];
      p.officers[2].currentStress = 6;
      return {
        players: [p],
        fumbleDeck: [testFumble],
      };
    });

    useGameStore.getState().evaluateCommandPhaseFumbles();

    const tacticalOfficer = useGameStore.getState().players[0].officers[2];
    expect(tacticalOfficer.currentStress).toBe(2);
    expect(tacticalOfficer.hasFumbledThisRound).toBe(true);
    expect(tacticalOfficer.isLocked).toBe(true);
  });

});
