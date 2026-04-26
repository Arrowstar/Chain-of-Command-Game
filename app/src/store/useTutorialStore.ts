/**
 * Tutorial Store — Manages the state and script for the combat tutorial.
 *
 * Architecture:
 * - `steps` is the full tutorial script array (dialogue + highlight metadata).
 * - `currentStep` is the index into that array.
 * - `isActive` gates whether the overlay is rendered.
 * - `waitingForCondition` is set when a step requires the player to take a
 *   game action before "Next" becomes available (e.g., reaching the Command Phase).
 */

import { create } from 'zustand';

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
  | 'EXECUTE_CLICKED';   // Wait until "EXECUTE ORDERS" is clicked (phase flips to execution)

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
}

export interface TutorialStore {
  isActive: boolean;
  isHidden: boolean; // True when temporarily hidden waiting for user action
  currentStep: number;
  steps: TutorialStep[];
  isFreePlay: boolean;  // true once the hand-holding script ends

  startTutorial: () => void;
  nextStep: () => void;
  endTutorial: () => void;
  releaseFreePlay: () => void;
  hideTutorial: () => void;
  unhideTutorial: () => void;
}

// ─────────────────────────────────────────────────────────────
// Tutorial Script
// ─────────────────────────────────────────────────────────────

/**
 * Admiral Reyes' combat tutorial script.
 *
 * Each step covers a specific widget or mechanic visible in the Combat UI.
 * The script is structured to walk through a full two-round combat cycle
 * hand-in-hand with the player, then release them to finish on their own.
 */
