import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsModal from './SettingsModal';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCampaignStore } from '../store/useCampaignStore';

// ─── Helpers ─────────────────────────────────────────────────────

/** Open the settings modal and register a return-to-menu callback. */
function openWithCallback(returnCb = vi.fn()) {
  act(() => {
    useSettingsStore.setState({
      isSettingsOpen: true,
      returnToMenuCallback: returnCb,
    });
  });
  return returnCb;
}

/** Open the modal WITHOUT registering a returnToMenuCallback (main-menu context). */
function openWithoutCallback() {
  act(() => {
    useSettingsStore.setState({
      isSettingsOpen: true,
      returnToMenuCallback: null,
    });
  });
}

// ─── Tests ───────────────────────────────────────────────────────

describe('SettingsModal', () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState({
      musicVolume: 0.15,
      sfxVolume: 0.5,
      isSettingsOpen: false,
      returnToMenuCallback: null,
    });
    // Clear campaign state so tests start clean
    useCampaignStore.setState({ campaign: null });
  });

  // ── Basic render / close ──────────────────────────────────────

  it('does not render when closed', () => {
    render(<SettingsModal />);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    openWithoutCallback();
    render(<SettingsModal />);
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
  });

  it('closes when the × button is clicked', async () => {
    const user = userEvent.setup();
    openWithoutCallback();
    render(<SettingsModal />);
    await user.click(screen.getByLabelText('Close settings'));
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    openWithoutCallback();
    render(<SettingsModal />);
    await user.keyboard('{Escape}');
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });

  // ── Navigation section visibility ────────────────────────────

  it('does NOT show navigation section when no returnToMenuCallback is registered', () => {
    openWithoutCallback();
    render(<SettingsModal />);
    expect(screen.queryByTestId('navigation-section')).not.toBeInTheDocument();
  });

  it('shows navigation section when returnToMenuCallback is registered', () => {
    openWithCallback();
    render(<SettingsModal />);
    expect(screen.getByTestId('navigation-section')).toBeInTheDocument();
    expect(screen.getByTestId('return-to-menu-btn')).toBeInTheDocument();
  });

  // ── Combat / non-campaign warning ────────────────────────────

  it('shows combat warning when not in campaign', async () => {
    const user = userEvent.setup();
    // No campaign active → combat/skirmish context
    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));

    expect(screen.getByTestId('combat-warn-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-save-confirm')).not.toBeInTheDocument();
  });

  it('abandon button calls triggerReturnToMenu in combat context', async () => {
    const user = userEvent.setup();
    const cb = vi.fn();
    openWithCallback(cb);
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));
    await user.click(screen.getByTestId('abandon-combat-btn'));

    expect(cb).toHaveBeenCalled();
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });

  it('cancel button returns to idle in combat context', async () => {
    const user = userEvent.setup();
    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));
    expect(screen.getByTestId('combat-warn-confirm')).toBeInTheDocument();

    await user.click(screen.getByTestId('cancel-return-btn'));
    expect(screen.getByTestId('return-to-menu-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-warn-confirm')).not.toBeInTheDocument();
  });

  // ── Campaign-map save confirmation ───────────────────────────

  it('shows save confirmation when on campaign sectorMap', async () => {
    const user = userEvent.setup();

    // Put campaign in sectorMap phase
    act(() => {
      useCampaignStore.setState({
        campaign: {
          campaignPhase: 'sectorMap',
          // Minimal campaign shape — only campaignPhase is checked in SettingsModal
        } as any,
      });
    });

    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));

    expect(screen.getByTestId('campaign-save-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-warn-confirm')).not.toBeInTheDocument();
  });

  it('shows save confirmation when on campaign drydock phase', async () => {
    const user = userEvent.setup();

    act(() => {
      useCampaignStore.setState({
        campaign: { campaignPhase: 'drydock' } as any,
      });
    });

    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));

    expect(screen.getByTestId('campaign-save-confirm')).toBeInTheDocument();
  });

  it('shows save confirmation when in campaign nodeResolution (event) phase', async () => {
    const user = userEvent.setup();

    act(() => {
      useCampaignStore.setState({
        campaign: { campaignPhase: 'nodeResolution' } as any,
      });
    });

    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));

    // nodeResolution is an event phase — savable, not a combat warning
    expect(screen.getByTestId('campaign-save-confirm')).toBeInTheDocument();
    expect(screen.queryByTestId('combat-warn-confirm')).not.toBeInTheDocument();
  });

  it('Save & Exit saves and triggers menu navigation', async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(
      await import('../utils/CampaignSaveManager').then(m => m.CampaignSaveManager),
      'saveToBrowser',
    ).mockImplementation(() => {});
    const cb = vi.fn();

    act(() => {
      useCampaignStore.setState({
        campaign: { campaignPhase: 'sectorMap' } as any,
      });
    });
    openWithCallback(cb);
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));
    await user.click(screen.getByTestId('save-and-exit-btn'));

    expect(saveSpy).toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();

    saveSpy.mockRestore();
  });

  it('Exit Without Saving triggers navigation without saving', async () => {
    const user = userEvent.setup();
    const saveSpy = vi.spyOn(
      await import('../utils/CampaignSaveManager').then(m => m.CampaignSaveManager),
      'saveToBrowser',
    ).mockImplementation(() => {});
    const cb = vi.fn();

    act(() => {
      useCampaignStore.setState({
        campaign: { campaignPhase: 'sectorMap' } as any,
      });
    });
    openWithCallback(cb);
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));
    await user.click(screen.getByTestId('exit-without-saving-btn'));

    expect(saveSpy).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalled();

    saveSpy.mockRestore();
  });

  // ── Escape key dismisses confirmation, not the whole modal ───

  it('Escape key dismisses confirmation panel (not the whole modal)', async () => {
    const user = userEvent.setup();
    openWithCallback();
    render(<SettingsModal />);

    await user.click(screen.getByTestId('return-to-menu-btn'));
    expect(screen.getByTestId('combat-warn-confirm')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    // Confirmation is gone; modal is still open
    expect(screen.queryByTestId('combat-warn-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    expect(useSettingsStore.getState().isSettingsOpen).toBe(true);
  });
});
