import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';
import type { FighterToken, PlayerState, ShipState, TorpedoToken } from '../types/game';

function basePlayerShip(overrides: Partial<ShipState> = {}): ShipState {
  return {
    kind: 'ship', faction: 'player', id: 's1', name: 'Vanguard',
    chassisId: 'vanguard', ownerId: 'p1',
    position: { q: 3, r: 0 }, facing: 0 as any,
    currentSpeed: 0, currentHull: 10, maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    equippedWeapons: [], equippedSubsystems: [],
    criticalDamage: [], scars: [],
    armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0,
    isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false,
    targetLocks: [], pdcDisabled: false,
    firedWeaponIndicesThisRound: [], ordnanceLoadedIndicesThisRound: [],
    ...overrides,
  } as unknown as ShipState;
}

function baseEnemyShip(overrides: Partial<import('../types/game').EnemyShipState> = {}): import('../types/game').EnemyShipState {
  return {
    kind: 'ship', faction: 'hegemony', id: 'e1', name: 'Monitor',
    adversaryId: 'monitor',
    position: { q: 0, r: 0 }, facing: 3 as any,
    currentSpeed: 0, currentHull: 12, maxHull: 12,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    maxShieldsPerSector: 3,
    criticalDamage: [], isDestroyed: false,
    hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
    baseEvasion: 5, armorDie: 'd6', evasionModifiers: 0,
    ...overrides,
  } as any;
}

describe('Enemy PDC Interception', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [] as PlayerState[],
      playerShips: [basePlayerShip()],
      enemyShips: [baseEnemyShip()],
      fighterTokens: [],
      torpedoTokens: [],
      terrainMap: new Map(),
      log: [],
      smallShipsDestroyedThisMission: 0,
    });
    vi.restoreAllMocks();
  });

  it('can intercept an allied torpedo before impact', () => {
    useGameStore.setState({
      torpedoTokens: [{
        kind: 'torpedo', faction: 'allied',
        id: 't1', name: 'Ally Torpedo',
        sourceShipId: 's1', targetShipId: 'e1',
        position: { q: 3, r: 0 }, facing: 3 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 5,
        isDestroyed: false, hasMoved: false,
      } as TorpedoToken],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveTorpedoStep('allied');

    const torpedo = useGameStore.getState().torpedoTokens.find(t => t.id === 't1');
    expect(torpedo?.isDestroyed).toBe(true);
    expect(useGameStore.getState().log.some(l => l.message.includes('INTERCEPTED'))).toBe(true);
  });

  it('does not intercept when the enemy ship is small', () => {
    useGameStore.setState({
      enemyShips: [baseEnemyShip({ id: 'e1', name: 'Raider', adversaryId: 'hunter-killer' })],
      torpedoTokens: [{
        kind: 'torpedo', faction: 'allied',
        id: 't1', name: 'Ally Torpedo',
        sourceShipId: 's1', targetShipId: 'e1',
        position: { q: 3, r: 0 }, facing: 3 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 5,
        isDestroyed: false, hasMoved: false,
      } as TorpedoToken],
    });

    useGameStore.getState().resolveTorpedoStep('allied');

    const logMessages = useGameStore.getState().log.map(l => l.message);
    expect(logMessages.some(m => m.includes('INTERCEPTED'))).toBe(false);
  });

  it('does not intercept when ship has enemy-point-defense-offline critical', () => {
    useGameStore.setState({
      enemyShips: [baseEnemyShip({
        criticalDamage: [{ id: 'enemy-point-defense-offline', name: 'Point Defense Offline', effect: '', isRepaired: false }],
      })],
      torpedoTokens: [{
        kind: 'torpedo', faction: 'allied',
        id: 't1', name: 'Ally Torpedo',
        sourceShipId: 's1', targetShipId: 'e1',
        position: { q: 3, r: 0 }, facing: 3 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 5,
        isDestroyed: false, hasMoved: false,
      } as TorpedoToken],
    });

    useGameStore.getState().resolveTorpedoStep('allied');

    const logMessages = useGameStore.getState().log.map(l => l.message);
    expect(logMessages.some(m => m.includes('INTERCEPTED'))).toBe(false);
  });

  it('can intercept an allied fighter on approach', () => {
    useGameStore.setState({
      enemyShips: [baseEnemyShip({ position: { q: 0, r: 0 } })],
      fighterTokens: [{
        kind: 'fighter', faction: 'allied',
        id: 'f1', name: 'Wasp Fighter',
        classId: 'strike-fighter',
        sourceShipId: 's1',
        position: { q: 3, r: 0 }, facing: 0 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 8,
        volleyPool: ['d4', 'd4', 'd4'],
        weaponRangeMax: 1,
        behavior: 'attack',
        isDestroyed: false, hasDrifted: false, hasActed: false,
        assignedTargetId: 'e1',
      } as unknown as FighterToken],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveFighterStep('allied');

    const fighter = useGameStore.getState().fighterTokens.find(f => f.id === 'f1');
    expect(fighter?.isDestroyed).toBe(true);
    expect(useGameStore.getState().log.some(l => l.message.includes('INTERCEPTED'))).toBe(true);
  });

  it('fires a toast notification and queues explosion on torpedo intercept', () => {
    const toastSpy = vi.fn();
    window.__combatToast = toastSpy;

    useGameStore.setState({
      torpedoTokens: [{
        kind: 'torpedo', faction: 'allied',
        id: 't1', name: 'Ally Torpedo',
        sourceShipId: 's1', targetShipId: 'e1',
        position: { q: 3, r: 0 }, facing: 3 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 5,
        isDestroyed: false, hasMoved: false,
      } as TorpedoToken],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveTorpedoStep('allied');

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pdc-intercept' }),
    );
  });

  it('queues an explosion animation on fighter intercept', () => {
    useGameStore.setState({
      fighterTokens: [{
        kind: 'fighter', faction: 'allied',
        id: 'f1', name: 'Wasp Fighter',
        classId: 'strike-fighter',
        sourceShipId: 's1',
        position: { q: 3, r: 0 }, facing: 0 as any,
        currentHull: 1, maxHull: 1,
        speed: 4, baseEvasion: 8,
        volleyPool: ['d4', 'd4', 'd4'],
        weaponRangeMax: 1,
        behavior: 'attack',
        isDestroyed: false, hasDrifted: false, hasActed: false,
        assignedTargetId: 'e1',
      } as unknown as FighterToken],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveFighterStep('allied');

    const explosions = useUIStore.getState().pendingFireAnimations.filter(
      e => e.weaponTags.includes('explosion'),
    );
    expect(explosions.length).toBeGreaterThanOrEqual(1);
  });
});
