import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';
import type { PlayerState, QueuedAction } from '../types/game';

vi.mock('../engine/ai/aiTurn', () => ({
  executeAITier: vi.fn()
}));

/**
 * Unit tests for the three new "built-in skill proc" abilities:
 *   • Snap Maneuver  — Helm Rotate action
 *   • Overcharge Conduit — Engineering Reinforce Shields action
 *   • Deep Intrusion — Sensors Cyber-Warfare action
 *
 * Each test uses vi.spyOn(Math, 'random') to force deterministic die rolls:
 *   - 0.99 → maximum die face (veteran d8 = 8 → critical)
 *   - 0    → minimum die face (1 → failure on any die)
 */
describe('Skill Proc Expansion — Snap Maneuver, Overcharge Conduit, Deep Intrusion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.getState().resetUI();
    useGameStore.setState({
      round: 1,
      phase: 'execution',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 5,
          maxCommandTokens: 5,
          assignedActions: [],
          officers: [
            // index 0 — sensors (Vance is Eagle Eye, so use generic officer here)
            { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            // index 1 — helm
            { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            // index 2 — tactical
            { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            // index 3 — engineering (O'Bannon has Miracle Worker trait; use generic for Overcharge Conduit)
            { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          ]
        } as PlayerState
      ],
      playerShips: [{
        kind: 'ship', faction: 'player',
        id: 's1', name: 'Ship 1', chassisId: 'vanguard', ownerId: 'p1',
        position: { q: 0, r: 0 }, facing: 0 as import('../types/game').HexFacing,
        currentSpeed: 2, currentHull: 10, maxHull: 10,
        shields: { fore: 1, foreStarboard: 1, aftStarboard: 1, aft: 1, aftPort: 1, forePort: 1 },
        maxShieldsPerSector: 3,
        equippedWeapons: [], equippedSubsystems: [],
        criticalDamage: [], scars: [],
        armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, evasiveManeuvers: 0,
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
      }],
      enemyShips: [{
        kind: 'ship', faction: 'hegemony',
        id: 'e1', name: 'Enemy 1', adversaryId: 'hunter-killer',
        position: { q: 5, r: 0 }, facing: 3 as import('../types/game').HexFacing,
        currentSpeed: 2, currentHull: 10, maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2,
        criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false,
        hasDrifted: false, targetLocks: [], baseEvasion: 5, armorDie: 'd6',
      }],
      stations: [],
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
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────
  //  SNAP MANEUVER (Helm — Rotate)
  // ─────────────────────────────────────────────────────────────────

  it('Snap Maneuver FAIL: ship rotates only 60° (one face) when proc fails', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1 on any die → failure

    useGameStore.setState(s => {
      const p = s.players[0];
      const action: QueuedAction = { id: 'h1', station: 'helm', actionId: 'rotate', ctCost: 1, stressCost: 1 };
      p.assignedActions.push(action);
      return { players: [p] };
    });

    const initialFacing = useGameStore.getState().playerShips[0].facing;
    useGameStore.getState().resolveAction('p1', 's1', 'h1', { direction: 'clockwise' });

    const ship = useGameStore.getState().playerShips[0];
    // One clockwise rotation = facing + 1 (mod 6)
    const expected = ((initialFacing as number) + 1) % 6;
    expect(ship.facing).toBe(expected);
    expect(ship.evasiveManeuvers).toBeFalsy(); // no evasion bonus

    const modal = useUIStore.getState();
    expect(modal.activeModal).toBe('skill-proc');
    expect((modal.modalData as any)?.data?.title).toBe('Snap Maneuver');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(false);
  });

  it('Snap Maneuver SUCCESS: ship rotates 120° (two faces) clockwise when proc succeeds and is accepted', () => {
    // Veteran helm = d8; roll 5 ≥ 4 = success but not max face → isSuccess true, isCritical false
    vi.spyOn(Math, 'random').mockReturnValue(4 / 8); // (4/8)*8+1 = 5 → success on d8

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'h2', station: 'helm', actionId: 'rotate', ctCost: 1, stressCost: 1 });
      return { players: [p] };
    });

    const initialFacing = useGameStore.getState().playerShips[0].facing as number;
    useGameStore.getState().resolveAction('p1', 's1', 'h2', { direction: 'clockwise' });

    const ship = useGameStore.getState().playerShips[0];
    // First rotation happens immediately
    expect(ship.facing).toBe((initialFacing + 1) % 6);
    expect(ship.evasiveManeuvers ?? 0).toBe(0); // success only — no evasion bonus

    const modal = useUIStore.getState();
    expect(modal.activeModal).toBe('skill-proc');
    expect((modal.modalData as any)?.data?.title).toBe('Snap Maneuver');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(true);
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(false);

    // Now execute the optional action
    const optionalAction = (modal.modalData as any)?.data?.optionalAction;
    expect(optionalAction).toBeDefined();
    optionalAction.onAccept();

    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.facing).toBe((initialFacing + 2) % 6);
  });

  it('Snap Maneuver CRITICAL: ship rotates 120° AND gains +1 Evasion TN when proc succeeds and is accepted', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // veteran helm d8 → 8 = critical

    useGameStore.setState(s => {
      const p = s.players[0];
      p.officers[1].currentTier = 'veteran';
      p.assignedActions.push({ id: 'h3', station: 'helm', actionId: 'rotate', ctCost: 1, stressCost: 1 });
      return { players: [p] };
    });

    const initialFacing = useGameStore.getState().playerShips[0].facing as number;
    useGameStore.getState().resolveAction('p1', 's1', 'h3', { direction: 'counterclockwise' });

    const ship = useGameStore.getState().playerShips[0];
    // Initial rotation only
    expect(ship.facing).toBe(((initialFacing - 1) % 6 + 6) % 6);
    expect(ship.evasiveManeuvers).toBe(1); // +1 from critical

    const modal = useUIStore.getState();
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(true);
    expect((modal.modalData as any)?.data?.title).toBe('Snap Maneuver');

    // Execute optional action
    const optionalAction = (modal.modalData as any)?.data?.optionalAction;
    expect(optionalAction).toBeDefined();
    optionalAction.onAccept();

    const updatedShip = useGameStore.getState().playerShips[0];
    expect(updatedShip.facing).toBe(((initialFacing - 2) % 6 + 6) % 6);
  });

  // ─────────────────────────────────────────────────────────────────
  //  OVERCHARGE CONDUIT (Engineering — Reinforce Shields)
  // ─────────────────────────────────────────────────────────────────

  it('Overcharge Conduit FAIL: restores 2 shield points on proc failure', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1 → failure

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'eng1', station: 'engineering', actionId: 'reinforce-shields', ctCost: 1, stressCost: 1 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng1', { sector: 'fore' });

    const ship = useGameStore.getState().playerShips[0];
    // fore started at 1, max is 3; failure → +2 = 3 (capped)
    expect(ship.shields.fore).toBe(3);

    const modal = useUIStore.getState();
    expect(modal.activeModal).toBe('skill-proc');
    expect((modal.modalData as any)?.data?.title).toBe('Overcharge Conduit');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(false);
  });

  it('Overcharge Conduit SUCCESS: restores 3 shield points on proc success', () => {
    vi.spyOn(Math, 'random').mockReturnValue(4 / 8); // d8 roll = 5 → success

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'eng2', station: 'engineering', actionId: 'reinforce-shields', ctCost: 1, stressCost: 1 });
      // Start fore at 0 so we can see the full 3-point restore
      const ship = s.playerShips[0];
      ship.shields = { ...ship.shields, fore: 0 };
      return { players: [p], playerShips: [ship] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng2', { sector: 'fore' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(3); // 0 + 3 = 3 (at max)

    const modal = useUIStore.getState();
    expect(modal.activeModal).toBe('skill-proc');
    expect((modal.modalData as any)?.data?.title).toBe('Overcharge Conduit');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(true);
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(false);
  });

  it('Overcharge Conduit CRITICAL: restores 3 shields AND clears shield-generator-offline critical', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // d8 → 8 = critical

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'eng3', station: 'engineering', actionId: 'reinforce-shields', ctCost: 1, stressCost: 1 });
      const ship = s.playerShips[0];
      ship.shields = { ...ship.shields, fore: 0 };
      ship.criticalDamage = [
        { id: 'shield-generator-offline', name: 'Shield Generator Offline', effect: 'No regen.', isRepaired: false },
        { id: 'coolant-leak', name: 'Coolant Leak', effect: 'Stress penalty.', isRepaired: false },
      ];
      return { players: [p], playerShips: [ship] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng3', { sector: 'fore' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(3);
    // shield-generator-offline should be removed, coolant-leak should remain
    expect(ship.criticalDamage).toHaveLength(1);
    expect(ship.criticalDamage[0].id).toBe('coolant-leak');

    const modal = useUIStore.getState();
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(true);
    expect((modal.modalData as any)?.data?.title).toBe('Overcharge Conduit');

    const repairLog = useGameStore.getState().log.find(l => l.message.includes('surge cleared'));
    expect(repairLog).toBeDefined();
  });

  it('Overcharge Conduit CRITICAL: still restores 3 shields when no eligible critical exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // d8 → 8 = critical

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'eng4', station: 'engineering', actionId: 'reinforce-shields', ctCost: 1, stressCost: 1 });
      const ship = s.playerShips[0];
      ship.shields = { ...ship.shields, aft: 0 };
      ship.criticalDamage = []; // no crits at all
      return { players: [p], playerShips: [ship] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'eng4', { sector: 'aft' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.aft).toBe(3);
    expect(ship.criticalDamage).toHaveLength(0);

    // Should log that no eligible critical was found
    const noEligibleLog = useGameStore.getState().log.find(l => l.message.includes('no eligible critical'));
    expect(noEligibleLog).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────────
  //  DEEP INTRUSION (Sensors — Cyber-Warfare)
  // ─────────────────────────────────────────────────────────────────

  it('Deep Intrusion FAIL: strips shield sector only; no Jamming applied', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // roll = 1 → failure

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'cw1', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'cw1', { targetShipId: 'e1', sector: 'fore' });

    const enemy = useGameStore.getState().enemyShips[0];
    expect(enemy.shields.fore).toBe(0);   // sector stripped
    expect(enemy.isJammed).toBeFalsy();    // NOT jammed — proc failed
    expect(enemy.speedZeroNextRound).toBeFalsy();

    const modal = useUIStore.getState();
    expect(modal.activeModal).toBe('skill-proc');
    expect((modal.modalData as any)?.data?.title).toBe('Deep Intrusion');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(false);
  });

  it('Deep Intrusion SUCCESS: strips shield AND Jams the target (+2 TN)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(4 / 8); // d8 = 5 → success but not critical

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'cw2', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'cw2', { targetShipId: 'e1', sector: 'fore' });

    const enemy = useGameStore.getState().enemyShips[0];
    expect(enemy.shields.fore).toBe(0);  // sector stripped
    expect(enemy.isJammed).toBe(true);   // Jammed applied
    expect(enemy.speedZeroNextRound).toBeFalsy(); // no speed reduction on plain success

    const modal = useUIStore.getState();
    expect((modal.modalData as any)?.data?.title).toBe('Deep Intrusion');
    expect((modal.modalData as any)?.data?.result?.isSuccess).toBe(true);
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(false);
  });

  it('Deep Intrusion CRITICAL: strips shield, Jams the target, AND reduces Speed to 0 next round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // d8 → 8 = critical

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'cw3', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'cw3', { targetShipId: 'e1', sector: 'aft' });

    const enemy = useGameStore.getState().enemyShips[0];
    expect(enemy.shields.aft).toBe(0);           // sector stripped
    expect(enemy.isJammed).toBe(true);            // Jammed
    expect(enemy.speedZeroNextRound).toBe(true);  // Speed → 0 next round

    const modal = useUIStore.getState();
    expect((modal.modalData as any)?.data?.result?.isCritical).toBe(true);
    expect((modal.modalData as any)?.data?.title).toBe('Deep Intrusion');

    const navHackLog = useGameStore.getState().log.find(l => l.message.includes('nav-core'));
    expect(navHackLog).toBeDefined();
  });

  it('Deep Intrusion does not apply Jammed/Speed reduction on a failed proc', () => {
    // Extra coverage: ensure isJammed stays false even if prior state has it
    vi.spyOn(Math, 'random').mockReturnValue(0); // failure

    useGameStore.setState(s => {
      const p = s.players[0];
      p.assignedActions.push({ id: 'cw4', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2 });
      return { players: [p] };
    });

    useGameStore.getState().resolveAction('p1', 's1', 'cw4', { targetShipId: 'e1', sector: 'foreStarboard' });

    const enemy = useGameStore.getState().enemyShips[0];
    expect(enemy.shields.foreStarboard).toBe(0);
    expect(enemy.isJammed).toBeFalsy();
    expect(enemy.speedZeroNextRound).toBeFalsy();
  });
});
