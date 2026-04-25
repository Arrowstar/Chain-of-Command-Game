# **Procedural Scenario Generator**

*In the Sector Map Campaign, the Hegemony’s response to your defection is unpredictable. When the fleet jumps to a Combat Node, the War Council must immediately roll on the following tables to generate the battlefield, the objective, and the enemy forces.*

## **Step 1: Mission Objective (Roll 1D6)**

*What is the fleet trying to achieve before jumping away? The Primary Objective always awards **\+2 Fleet Favor (FF)** upon completion.*

| Roll | Mission Type | Win Condition |
| :---- | :---- | :---- |
| **1** | **Breakout** | At least 50% of the surviving Player Capital Ships must reach the opposite edge of the board (Row 15\) and spend 1 CT at the Helm to jump to warp. |
| **2** | **Assassination** | The Enemy Fleet spawns with one "Flagship" (upgrade the heaviest Enemy ship with \+1 Evasion and \+5 Hull). Destroy it. |
| **3** | **Data Siphon** | Place 3 "Comm Relays" evenly across the centerline of the map. Player ships must end a round adjacent to all 3 relays to download their data. |
| **4** | **Hold the Line** | Hegemony reinforcements are jumping in. The players must survive for exactly 6 Rounds without jumping away to cover civilian transports (off-map). |
| **5** | **Salvage Run** | Scatter 5 "Supply Crate" tokens across the board. A player ship can spend 1 CT at Sensors when adjacent to pick one up. Collect at least 3, then jump away. |
| **6** | **Search & Destroy** | No fancy objectives. Utterly destroy every Enemy Capital Ship on the board. |

## **Step 2: Environmental Hazard (Roll 1D6)**

*Space is rarely empty. Roll to determine the dominant terrain feature on the 15x15 hex map.*

| Roll | Environment | Setup & Rules |
| :---- | :---- | :---- |
| **1** | **Open Void** | Clear space. Place only 1D4 small 1-hex Asteroids as scattered cover. |
| **2** | **Dense Asteroid Field** | Place 3 massive (3-hex) Asteroid clusters and 1D6 small Asteroids. Navigation is highly restricted. Speeding through narrow gaps is lethal. |
| **3** | **Ion Nebula** | The central 7x7 hex area is a Nebula. All Shields inside are reduced to 0\. Target Numbers (TN) inside the Nebula are reduced by \-1. |
| **4** | **Debris Graveyard** | Place 4 large (2-hex) Debris Fields. Small craft (Fighters/Torpedoes) cannot enter. Capital ships suffer \+1 TN to attacks made through the debris. |
| **5** | **Gravity Anomaly** | Place a 1-hex Anomaly in the dead center. At the end of every round, all ships within Range 5 are pulled 1 hex directly toward it. |
| **6** | **Solar Flare Activity** | Clear space. However, at the start of Phase 4, roll a D6. On a 1 or 2, a solar flare hits: ALL ships (player and enemy) take 1 unblockable Hull damage. |

## **Step 3: Hegemony AI Deployment (The Algorithm)**

*The Hegemony does not use fixed lists; the AI calculates the necessary force to crush your specific task force. Enemy composition is generated procedurally using a Threat Budget.*  
**1\. Calculate Threat Budget:** Multiply the number of **Allied Player Ships** by the current **Sector Threat Level**:

* **Sector 1:** 4 Threat Points per player (e.g., 4 players \= 16 pts).  
* **Sector 2:** 7 Threat Points per player (e.g., 4 players \= 28 pts).  
* **Sector 3:** 10 Threat Points per player (e.g., 4 players \= 40 pts).

**2\. The AI Purchasing Protocol:**  
The Adversary Player (or War Council) rolls 1D6 and consults the AI Requisition Table.

* If the AI has enough Threat Points, it buys that ship, subtracts the cost from the budget, and adds the ship to the spawn pool.  
* **The Override Rule:** If the AI rolls a ship it *cannot afford* with its remaining points, it automatically buys the most expensive ship it *can* currently afford instead.  
* Repeat this rolling process until the Threat Budget is exactly **0**.

| D6 Roll | Hegemony Ship Class | Threat Cost | Role |
| :---- | :---- | :---- | :---- |
| **1** | **Interceptor Wing** | 1 Point | Small Craft. Annoying swarms. |
| **2** | **Corvette** | 2 Points | Fast flanking unit. |
| **3** | **Frigate** | 4 Points | Frontline brawler. |
| **4** | **Frigate** | 4 Points | (Weighted for fleet backbone) |
| **5** | **Heavy Cruiser** | 7 Points | Slow, heavy broadside cannons. |
| **6** | **Dreadnought** | 10 Points | Massive Boss-tier ship. |

*Deployment:* Players deploy on Edge A (South). The Enemy NPC ships spawn on Edge C (North) or the Flanks (East/West), depending on the objective.

## **Step 4: The Admiral's Directive (Roll 1D6)**

*High Command still has a backdoor into your comms and demands obedience. This Directive replaces the standard deck draw for this node. If completed, gain **\+1 FF**. If failed or ignored, lose **\-2 FF**.*

| Roll | Directive | The Complication |
| :---- | :---- | :---- |
| **1** | **"Show No Weakness"** | No player ship is allowed to use the Engineering "Damage Control" action to repair Hull points during this mission. |
| **2** | **"Save the Ordnance"** | The fleet may not use any weapons with the \[Ordnance\] tag. Ammunition is too precious to waste here. |
| **3** | **"Aggressive Negotiations"** | Every player ship must end Phase 3 (Execution) closer to an Enemy ship than they started it. No retreating. |
| **4** | **"Test the Shields"** | Do not destroy any Enemy ships until Round 3 or later. Let them fire on you to gather telemetry. |
| **5** | **"Push the Engines"** | Every player ship must maintain a Speed of 2 or higher for the entire mission. |
| **6** | **"Maintain Comms Silence"** | Players cannot speak to each other during Phase 2 (The Command Phase). You must assign your Command Tokens in total silence. |

