import { renderHook } from '@testing-library/react';
import { useBgm } from './useBgm';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { App as CapacitorApp } from '@capacitor/app';

// Mock useSettingsStore
vi.mock('../store/useSettingsStore', () => ({
  useSettingsStore: vi.fn((selector) => selector({ musicVolume: 0.5 })),
}));

// Mock Capacitor App
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  },
}));

describe('useBgm', () => {
  let mockPlay: any;
  let mockPause: any;
  let originalAudio: any;

  beforeEach(() => {
    mockPlay = vi.fn(() => Promise.resolve());
    mockPause = vi.fn();

    originalAudio = global.Audio;
    
    // Mock the HTML Audio element
    global.Audio = vi.fn().mockImplementation(function() {
      return {
        play: mockPlay,
        pause: mockPause,
        loop: false,
        volume: 1,
        src: '',
      };
    }) as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    global.Audio = originalAudio;
    vi.restoreAllMocks();
  });

  it('initializes audio and attempts playback on mount', () => {
    renderHook(() => useBgm('test.mp3'));
    
    expect(global.Audio).toHaveBeenCalledWith('test.mp3');
    expect(mockPlay).toHaveBeenCalled();
  });

  it('cleans up audio on unmount', () => {
    const { unmount } = renderHook(() => useBgm('test.mp3'));
    
    unmount();
    
    expect(mockPause).toHaveBeenCalled();
  });

  it('pauses music when document becomes hidden', async () => {
    renderHook(() => useBgm('test.mp3'));
    
    // Allow the initial play promise to resolve
    await Promise.resolve();

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(mockPause).toHaveBeenCalled();
  });

  it('resumes music when document becomes visible again', async () => {
    renderHook(() => useBgm('test.mp3'));
    
    // Allow the initial play promise to resolve so playedRef.current becomes true
    await Promise.resolve();
    // Also wait a tick for the promise chain in the hook
    await new Promise(resolve => setTimeout(resolve, 0));

    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    
    mockPlay.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(mockPlay).toHaveBeenCalled();
  });

  it('pauses and resumes on capacitor appStateChange', async () => {
    let appStateCallback: any;
    
    (CapacitorApp.addListener as any).mockImplementation((event: string, cb: any) => {
      if (event === 'appStateChange') {
        appStateCallback = cb;
      }
      return Promise.resolve({ remove: vi.fn() });
    });

    renderHook(() => useBgm('test.mp3'));
    
    // Allow the initial play promise to resolve
    await Promise.resolve();
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(appStateCallback).toBeDefined();

    // Simulate minimize
    appStateCallback({ isActive: false });
    expect(mockPause).toHaveBeenCalled();

    mockPlay.mockClear();

    // Simulate resume
    appStateCallback({ isActive: true });
    expect(mockPlay).toHaveBeenCalled();
  });
});
