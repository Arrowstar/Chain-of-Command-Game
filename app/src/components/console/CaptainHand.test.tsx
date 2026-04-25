import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CaptainHand from './CaptainHand';
import { useGameStore } from '../../store/useGameStore';
import { DndContext } from '@dnd-kit/core';

describe('CaptainHand', () => {
  beforeEach(() => {
    useGameStore.setState({
      round: 1,
      activeRoE: null,
      combatModifiers: null,
      players: [{
        id: 'p1',
        name: 'Player',
        shipId: 's1',
        officers: [],
        commandTokens: 3,
        maxCommandTokens: 5,
        assignedActions: []
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
    });
  });

  it('renders all maxCommandTokens slots, with spent ones marked as assigned', () => {
    render(
      <DndContext>
        <CaptainHand />
      </DndContext>
    );
    expect(screen.getByText('Command Token Pool')).toBeInTheDocument();
    // maxCommandTokens = 5, so 5 token slots rendered
    const tokens = screen.getAllByTestId(/command-token-ct-/);
    expect(tokens.length).toBe(5);
    // 2 spent (5 max - 3 remaining) should have "Token spent" title
    const spent = tokens.filter(t => t.title === 'Token spent');
    expect(spent.length).toBe(2);
    // 3 available should have drag tooltip
    const available = tokens.filter(t => t.title !== 'Token spent');
    expect(available.length).toBe(3);
  });

  it('renders all tokens as spent when commandTokens is 0', () => {
    useGameStore.setState(s => ({
      players: [{ ...s.players[0], commandTokens: 0 }]
    }));
    render(
      <DndContext>
        <CaptainHand />
      </DndContext>
    );
    // Still renders all 5 slots (no POOL DEPLETED when max > 0)
    const tokens = screen.getAllByTestId(/command-token-ct-/);
    expect(tokens.length).toBe(5);
    const spent = tokens.filter(t => t.title === 'Token spent');
    expect(spent.length).toBe(5);
  });

  it('shows round-start CT modifiers and live CT bonuses', () => {
    useGameStore.setState(state => ({
      activeRoE: {
        id: 'overclocked-reactors',
        name: 'Overclocked Reactors',
        doctrine: 'cruelCalculus',
        flavorText: '',
        rule: '',
        mechanicalEffect: { bonusCTPerRound: 1 },
      },
      combatModifiers: { playerCTRound1Modifier: -1 },
      players: [{
        ...state.players[0],
        commandTokens: 4,
        maxCommandTokens: 5,
        assignedActions: [{ id: 'a1', station: 'engineering', actionId: 'reroute-power', ctCost: 2, stressCost: 3 }],
      }],
      playerShips: [{
        ...state.playerShips[0],
        scars: [{ id: 'scar-bridge', name: 'Damaged Bridge', effect: '', fromCriticalId: 'bridge-hit' }],
      }],
    }));

    render(
      <DndContext>
        <CaptainHand />
      </DndContext>
    );

    expect(screen.getByText('Base 5 CT')).toBeInTheDocument();
    expect(screen.getByText('Round Start 4')).toBeInTheDocument();
    expect(screen.getByText('Live Pool 6')).toBeInTheDocument();
    expect(screen.getByText('RoE +1')).toHaveAttribute('title', expect.stringContaining('Overclocked Reactors'));
    expect(screen.getByText('R1 -1')).toBeInTheDocument();
    expect(screen.getByText('Bridge -1')).toBeInTheDocument();
    expect(screen.getByText('Live +2')).toHaveAttribute('title', expect.stringContaining('Bonus CT gained during this round'));
  });
});
