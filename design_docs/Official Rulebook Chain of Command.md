# **Official Rulebook: Chain of Command: Stellar War (Co-Op Edition)**

*Welcome to the Bridge, Captains.* *In Chain of Command, you and your fellow players represent a unified task force operating under the strict, often unreasonable directives of Hegemony High Command—or acting as a desperate defector fleet fleeing their wrath. You are not hotshot fighter pilots pulling high-G maneuvers in nimble starfighters; you are the commanding officers of massive, lumbering capital ships. These vessels are cities in the void, crewed by thousands of souls whose lives rest on your shoulders.*  
*Success in this cold, unforgiving theater of war requires perfect coordination with your allies, shrewd management of your stressed and overworked bridge crew, and the tactical acumen to outmaneuver a relentless enemy AI. The void of space is entirely indifferent to your survival. Will you secure victory for the fleet, or face a court-martial—or worse, a silent grave—in the dark?*

## **1\. Game Setup**

A game of *Chain of Command* requires careful preparation of the digital or physical environment to ensure the scenario logic remains balanced. Setup represents the tense, chaotic moments right after your fleet violently drops out of hyperspace into a hot combat zone.

1. **The Board:** Consult the chosen Scenario Briefing. Assemble the Hex Map using the specified modular tiles. Place all environmental Terrain tokens (Asteroids, Nebulas, Debris Fields) and any scenario-specific Objective Markers exactly as diagrammed.  
2. **The Players (Fleet Building):** Before deployment, players act as a "War Council" to construct their task force using a shared economy. This phase requires intense negotiation and strategic foresight.  
   * **The Fleet Budget:** The fleet receives a pooled budget of **150 Requisition Points (RP) per player** (e.g., 600 RP for a 4-player game). This represents the total material wealth and logistical backing of your task force.  
   * **Draft Officers:** Bridge Officers are unique characters with distinct personalities and traits. Players take turns drafting their crew (Helm, Tactical, Engineering, Sensors) from the roster until all stations are manned for every ship. (For standard standalone games, all officers operate at the Veteran/D6 rank). You cannot have two of the same named officer in the fleet.  
   * **Purchase Chassis:** Players work together to collectively spend RP from the pooled budget to purchase a Ship Chassis for each player.  
   * **Equip Modules:** Players spend remaining RP to purchase Weapon Modules and Internal Subsystems to fill the slots on their chosen chassis. Unfilled slots cannot be used in combat and represent critical supply shortages.  
   * **Deployment:** Place each Player Ship token on the designated starting hexes within the player deployment zone.  
   * **Initialize:** Set your starting Command Tokens (CT) to match the Ship's Base Generation value. Ensure all Bridge Officer Action Cards are slotted and set all Stress meters to 0\. Take a breath; your crew is currently calm.  
   * **Momentum:** Set starting Speed to 1 for all Player Capital Ships. You are entering the combat zone already in motion.  
3. **The Enemy:** Place all **Enemy NPC** tokens on their designated spawn hexes. Shuffle the AI Tactic Deck, the Enemy Critical Damage Deck, and the Player Critical Damage Deck. (Enemy NPC capital ships also start with a Speed of 1 unless the scenario specifies otherwise). The Hegemony AI is merciless and requires no resource management.  
4. **The Admiral:** Shuffle the **Admiral's Directive Deck**. Draw 1 card face-up and place it in the Command Zone. This order applies to the *entire* player fleet, regardless of whether it makes tactical sense for your current situation. Set the shared **Fleet Favor (FF)** pool to the scenario's starting value (default 0).

## **2\. Anatomy of a Ship & Navigation**

Positioning, momentum, and facing are the lifeblood of tactical space combat. You cannot simply stop on a dime, strafe sideways, or reverse thrusters easily. Every movement is a calculated commitment to a vector.

### **2.1 Facing and Arcs**

All Capital Ships occupy exactly 1 Hex on the board. A ship token must always have its "Nose" pointed directly at one flat edge of the hex (never pointing at a corner). Facing determines your six distinct weapon/shield arcs: **Fore, Fore-Starboard, Aft-Starboard, Aft, Aft-Port, and Fore-Port.**

* *Implication:* Protecting your Aft (rear) arc is vital. Most capital ships possess devastating forward-facing weaponry but leave their massive thruster arrays exposed from behind.

### **2.2 Movement Physics (Speed & Momentum)**

Spacecraft in *Chain of Command* follow the brutal laws of inertia.

* **Current Speed:** Every Capital Ship has a Current Speed value (minimum 0, up to the Chassis maximum). This is the exact number of hexes the ship *must* drift forward during its activation. It is not optional.  
* **The Forward Vector:** A ship's momentum always carries it into the hex directly in front of its Fore Arc. You cannot drift diagonally.  
* **Rotation and Inertia:** If you use a Helm action to Rotate, you change your facing immediately. However, this new facing establishes your Forward Vector for the *next* round's momentum drift. You are always planning your movement one full turn in advance.

### **2.3 Shield Sectors**

Capital Ships feature 6 distinct, localized Shield Sectors, corresponding to the six hex faces.

