import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DiceVisual from './DiceVisual';

describe('DiceVisual', () => {
  it('renders initial state and final result', async () => {
    vi.useFakeTimers();
    render(<DiceVisual dieType="d6" finalResult={4} />);
    
    // Initially rolling, it should mount
    expect(screen.getByTestId('dice-visual-d6')).toBeInTheDocument();
    
    // Advance timers so it settles
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(screen.getByText('4')).toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('renders explosion badge when isExploded is true', async () => {
    render(<DiceVisual dieType="d8" finalResult={8} isExploded={true} />);
    expect(screen.getByText('💥')).toBeInTheDocument();
  });
});
