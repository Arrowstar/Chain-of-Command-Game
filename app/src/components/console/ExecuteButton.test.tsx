import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExecuteButton from './ExecuteButton';
import { useGameStore } from '../../store/useGameStore';
import { useTutorialStore } from '../../store/useTutorialStore';

describe('ExecuteButton', () => {
  beforeEach(() => {
    useGameStore.setState({ phase: 'command', players: [], playerShips: [] });
    useTutorialStore.setState({ isActive: false, isFreePlay: false, currentStep: 0, steps: [] });
  });

  it('renders correctly and is enabled during command phase', () => {
    render(<ExecuteButton />);
    const btn = screen.getByTestId('execute-button');
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('is disabled during other phases', () => {
    useGameStore.setState({ phase: 'execution' });
    render(<ExecuteButton />);
    const btn = screen.getByTestId('execute-button');
    expect(btn).toBeDisabled();
  });

  it('calls advancePhase when clicked', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    useGameStore.setState({ advancePhase: spy, phase: 'command' });
    
    render(<ExecuteButton />);
    await user.click(screen.getByTestId('execute-button'));
    
    expect(spy).toHaveBeenCalled();
  });

  it('is disabled during tutorial when the current step is not waiting for execution', () => {
    useTutorialStore.setState({ 
      isActive: true, 
      isFreePlay: false, 
      currentStep: 0,
      steps: [{ dialogue: 'Step 0', waitForCondition: 'TOKEN_ASSIGNED' }]
    });
    render(<ExecuteButton />);
    const btn = screen.getByTestId('execute-button');
    expect(btn).toBeDisabled();
  });

  it('is enabled during tutorial when the current step is waiting for execution', () => {
    useTutorialStore.setState({ 
      isActive: true, 
      isFreePlay: false, 
      currentStep: 0,
      steps: [{ dialogue: 'Step 0', waitForCondition: 'PHASE_EXECUTION' }]
    });
    render(<ExecuteButton />);
    const btn = screen.getByTestId('execute-button');
    expect(btn).not.toBeDisabled();
  });

  it('is enabled during tutorial free play', () => {
    useTutorialStore.setState({ 
      isActive: true, 
      isFreePlay: true, 
      currentStep: 0,
      steps: [{ dialogue: 'Step 0', waitForCondition: 'TOKEN_ASSIGNED' }]
    });
    render(<ExecuteButton />);
    const btn = screen.getByTestId('execute-button');
    expect(btn).not.toBeDisabled();
  });
});
