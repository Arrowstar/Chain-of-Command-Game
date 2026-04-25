import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainMenu from './MainMenu';

describe('MainMenu', () => {
  it('renders title and buttons', () => {
    render(<MainMenu />);
    expect(screen.getByText('CHAIN OF COMMAND')).toBeInTheDocument();
    expect(screen.getByText('STELLAR WAR')).toBeInTheDocument();
    expect(screen.getByTestId('start-scenario-btn')).toBeInTheDocument();
    expect(screen.getByText('START CAMPAIGN')).toBeInTheDocument();
  });

  it('clicking start fires the onStart callback', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<MainMenu onStart={spy} />);
    await user.click(screen.getByTestId('start-scenario-btn'));
    expect(spy).toHaveBeenCalled();
  });
});
