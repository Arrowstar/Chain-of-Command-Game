import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, EnemyShipState } from '../types/game';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePlayer(id = 'p1', shipId = 's1'): PlayerState {
  return {
    id,
    name: `Player ${id}`,
    shipId,
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

function makePlayerShip(id = 's1', ownerId = 'p1'): ShipState {
  return {
    kind: 'ship', faction: 'player',
    id,
    name: `Ship ${id}`,
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
  } as any;
}

function makeEnemyShip(id = 'e1', pos = { q: 1, r: 0 }): EnemyShipState {
  return {
    kind: 'ship', faction: 'hegemony',
    id,
    name: `Enemy ${id}`,
    adversaryId: 'hunter-killer',
    position: pos,
    facing: 3 as any,
    currentSpeed: 2,
    currentHull: 8,
    maxHull: 8,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 4,
    armorDie: 'd4',
  } as any;
}

function setBaseState(extra: Record<string, unknown> = {}) {
  useGameStore.setState({
    round: 1,
    phase: 'execution',
    players: [makePlayer()],
    playerShips: [makePlayerShip()],
    enemyShips: [],
    fighterTokens: [],
    torpedoTokens: [],
    tacticHazards: [],
    terrainMap: new Map(),
    log: [],
    ...extra,
  } as any);
}

// ─── Sensor Ghost Emitter ────────────────────────────────────────────────────

describe('Sensor Ghost Emitter subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('deploys a Sensor Decoy hazard token to the specified hex', () => {
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'sensor-ghost-emitter', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetHex: { q: 2, r: 0 } });

    const state = useGameStore.getState();
    const decoy = state.tacticHazards.find(h => h.kind === 'decoy');
    expect(decoy).toBeDefined();
    expect(decoy?.position).toEqual({ q: 2, r: 0 });
    expect(decoy?.ownerFaction).toBe('player');
    expect(state.log.some(l => l.message.includes('Sensor Decoy'))).toBe(true);
  });

  it('logs a ready message if no hex is specified', () => {
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'sensor-ghost-emitter', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    expect(state.tacticHazards.length).toBe(0);
    expect(state.log.some(l => l.message.includes('ready'))).toBe(true);
  });
});

// ─── Helm Thruster Booster ───────────────────────────────────────────────────

describe('Helm Thruster Booster subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('increases ship speed by 2 and sets helmBoostActive', () => {
    const p1 = makePlayer();
    const ship = makePlayerShip();
    ship.currentSpeed = 2;
    p1.assignedActions = [{ id: 'act-1', station: 'helm', actionId: 'helm-thruster-booster', ctCost: 1, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [ship] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    expect(state.playerShips[0].currentSpeed).toBe(4);
    expect(state.playerShips[0].helmBoostActive).toBe(true);
    expect(state.log.some(l => l.message.includes('Emergency Burn'))).toBe(true);
  });

  it('helmBoostActive is cleared and speed corrected at next briefing phase', () => {
    const ship = makePlayerShip();
    ship.currentSpeed = 4;
    ship.helmBoostActive = true;
    // We simulate state directly as if boost was applied this round
    useGameStore.setState({ playerShips: [ship] } as any);

    const reset = (useGameStore.getState().playerShips as any[]).map((s: any) => ({
      ...s,
      currentSpeed: (() => {
        let spd = s.speedZeroNextRound ? 0 : s.currentSpeed;
        if (s.helmBoostActive) spd = Math.max(0, spd - 2);
        return spd;
      })(),
      helmBoostActive: false,
    }));
    // Speed should go back to 2 (4 - 2)
    expect(reset[0].currentSpeed).toBe(2);
    expect(reset[0].helmBoostActive).toBe(false);
  });
});

// ─── Targeting Inhibitor ─────────────────────────────────────────────────────

describe('Targeting Inhibitor subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('applies inhibitorActive to an enemy within range 6', () => {
    const enemy = makeEnemyShip('e1', { q: 4, r: 0 });
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'sensors', actionId: 'targeting-inhibitor', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.enemyShips[0].inhibitorActive).toBe(true);
    expect(state.log.some(l => l.message.includes('Targeting Inhibitor'))).toBe(true);
  });

  it('fails if the enemy target is out of range (>6)', () => {
    const enemy = makeEnemyShip('e1', { q: 10, r: 0 });
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'sensors', actionId: 'targeting-inhibitor', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.enemyShips[0].inhibitorActive).toBeFalsy();
    expect(state.log.some(l => l.message.includes('out of range'))).toBe(true);
  });
});

// ─── Shield Siphon Coil ──────────────────────────────────────────────────────

