import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import OfficerStationPanel from './components/console/OfficerStationPanel';
import { useGameStore } from './store/useGameStore';

describe('Load Ordnance Visibility Integration', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [{
        id: 'p1',
        name: 'Player',
        shipId: 's1',
        commandTokens: 5,
        maxCommandTokens: 5,
        assignedActions: [],
        officers: [
          { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
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
        equippedWeapons: ['plasma-battery'], // No ordnance
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
    });
  });

  it('should hide Load Ordnance when no ordnance weapons are equipped, then show it when one is added', () => {
    const tacticalOfficer = useGameStore.getState().players[0].officers[0];

    // 1. Initial state: no ordnance
    const { rerender } = render(
      <DndContext>
        <OfficerStationPanel officerState={tacticalOfficer} />
      </DndContext>
    );
    expect(screen.queryByTestId('action-slot-load-ordinance')).not.toBeInTheDocument();

    // 2. Update state: add ordnance weapon
    useGameStore.setState(state => ({
      playerShips: state.playerShips.map(s => 
        s.id === 's1' ? { ...s, equippedWeapons: ['heavy-railgun'] } : s
      )
    }));

    // 3. Rerender and verify
    rerender(
      <DndContext>
        <OfficerStationPanel officerState={tacticalOfficer} />
      </DndContext>
    );
    expect(screen.getByTestId('action-slot-load-ordinance')).toBeInTheDocument();
    
    // 4. Update state: remove ordnance weapon
    useGameStore.setState(state => ({
      playerShips: state.playerShips.map(s => 
        s.id === 's1' ? { ...s, equippedWeapons: ['plasma-battery'] } : s
      )
    }));
    
    // 5. Rerender and verify hidden again
    rerender(
      <DndContext>
        <OfficerStationPanel officerState={tacticalOfficer} />
      </DndContext>
    );
    expect(screen.queryByTestId('action-slot-load-ordinance')).not.toBeInTheDocument();
  });
});
