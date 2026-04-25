import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import OfficerStationPanel from './OfficerStationPanel';
import { useGameStore } from '../../store/useGameStore';

describe('OfficerStationPanel', () => {
  beforeEach(() => {
    useGameStore.setState({
      activeRoE: null,
      recycledCoolantUsedThisRound: false,
      experimentalTech: [],
      players: [{
        id: 'p1',
        name: 'Player',
        shipId: 's1',
        commandTokens: 2,
        maxCommandTokens: 5,
        assignedActions: [],
        officers: [
          { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
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
        equippedWeapons: ['plasma-battery'],
        equippedSubsystems: [],
        criticalDamage: [],
        scars: [{ id: 'scar-bus', name: 'Leaking Power Bus', effect: '', fromCriticalId: 'power-bus-leak' }],
        armorDie: 'd6',
        baseEvasion: 5,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
      }],
      objectiveType: '',
    });
  });

  it('shows the true next CT cost for the first assignment when a scar increases it', () => {
    const engineeringOfficer = useGameStore.getState().players[0].officers.find(officer => officer.station === 'engineering');
    expect(engineeringOfficer).toBeDefined();

    render(
      <DndContext>
        <OfficerStationPanel officerState={engineeringOfficer!} />
      </DndContext>
    );

    const damageControlSlot = screen.getByTestId('action-slot-damage-control');
    expect(within(damageControlSlot).getByText('3 CT')).toBeInTheDocument();
  });

  it('shows Xel CT modifier on the command panel when Cyber-Warfare cost is adjusted', () => {
    useGameStore.setState(state => ({
      players: state.players.map(player => ({
        ...player,
        officers: player.officers.map(officer =>
          officer.station === 'sensors'
            ? { ...officer, officerId: 'xel' }
            : officer
        ),
      })),
    }));

    const sensorsOfficer = useGameStore.getState().players[0].officers.find(officer => officer.station === 'sensors');
    expect(sensorsOfficer).toBeDefined();

    render(
      <DndContext>
        <OfficerStationPanel officerState={sensorsOfficer!} />
      </DndContext>
    );

    const cyberWarfareSlot = screen.getByTestId('action-slot-cyber-warfare');
    expect(within(cyberWarfareSlot).getByText('2 CT')).toBeInTheDocument();
    expect(within(cyberWarfareSlot).getByText(/Hacker: -1 CT/)).toBeInTheDocument();
  });

  it('shows the officer ability name and mechanics when hovering the officer name', () => {
    const sensorsOfficer = useGameStore.getState().players[0].officers.find(officer => officer.station === 'sensors');
    expect(sensorsOfficer).toBeDefined();

    render(
      <DndContext>
        <OfficerStationPanel officerState={sensorsOfficer!} />
      </DndContext>
    );

    expect(screen.getByRole('heading', { name: /lt\. cmdr\. vance/i })).toHaveAttribute(
      'title',
      'Eagle Eye: "Target Lock" actions apply -2 TN even without a Target Painting success; a successful Target Painting roll improves that to -3 TN.',
    );
  });
  it('hides "Load Ordnance" action when no ordnance weapons are equipped', () => {
    const tacticalOfficer = useGameStore.getState().players[0].officers.find(o => o.station === 'tactical');
    
    // Ship starts with only 'plasma-battery' (not ordnance)
    render(
      <DndContext>
        <OfficerStationPanel officerState={tacticalOfficer!} />
      </DndContext>
    );

    expect(screen.queryByTestId('action-slot-load-ordinance')).not.toBeInTheDocument();
  });

  it('shows "Load Ordnance" action when ordnance weapons are equipped', () => {
    // Equip an ordnance weapon
    useGameStore.setState(state => ({
      playerShips: state.playerShips.map(s => 
        s.id === 's1' ? { ...s, equippedWeapons: ['heavy-railgun'] } : s
      )
    }));

    const tacticalOfficer = useGameStore.getState().players[0].officers.find(o => o.station === 'tactical');
    
    render(
      <DndContext>
        <OfficerStationPanel officerState={tacticalOfficer!} />
      </DndContext>
    );

    expect(screen.getByTestId('action-slot-load-ordinance')).toBeInTheDocument();
  });
});
