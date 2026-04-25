import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExecutionPanel from './ExecutionPanel';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';

describe('ExecutionPanel', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    useGameStore.setState({
      phase: 'execution',
      executionStep: 'mediumAllied',
      players: [{
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        commandTokens: 3,
        maxCommandTokens: 5,
        pendingCommandTokenBonus: 0,
        briefingCommandTokenBonus: 0,
        officers: [
          { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
        ],
        assignedActions: [
          { id: 'cw-1', station: 'sensors', actionId: 'cyber-warfare', ctCost: 2, stressCost: 2, resolved: false },
        ],
      }],
      playerShips: [{
        id: 's1',
        name: 'Resolute',
        chassisId: 'vanguard',
        ownerId: 'p1',
        position: { q: 0, r: 0 },
        facing: 0,
        currentSpeed: 0,
        currentHull: 10,
        maxHull: 10,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2,
        equippedWeapons: [],
        equippedSubsystems: [],
        criticalDamage: [],
        scars: [],
        armorDie: 'd6',
        baseEvasion: 5,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: true,
        targetLocks: [],
      }],
      enemyShips: [
        {
          id: 'e1',
          name: 'Monitor',
          adversaryId: 'monitor',
          position: { q: 4, r: 0 },
          facing: 3,
          currentSpeed: 0,
          currentHull: 12,
          maxHull: 12,
          shields: { fore: 3, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 5,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
          baseEvasion: 4,
          armorDie: 'd4',
        },
        {
          id: 'e2',
          name: 'Strike Fighter',
          adversaryId: 'strike-fighter',
          position: { q: 5, r: 0 },
          facing: 3,
          currentSpeed: 0,
          currentHull: 1,
          maxHull: 1,
          shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
          maxShieldsPerSector: 0,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
          baseEvasion: 8,
          armorDie: 'd4',
        },
      ],
      fighterTokens: [],
      torpedoTokens: [],
      experimentalTech: [],
      resolvedSteps: [],
    } as Partial<ReturnType<typeof useGameStore.getState>>);
  });

  it('only shows cyber-warfare targets for shield arcs that currently exist', async () => {
    const user = userEvent.setup();
    const resolveAction = vi.fn();
    useGameStore.setState({ resolveAction } as Partial<ReturnType<typeof useGameStore.getState>>);

    render(<ExecutionPanel />);

    await user.click(screen.getByRole('button', { name: 'OPTIONS...' }));

    expect(screen.getByRole('button', { name: /monitor/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /strike fighter/i })).not.toBeInTheDocument();
    expect(screen.getByText('Select a target ship to open its shield arc display.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /monitor/i }));

    const arcPicker = screen.getByRole('img', { name: /shield arcs for monitor/i });
    const arcPaths = arcPicker.querySelectorAll('path');
    expect(arcPaths.length).toBeGreaterThan(0);

    await user.click(arcPaths[0]);

    expect(screen.getByText('Selected arc: Fore')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm fore on monitor/i });
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);

    expect(resolveAction).toHaveBeenCalledWith('p1', 's1', 'cw-1', {
      targetShipId: 'e1',
      sector: 'fore',
    });
  });
});

