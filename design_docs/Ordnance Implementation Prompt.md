# **Role & Context**

Act as a Senior React and TypeScript developer working on a cooperative, digital tabletop space combat game called *Chain of Command*. The game uses a strict Phase-based combat loop (similar to board games) where players assign "Command Tokens" (CT) to Bridge Officer stations to take actions.  
I need you to implement a new mechanical system for our weapons: the \[Ordnance\] tag.

## **Game Design Intent (The "Why")**

Currently, all weapons in the game can be fired every single round as long as the Tactical Officer spends 1 CT on the "Fire Primary" action. We want to introduce "Burst Damage" weapons (like heavy Torpedoes) that require a reload cycle. This forces players to think tactically about when to unleash their heaviest hitters.

## **Feature Requirements: The "Primed" State**

Weapons with the \[Ordnance\] tag cannot be fired consecutively without reloading.

1. **Initial State:** All \[Ordnance\] weapons begin the game in a "Primed" state (isLoaded: true).  
2. **Firing:** When a player executes the "Fire Primary" action using an \[Ordnance\] weapon, the weapon fires normally, but its state immediately changes to isLoaded: false.  
3. **Reloading:** A weapon in the isLoaded: false state *cannot* be fired. The Tactical Officer must spend an action (e.g., "Load Ordnance") to cycle the weapon back to isLoaded: true.

## **Step-by-Step Implementation Guide**

Please review my codebase and implement the following architectural changes. Ask me to provide any specific files (like the state store, types file, or Tactical UI component) if you need them.

### **Step 1: Update TypeScript Definitions**

We need to separate the static weapon data from the dynamic runtime state.

* Update our weapon tags type to include 'ordnance'.  
* Create or update an EquippedWeapon interface (used in the active ship's state) that wraps the base WeaponModule. It must include a boolean isLoaded property.

// Example target structure:  
interface EquippedWeapon {  
   id: string; // unique instance ID  
   module: WeaponModule; // Reference to the static data  
   isLoaded: boolean; // Dynamic state tracking  
}

### **Step 2: Update the Static Database**

Modify the weapons.ts database.

* Add the 'ordnance' tag to the tags array for the **"Seeker Torpedo Tubes"**.  
* Add the 'ordnance' tag to the **"Heavy Railgun"**.  
* Ensure no other standard energy weapons (like the Plasma Battery) receive this tag.

### **Step 3: Implement State Initialization**

When a ship is spawned or initialized for combat, ensure the logic mapping the WeaponModule array to the EquippedWeapon array explicitly sets isLoaded \= true for all weapons, regardless of whether they have the tag or not (for simplicity, or conditionally only if they have the tag).

### **Step 4: Refactor Action Handlers**

You will need to update the logic handling the Tactical Station's actions.

* **Fire Action Validation:** Before processing the Volley Pool for a "Fire" action, assert that the selected weapon is loaded. If \!isLoaded, throw an error or block the action.  
* **Fire Action Side-Effect:** If the fired weapon includes the 'ordnance' tag in its module, immediately dispatch a state update setting that specific weapon's isLoaded to false.  
* **New Reload Action:** Create a new action handler for "Load Ordnance". This action should take the target weapon ID as a payload, validate that it has the 'ordnance' tag, validate that it is currently empty, and then update isLoaded to true.

### **Step 5: UI and UX Feedback**

The user interface must clearly communicate this new mechanic to the players to prevent frustration. Please update the Tactical Station React components:

* **Visual Status:** Add an indicator (like a glowing green dot for "Loaded" or a red "EMPTY" text block) next to ordnance weapons in the UI.  
* **Button Disabling:** The "Fire" button should be dynamically disabled (disabled={\!weapon.isLoaded}) to physically prevent the user from clicking it when empty.  
* **Reload Prompt:** When a weapon is empty, the UI should highlight the "Load Ordnance" action button to guide the player toward their next logical step.

## **Edge Cases to Consider & Address**

In your implementation, please account for the following system interactions:

1. **Non-Ordnance Weapons:** Standard weapons (like the Plasma Battery) should never be blocked from firing, even if their isLoaded state accidentally flips, or better yet, their loaded state should be completely ignored by the firing validation logic.  
2. **The Auto-Loader Network Subsystem:** If you see the "Auto-Loader Network" in the subsystems.ts file, keep in mind how this interacts. Make sure your reload action is modular enough that we could potentially trigger it as a free action if a specific subsystem is active in the future.

Please provide the updated code for types/game.ts (or equivalent), weapons.ts, the relevant state slice/reducer handling the weapon firing, and the React component for the Tactical UI. Let me know if you need to see my current state management setup first\!