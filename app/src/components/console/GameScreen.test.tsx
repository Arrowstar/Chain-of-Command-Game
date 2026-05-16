import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameScreen from './GameScreen';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';
import * as useViewportModule from '../../utils/useViewport';

const useViewportSpy = vi.spyOn(useViewportModule, 'useViewport');

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
    useViewportSpy.mockReturnValue({ isTablet: false, isCoarsePointer: false } as any);
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
      playerShips: [{ kind: 'ship', faction: 'player',
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
    expect(screen.getByText('⛟ FLEET ASSETS')).toBeInTheDocument();
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
          effect: 'All AI weapons gain +1 Skill Die.',
          mechanicalEffect: {
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

  it('renders tabbed UI for officers when on tablet viewport', async () => {
    useViewportSpy.mockReturnValue({ isTablet: true, isCoarsePointer: true } as any);

    useGameStore.setState({
      phase: 'command', // So we don't render ExecutionPanel
      players: [{
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        officers: [
          { officerId: 'vance', station: 'helm', currentStress: 1, currentTier: 'recruit', traumas: [], isLocked: false },
          { officerId: 'scorch-malikov', station: 'weapons', currentStress: 0, currentTier: 'recruit', traumas: [{ id: 't1', name: 'Trauma' }], isLocked: true },
        ],
        commandTokens: 3,
        maxCommandTokens: 5,
        assignedActions: [],
      } as any],
    });

    const user = userEvent.setup();
    render(<GameScreen />);

    // We should see tabs for HELM and WEAPONS
    const helmTab = screen.getByRole('button', { name: /HELM/i });
    const weaponsTab = screen.getByRole('button', { name: /WEAPONS/i });

    expect(helmTab).toBeInTheDocument();
    expect(weaponsTab).toBeInTheDocument();

    // Helm is active by default (first sorted alphabetically)
    expect(screen.getByTestId('officer-station-helm')).toBeInTheDocument();
    expect(screen.queryByTestId('officer-station-weapons')).not.toBeInTheDocument();

    // Weapons has a lock and a trauma
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
    expect(screen.getByText('⚠ 1 TRAUMA')).toBeInTheDocument();

    // Click weapons tab
    await user.click(weaponsTab);

    // Now Weapons panel is active
    expect(screen.queryByTestId('officer-station-helm')).not.toBeInTheDocument();
    expect(screen.getByTestId('officer-station-weapons')).toBeInTheDocument();
  });

  it('automatically switches to the map tab on mobile when targeting is initiated', async () => {
    useViewportSpy.mockReturnValue({ isPhone: true, isTablet: false, isCoarsePointer: false } as any);

    const user = userEvent.setup();
    render(<GameScreen />);

    // Initially on MAP tab, switch to CONSOLE
    const consoleTab = screen.getByRole('button', { name: /CONSOLE/i });
    await user.click(consoleTab);

    // Verify CONSOLE is active
    expect(consoleTab.className).toContain('active');

    // Initiate targeting
    act(() => {
      useUIStore.getState().startTargeting('hex', { shipId: 's1', actionId: 'test-action' });
    });

    // Verify it automatically switched back to MAP
    const mapTab = screen.getByRole('button', { name: /MAP/i });
    expect(mapTab.className).toContain('active');
    expect(consoleTab.className).not.toContain('active');
  });

  it('automatically switches tabs on mobile based on tutorial highlightId', async () => {
    // We need to import useTutorialStore at the top or just mock its state here
    const { useTutorialStore } = await import('../../store/useTutorialStore');
    
    useViewportSpy.mockReturnValue({ isPhone: true, isTablet: false, isCoarsePointer: false } as any);

    render(<GameScreen />);

    // Mock tutorial active and pointing to console element
    act(() => {
      useTutorialStore.setState({
        isActive: true,
        isHidden: false,
        currentStep: 0,
        steps: [
          { highlightId: 'captain-hand', dialogue: '' }
        ]
      });
    });

    const consoleTab = screen.getByRole('button', { name: /CONSOLE/i });
    const mapTab = screen.getByRole('button', { name: /MAP/i });

    // Should switch to console
    expect(consoleTab.className).toContain('active');

    // Change step to point to map element
    act(() => {
      useTutorialStore.setState({
        currentStep: 1,
        steps: [
          { highlightId: 'captain-hand', dialogue: '' },
          { highlightId: 'hex-map-container', dialogue: '' }
        ]
      });
    });

    // Should switch to map
    expect(mapTab.className).toContain('active');
  });
});
