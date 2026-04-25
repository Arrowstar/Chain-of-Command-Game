import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StressBar from './StressBar';

describe('StressBar', () => {
  it('renders immune state when maxStress is null', () => {
    render(<StressBar currentStress={0} maxStress={null} officerName="Sparky" />);
    expect(screen.getByText('Stress: Immune')).toBeInTheDocument();
  });

  it('renders normal stress levels correctly', () => {
    render(<StressBar currentStress={2} maxStress={5} officerName="Vane" />);
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    
    // Check width percentage 2/5 = 40%
    const fill = screen.getByTestId('stress-fill');
    expect(fill.style.width).toBe('40%');
  });

  it('renders MAX state when stress meets or exceeds limit', () => {
    render(<StressBar currentStress={5} maxStress={5} officerName="Rutherford" />);
    expect(screen.getByText('Stress (MAX)')).toBeInTheDocument();
    
    const fill = screen.getByTestId('stress-fill');
    expect(fill.style.width).toBe('100%');
    expect(fill.style.background).toContain('var(--color-hostile-red)');
  });
});
