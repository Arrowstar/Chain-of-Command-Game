import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════════════
// Settings Store — Audio volume and settings modal visibility
//
// Volumes are stored in plain module-level state (not localStorage
// middleware) to keep the store synchronous and test-friendly.
// On first load, we read from localStorage once; on every change we
// write back manually.
// ═══════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'coc-settings';

interface PersistedSettings {
  musicVolume: number;
  sfxVolume: number;
}

function loadFromStorage(): PersistedSettings {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
      return {
        musicVolume: typeof parsed.musicVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.musicVolume))
          : 0.15,
        sfxVolume: typeof parsed.sfxVolume === 'number'
          ? Math.max(0, Math.min(1, parsed.sfxVolume))
          : 0.5,
      };
    }
  } catch {
    // Ignore JSON / storage errors (e.g. private browsing)
  }
  return { musicVolume: 0.15, sfxVolume: 0.5 };
}

function saveToStorage(settings: PersistedSettings): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore storage errors
  }
}

// ─── Store interface ─────────────────────────────────────────────

export interface SettingsStore {
  /** BGM playback volume, 0–1 */
  musicVolume: number;
  /** Button-click and SFX volume, 0–1 */
  sfxVolume: number;
  /** Whether the settings modal is currently visible */
  isSettingsOpen: boolean;

  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  openSettings: () => void;
  closeSettings: () => void;
}

// ─── Store ───────────────────────────────────────────────────────

const initial = loadFromStorage();

export const useSettingsStore = create<SettingsStore>((set) => ({
  musicVolume: initial.musicVolume,
  sfxVolume: initial.sfxVolume,
  isSettingsOpen: false,

  setMusicVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    set((s) => {
      saveToStorage({ musicVolume: clamped, sfxVolume: s.sfxVolume });
      return { musicVolume: clamped };
    });
  },

  setSfxVolume: (v) => {
    const clamped = Math.max(0, Math.min(1, v));
    set((s) => {
      saveToStorage({ musicVolume: s.musicVolume, sfxVolume: clamped });
      return { sfxVolume: clamped };
    });
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
