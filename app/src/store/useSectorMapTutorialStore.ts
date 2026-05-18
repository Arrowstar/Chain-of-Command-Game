/**
 * Sector Map Tutorial Store — One-time node legend tutorial for new campaigns.
 *
 * Shows Admiral Reyes explaining the sector map UI on the player's first
 * campaign. Persists to localStorage so it only triggers once per device.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SectorMapTutorialStep {
  dialogue: string;
}

export interface SectorMapTutorialStore {
  hasSeenSectorMap: boolean; // persisted — once true, never shows again
  isActive: boolean;
  currentStep: number;
  steps: SectorMapTutorialStep[];
  historyStack: number[];

  /** Call when the sector map first loads. Will activate if not yet seen. */
  tryActivate: () => void;
  nextStep: () => void;
  previousStep: () => void;
  dismiss: () => void;
}

// ─────────────────────────────────────────────────────────────
// Script
// ─────────────────────────────────────────────────────────────

export const SECTOR_MAP_STEPS: SectorMapTutorialStep[] = [
  {
    dialogue:
      '**THE SECTOR MAP — CAMPAIGN NAVIGATION**\n\n' +
      'This is the Sector Map — your strategic command center between battles. ' +
      'Each **node** represents a location in the Hegemony occupation zone.\n\n' +
      'Your current position is marked by the **pulsing blue star**. ' +
      'Nodes connected by lines are reachable. Tap a **glowing node** to advance.\n\n' +
      'Node colors tell you what to expect:\n' +
      '• ⚪ **Combat** — standard Hegemony engagement\n' +
      '• 🔴 **Elite** — harder opposition, better rewards\n' +
      '• 🟡 **Event** — a strategic choice or story moment\n' +
      '• 🟢 **Haven** — rest your crew, reduce stress, repair scars\n' +
      '• 💀 **Boss** — the sector climax\n\n' +
      'You don\'t have to rush. Study the path before you commit.',
  },
  {
    dialogue:
      '**FLEET FAVOR — YOUR STRATEGIC CURRENCY**\n\n' +
      'See the **Fleet Favor** counter at the top? That\'s your campaign resource.\n\n' +
      'Earn FF by winning engagements cleanly — low casualties, fast victories. ' +
      'Spend it on:\n' +
      '• **Fleet Assets** during combat (Tactical Overrides, Emergency Reinforcements, etc.)\n' +
      '• **Overriding a Rules of Engagement** card that\'s hurting you (costs -3 FF)\n' +
      '• **Haven upgrades** — healing your crew, clearing officer scars\n\n' +
      'Negative FF at the start of a mission inflicts morale stress on your crew. ' +
      'Don\'t let it slip below zero.\n\n' +
      'Plan your path, Captain. The Hegemony isn\'t going to wait.\n\n' +
      '— Admiral Reyes',
  },
];

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useSectorMapTutorialStore = create<SectorMapTutorialStore>()(
  persist(
    (set, get) => ({
      hasSeenSectorMap: false,
      isActive: false,
      currentStep: 0,
      steps: SECTOR_MAP_STEPS,
      historyStack: [],

      tryActivate: () => {
        const { hasSeenSectorMap } = get();
        if (!hasSeenSectorMap) {
          set({ isActive: true, currentStep: 0, historyStack: [] });
        }
      },

      nextStep: () => {
        const { currentStep, steps, historyStack } = get();
        const nextIndex = currentStep + 1;
        if (nextIndex >= steps.length) {
          // All steps done — mark as seen and dismiss
          set({ isActive: false, hasSeenSectorMap: true });
        } else {
          set({
            currentStep: nextIndex,
            historyStack: [...historyStack, currentStep],
          });
        }
      },

      previousStep: () => {
        const { historyStack } = get();
        if (historyStack.length === 0) return;
        const prev = historyStack[historyStack.length - 1];
        set({
          currentStep: prev,
          historyStack: historyStack.slice(0, -1),
        });
      },

      dismiss: () => {
        set({ isActive: false, hasSeenSectorMap: true });
      },
    }),
    {
      name: 'sector-map-tutorial-store',
      partialize: (state) => ({
        hasSeenSectorMap: state.hasSeenSectorMap,
        // Don't persist mid-session active state — always re-evaluate via tryActivate
      }),
    },
  ),
);
