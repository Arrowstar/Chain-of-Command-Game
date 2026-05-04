import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Tooltip from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children and shows tooltip on hover', () => {
    render(
      <Tooltip content={<div data-testid="tooltip-content">Explanatory Text</div>}>
        <button data-testid="trigger">Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('trigger');
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger);
    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
    expect(screen.getByText('Explanatory Text')).toBeInTheDocument();

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
  });

  it('respects the delay prop', () => {
    render(
      <Tooltip content={<div data-testid="tooltip-content">Delayed</div>} delay={500}>
        <button data-testid="trigger">Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);
    
    // Should not be visible yet
    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();

    // Advance time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId('tooltip-content')).toBeInTheDocument();
  });

  it('clears timer if mouse leaves before delay expires', () => {
    render(
      <Tooltip content={<div data-testid="tooltip-content">Delayed</div>} delay={500}>
        <button data-testid="trigger">Hover Me</button>
      </Tooltip>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);
    
    act(() => {
      vi.advanceTimersByTime(250);
    });
    
    fireEvent.mouseLeave(trigger);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.queryByTestId('tooltip-content')).not.toBeInTheDocument();
  });
});
