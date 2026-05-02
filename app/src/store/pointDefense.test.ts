import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { FighterToken, PlayerState, ShipState, TorpedoToken } from '../types/game';

describe('Point Defense vs Fighters', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [] as PlayerState[],
      playerShips: [
        {
          id: 's1',
          name: 'Bulwark',
          chassisId: 'vanguard',
          ownerId: 'p1',
          position: { q: 0, r: 0 },
          facing: 0 as any,
          currentSpeed: 0,
          currentHull: 10,
          maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
          maxShieldsPerSector: 2,
          equippedWeapons: ['pdc'],
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
          pdcDisabled: false,
          firedWeaponIndicesThisRound: [],
          ordnanceLoadedIndicesThisRound: [],
        } as ShipState,
      ],
      enemyShips: [],
      fighterTokens: [
        {
          id: 'f1',
          name: 'Strike Fighter',
          classId: 'strike-fighter',
          allegiance: 'enemy',
          sourceShipId: 'carrier-1',
          position: { q: 3, r: 0 },
          facing: 0 as any,
          currentHull: 1,
          maxHull: 1,
          speed: 4,
          baseEvasion: 8,
          volleyPool: ['d4', 'd4', 'd4'],
          weaponRangeMax: 1,
          behavior: 'attack',
          isDestroyed: false,
          hasDrifted: false,
          hasActed: false,
          assignedTargetId: null,
        } as FighterToken,
      ],
      torpedoTokens: [],
      terrainMap: new Map(),
      log: [],
      smallShipsDestroyedThisMission: 0,
    });
    vi.restoreAllMocks();
  });

  it('can intercept an enemy fighter on an approach hex before adjacency', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveFighterStep('enemy');
    const fighter = useGameStore.getState().fighterTokens.find(f => f.id === 'f1');
    expect(fighter?.isDestroyed).toBe(true);
    expect(fighter?.position).toEqual({ q: 2, r: 0 });
  });

  it('can destroy an incoming seeker torpedo before impact', () => {
    useGameStore.setState({
      fighterTokens: [],
      enemyShips: [
        {
          id: 'e1',
          name: 'Enemy Launcher',
          adversaryId: 'hunter-killer',
          position: { q: 4, r: 0 },
          facing: 3 as any,
          currentSpeed: 0,
          currentHull: 10,
          maxHull: 10,
          shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 0,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
          baseEvasion: 5,
          armorDie: 'd6',
        } as any,
      ],
      torpedoTokens: [
        {
          id: 't1',
          name: 'Seeker Torpedo',
          allegiance: 'enemy',
          sourceShipId: 'e1',
          targetShipId: 's1',
          position: { q: 4, r: 0 },
          facing: 3 as any,
          currentHull: 1,
          maxHull: 1,
          speed: 4,
          baseEvasion: 5,
          isDestroyed: false,
          hasMoved: false,
        } as TorpedoToken,
      ],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    useGameStore.getState().resolveTorpedoStep('enemy');

    const torpedo = useGameStore.getState().torpedoTokens.find(t => t.id === 't1');
    expect(torpedo?.isDestroyed).toBe(true);
    expect(useGameStore.getState().playerShips[0].currentHull).toBe(10);
    expect(useGameStore.getState().log.some(l => l.message.includes('destroyed by point defense before impact'))).toBe(true);
  });
});
