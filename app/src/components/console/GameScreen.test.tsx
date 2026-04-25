import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameScreen from './GameScreen';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';

vi.mock('../board/HexMap', () => ({
  default: () => <div data-testid="hex-map" />,
}));

vi.mock('../board/GameLog', () => ({
  default: () => <div data-testid="game-log" />,
}));

vi.mock('./ExecutionPanel', () => ({
  default: () => <div data-testid="execution-panel">Execution Panel</div>,
}));

describe('GameScreen', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
    useGameStore.setState({
      phase: 'execution',
      executionStep: 'smallAllied',
      players: [{
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        officers: [],
        commandTokens: 3,
        maxCommandTokens: 5,
        pendingCommandTokenBonus: 0,
        briefingCommandTokenBonus: 0,
        assignedActions: [],
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
        hasDrifted: false,
        targetLocks: [],
      }],
      enemyShips: [],
      fighterTokens: [],
      torpedoTokens: [],
      terrainMap: new Map(),
      fleetFavor: 3,
      fleetAssetRoundUses: {},
      fleetAssetScenarioUses: {},
      fleetAssetShipRoundUses: {},
      pendingSpawns: [],
      currentTactic: null,
      resolvedSteps: [],
      deploymentMode: false,
      deploymentBounds: null,
      deploymentSelectedShipId: null,
      objectiveMarkers: [],
      log: [],
    } as Partial<ReturnType<typeof useGameStore.getState>>);
  });

  it('shows Fleet Assets during execution phase', () => {
    render(<GameScreen />);

    expect(screen.getByTestId('execution-panel')).toBeInTheDocument();
    expect(screen.getByText('Open Fleet Assets')).toBeInTheDocument();
    expect(screen.getByText('3 FF')).toBeInTheDocument();
  });

  it('shows the current enemy tactic in the top slide-out UI', async () => {
    act(() => {
      useGameStore.setState({
        currentTactic: {
          id: 'pincer-movement',
          name: 'Pincer Movement',
          effect: 'All AI ships gain +1 Hex movement.',
          mechanicalEffect: {
            extraMovement: 1,
            targetingOverride: 'flank',
          },
        },
      });
    });

    const user = userEvent.setup();
    render(<GameScreen />);

    expect(screen.queryByText(/current enemy tactic/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show enemy tactic/i }));

    expect(screen.getByRole('button', { name: /hide enemy tactic/i })).toBeInTheDocument();
    expect(screen.getByText(/current enemy tactic/i)).toBeInTheDocument();
    expect(screen.getByText('Pincer Movement')).toBeInTheDocument();
    expect(screen.getByText('All AI ships gain +1 Hex movement.')).toBeInTheDocument();
  });

  it('shows and clears an unread indicator when a new tactic arrives', async () => {
    act(() => {
      useGameStore.setState({
        currentTactic: {
          id: 'pincer-movement',
          name: 'Pincer Movement',
          effect: 'All AI ships gain +1 Hex movement.',
          mechanicalEffect: {
            extraMovement: 1,
            targetingOverride: 'flank',
          },
        },
      });
    });

    const user = userEvent.setup();
    render(<GameScreen />);

    expect(screen.queryByTestId('enemy-tactic-unread-indicator')).not.toBeInTheDocument();

    act(() => {
      useGameStore.setState({
        currentTactic: {
          id: 'overwhelming-firepower',
          name: 'Overwhelming Firepower',
          effect: 'AI ships do not move this round.',
          mechanicalEffect: {
            extraMovement: -99,
            extraDice: ['d6'],
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('enemy-tactic-unread-indicator')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /show enemy tactic/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('enemy-tactic-unread-indicator')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Overwhelming Firepower')).toBeInTheDocument();
  });
});
