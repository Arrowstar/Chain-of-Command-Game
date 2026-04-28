import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { FighterToken, PlayerState, ShipState } from '../types/game';

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
});
