import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { HexFacing } from '../types/game';

describe('Phase Slip E2E', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          officers: [],
          commandTokens: 10,
          maxCommandTokens: 10,
          assignedActions: [
            {
              id: 'a1',
              station: 'helm',
              actionId: 'alien-phase-vanes',
              ctCost: 1,
              stressCost: 1,
              resolved: false,
            },
          ],
        },
      ],
      playerShips: [
        {
          id: 's1',
          name: 'Test Ship',
          chassisId: 'vanguard',
          ownerId: 'p1',
          position: { q: 0, r: 0 },
          facing: HexFacing.Fore,
          currentSpeed: 0,
          currentHull: 10,
          maxHull: 10,
          shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 0,
          equippedWeapons: [],
          equippedSubsystems: ['alien-phase-vanes'],
          criticalDamage: [],
          scars: [],
          armorDie: 'd4',
          baseEvasion: 5,
          evasionModifiers: 0,
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
        },
      ],
      enemyShips: [
          {
            id: 'e1',
            name: 'Enemy Ship',
            adversaryId: 'adversary1',
            position: { q: 2, r: 0 },
            facing: HexFacing.Aft,
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
            armorDie: 'd4',
          }
      ],
      fighterTokens: [],
      torpedoTokens: [],
      objectiveMarkers: [],
      log: [],
    });
  });

  it('should complete a full Phase Slip resolution cycle', () => {
    const { resolveAction } = useGameStore.getState();
    const targetHex = { q: 1, r: 0 };

    // 1. Resolve the action
    resolveAction('p1', 's1', 'a1', { targetHex });

    // 2. Check final state
    const state = useGameStore.getState();
    const ship = state.playerShips[0];
    
    expect(ship.position).toEqual(targetHex);
    expect(ship.evasionModifiers).toBe(1);
    expect(state.players[0].assignedActions[0].resolved).toBe(true);

    // 3. Verify logs
    const lastLog = state.log[state.log.length - 1];
    expect(lastLog.message).toContain('phased to (1,0)');
    expect(lastLog.message).toContain('Evasion increased');
  });

  it('should handle resolveAction even if no targetHex is provided (graceful fail)', () => {
    const { resolveAction } = useGameStore.getState();

    // Resolve without targetHex
    resolveAction('p1', 's1', 'a1', {});

    const state = useGameStore.getState();
    const ship = state.playerShips[0];
    
    expect(ship.position).toEqual({ q: 0, r: 0 }); // No move
    expect(ship.evasionModifiers).toBe(0); // No boost
    expect(state.players[0].assignedActions[0].resolved).toBe(true); // Still marks as resolved to prevent infinite loops/blockage
  });
});