* **Tracking Hits:** To determine which shield takes damage, draw a Line of Sight (LoS) from the center of the attacker's hex to the center of the defender's hex. The edge of the defender's hex that the line crosses first determines the struck shield sector.  
* **Stripped Shields:** Shields absorb damage point-for-point. If a sector is reduced to 0, it is "Stripped." Any further hits to that face pass directly to the ship's physical Hull.  
* **Regeneration:** Shields regenerate at a rate of 1 point per round during Phase 4, provided the Shield Generator subsystem hasn't been critically damaged.

### **2.4 Stacking and Collisions**

* **Capital Ships:** A Capital Ship cannot occupy or pass through a hex containing another Capital Ship or large asteroid. Space is vast, but combat formations are dangerously tight.  
* **Ramming/Collisions:** If a ship's mandatory Momentum Drift forces it into an occupied hex or a solid hazard, a catastrophic collision occurs. The moving ship immediately halts (Speed instantly drops to 0\) in the last valid hex it occupied prior to impact. Both units involved take 1D4 unblockable Hull damage.  
* **Small Craft:** Strike Fighters, bombers, and Torpedoes exist on a smaller tactical plane. They can stack (up to 3 small craft per hex) and may freely pass through Capital Ships and debris without causing collisions.

## **3\. The Round Sequence**

A standard game is played over a series of sequential Rounds. Each Round represents roughly three minutes of chaotic, real-time combat and consists of 4 strict Phases.

### **Phase 1: The Briefing Phase**

This administrative phase resets the board state and introduces the macro-strategy for the round.

1. **Refresh:** All players reset their available Command Tokens (CT) to their ship's Base Generation value, minus any penalties from engine damage.  
2. **Directives:** Evaluate the previous round's Directive. If successful, increase FF. If failed, decrease FF. Discard it and draw a new Directive.  
3. **Enemy Tactic Reveal:** Draw 1 Tactic Card from the Hegemony deck. Players see this *before* planning their own turn, allowing them to brace for incoming electronic warfare, reinforcements, or orbital strikes.

### **Phase 2: The Command Phase (Simultaneous Planning)**

This is the heart of the game. Communication is paramount, and time is theoretically limited.

* **Simultaneous Planning:** All players assign CT to their Bridge Officers' action nodes at the same time. You must coordinate targeting and movement with your allies.  
* **Stress Management:** Every action generates Stress. If a token pushes an officer's Stress past their individual limit, they break under the pressure. You must immediately draw and resolve an **Officer Fumble Card**. A Fumble can cause weapons to misfire, shields to drop, or helmsmen to overcompensate, ruining carefully laid plans.  
* **Fleet Support:** Players may spend shared FF to purchase one-time support assets, such as sensor sweeps or emergency supply drops.

### **Phase 3: The Execution Phase (Initiative Order)**

Actions are not simultaneous; they are interleaved based on ship class size to simulate relative agility. Smaller ships dart through the battlefield before massive dreadnoughts can bring their main guns to bear.  
**Tie-Breaker Rules:**

* **Allied Advantage:** In any given tier, the Player fleet and their **Allied NPCs** act as a unified block before the **Enemy NPCs**.  
* **Cooperative Order:** Within the Allied portion of a tier, players decide among themselves who activates their ship first, allowing for deep combo setups.  
* **Proximity Logic:** Enemy NPCs in a tier activate based on their current distance from the nearest player ship (the closest threats activate and fire first).

**Internal Resolution (The Momentum Drift):**  
When a capital ship activates, it must strictly follow a two-part sequence:

1. **Mandatory Momentum Drift:** The ship moves forward a number of hexes equal to its Current Speed. Hazards are resolved hex-by-hex as it moves.  
2. **Command Resolution:** Only *after* the drift is complete do you resolve the Command Tokens assigned during Phase 2\. Players choose the exact order of resolution (e.g., you may choose to Rotate, then Fire Primary, then use Damage Control).

**Activation Steps:**

* **Step 1: Small Craft (Fighters, Frigates, Corvettes, and Torpedoes):**  
  * **Allied Step:** Players commanding Small-class chassis activate. Any **Allied NPC** small craft then drift and act.  
  * **Enemy Step:** All **Enemy NPC** small craft drift and act.  
* **Step 2: Medium Craft (Cruisers and Destroyers):**  
  * **Allied Step:** Players commanding Medium-class chassis activate.  
  * **Enemy Step:** All **Enemy NPC** medium cruisers and gunboats drift and act.  
* **Step 3: Large Craft (Dreadnoughts, Bases, and Carriers):**  
  * **Allied Step:** Players commanding Large-class chassis activate. Massive **Allied NPC** support ships act.  
  * **Enemy Step:** All **Enemy NPC** behemoths and capital ships drift and act.

### **3.1 Target Re-acquisition & Wasted Orders**

Because the battlefield shifts drastically during the early Initiative steps and Momentum Drifts, your meticulously planned targets might vanish.

