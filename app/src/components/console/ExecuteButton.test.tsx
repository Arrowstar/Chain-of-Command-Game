import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExecuteButton from './ExecuteButton';
import { useGameStore } from '../../store/useGameStore';

describe('ExecuteButton', () => {
  beforeEach(() => {
    useGameStore.setState({ phase: 'command' });
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
});
