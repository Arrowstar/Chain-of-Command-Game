# **Enemy AI & Adversary Logic: The Hegemony**

## **1\. Core Philosophy: "Predictable Chaos"**

The Hegemony AI operates on a tiered, deterministic logic system. The player should generally know *what* an enemy ship wants to do (based on its class), but the exact execution is modified by the round's **Tactic Card**. The challenge comes from managing the sheer volume of threats and predicting the AI's targeting priorities.

## **2\. The AI Turn Sequence**

During Phase 3 (Execution Phase), after the player has locked in their Command Tokens, the AI activates.

1. **Draw Tactic Card:** Reveal the Hegemony's fleet-wide directive for the round.  
2. **Determine Initiative:** AI ships activate in order from smallest (Fighters/Frigates) to largest (Cruisers/Dreadnoughts).  
3. **Acquire Target:** Each ship determines its highest-priority target using the "Aggro Score" system.  
4. **Move:** The ship executes movement based on its "Behavior Tag" to optimize its attack against the acquired target.  
5. **Attack:** The ship generates its Volley Pool and rolls against the player.

## **3\. The Tactic Deck (The "Mind" of the Fleet)**

At the start of the execution phase, a card is drawn from the Tactic Deck. This card applies a global modifier to all enemy ships for one round, representing the enemy Admiral's commands.

* **Card: "Pincer Movement"**  
  * *Effect:* All AI ships gain \+1 Hex movement. Targeting priority shifts to prioritize ships on the flanks of the player's formation.  
* **Card: "Overwhelming Firepower"**  
  * *Effect:* AI ships do not move this round. All AI weapons gain \+1 Skill Die (e.g., a D6 becomes a D8).  
* **Card: "Shields to Maximum"**  
  * *Effect:* Restore 2 Shield points to all enemy quadrants. Player Volley dice rolls of 8 or higher are required to cause Critical Hits this round, regardless of die size.  
* **Card: "Target the Bridge"**  
  * *Effect:* All AI ships gain \+3 Aggro Score toward the Player's main Captain/Flagship.

## **4\. Targeting Logic (The Aggro Score)**

When an AI ship activates, it calculates a score for every valid player/allied unit on the board. It will target the ship with the highest score. In the event of a tie, it targets the closest ship.

* **Base Distance:**  
  * Target is within Short Range (1-2 Hexes): \+3 Points  
  * Target is within Medium Range (3-4 Hexes): \+2 Points  
  * Target is within Long Range (5+ Hexes): \+1 Point  
* **Vulnerability:**  
  * Target has 0 Shields in the facing quadrant: \+3 Points  
  * Target has taken Critical Hull Damage: \+2 Points  
* **Strategic Value:**  
  * Target is the Player's main ship: \+2 Points  
  * Target is an objective VIP/Escort: \+4 Points  
* **Evasion:**  
  * Target used "Evasive Maneuvers" this round: \-2 Points

*Example: An AI Frigate sees a heavily armored Escort at Range 2 (+3 Distance) and the Player's ship with depleted rear shields at Range 4 (+2 Distance, \+3 Vulnerability, \+2 Player Ship). It will ignore the closer Escort and fire on the Player's ship (Score 7 vs Score 3).*

## **5\. Movement Behaviors (The AI Tags)**

Once a target is acquired, the AI ship moves to optimize its attack. Every enemy ship in the database has one of these hardcoded Behavior Tags:

### **A. The Brawler (Tag: Aggressive)**

* **Goal:** Close the distance, maximize damage.  
* **Logic:** Moves via the shortest path to reach Range 1 of the target. If it reaches Range 1 and still has movement points, it will attempt to move into the target's weakest shield quadrant.  
* *Units:* Strike Fighters, Ramming Corvettes.

### **B. The Sniper (Tag: Artillery)**

* **Goal:** Maintain distance, stay safe.  
* **Logic:** Moves to exactly its maximum weapon range (e.g., exactly 6 hexes away). If it is closer than maximum range, it will use its movement to back away or hide behind Asteroid terrain while maintaining Line of Sight.  
* *Units:* Hegemony Monitors, Missile Frigates.

### **C. The Flanker (Tag: Hunter)**

* **Goal:** Exploit blind spots, avoid front arcs.  
* **Logic:** Prioritizes movement that takes it out of the Player's forward firing arc (120 degrees front). It will gladly sacrifice an attack this round if it means getting into the Player's Rear Arc for the next round.  
* *Units:* Stealth Bombers, Fast Attack Craft.

## **6\. AI Combat Resolution**

To keep the game moving quickly and the CPU load light, the AI does not use the complex "Stress" mechanics or Command Tokens the player uses.

* **The AI Volley:** An AI ship's Volley Pool is static, listed on its stat card. E.g., A Hegemony Cruiser rolls \[2x D8 \+ 1x D6\] as its standard attack.  
* **Criticals:** AI dice *do* explode on max values, just like the player's.  
* **Damage Spikes:** Because the AI draws Tactic Cards instead of using Command Tokens, the "spikes" in their difficulty come from drawing a nasty Tactic Card at the worst possible time, rather than individual AI units doing complex internal combos.