* **Target Lost:** If your primary target is destroyed or moves out of range before your ship's Execution step, your tactical officer's quick thinking kicks in. You may "Re-acquire" a new valid target, provided it currently sits within a valid arc of the specific weapon being fired.  
* **Wasted Orders:** If absolutely no valid targets exist for a planned attack, the crew still went through the grueling process of arming and targeting. The CT is lost, and the Stress is still incurred, but no attack happens.

## **4\. Combat Resolution (Step-Die Volley)**

Combat in *Chain of Command* is designed around a custom polyhedral "Step-Die" system to highlight the vast differences between experimental weaponry and raw officer skill.  
**1\. Calculate TN (Target Number):** The attacker must overcome the defender's evasion.  
Base Evasion \+ Range Modifier \+ Terrain Modifier \+ Active Maneuvers \= TN  
*(Example: A base Evasion of 5, fired at from Medium Range (+1), while the target is in a Debris Field (+1) creates a TN of 7).*  
**2\. Assemble Volley Pool:** The attacker gathers their dice pool. This is always the dice provided by the Weapon Module PLUS the Tactical Officer's Skill Die.  
**3\. Roll & Sort:** Roll the entire pool. Any die whose face value matches or exceeds the TN is a **Hit**. Any die that rolls its absolute maximum face value (e.g., an 8 on a D8, or a 6 on a D6) is a **Critical Hit**.  
**4\. Explode Criticals:** The thrill of space combat comes from cascading damage. You must immediately pick up and re-roll all dice that scored a maximum value. Add the original hit to your total, and evaluate the new roll against the TN. If the new roll is *also* a maximum value, it adds another hit and explodes again\!  
**5\. Apply Hits to Shields:** Subtract the total number of hits from the specific Shield Sector struck. Overflow hits bypass the shattered shield and strike the Hull.  
**6\. Apply Hull Damage:** Combine all Overflow hits. The Defender then rolls their Ship's Armor Die (e.g., a D4 or D6) to mitigate the damage. (Hits) \- (Armor Die Roll) \= Final Hull Damage *Note: Armor is not impenetrable. If any hits reached the hull phase, the ship must take a minimum of 1 damage, even if the Armor roll was high.*  
**7\. Critical Damage:** If a ship takes 3 or more Hull damage from a single attack volley, or if the hit causes its total Hull to fall below 50% for the first time, draw a Critical Damage card. These inflict severe, permanent effects like venting plasma, offline comms, or dead engines.

## **5\. Environmental Hazards & Terrain**

Space is rarely empty. Environmental terrain heavily dictates positioning. Ships must often choose between taking the safest route or flying through dangerous anomalies to secure an advantageous firing angle.

| Terrain Type | LoS Effect | TN Modifier | Movement Effect | Special Consequences & Tactical Notes |
| :---- | :---- | :---- | :---- | :---- |
| **Asteroids** | Blocks LoS | \+2 | Halts Drift (Speed \-\> 0\) | Entering requires a D6 roll; on a 1, take 1D4 Hull damage. A great place to hide, but highly dangerous to navigate at high speeds. |
| **Ion Nebula** | Clear | \-1 | None | All Shields are disabled (reduced to 0\) while inside. The electrostatic interference makes targeting easier (-1 TN), turning these clouds into brutal kill zones. |
| **Debris Field** | Clear | \+1 | None | Wreckage from past battles provides minor cover. Small Craft (Fighters) cannot enter or pass through, as micrometeorites will shred their unarmored canopies. |
| **Gravity Well** | Clear | 0 | Forced Pull | A localized anomaly. At the start of Phase 4, any ship inside or adjacent is violently pulled 1 hex directly toward the center. |

## **6\. Repairing & Recovery**

Capital ships are remarkably resilient, and their crews are trained to handle disasters. However, repairing a ship mid-battle costs precious time and focus that could be spent shooting.

* **Hull Repair:** Fixing physical breaches requires the Engineering "Damage Control" action. Resolving this action restores exactly 1 Hull Point.  
* **Critical Damage Removal:** Removing a debilitating Critical Damage card requires Engineering to spend 2 CT and successfully roll a 4+ on a D6. A failure means the CT and Stress are spent, but the jury-rigged patch didn't hold.  
* **Stress Recovery:** The psychological pressure of command is immense. Officers recover Stress passively at the end of the round based on their workload:  
  * If an Officer performs **zero** actions in a round, they take a breather and recover 2 Stress.  
  * If they perform exactly **one** action, they can recover 1 Stress, but *only if* the ship is currently in "Safe Space" (meaning no enemy ships are located within Range 1-3). If you are surrounded by enemies, a working officer cannot calm down.

## **7\. Game Over Conditions**

A scenario concludes under one of the following specific conditions:

* **Victory:** The player fleet successfully completes the primary Scenario Objective (e.g., destroying a Hegemony Starbase, surviving a set number of rounds, or escorting an allied transport off the board).  
* **Defeat:** If the shared Fleet Favor (FF) track drops to \-5, the Admiral determines your task force is entirely incompetent. High Command remotely locks out your navigation computers, ending the game in a loss.  
* **Defeat:** All Player Capital Ships are reduced to 0 Hull.