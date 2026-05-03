import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GameOverScreen from './GameOverScreen';
import { useGameStore } from '../../store/useGameStore';

describe('GameOverScreen', () => {
  it('shows COMMAND RELIEVED when Fleet Favor is low', () => {
    useGameStore.setState({ 
      victory: false, 
      gameOverReason: 'Fleet Favor dropped to -5. The High Command has relieved you of duty.',
      round: 3, 
      fleetFavor: -5, 
      startingFleetFavor: 0,
      log: [] 
    });
    render(<GameOverScreen />);
    expect(screen.getByText('COMMAND RELIEVED')).toBeInTheDocument();
    expect(screen.getByText(/Fleet Favor dropped to -5/)).toBeInTheDocument();
  });

  it('shows TIME EXPIRED when round limit is reached', () => {
    useGameStore.setState({ 
      victory: false, 
      gameOverReason: 'Round limit reached. Enemy reinforcements have arrived.',
      round: 8, 
      fleetFavor: 0, 
      startingFleetFavor: 0,
      log: [] 
    });
    render(<GameOverScreen />);
    expect(screen.getByText('TIME EXPIRED')).toBeInTheDocument();
  });

  it('shows SECTOR SECURED when victory is true and enemies eliminated', () => {
    useGameStore.setState({ 
      victory: true, 
      gameOverReason: 'All enemy forces eliminated.',
      round: 6, 
      fleetFavor: 5, 
      startingFleetFavor: 0,
      log: [] 
    });
    render(<GameOverScreen />);
    expect(screen.getByText('SECTOR SECURED')).toBeInTheDocument();
  });
});
