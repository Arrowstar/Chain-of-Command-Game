import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import { HexFacing } from '../types/game';

describe('Phase Slip Logic', () => {
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
      enemyShips: [],
      fighterTokens: [],
      torpedoTokens: [],
      objectiveMarkers: [],
      log: [],
    });
  });

  it('should update ship position and evasion when Phase Slip resolves', () => {
    const targetHex = { q: 1, r: -1 };
    const { resolveAction } = useGameStore.getState();

    resolveAction('p1', 's1', 'a1', { targetHex });

    const state = useGameStore.getState();
    const ship = state.playerShips[0];

    expect(ship.position).toEqual(targetHex);
    expect(ship.evasionModifiers).toBe(1);
    
    const action = state.players[0].assignedActions[0];
    expect(action.resolved).toBe(true);
  });

  it('should stack evasion modifiers if used multiple times (if that were possible)', () => {
    const targetHex = { q: 1, r: -1 };
    const { resolveAction } = useGameStore.getState();

    // Force evasion to 1 first
    useGameStore.setState(s => {
        const ships = [...s.playerShips];
        ships[0].evasionModifiers = 1;
        return { playerShips: ships };
    });

    resolveAction('p1', 's1', 'a1', { targetHex });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.evasionModifiers).toBe(2);
  });
});
