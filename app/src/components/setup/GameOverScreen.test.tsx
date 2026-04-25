import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameOverScreen from './GameOverScreen';
import { useGameStore } from '../../store/useGameStore';

describe('GameOverScreen', () => {
  it('shows defeat state when victory is false', () => {
    useGameStore.setState({ victory: false, round: 3, fleetFavor: -2, log: [] });
    render(<GameOverScreen />);
    expect(screen.getByText('SHIP DESTROYED')).toBeInTheDocument();
    expect(screen.getByTestId('return-to-menu-btn')).toBeInTheDocument();
  });

  it('shows victory state when victory is true', () => {
    useGameStore.setState({ victory: true, round: 6, fleetFavor: 5, log: [] });
    render(<GameOverScreen />);
    expect(screen.getByText('SECTOR SECURED')).toBeInTheDocument();
  });
});
