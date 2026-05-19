/**
 * Tutorial Store — Manages the state and script for the combat tutorial.
 *
 * Architecture:
 * - `steps` is the full tutorial script array (dialogue + highlight metadata).
 * - `currentStep` is the index into that array.
 * - `isActive` gates whether the overlay is rendered.
 * - `waitingForCondition` is set when a step requires the player to take a
 *   game action before "Next" becomes available.
 * - `historyStack` tracks previously visited step indices so the player can
 *   go back and re-read content they skipped past. Persisted to localStorage.
 * - `tutorialForcedFumbleArmed` is set by the tutorial at the fumble step;
 *   the game store reads it to guarantee a fumble occurs on next Execute.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type TutorialCondition =
  | 'NONE'               // No condition — Next is always available
  | 'PHASE_COMMAND'      // Wait until game phase reaches 'command'
  | 'PHASE_EXECUTION'    // Wait until game phase reaches 'execution'
  | 'PHASE_CLEANUP'      // Wait until game phase reaches 'cleanup'
  | 'ROUND_2'            // Wait until round 2 begins
  | 'TOKEN_ASSIGNED'     // Wait until at least one token is assigned
  | 'FIRE_PRIMARY_ASSIGNED' // Wait until at least one fire-primary action is queued
  | 'EXECUTE_CLICKED'    // Wait until "EXECUTE ORDERS" is clicked (phase flips to execution)
  | 'FUMBLE_CLEARED'     // Wait until the fumble modal has been dismissed
  | 'SENSOR_LOCK_APPLIED'  // Wait until at least one target lock is on an enemy ship
  | 'DAMAGE_CONTROL_USED'; // Wait until Damage Control has been used this round

export interface TutorialStep {
  /** Admiral's dialogue for this step. Supports \n for paragraph breaks. */
  dialogue: string;
  /** Optional DOM element id to spotlight */
  highlightId?: string;
  /**
   * If set, the "Next" button is disabled until this game-state condition
   * is satisfied. The overlay checks the condition automatically.
   */
  waitForCondition?: TutorialCondition;
  /** Hint text shown below "Next" when waiting for a condition. */
  conditionHint?: string;
  /**
   * If set during the active tutorial, only action slots whose action.id
   * is in this array will be enabled/clickable. All others will be disabled (greyed out).
   */
  allowedActionIds?: string[];
}

export interface TutorialStore {
  isActive: boolean;
  isHidden: boolean; // True when temporarily hidden waiting for user action
  currentStep: number;
  steps: TutorialStep[];
  isFreePlay: boolean;  // true once the hand-holding script ends
  historyStack: number[];  // Previously visited step indices for Back navigation
  tutorialForcedFumbleArmed: boolean; // When true, game store will guarantee a fumble

  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  endTutorial: () => void;
  releaseFreePlay: () => void;
  hideTutorial: () => void;
  unhideTutorial: () => void;
  armTutorialForcedFumble: () => void;
  disarmTutorialForcedFumble: () => void;
}

// ─────────────────────────────────────────────────────────────
// Tutorial Script
// ─────────────────────────────────────────────────────────────

/**
 * Admiral Reyes' combat tutorial script — re-scripted for progressive disclosure.
 *
 * Round 1: Learn to move and shoot (action-first, lore second).
 * Round 2: Learn the crew pressure system (stress, fumbles, sensors, engineering).
 * Free Play: Finish the engagement on your own.
 */
