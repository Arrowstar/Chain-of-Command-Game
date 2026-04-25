import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CriticalCardReveal from './CriticalCardReveal';

describe('CriticalCardReveal', () => {
  it('renders null when card is null', () => {
    const { container } = render(<CriticalCardReveal card={null} onAcknowledge={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders card info correctly and fires acknowledge', async () => {
    const mockCard = {
      id: 'crit-engine',
      name: 'Engine Disabled',
      effect: 'Speed is reduced to 0.',
      isRepaired: false
    };

    const spy = vi.fn();
    render(<CriticalCardReveal card={mockCard} onAcknowledge={spy} />);
    
    expect(screen.getByText('CRITICAL DAMAGE')).toBeInTheDocument();
    expect(screen.getByText('Engine Disabled')).toBeInTheDocument();
    expect(screen.getByText('Speed is reduced to 0.')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /ACKNOWLEDGE/i }));

    expect(spy).toHaveBeenCalled();
  });
});
