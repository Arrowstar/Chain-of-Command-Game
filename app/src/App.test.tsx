import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useSettingsStore } from './store/useSettingsStore';
import { useTutorialStore } from './store/useTutorialStore';

// Mock problematic Capacitor imports and bgm
vi.mock('@capacitor/screen-orientation', () => ({
  ScreenOrientation: { lock: vi.fn() }
}));
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(), exitApp: vi.fn() }
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false }
}));
vi.mock('./utils/useBgm', () => ({
  useBgm: vi.fn()
}));
vi.mock('./components/console/GameScreen', () => ({
  default: () => <div data-testid="mock-game-screen">Game Screen Mock</div>
}));

describe('App', () => {
  beforeEach(() => {
    useTutorialStore.setState({ isActive: false, currentStep: 0, isFreePlay: false });
    useSettingsStore.setState({ returnToMenuCallback: null });
  });

  it('ends the tutorial when returning to the main menu', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click "COMBAT TUTORIAL" on the main menu
    const startTutorialBtn = screen.getByTestId('start-tutorial-btn');
    await user.click(startTutorialBtn);

    // Verify tutorial state is active
    expect(useTutorialStore.getState().isActive).toBe(true);

    // The callback should now be registered by App.tsx
    const cb = useSettingsStore.getState().returnToMenuCallback;
    expect(cb).not.toBeNull();

    // Trigger the callback (this simulates what SettingsModal does when "Return to Main Menu" is clicked)
    act(() => {
      cb!();
    });

    // Verify tutorial state is cleared
    expect(useTutorialStore.getState().isActive).toBe(false);
    expect(useTutorialStore.getState().currentStep).toBe(0);
  });
});
