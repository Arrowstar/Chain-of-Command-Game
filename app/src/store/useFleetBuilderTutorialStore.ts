/**
 * Fleet Builder Tutorial Store — Admiral Reyes dialogue for new campaign setup.
 *
 * Guides players through the three steps of the Fleet Builder:
 *   Step 1 (INIT):    Campaign parameters — difficulty, player count
 *   Step 2 (OFFICERS): Assigning officers to stations
 *   Step 3 (MODULES):  Weapons, subsystems, and the DP budget
 *
 * State persists to localStorage so a player who navigates away mid-setup
 * doesn't lose their place.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface FleetBuilderTutorialStep {
  /** Which Fleet Builder wizard step (1=INIT, 2=OFFICERS, 3=MODULES) to show this on */
  fleetBuilderStep: 1 | 2 | 3;
  /** Admiral's dialogue for this step */
  dialogue: string;
}

export interface FleetBuilderTutorialStore {
  isActive: boolean;
  isDismissed: boolean; // user has permanently closed this tutorial session
  currentStep: number;
  steps: FleetBuilderTutorialStep[];
  historyStack: number[];

  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  dismiss: () => void;
  resetForNewCampaign: () => void;
  /** Returns the current step for the given fleet builder wizard page, or null if none. */
  getStepForPage: (page: 1 | 2 | 3) => FleetBuilderTutorialStep | null;
}

// ─────────────────────────────────────────────────────────────
// Script
// ─────────────────────────────────────────────────────────────

export const FLEET_BUILDER_STEPS: FleetBuilderTutorialStep[] = [
  // ── Step 1: Campaign Init ──────────────────────────────────
  {
    fleetBuilderStep: 1,
    dialogue:
      '**CAMPAIGN BRIEFING — DEPLOYMENT COMMAND**\n\n' +
      'Welcome to Deployment Command, Captain. Before we throw you into the Hegemony\'s teeth, ' +
      'you need to put together a fleet.\n\n' +
      'First things first: choose your **Difficulty**.\n\n' +
      '• **Easy** gives you 130 Deployment Points (DP) — more gear, more options.\n' +
      '• **Normal** is 115 DP — the intended experience.\n' +
      '• **Hard** is 100 DP — less gear, more decisions. Veterans only.\n\n' +
      'DP is your currency for everything: the ship chassis, your officers, weapons, and subsystems. ' +
      'Every choice costs DP. Go over budget and you can\'t launch.\n\n' +
      'Set your difficulty, then proceed to officer selection.',
  },

  // ── Step 2: Officers ───────────────────────────────────────
  {
    fleetBuilderStep: 2,
    dialogue:
      '**OFFICERS — YOUR BRIDGE CREW**\n\n' +
      'Your ship runs on four stations: **Helm**, **Tactical**, **Engineering**, and **Sensors**. ' +
      'You need one officer per station. Choose carefully.\n\n' +
      'Each officer has a unique **Trait** that activates on a skill die roll during combat. ' +
      'Hover their name to read the full trait description.\n\n' +
      'The **Tier** (Rookie → Veteran → Elite → Legendary) determines their skill die size — ' +
      'bigger die means more reliable trait procs, but higher DP cost.\n\n' +
      'Officers also have a **Stress Limit** — the number of actions they can take before they ' +
      'start risking a Fumble. Higher limits give you more flexibility.\n\n' +
      'Fill all four stations before moving on to weapons and modules.',
  },

  // ── Step 3: Modules ───────────────────────────────────────
  {
    fleetBuilderStep: 3,
    dialogue:
      '**MODULES — WEAPONS & SUBSYSTEMS**\n\n' +
      'Now arm your ship. You have **weapon slots** and **subsystem slots** to fill.\n\n' +
      '• **Weapons** determine your offensive capability. Check their **firing arcs** — ' +
      'a weapon you can\'t bring to bear on an enemy is dead weight. The loadout preview ' +
      'on the right shows your arc coverage visually.\n' +
      '• **Subsystems** provide passive bonuses or new actions: shields, sensors boosts, ' +
      'special maneuvers, and more.\n\n' +
      'Watch the **DP Budget bar** at the top — going over budget locks the Launch button. ' +
      'You need at least **one weapon** to deploy.\n\n' +
      'When every player\'s ship is fully kitted and within budget, hit **LAUNCH CAMPAIGN**. ' +
      'Good luck, Captain. The fleet is counting on you.\n\n' +
      '— Admiral Reyes',
  },
];

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useFleetBuilderTutorialStore = create<FleetBuilderTutorialStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      isDismissed: false,
      currentStep: 0,
      steps: FLEET_BUILDER_STEPS,
      historyStack: [],

      startTutorial: () => {
        set({
          isActive: true,
          isDismissed: false,
          currentStep: 0,
          historyStack: [],
        });
      },

      nextStep: () => {
        const { currentStep, steps, historyStack } = get();
        const nextIndex = currentStep + 1;
        if (nextIndex >= steps.length) {
          // All steps complete — dismiss automatically
          set({ isDismissed: true, isActive: false });
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
        set({ isDismissed: true, isActive: false });
      },

      resetForNewCampaign: () => {
        set({
          isActive: true,
          isDismissed: false,
          currentStep: 0,
          historyStack: [],
        });
      },

      getStepForPage: (page) => {
        const { currentStep, steps, isActive, isDismissed } = get();
        if (!isActive || isDismissed) return null;
        const step = steps[currentStep];
        if (!step || step.fleetBuilderStep !== page) return null;
        return step;
      },
    }),
    {
      name: 'fleet-builder-tutorial-store',
      partialize: (state) => ({
        isActive: state.isActive,
        isDismissed: state.isDismissed,
        currentStep: state.currentStep,
        historyStack: state.historyStack,
      }),
    },
  ),
);
