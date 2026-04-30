import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { FighterToken } from '../types/game';

describe('resolveAction - Vector Orders Logic', () => {
  beforeEach(() => {
    useGameStore.setState({
      phase: 'execution',
      players: [{
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        commandTokens: 3,
        officers: [
          { officerId: 'vance', station: 'tactical', currentStress: 0, currentTier: 'veteran' } as any,
        ],
        assignedActions: [
          { id: 'a1', station: 'tactical', actionId: 'vector-orders', resolved: false } as any,
        ],
      }],
      playerShips: [{
        id: 's1',
        name: 'Resolute',
        ownerId: 'p1',
      } as any],
      fighterTokens: [
        {
          id: 'f1',
          name: 'Strike 1',
          allegiance: 'allied',
          sourceShipId: 's1',
          behavior: 'escort',
          assignedTargetId: 's1',
          isDestroyed: false,
        } as FighterToken,
        {
          id: 'f2',
          name: 'Strike 2',
          allegiance: 'allied',
          sourceShipId: 's1',
          behavior: 'attack',
          assignedTargetId: 'e1',
          isDestroyed: false,
        } as FighterToken,
      ],
      log: [],
    } as any);
  });

  it('assigns specific fighter to a new target and behavior', () => {
    const { resolveAction } = useGameStore.getState();
    resolveAction('p1', 's1', 'a1', { fighterId: 'f1', targetShipId: 'e2', behavior: 'hit_and_run' });

    const tokens = useGameStore.getState().fighterTokens;
    const f1 = tokens.find(f => f.id === 'f1')!;
    const f2 = tokens.find(f => f.id === 'f2')!;

    // Verify f1 was updated
    expect(f1.assignedTargetId).toBe('e2');
    expect(f1.behavior).toBe('hit_and_run');

    // Verify f2 was NOT updated
    expect(f2.assignedTargetId).toBe('e1');
    expect(f2.behavior).toBe('attack');

    const logs = useGameStore.getState().log;
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('Vector Orders from Resolute');
    
    const player = useGameStore.getState().players[0];
    expect(player.assignedActions[0].resolved).toBe(true);
  });

  it('fails gracefully if fighterId or behavior is missing', () => {
    const { resolveAction } = useGameStore.getState();
    resolveAction('p1', 's1', 'a1', { targetShipId: 'e2' });

    const logs = useGameStore.getState().log;
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('awaiting target designation');
    
    const player = useGameStore.getState().players[0];
    // Action should not be resolved
    expect(player.assignedActions[0].resolved).toBe(false);
  });
});
