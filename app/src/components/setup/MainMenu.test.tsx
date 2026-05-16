import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainMenu from './MainMenu';

describe('MainMenu', () => {
  it('renders title and buttons', async () => {
    render(<MainMenu />);
    // Title is animated, so we wait for it
    expect(await screen.findByText('CHAIN OF COMMAND', {}, { timeout: 2000 })).toBeInTheDocument();
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

  it('renders the EXIT button', () => {
    render(<MainMenu />);
    expect(screen.getByTestId('exit-btn')).toBeInTheDocument();
  });

  it('EXIT button calls onExit when provided', async () => {
    const user = userEvent.setup();
    const spy = vi.fn().mockResolvedValue(undefined);
    render(<MainMenu onExit={spy} />);
    await user.click(screen.getByTestId('exit-btn'));
    expect(spy).toHaveBeenCalled();
  });

  it('EXIT button shows web hint when onExit is not provided', async () => {
    const user = userEvent.setup();
    render(<MainMenu />);
    await user.click(screen.getByTestId('exit-btn'));
    expect(screen.getByTestId('exit-hint')).toBeInTheDocument();
    expect(screen.getByText(/close this browser tab/i)).toBeInTheDocument();
  });

  it('EXIT button shows web hint when onExit throws (web environment)', async () => {
    const user = userEvent.setup();
    // Simulate Capacitor App.exitApp() failing on web
    const spy = vi.fn().mockRejectedValue(new Error('Not available on web'));
    render(<MainMenu onExit={spy} />);
    await user.click(screen.getByTestId('exit-btn'));
    expect(await screen.findByTestId('exit-hint')).toBeInTheDocument();
  });
});
