import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FleetBuilder from './FleetBuilder';
import { useGameStore } from '../../store/useGameStore';

describe('FleetBuilder', () => {
  it('renders step 1 and validates chassis selection', async () => {
    render(<FleetBuilder />);
    const user = userEvent.setup();

    expect(screen.getByText(/1\.\s*CHASSIS/)).toBeInTheDocument();
    
    // Select Vanguard
    const card = screen.getByTestId('chassis-card-vanguard');
    await user.click(card);

    // Next button should be enabled
    const nextBtn = screen.getByTestId('next-btn-1');
    expect(nextBtn).not.toBeDisabled();
    await user.click(nextBtn);

    // Should go to step 2
    expect(screen.getByText(/2\.\s*OFFICERS/)).toBeInTheDocument();
  });

  it('completes the wizard and advances phase', async () => {
    render(<FleetBuilder />);
    const user = userEvent.setup();
    const advanceSpy = vi.fn();
    useGameStore.setState({ initializeGame: advanceSpy });

    // Step 1
    await user.click(screen.getByTestId('chassis-card-zephyr'));
    await user.click(screen.getByTestId('next-btn-1'));

    // Step 2
    // Select one officer per station
    // Zephyr implies 4 stations 
    await user.click(screen.getByTestId('officer-select-slick-jones')); // helm
    await user.click(screen.getByTestId('officer-select-vane')); // tactical
    await user.click(screen.getByTestId('officer-select-obannon')); // eng
    await user.click(screen.getByTestId('officer-select-vance')); // sensors
    
    expect(screen.getByTestId('next-btn-2')).not.toBeDisabled();
    await user.click(screen.getByTestId('next-btn-2'));

    // Step 3
    // Zephyr has 2 weapons and 1 subsystem
    await user.click(screen.getByTestId('weapon-add-plasma-battery'));
    await user.click(screen.getByTestId('weapon-add-heavy-railgun'));
    await user.click(screen.getByTestId('subsystem-select-reinforced-bulkheads'));

    expect(screen.getByTestId('launch-btn')).not.toBeDisabled();
    await user.click(screen.getByTestId('launch-btn'));

    expect(advanceSpy).toHaveBeenCalled();
  });

  it('starts campaign officers at the lowest skill tier', async () => {
    const campaignStartSpy = vi.fn();
    const user = userEvent.setup();
    render(<FleetBuilder isCampaignSetup onCampaignStart={campaignStartSpy} />);

    await user.click(screen.getByTestId('next-btn-1'));

    await user.click(screen.getByTestId('officer-select-slick-jones'));
    await user.click(screen.getByTestId('officer-select-vane'));
    await user.click(screen.getByTestId('officer-select-obannon'));
    await user.click(screen.getByTestId('officer-select-vance'));
    await user.click(screen.getByTestId('next-btn-2'));

    await user.click(screen.getByTestId('weapon-add-plasma-battery'));
    await user.click(screen.getByTestId('launch-btn'));

    expect(campaignStartSpy).toHaveBeenCalledTimes(1);
    const [, players] = campaignStartSpy.mock.calls[0];
    expect(players[0].officers.map((officer: { currentTier: string }) => officer.currentTier)).toEqual([
      'rookie',
      'rookie',
      'rookie',
      'rookie',
    ]);
  });

  it('starts new player ships at speed 1', async () => {
    const campaignStartSpy = vi.fn();
    const user = userEvent.setup();
    render(<FleetBuilder isCampaignSetup onCampaignStart={campaignStartSpy} />);

    await user.click(screen.getByTestId('next-btn-1'));
    await user.click(screen.getByTestId('officer-select-slick-jones'));
    await user.click(screen.getByTestId('officer-select-vane'));
    await user.click(screen.getByTestId('officer-select-obannon'));
    await user.click(screen.getByTestId('officer-select-vance'));
    await user.click(screen.getByTestId('next-btn-2'));
    await user.click(screen.getByTestId('weapon-add-plasma-battery'));
    await user.click(screen.getByTestId('launch-btn'));

    const [, , ships] = campaignStartSpy.mock.calls[0];
    expect(ships[0].currentSpeed).toBe(1);
  });
});