const TUTORIAL_STEPS: TutorialStep[] = [
  // ── Introduction ──────────────────────────────────────────
  {
    dialogue:
      'At ease, Captain. I\'m Fleet Admiral Reyes — and this is your orientation exercise.\n\n' +
      'We have a single Hegemony Hunter-Killer on the board. Small, fast, and very mean. ' +
      'I\'m not going to lecture you — I\'m going to walk you through this fight live.\n\n' +
      'We\'ll handle the basics this round: get your ship moving and get a weapon on target. ' +
      'The rest can wait until you\'ve seen it in action. Ready? Let\'s go.',
  },

  // ── Briefing Phase ────────────────────────────────────────
  {
    dialogue:
      '**THE BRIEFING PHASE**\n\n' +
      'Every round starts here. Two things matter:\n\n' +
      '1. **Rules of Engagement (RoE)** — High Command\'s standing order for this mission. ' +
      'It modifies the rules. Spend -3 Fleet Favor to override it if it\'s hurting you.\n\n' +
      '2. **Enemy Tactic** — The Hegemony\'s active doctrine. It changes how the enemy behaves. ' +
      'A red dot appears when a new tactic is in play and you haven\'t read it.\n\n' +
      'Hit "Proceed to Command Phase" when you\'re ready to plan.',
    highlightId: 'briefing-overlay',
    waitForCondition: 'PHASE_COMMAND',
    conditionHint: 'Click "Proceed to Command Phase" on the Briefing screen to continue.',
    allowedActionIds: [],
  },

  // ── Tactical Map ──────────────────────────────────────────
  {
    dialogue:
      '**THE TACTICAL MAP**\n\n' +
      'The hex grid on your left is the battlefield. Cyan icons are your ships. ' +
      'Red icons are enemies.\n\n' +
      '• The glowing arcs around each ship are **Shield Sectors** — fore, aft, port, starboard. ' +
      'Arc brightness = current shield strength.\n' +
      '• The bar beneath each icon is **Hull integrity**.\n\n' +
      'Hover any ship to see its detailed stats. The terrain — those grey clusters — ' +
      'are **Asteroid Fields**. Moving through them without a roll risks hull damage.',
    highlightId: 'hex-map-container',
    allowedActionIds: [],
  },

  // ── Command Tokens ────────────────────────────────────────
  {
    dialogue:
      '**COMMAND TOKENS — YOUR ACTION BUDGET**\n\n' +
      'Those glowing hex chips at the top right are your **Command Tokens (CT)**. ' +
      'Each token you spend buys one officer action this round.\n\n' +
      'To queue an action: **drag a token** from the CT Pool down onto an Action Slot ' +
      'in one of the officer panels below.\n\n' +
      'Start simple. Drag a token onto the **Helm Station** — use "Adjust Speed" or "Rotate" ' +
      'to get your ship moving toward the Hunter-Killer.',
    highlightId: 'captain-hand',
    waitForCondition: 'TOKEN_ASSIGNED',
    conditionHint: 'Drag a Command Token onto an Action Slot to continue.',
    allowedActionIds: ['adjust-speed', 'rotate'],
  },

  // ── Helm Station ──────────────────────────────────────────
  {
    dialogue:
      '**HELM STATION — MOVEMENT**\n\n' +
      'Good. The **Helm Station** controls your ship\'s movement:\n' +
      '• **Adjust Speed** (1 CT) — change speed by ±1. Speed = hexes you drift each execution.\n' +
      '• **Rotate** (1 CT, 1 Stress) — turn 60 degrees. Facing matters for weapons and shields.\n' +
      '• **Evasive Pattern** (2 CT, 2 Stress) — boost your evasion TN for this round.\n\n' +
      'Now queue a **Tactical action** — drag another token onto the Tactical Station ' +
      'and choose "Fire Primary." You\'ll pick a target when the round executes.',
    highlightId: 'officer-station-helm',
    allowedActionIds: ['fire-primary'],
  },

  // ── Tactical Station ──────────────────────────────────────
  {
    dialogue:
      '**TACTICAL STATION — WEAPONS**\n\n' +
      'The **Tactical Station** handles your weapons:\n' +
      '• **Fire Primary** (1 CT, 1 Stress) — select a weapon and roll its dice against a target.\n\n' +
      'The ISS Perseverance carries a **Plasma Lance** (medium energy beam) and a ' +
      '**Rail Barrage** (broad-arc kinetic volley). Both have firing arc restrictions — ' +
      'your facing on the map determines which arcs are available.\n\n' +
      'When you\'re done planning, click **EXECUTE ORDERS** at the bottom of your console.',
    highlightId: 'officer-station-tactical',
    waitForCondition: 'PHASE_EXECUTION',
    conditionHint: 'Click "EXECUTE ORDERS" to proceed to the Execution Phase.',
    allowedActionIds: ['fire-primary'],
  },

  // ── Execution Phase ───────────────────────────────────────
  {
    dialogue:
      '**EXECUTION PHASE — RESOLVING ACTIONS**\n\n' +
      'Your console has switched to the **Execution Panel**. Actions resolve by ship size: ' +
      'small craft first, then medium, then large.\n\n' +
      '• Resolve **Drift** first — your ship moves automatically based on current speed.\n' +
      '• Then resolve each queued action from top to bottom.\n' +
      '• For actions that need a target (like Fire Primary), click the button — ' +
      'then click the enemy ship on the map.\n' +
      '• When the enemy\'s step appears, click **"Automate Enemy Turn"** — ' +
      'the AI handles everything.\n\n' +
      'Work through the full round, then we\'ll talk about what just happened.',
    highlightId: 'execution-panel',
    waitForCondition: 'ROUND_2',
    conditionHint: 'Complete the Execution Phase to advance to Round 2.',
    allowedActionIds: [],
  },

  // ── Round 2 Introduction ──────────────────────────────────
  {
    dialogue:
      '**ROUND 2 — THE CREW PRESSURE SYSTEM**\n\n' +
      'Welcome to Round 2. Your Command Tokens are fully replenished.\n\n' +
      'This round, you\'re going to learn the most important resource in the game: ' +
      '**Stress**. Look at your Tactical Officer\'s stress bar — it\'s already partially filled ' +
      'from last round\'s firing action.\n\n' +
      'Every action an officer takes adds stress. When they hit their maximum, ' +
      'they **Fumble** their next assignment — and bad things happen. ' +
      'You\'re going to see that happen today. Read the Briefing, then let\'s proceed.',
    waitForCondition: 'PHASE_COMMAND',
    conditionHint: 'Click "Proceed to Command Phase" on the Briefing screen.',
    allowedActionIds: [],
  },

  // ── Sensors & Target Lock ─────────────────────────────────
  {
    dialogue:
      '**SENSORS STATION — TARGET LOCK**\n\n' +
      'Let\'s bring our other stations online. The **Sensors Station** gives you the tactical edge:\n' +
      '• **Target Lock** (1 CT, no stress) — lower the TN on a specific enemy by 1 for this round. ' +
      'The officer\'s skill die may improve it further.\n' +
      '• **Cyber-Warfare** (2 CT, 2 Stress) — collapse an enemy shield sector to 0.\n\n' +
      'Queue a **Target Lock** on the Hunter-Killer right now. ' +
      'Target Lock + Fire Primary in the same round is the most efficient attack combo in the game.',
    highlightId: 'officer-station-sensors',
    waitForCondition: 'SENSOR_LOCK_APPLIED',
    conditionHint: 'Queue a Target Lock action on the Sensors Station, then pick the enemy ship.',
    allowedActionIds: ['target-lock'],
  },

  // ── Engineering Station ───────────────────────────────────
  {
    dialogue:
      '**ENGINEERING STATION — REPAIR & DEFENSE**\n\n' +
      'While Sensors paints the target, Engineering keeps you in the fight:\n' +
      '• **Reinforce Shields** (1 CT, 1 Stress) — restore 2 Shield points to any arc sector.\n' +
      '• **Damage Control** (2 CT, 2 Stress) — repair 1 Hull point, or attempt to clear a ' +
      'Critical Damage card (roll 4+ on D6).\n' +
      '• **Reroute Power** (1 CT, 3 Stress) — +2 CT at the start of next round. A risk worth taking.\n' +
      '• **Steady Nerves** (1 CT, 1 Stress) — reduce one officer\'s stress by 1 mid-execution.\n\n' +
      'If you\'re taking hull damage, queue a **Damage Control** action now.',
    highlightId: 'officer-station-engineering',
    waitForCondition: 'DAMAGE_CONTROL_USED',
    conditionHint: 'Queue a Damage Control action on the Engineering Station to continue.',
    allowedActionIds: ['damage-control'],
  },

  // ── Stress Bar ────────────────────────────────────────────
  {
    dialogue:
      '**STRESS — THE OFFICER RESOURCE**\n\n' +
      'The colored bar under each officer\'s portrait is their **Stress Meter**.\n\n' +
      '• Each action that costs Stress fills this bar.\n' +
      '• When Stress **exceeds** the officer\'s maximum, they **Fumble** — ' +
      'a Fumble Card is drawn immediately when you click Execute.\n' +
      '• Stress recovers partially at the end of each round during Cleanup.\n\n' +
      'Your Tactical Officer (Vane) is sitting at high stress right now. ' +
      'I want you to queue **Fire Primary** for Vane again this round.\n\n' +
      'Watch that stress bar. Watch what happens when you click Execute.',
    highlightId: 'officer-station-tactical',
    waitForCondition: 'FIRE_PRIMARY_ASSIGNED',
    conditionHint: 'Queue a Fire Primary action on the Tactical Station to continue.',
    allowedActionIds: ['fire-primary'],
  },

  // ── Fumbles ───────────────────────────────────────────────
  {
    dialogue:
      '**FUMBLES — WHEN OFFICERS CRACK UNDER PRESSURE**\n\n' +
      'Click **EXECUTE ORDERS** — Vane is going to Fumble. Watch what happens.\n\n' +
      'A Fumble Card is drawn when an officer\'s Stress exceeds their limit. Fumbles can:\n' +
      '• Cancel the action and refund the CT.\n' +
      '• Lock the station for 1–2 rounds.\n' +
      '• Cause collateral damage — Fleet Favor loss, random drift, shields stripped.\n\n' +
      'You can recover:\n' +
      '• **Steady Nerves** (Engineering) — reduce an officer\'s stress by 1.\n' +
      '• **Morale / Discipline** (Fleet Assets) — unlock a locked station.\n\n' +
      'Prevention beats recovery. Manage your stress bars.',
    highlightId: 'officer-station-tactical',
    waitForCondition: 'FUMBLE_CLEARED',
    conditionHint: 'Click "EXECUTE ORDERS" to trigger the fumble, then acknowledge the card.',
    allowedActionIds: [],
  },

  // ── Critical Damage ───────────────────────────────────────
  {
    dialogue:
      '**CRITICAL DAMAGE**\n\n' +
      'When hull drops below 50%, or on devastating hits, your ship may draw a ' +
      '**Critical Damage Card**. Crits impose lasting effects until repaired:\n' +
      '• Weapons offline, stations locked, shield sectors stripped, hull bleeding per round.\n' +
      '• Use **Damage Control** to attempt a repair — roll 4+ on D6.\n\n' +
      'Enemy ships take crits too. A crit on their fire control makes their attacks less accurate. ' +
      'Keep hammering.',
    allowedActionIds: [],
  },

  // ── Fleet Assets ──────────────────────────────────────────
  {
    dialogue:
      '**FLEET ASSETS — STRATEGIC RESERVES**\n\n' +
      'Next to your CT Pool is the **Fleet Assets** panel — your **Fleet Favor (FF)** reserve.\n\n' +
      'Click "Open Fleet Assets" to see what\'s available:\n' +
      '• **Tactical Override** — grant a ship an extra action.\n' +
      '• **Emergency Reinforcement** — +1 CT right now.\n' +
      '• **Targeting Package** — improve an attack\'s accuracy.\n' +
      '• **Morale / Discipline** — remove stress or unlock a fumbled station.\n' +
      '• **Escort Support Call** — call in off-board assistance.\n\n' +
      'These are powerful and limited. Save them for when they\'re decisive.',
    highlightId: 'fleet-assets-panel',
    allowedActionIds: [],
  },

  // ── Game Log ──────────────────────────────────────────────
  {
    dialogue:
      '**GAME LOG**\n\n' +
      'The collapsible panel on the far left edge of the screen is your **Game Log**. ' +
      'Every action, every dice roll, every critical hit — recorded in order.\n\n' +
      '• Blue badge = unread entries.\n' +
      '• Entries color-coded: combat hits in red, system events in grey, phase transitions in amber.\n\n' +
      'When you\'re unsure what just happened — the log has the answer.',
    highlightId: 'game-log-tab',
    allowedActionIds: [],
  },

  // ── Free Play Sign-Off ────────────────────────────────────
  {
    dialogue:
      '**YOUR BRIDGE. YOUR COMMAND.**\n\n' +
      'That\'s everything, Captain — every panel, every phase, every mechanic on this bridge.\n\n' +
      'The Hunter-Killer is still out there. ' +
      'The tutorial overlay stands down from here. You\'re in full command.\n\n' +
      'Destroy that ship and the exercise is complete.\n\n' +
      'Good hunting. Don\'t embarrass the fleet.\n\n' +
      '— Admiral Reyes',
    allowedActionIds: [],
  },
];

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      isActive: false,
      isHidden: false,
      currentStep: 0,
      steps: TUTORIAL_STEPS,
      isFreePlay: false,
      historyStack: [],
      tutorialForcedFumbleArmed: false,

      startTutorial: () => {
        set({
          isActive: true,
          isHidden: false,
          currentStep: 0,
          isFreePlay: false,
          historyStack: [],
          tutorialForcedFumbleArmed: false,
        });
      },

      nextStep: () => {
        const { currentStep, steps, historyStack } = get();
        const nextIndex = currentStep + 1;

        if (nextIndex >= steps.length) {
          // Script finished — release the player
          set({
            isFreePlay: true,
            currentStep: nextIndex,
            isHidden: false,
            historyStack: [...historyStack, currentStep],
          });
        } else {
          set({
            currentStep: nextIndex,
            isHidden: false,
            historyStack: [...historyStack, currentStep],
          });
        }
      },

      previousStep: () => {
        const { historyStack, isFreePlay } = get();
        if (isFreePlay || historyStack.length === 0) return;

        const prev = historyStack[historyStack.length - 1];
        set({
          currentStep: prev,
          isHidden: false,
          isFreePlay: false,
          historyStack: historyStack.slice(0, -1),
        });
      },

      releaseFreePlay: () => {
        set({ isFreePlay: true });
      },

      endTutorial: () => {
        set({
          isActive: false,
          isHidden: false,
          currentStep: 0,
          isFreePlay: false,
          historyStack: [],
          tutorialForcedFumbleArmed: false,
        });
      },

      hideTutorial: () => {
        set({ isHidden: true });
      },

      unhideTutorial: () => {
        set({ isHidden: false });
      },

      armTutorialForcedFumble: () => {
        set({ tutorialForcedFumbleArmed: true });
      },

      disarmTutorialForcedFumble: () => {
        set({ tutorialForcedFumbleArmed: false });
      },
    }),
    {
      name: 'tutorial-store',
      // Only persist the navigation/progress state — not the steps array itself
      // (it's derived from the module) or runtime flags like isHidden.
      partialize: (state) => ({
        isActive: state.isActive,
        currentStep: state.currentStep,
        isFreePlay: state.isFreePlay,
        historyStack: state.historyStack,
        tutorialForcedFumbleArmed: state.tutorialForcedFumbleArmed,
      }),
    },
  ),
);