const TUTORIAL_STEPS: TutorialStep[] = [
  // ── Introduction ──────────────────────────────────────────
  {
    dialogue:
      'At ease, Captain. I\'m Fleet Admiral Reyes — and this is your orientation exercise.\n\n' +
      'Before I throw you into a live engagement, I\'m going to walk you through every panel, ' +
      'every widget, and every button on that bridge console. Pay attention; your crew\'s lives ' +
      'depend on how fast you learn.\n\n' +
      'We have a single Hegemony Hunter-Killer on the board. Small, fast, and very mean. ' +
      'By the time we\'re done, you\'ll know exactly how to handle it — and anything else the ' +
      'Hegemony throws at you.',
  },

  // ── The Briefing Phase ────────────────────────────────────
  {
    dialogue:
      '**THE BRIEFING PHASE**\n\n' +
      'At the start of each round, you\'ll see the Intelligence Briefing screen. ' +
      'It tells you two critical things:\n\n' +
      '1. The **Rules of Engagement (RoE)** — a standing order from High Command that modifies ' +
      'the rules for the entire mission. Read it carefully. You can override it for -3 Fleet ' +
      'Favor if it\'s actively hurting you.\n\n' +
      '2. The **Enemy Tactic** — the Hegemony\'s active doctrine this round. It changes their ' +
      'behavior and may impose restrictions on your forces. Plan around it.\n\n' +
      '3. **Scenario Objectives** — your mission goals and the current round count. Know when the ' +
      'clock is running out.\n\n' +
      'When you\'re done reviewing, press "Proceed to Command Phase" to begin planning.',
    highlightId: 'briefing-overlay',
    waitForCondition: 'PHASE_COMMAND',
    conditionHint: 'Click "Proceed to Command Phase" on the Briefing screen to continue.',
  },

  // ── The Hex Map ───────────────────────────────────────────
  {
    dialogue:
      '**THE TACTICAL MAP — LEFT PANEL**\n\n' +
      'The large hexagonal grid on your left is the Tactical Map. ' +
      'This is where the battle is fought — every ship, every terrain feature, and every ' +
      'small craft token exists on these hexes.\n\n' +
      '• Cyan icons are your ships. Red icons are enemies.\n' +
      '• The arcs radiating from each ship\'s icon represent its Shield Sectors ' +
      '(fore, aft, port, starboard). Each arc\'s brightness shows current shield strength.\n' +
      '• The bar beneath each ship icon is its Hull integrity.\n\n' +
      'Hover over any ship on the map to see its detailed stats in a tooltip.',
    highlightId: 'hex-map-container',
  },

  // ── Terrain ───────────────────────────────────────────────
  {
    dialogue:
      '**TERRAIN**\n\n' +
      'Those grey clusters and hazy patches on the map are terrain. Two types are on this board:\n\n' +
      '• **Asteroid Fields** (dark grey) — Entering one requires a D6 roll on 4+ or your ship ' +
      'takes hull damage. They also increase TN (target number) for weapons firing through them.\n' +
      '• **Debris Fields** (lighter haze) — Movement penalty but no entry roll. ' +
      'Slightly harder for enemies to target you inside one.\n\n' +
      'Use terrain to break line of sight or force enemies into it — just watch your own hull.',
  },

  // ── Command Token Pool ────────────────────────────────────
  {
    dialogue:
      '**COMMAND TOKEN POOL — TOP RIGHT**\n\n' +
      'Those glowing hexagonal chips at the top of your console are your **Command Tokens (CT)**. ' +
      'This is your action budget for the round.\n\n' +
      '• Each token costs 1 CT to spend. Your ship generates 3 CT per round by default.\n' +
      '• Spent tokens are spent — you can\'t un-spend them once the round executes.\n' +
      '• Hovering over the CT pool shows your breakdown: base generation, any bonuses or ' +
      'penalties from critical damage, RoE, or ship traits.\n\n' +
      'To spend a token, **drag it** from this pool onto one of the Action Slots on your ' +
      'Bridge Officer Station panels below.',
    highlightId: 'captain-hand',
  },

  // ── Fleet Assets Panel ────────────────────────────────────
  {
    dialogue:
      '**FLEET ASSETS — SHARED RESERVES**\n\n' +
      'Next to your CT pool is the **Fleet Assets** panel showing your current **Fleet Favor (FF)**. ' +
      'Fleet Favor is a shared strategic currency — think of it as political capital ' +
      'you spend to call in favors from the fleet.\n\n' +
      'Click "Open Fleet Assets" to see the menu. From there you can:\n' +
      '• **Tactical Override** — grant a ship an extra action this round.\n' +
      '• **Emergency Reinforcement** — give a ship +1 CT right now.\n' +
      '• **Targeting Package** — improve a specific attack\'s accuracy.\n' +
      '• **Morale / Discipline** — remove stress or unlock a fumbled station.\n' +
      '• **Escort Support Call** — call in an off-board escort for various effects.\n' +
      '• And more.\n\n' +
      'These are powerful and limited — save them for when they matter.',
    highlightId: 'fleet-assets-panel',
  },

  // ── Show Objectives / Enemy Tactic Buttons ────────────────
  {
    dialogue:
      '**TOP-CENTER BUTTONS — OBJECTIVES & ENEMY TACTIC**\n\n' +
      'At the top-center of the screen you\'ll see two quick-reference buttons:\n\n' +
      '• **SHOW OBJECTIVES** — pulls up the current scenario\'s victory and defeat conditions ' +
      'along with real-time progress. Never lose track of what you\'re fighting for.\n\n' +
      '• **SHOW ENEMY TACTIC** — shows the Hegemony\'s current doctrine card. ' +
      'A red dot appears when a new tactic is in play and you haven\'t reviewed it yet. ' +
      'Always read the enemy tactic — it tells you how the AI will behave this round.\n\n' +
      'Both panels are collapsible and don\'t block gameplay.',
    highlightId: 'top-center-buttons',
  },

  // ── Helm Station ──────────────────────────────────────────
  {
    dialogue:
      '**HELM STATION — NAVIGATION**\n\n' +
      'The four officer panels on your console are your bridge crew. ' +
      'Each officer handles a specific domain of ship operations.\n\n' +
      'The **Helm Station** controls your ship\'s movement:\n' +
      '• **Adjust Speed** (1 CT) — increase or decrease current speed by 1. ' +
      'Speed determines how far your ship drifts during execution.\n' +
      '• **Rotate** (1 CT, 1 Stress) — turn the ship 60 degrees in either direction. ' +
      'Facing matters — shields and weapons have arc restrictions.\n' +
      '• **Evasive Pattern** (2 CT, 2 Stress) — boost your base evasion this round, ' +
      'making you harder to hit.\n\n' +
      'The officer portrait shows their name and trait. Hover the name to read the full ' +
      'trait description. The rank shown (Rookie → Veteran → Elite → Legendary) determines ' +
      'their skill die size for special procs.',
    highlightId: 'officer-station-helm',
  },

  // ── Stress Bar ────────────────────────────────────────────
  {
    dialogue:
      '**STRESS — THE OFFICER RESOURCE**\n\n' +
      'Every action that costs Stress pushes that officer closer to their limit. ' +
      'The **Stress Bar** under each officer portrait tracks this in real-time.\n\n' +
      '• When Stress reaches the officer\'s maximum (usually 4–5), they **Fumble** their next action.\n' +
      '• A Fumble draws a Fumble Card — bad things happen: stations lock, penalties apply, ' +
      'sometimes the entire fleet takes a hit to Fleet Favor.\n' +
      '• Stress recovers partially at the end of each round during the **Cleanup Phase**.\n\n' +
      'Managing stress is as important as managing tokens. Don\'t push an officer past their limit ' +
      'unless the situation demands it.',
    highlightId: 'officer-station-helm',
  },

  // ── Tactical Station ──────────────────────────────────────
  {
    dialogue:
      '**TACTICAL STATION — WEAPONS**\n\n' +
      'The **Tactical Station** is your teeth:\n' +
      '• **Fire Primary** (1 CT, 1 Stress) — select a weapon from your ship\'s loadout and ' +
      'roll its Volley Pool against a valid target. You\'ll be asked to click the target on the map.\n' +
      '• **Load Ordnance** (1 CT) — reload an expended [Ordnance] weapon like a torpedo tube. ' +
      'This only appears if your ship carries ordnance.\n' +
      '• **Vector Orders** (1 CT) — assign your Strike Fighter tokens to attack a specific enemy ' +
      'ship every round until redirected.\n\n' +
      'Your weapon loadout is in your ship\'s chassis. The Perseverance carries a **Plasma Lance** ' +
      '(medium-range energy beam) and a **Rail Barrage** (broad-arc kinetic volley). ' +
      'Both have arc restrictions — you may need to rotate before firing.',
    highlightId: 'officer-station-tactical',
  },

  // ── Engineering Station ───────────────────────────────────
  {
    dialogue:
      '**ENGINEERING STATION — DEFENSE & REPAIR**\n\n' +
      'The **Engineering Station** keeps your ship in the fight:\n' +
      '• **Reinforce Shields** (1 CT, 1 Stress) — restore 2 Shield points to any one arc sector. ' +
      'Choose the arc that\'s taking the most fire.\n' +
      '• **Damage Control** (2 CT, 2 Stress) — repair 1 Hull point, or attempt to clear an ' +
      'active Critical Damage card (roll 4+ on D6).\n' +
      '• **Reroute Power** (1 CT, 3 Stress) — sacrifice stress now to gain +2 CT at the start ' +
      'of the next round. A calculated risk when you need burst resources.\n' +
      '• **Steady Nerves** (1 CT, 1 Stress) — reduce one allied officer\'s stress by 1 during ' +
      'execution. Prevents a fumble in a pinch.\n\n' +
      'Engineering is your lifeline. Don\'t neglect it.',
    highlightId: 'officer-station-engineering',
  },

  // ── Sensors Station ───────────────────────────────────────
  {
    dialogue:
      '**SENSORS STATION — INTELLIGENCE & ELECTRONIC WARFARE**\n\n' +
      'The **Sensors Station** gives you the edge:\n' +
      '• **Target Lock** (1 CT) — lower the TN on a specific enemy by 1 for this round. ' +
      'The officer\'s skill die may improve it further on a 4+ roll.\n' +
      '• **Cyber-Warfare** (2 CT, 2 Stress) — remotely collapse an enemy ship\'s shield ' +
      'sector, dropping it to 0. Then hammer that arc with weapons while it\'s exposed.\n\n' +
      'The combination of Target Lock → Fire Primary on the same enemy in one round is ' +
      'highly effective. Plan the order of operations: lock first, then shoot.',
    highlightId: 'officer-station-sensors',
  },

  // ── Action Slots ──────────────────────────────────────────
  {
    dialogue:
      '**HOW TO QUEUE ACTIONS — DRAG AND DROP**\n\n' +
      'Now that you know what each station does, let\'s talk mechanics.\n\n' +
      'To assign an action:\n' +
      '1. Find an available Command Token in the **CT Pool** at the top.\n' +
      '2. **Drag** it down onto the desired Action Slot in any officer panel.\n' +
      '3. The slot will highlight when a token is hovering over it.\n' +
      '4. Drop the token — the action is now queued.\n\n' +
      'You can queue multiple actions across different officers in the same round. ' +
      'The CT cost is deducted immediately. If you change your mind, click the queued ' +
      'token on the action slot to remove it and recover the CT.\n\n' +
      'Go ahead and queue at least one action right now.',
    waitForCondition: 'TOKEN_ASSIGNED',
    conditionHint: 'Drag a Command Token onto an Action Slot to continue.',
  },

  // ── Execute Orders Button ─────────────────────────────────
  {
    dialogue:
      '**EXECUTE ORDERS — LOCKING IN YOUR PLAN**\n\n' +
      'At the bottom of your console is the glowing **EXECUTE ORDERS** button. ' +
      'This is the point of no return for your planning phase.\n\n' +
      'Once you click it:\n' +
      '• All queued actions lock in.\n' +
      '• The game transitions to the **Execution Phase**.\n' +
      '• Actions resolve in initiative order — small ships first, then medium, then large.\n\n' +
      'You can assign as many or as few actions as you want before executing. ' +
      'Unspent tokens are simply wasted — there\'s no "save for later."\n\n' +
      'Ready? Click **EXECUTE ORDERS** to begin execution.',
    highlightId: 'execute-button',
    waitForCondition: 'PHASE_EXECUTION',
    conditionHint: 'Click "EXECUTE ORDERS" to proceed to the Execution Phase.',
  },

  // ── Execution Phase Overview ──────────────────────────────
  {
    dialogue:
      '**EXECUTION PHASE — RESOLVING ACTIONS**\n\n' +
      'Your console has switched to the **Execution Panel**. ' +
      'This is where your orders become reality.\n\n' +
      'Actions resolve in a strict sequence by ship size:\n' +
      '1. Small Allied ships → Small Enemy ships\n' +
      '2. Medium Allied → Medium Enemy\n' +
      '3. Large Allied → Large Enemy\n\n' +
      'The current active step is shown in the header. For each step, you\'ll see:\n' +
      '• **Mandatory Drift** — your ship moves automatically based on its current speed. ' +
      'Resolve this first before your actions.\n' +
      '• **Queued Actions** — the actions you assigned during Command Phase, listed in order.\n\n' +
      'Resolve actions from top to bottom. For enemy steps, click "Automate Enemy Turn" — ' +
      'the AI handles everything automatically.',
    highlightId: 'execution-panel',
  },

  // ── Resolving Actions ─────────────────────────────────────
  {
    dialogue:
      '**RESOLVING YOUR ACTIONS**\n\n' +
      'For each queued action, click the **RESOLVE** button (or **OPTIONS...** for actions that ' +
      'need a choice).\n\n' +
      '• **Drift** must always be resolved first — the ship won\'t let you do anything else until ' +
      'it moves.\n' +
      '• Actions that need a target (Fire Primary, Target Lock, etc.) will ask you to click a ' +
      'ship on the Tactical Map after you hit the button.\n' +
      '• When you fire a weapon, a **Volley Resolution** modal pops up showing every dice roll, ' +
      'hits vs. shields vs. hull, and any critical damage triggered.\n\n' +
      'Once all actions for your ship are resolved and a green ✓ COMPLETE badge appears, ' +
      'click **Next Step** to hand control to the enemy.',
  },

  // ── Enemy Turn ────────────────────────────────────────────
  {
    dialogue:
      '**ENEMY TURN — AUTOMATE IT**\n\n' +
      'When it\'s the enemy\'s step, a red panel appears with the **"Automate Enemy Turn"** button. ' +
      'The enemy is fully AI-controlled — you don\'t make decisions for it.\n\n' +
      'When you click the button, the enemy ship will:\n' +
      '1. Drift according to its speed.\n' +
      '2. Execute its AI doctrine (the Hunter-Killer will try to close distance and attack).\n' +
      '3. Log all actions in the **Game Log**.\n\n' +
      'After the enemy resolves, click **Next Step** to continue through the sequence. ' +
      'Once all six steps are complete, the round advances to the **Cleanup Phase** automatically.',
  },

  // ── Game Log ──────────────────────────────────────────────
  {
    dialogue:
      '**GAME LOG — THE RECORD OF BATTLE**\n\n' +
      'On the far left edge of the screen you\'ll see a collapsible **Game Log**. ' +
      'Every action, every dice roll, every critical hit — it\'s all recorded there in chronological order.\n\n' +
      '• A blue badge shows the number of unread entries.\n' +
      '• Click the log icon (or the edge panel) to expand it.\n' +
      '• Entries are color-coded by type: combat hits in red, system events in grey, ' +
      'phase transitions in amber.\n\n' +
      'When you\'re unsure what just happened, the log has the answer.',
    highlightId: 'game-log-tab',
  },

  // ── Cleanup Phase ─────────────────────────────────────────
  {
    dialogue:
      '**CLEANUP PHASE — END OF ROUND HOUSEKEEPING**\n\n' +
      'After all execution steps resolve, the round enters the **Cleanup Phase**. ' +
      'This happens automatically — you don\'t need to click anything.\n\n' +
      'During cleanup:\n' +
      '• Officer Stress **recovers** by 1 (or more, depending on traits).\n' +
      '• Shields **regenerate** by 1 per sector on all ships (both yours and the enemy).\n' +
      '• Temporary effects (Target Locks, tactic hazards) expire.\n' +
      '• The game logs all changes.\n\n' +
      'Then the round counter increments and you\'re back to the Briefing Phase for Round 2.',
    waitForCondition: 'ROUND_2',
    conditionHint: 'Complete the Execution Phase to advance to Round 2.',
  },

  // ── Round 2 Introduction ──────────────────────────────────
  {
    dialogue:
      '**ROUND 2 — THE TACTIC CHANGES**\n\n' +
      'Welcome to Round 2. Notice a few things at the Briefing:\n\n' +
      '• A **new Enemy Tactic** has been drawn. The red indicator dot will appear when you ' +
      'haven\'t read it yet — always review it before planning.\n' +
      '• Your **Command Tokens are replenished** fully. You start fresh each round.\n' +
      '• Check your officers\' Stress. Some recovered during cleanup; some may still be elevated.\n\n' +
      'This round, I want you to try a combined-arms play:\n' +
      '1. Use **Target Lock** (Sensors) to mark the Hunter-Killer.\n' +
      '2. Then **Fire Primary** (Tactical) at that same target.\n\n' +
      'The Target Lock lowers the TN — your weapons hit more often.',
    waitForCondition: 'PHASE_COMMAND',
    conditionHint: 'Click "Proceed to Command Phase" on the Briefing screen.',
  },

  // ── Critical Damage ───────────────────────────────────────
  {
    dialogue:
      '**CRITICAL DAMAGE — WHEN THINGS GO WRONG**\n\n' +
      'When hull damage drops below 50% for the first time, and sometimes on particularly ' +
      'devastating hits, your ship may draw a **Critical Damage Card**.\n\n' +
      'Crits are bad. They impose lasting effects that persist until repaired:\n' +
      '• Weapons offline, stations locked, shield sectors stripped, hull bleeding per round.\n' +
      '• You can attempt to clear a crit using **Damage Control** (Engineering) — roll 4+ on D6.\n' +
      '• A failed repair roll means you\'re stuck with it another round.\n\n' +
      'Enemy ships also take critical damage — so keep hammering them. ' +
      'A crit on the enemy\'s fire control makes their volleys less accurate.',
  },

  // ── Fumbles ───────────────────────────────────────────────
  {
    dialogue:
      '**FUMBLES — WHEN OFFICERS CRACK UNDER PRESSURE**\n\n' +
      'When an officer\'s Stress reaches their maximum and they\'re assigned another action, ' +
      'they **Fumble**. A Fumble Card is drawn from the deck immediately.\n\n' +
      'Fumbles can:\n' +
      '• Cancel the action and refund the CT.\n' +
      '• Lock the station for 1–2 rounds (that officer is useless until unlocked).\n' +
      '• Cause collateral damage — fleet favor loss, random drift, shields stripped.\n\n' +
      'You can recover from fumbles:\n' +
      '• **Steady Nerves** (Engineering) reduces stress by 1 during execution.\n' +
      '• **Morale / Discipline** (Fleet Asset) can unlock a locked station or remove stress.\n\n' +
      'Prevention is easier than recovery. Watch your stress bars.',
  },

  // ── Releasing Control ─────────────────────────────────────
  {
    dialogue:
      '**YOUR BRIDGE. YOUR COMMAND.**\n\n' +
      'Alright, Captain — that\'s everything I\'ve got for you on the theory. ' +
      'You\'ve seen every panel, every phase, and every mechanic on this bridge.\n\n' +
      'The Hunter-Killer is still out there. It\'s time to finish the job on your own.\n\n' +
      'From here, the tutorial overlay will stand down. ' +
      'You\'re in full command. Destroy that ship and the exercise is complete.\n\n' +
      'Good hunting. Don\'t embarrass the fleet.\n\n' +
      '— Admiral Reyes',
  },
];

// ─────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  isActive: false,
  isHidden: false,
  currentStep: 0,
  steps: TUTORIAL_STEPS,
  isFreePlay: false,

  startTutorial: () => {
    set({
      isActive: true,
      isHidden: false,
      currentStep: 0,
      isFreePlay: false,
    });
  },

  nextStep: () => {
    const { currentStep, steps } = get();
    const nextIndex = currentStep + 1;

    if (nextIndex >= steps.length) {
      // Script finished — release the player
      set({ isFreePlay: true, currentStep: nextIndex, isHidden: false });
    } else {
      set({ currentStep: nextIndex, isHidden: false });
    }
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
    });
  },

  hideTutorial: () => {
    set({ isHidden: true });
  },

  unhideTutorial: () => {
    set({ isHidden: false });
  },
}));
