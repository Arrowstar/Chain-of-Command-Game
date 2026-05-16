import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store and clear localStorage
    localStorage.clear();
    useSettingsStore.setState({
      musicVolume: 0.15,
      sfxVolume: 0.5,
      isSettingsOpen: false,
      returnToMenuCallback: null,
    });
  });

  it('initializes with default values', () => {
    const state = useSettingsStore.getState();
    expect(state.musicVolume).toBe(0.15);
    expect(state.sfxVolume).toBe(0.5);
    expect(state.isSettingsOpen).toBe(false);
  });

  it('updates music volume and persists to localStorage', () => {
    const { setMusicVolume } = useSettingsStore.getState();
    
    setMusicVolume(0.75);
    
    expect(useSettingsStore.getState().musicVolume).toBe(0.75);
    
    const stored = JSON.parse(localStorage.getItem('coc-settings') || '{}');
    expect(stored.musicVolume).toBe(0.75);
  });

  it('updates SFX volume and persists to localStorage', () => {
    const { setSfxVolume } = useSettingsStore.getState();
    
    setSfxVolume(0.8);
    
    expect(useSettingsStore.getState().sfxVolume).toBe(0.8);
    
    const stored = JSON.parse(localStorage.getItem('coc-settings') || '{}');
    expect(stored.sfxVolume).toBe(0.8);
  });

  it('clamps volumes between 0 and 1', () => {
    const { setMusicVolume, setSfxVolume } = useSettingsStore.getState();
    
    setMusicVolume(1.5);
    setSfxVolume(-0.5);
    
    expect(useSettingsStore.getState().musicVolume).toBe(1);
    expect(useSettingsStore.getState().sfxVolume).toBe(0);
  });

  it('toggles modal open and closed', () => {
    const { openSettings, closeSettings } = useSettingsStore.getState();
    
    openSettings();
    expect(useSettingsStore.getState().isSettingsOpen).toBe(true);
    
    closeSettings();
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });

  it('initializes with null returnToMenuCallback', () => {
    expect(useSettingsStore.getState().returnToMenuCallback).toBeNull();
  });

  it('setReturnToMenuCallback stores the callback', () => {
    const { setReturnToMenuCallback } = useSettingsStore.getState();
    const cb = vi.fn();

    setReturnToMenuCallback(cb);

    expect(useSettingsStore.getState().returnToMenuCallback).toBe(cb);
  });

  it('triggerReturnToMenu calls the registered callback', () => {
    const cb = vi.fn();
    useSettingsStore.setState({ returnToMenuCallback: cb, isSettingsOpen: true });

    useSettingsStore.getState().triggerReturnToMenu();

    expect(cb).toHaveBeenCalledOnce();
  });

  it('triggerReturnToMenu closes the settings modal', () => {
    useSettingsStore.setState({ isSettingsOpen: true, returnToMenuCallback: vi.fn() });

    useSettingsStore.getState().triggerReturnToMenu();

    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });

  it('triggerReturnToMenu is safe to call with no callback registered', () => {
    useSettingsStore.setState({ returnToMenuCallback: null, isSettingsOpen: true });

    // Should not throw
    expect(() => useSettingsStore.getState().triggerReturnToMenu()).not.toThrow();
    expect(useSettingsStore.getState().isSettingsOpen).toBe(false);
  });
});
