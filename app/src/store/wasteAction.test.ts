import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

describe('resolveAction - Waste Action Logic', () => {
  beforeEach(() => {
    // Basic setup for a game state with one player, one ship, and one action
    useGameStore.setState({
      phase: 'execution',
      players: [{
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        commandTokens: 3,
        officers: [
          { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran' } as any,
        ],
        assignedActions: [
          { id: 'a1', station: 'sensors', actionId: 'cyber-warfare', resolved: false } as any,
        ],
      }],
      playerShips: [{
        id: 's1',
        name: 'Resolute',
        ownerId: 'p1',
        shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
      } as any],
      log: [],
    } as any);
  });

  it('marks the action as resolved and logs a message when context.wasted is true', () => {
    const state = useGameStore.getState();
    // Use the action ID directly
    state.resolveAction('p1', 's1', 'a1', { wasted: true, reason: 'No enemy shields' });

    const updatedState = useGameStore.getState();
    const player = updatedState.players[0];
    expect(player.assignedActions[0].resolved).toBe(true);

    const lastLog = updatedState.log[updatedState.log.length - 1];
    expect(lastLog.type).toBe('system');
    expect(lastLog.message).toContain('Cyber-Warfare was wasted');
    expect(lastLog.message).toContain('No enemy shields');
  });
});
