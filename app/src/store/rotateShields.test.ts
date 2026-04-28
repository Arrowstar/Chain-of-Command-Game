import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

describe('resolveAction - Rotate Shields Logic', () => {
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
          { id: 'a1', station: 'tactical', actionId: 'rotate-shields', resolved: false } as any,
        ],
      }],
      playerShips: [{
        id: 's1',
        name: 'Resolute',
        ownerId: 'p1',
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 4,
      } as any],
      log: [],
    } as any);
  });

  it('transfers 1 shield point from donor to receiver successfully', () => {
    const { resolveAction } = useGameStore.getState();
    resolveAction('p1', 's1', 'a1', { donorSector: 'fore', receiverSector: 'aft' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(1);
    expect(ship.shields.aft).toBe(3);

    const logs = useGameStore.getState().log;
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('rotated shields');
    expect(lastLog.message).toContain('Fore (2→1)');
    expect(lastLog.message).toContain('Aft (2→3)');
    
    const player = useGameStore.getState().players[0];
    expect(player.assignedActions[0].resolved).toBe(true);
  });

  it('fails to rotate if donor has 0 shield points', () => {
    useGameStore.setState(s => {
      const ship = { ...s.playerShips[0] };
      ship.shields = { ...ship.shields, fore: 0 };
      return { playerShips: [ship] };
    });

    const { resolveAction } = useGameStore.getState();
    resolveAction('p1', 's1', 'a1', { donorSector: 'fore', receiverSector: 'aft' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(0);
    expect(ship.shields.aft).toBe(2);

    const logs = useGameStore.getState().log;
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('Rotate Shields failed');
    expect(lastLog.message).toContain('FORE has no shields');
  });

  it('fails to rotate if receiver is at max shields', () => {
    useGameStore.setState(s => {
      const ship = { ...s.playerShips[0] };
      ship.shields = { ...ship.shields, aft: 4 };
      return { playerShips: [ship] };
    });

    const { resolveAction } = useGameStore.getState();
    resolveAction('p1', 's1', 'a1', { donorSector: 'fore', receiverSector: 'aft' });

    const ship = useGameStore.getState().playerShips[0];
    expect(ship.shields.fore).toBe(2);
    expect(ship.shields.aft).toBe(4);

    const logs = useGameStore.getState().log;
    const lastLog = logs[logs.length - 1];
    expect(lastLog.message).toContain('Rotate Shields failed');
    expect(lastLog.message).toContain('AFT is already at maximum');
  });
});