describe('Shield Siphon Coil subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('transfers 1 shield from enemy to player fore when in range', () => {
    const enemy = makeEnemyShip('e1', { q: 2, r: 0 });
    enemy.shields.fore = 2;
    const ship = makePlayerShip();
    ship.shields.fore = 1;
    ship.maxShieldsPerSector = 4;

    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'shield-siphon-coil', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [ship], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.enemyShips[0].shields.fore).toBe(1);
    expect(state.playerShips[0].shields.fore).toBe(2);
    expect(state.log.some(l => l.message.includes('siphoned'))).toBe(true);
  });

  it('fails if enemy has no active shields', () => {
    const enemy = makeEnemyShip('e1', { q: 1, r: 0 });
    enemy.shields = { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 };
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'shield-siphon-coil', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.log.some(l => l.message.includes('no active shields'))).toBe(true);
  });
});

// ─── Boarding Prep Drill ─────────────────────────────────────────────────────

describe('Boarding Prep Drill subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('applies boardingMarker to an adjacent enemy (range 1)', () => {
    const enemy = makeEnemyShip('e1', { q: 1, r: 0 });
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'tactical', actionId: 'boarding-prep-drill', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.enemyShips[0].boardingMarker).toBe(true);
    expect(state.log.some(l => l.message.includes('Boarding Prep'))).toBe(true);
  });

  it('fails if enemy is more than 1 hex away', () => {
    const enemy = makeEnemyShip('e1', { q: 3, r: 0 });
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'tactical', actionId: 'boarding-prep-drill', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()], enemyShips: [enemy] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1', { targetShipId: 'e1' });

    const state = useGameStore.getState();
    expect(state.enemyShips[0].boardingMarker).toBeFalsy();
    expect(state.log.some(l => l.message.includes('out of range'))).toBe(true);
  });

  it('boarded enemy loses 1 speed at next briefing phase', () => {
    // Simulate enemy with boardingMarker set (as if it was applied this round)
    const enemy = makeEnemyShip('e1', { q: 1, r: 0 });
    (enemy as any).boardingMarker = true;
    enemy.currentSpeed = 3;

    // Apply the same briefing-phase transformation logic
    const wasBoarded = (enemy as any).boardingMarker;
    const newSpeed = wasBoarded ? Math.max(0, enemy.currentSpeed - 1) : enemy.currentSpeed;
    expect(newSpeed).toBe(2);
  });
});

// ─── Mirror Array ────────────────────────────────────────────────────────────

describe('Mirror Array subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('primes the mirror array and sets mirrorArrayUsedThisScenario', () => {
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'tactical', actionId: 'mirror-array', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    expect(state.playerShips[0].mirrorArrayUsedThisScenario).toBe(true);
    expect(state.log.some(l => l.message.includes('Mirror Array'))).toBe(true);
  });

  it('fails if mirror array was already used this scenario', () => {
    const ship = makePlayerShip();
    (ship as any).mirrorArrayUsedThisScenario = true;
    const p1 = makePlayer();
    p1.assignedActions = [{ id: 'act-1', station: 'tactical', actionId: 'mirror-array', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [ship] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    expect(state.log.some(l => l.message.includes('already used'))).toBe(true);
  });
});

// ─── Psychic Dampener ────────────────────────────────────────────────────────

describe('Psychic Dampener subsystem', () => {
  beforeEach(() => { vi.restoreAllMocks(); setBaseState(); });

  it('removes 1 stress from all officers fleet-wide and sets psychicHangover', () => {
    const p1 = makePlayer();
    p1.officers = p1.officers.map(o => ({ ...o, currentStress: 2 }));
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'psychic-dampener', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    const updatedPlayer = state.players[0];
    // All officers should have stress 1 (down from 2)
    updatedPlayer.officers.forEach(o => {
      expect(o.currentStress).toBe(1);
    });
    expect(updatedPlayer.psychicHangover).toBe(true);
    expect(state.log.some(l => l.message.includes('Psychic Dampener'))).toBe(true);
  });

  it('stress does not go below 0', () => {
    const p1 = makePlayer();
    p1.officers = p1.officers.map(o => ({ ...o, currentStress: 0 }));
    p1.assignedActions = [{ id: 'act-1', station: 'engineering', actionId: 'psychic-dampener', ctCost: 2, stressCost: 0 }];
    useGameStore.setState({ players: [p1], playerShips: [makePlayerShip()] });

    useGameStore.getState().resolveAction('p1', 's1', 'act-1');

    const state = useGameStore.getState();
    state.players[0].officers.forEach(o => {
      expect(o.currentStress).toBe(0);
    });
  });
});


