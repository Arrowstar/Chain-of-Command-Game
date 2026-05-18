# Player Onboarding & Tutorial Assessment

Based on a review of the codebase (specifically `useTutorialStore.ts`, `TutorialOverlay.tsx`, and the tooltip components), here is an assessment of the game's current onboarding experience.

## What's Good

**1. Dedicated, Contextual Combat Tutorial**
The `TutorialOverlay` and `useTutorialStore` provide a structured, in-engine learning environment. It walks the player through the UI during an actual combat scenario rather than relying on a static "How to Play" screen.

**2. Visual Callouts (`useHighlightElement`)**
The tutorial actively pulls focus to specific UI elements (e.g., highlighting the CT Pool, the Execute button, or the Hex Map) by temporarily elevating their z-index and drawing a glowing border. This prevents players from getting lost looking for the button the tutorial is talking about.

**3. State-Gated Progression**
The tutorial doesn't just let players blindly click "Next". It uses `waitForCondition` to enforce interactive learning at critical junctions (e.g., requiring `TOKEN_ASSIGNED` or `EXECUTE_CLICKED` before continuing).

**4. Strong Narrative Integration**
Using "Admiral Reyes" to deliver the instructions keeps the player immersed in the fiction of the game, rather than breaking the fourth wall with sterile system prompts.

**5. Pervasive Contextual Tooltips**
The game relies heavily on `Tooltip` and `TouchTooltipPortal` to explain complex mechanics (Officer traits, ship scars, trauma, critical damage). This is excellent for "just-in-time" learning, ensuring players don't need to memorize everything upfront.

---

## What Needs Work

**1. Severe Information Overload (Wall of Text)**
The combat tutorial script is heavily front-loaded. Steps 2 through 10 explain every single station, fleet assets, stress, and terrain *before* the player takes a single action. Most players will tune out or furiously click "Next" through these text dumps.
* **Recommendation:** Move to a progressive disclosure model. Introduce the Helm and Tactical stations first. Let the player move and shoot. Introduce Stress and Fumbles later in the fight, or in a second scenario.

**2. Missing Campaign & Setup Onboarding**
The tutorial is strictly limited to the combat engine. There is zero onboarding for `FleetBuilder.tsx` (how to compose a fleet, assign officers, manage budgets) or `SectorMapView.tsx` (how to navigate nodes, what Elite/Haven nodes mean, or how campaign persistence works).
* **Recommendation:** Add a short "Campaign Prologue" tutorial that guides the player through drafting their first fleet and navigating their first sector node.

**3. No "Back" Button in the Tutorial**
The `useTutorialStore` only exposes a `nextStep` function. If a player accidentally clicks past a crucial piece of advice, there is no way to retrieve it short of restarting the entire tutorial.
* **Recommendation:** Implement a `previousStep` function, or keep a persistent "Tutorial Log" accessible during the tutorial mission.

**4. Passive Learning vs. Active Play**
While there are a few gated conditions, much of the tutorial is passive reading. For instance, the tutorial explains "Target Lock", but doesn't *force* the player to perform a Target Lock to proceed.
* **Recommendation:** Add more `waitForCondition` gates that require specific actions (e.g., `WAIT_FOR_SENSOR_LOCK`, `WAIT_FOR_REPAIR`) so players build muscle memory instead of just reading about the mechanics.

**5. Fumbles & Crits are Abstract**
The tutorial explains Fumbles and Critical Damage in text blocks, but doesn't guarantee the player experiences them. 
* **Recommendation:** In the tutorial scenario, script a guaranteed critical hit or forced fumble so the player actively experiences the mechanic and learns how to resolve it (e.g., using Damage Control) in a safe environment.
