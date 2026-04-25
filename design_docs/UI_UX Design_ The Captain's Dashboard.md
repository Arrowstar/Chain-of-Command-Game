# **UI/UX & Player Experience: The Captain's Dashboard**

## **1\. Visual Philosophy: "Tactical Claustrophobia"**

The game screen should make the player feel like they are inside an armored CIC (Combat Information Center) deep within the ship. It shouldn't look like you are a god floating in space; it should look like you are looking at screens, holotables, and your crew.

* **Color Palette:** Deep navy blues, tactical amber/orange (for alerts), and stark holographic greens/cyans for the tactical map.  
* **Lighting:** Dim. When the ship takes hull damage, the ambient lighting should flicker and shift to red (Red Alert).

## **2\. Screen Layout (The Dual Interface)**

The screen is split into two primary zones to represent the "Downward" (Crew) and "Upward/Outward" (Admiral/Battle) commands.

### **A. The Main View (Center/Right \- 60% of screen)**

This is the **Holo-Table**. It displays the Hex Grid, the ships, and terrain.

* **Aesthetic:** Looks like a digital projection table. Ships can be represented as high-fidelity holographic miniatures.  
* **Interactivity:** Clicking a ship brings up a sleek side-panel showing its stats, shield facings, and current status effects.  
* **Dice Rolls:** When combat happens, the digital polyhedral dice should physically roll *on top* of the holo-table, knocking into each other before resolving.

### **B. The Command Console (Bottom/Left \- 40% of screen)**

This is your physical workspace, featuring your bridge crew.

* **The Directive Screen (Top Left):** A small, persistent monitor showing the Admiral's current Directive Card, your Fleet Favor tally, and a "Comms" button to buy Fleet Assets.  
* **The Officer Stations (Bottom Array):** Four distinct panels (Helm, Tactical, Engineering, Sensors).  
  * Each panel shows the Officer's portrait, name, and current Stress Bar (a gauge that fills with orange/red ticks).  
  * Below the portrait are their available Action Slots (the "Worker Placement" nodes).  
* **The Captain's Hand (Bottom Center):** This is where your generated Command Tokens (CT) sit. They look like glowing casino chips or heavy metallic coins.

## **3\. Interaction Flow: Issuing Orders**

The core physical interaction of the game must feel deliberate and weighty.

1. **Grab the Token:** The player clicks and drags a Command Token from their pool.  
2. **Assign the Token:** Dragging the token over an Officer highlights their available actions. The player drops the token into an action slot (e.g., "Evasive Maneuvers").  
3. **The "Make it So" Prompt:** Actions don't happen the millisecond a token is dropped. They queue up. Once the player places all desired tokens for the phase, they hit a large, satisfying **EXECUTE ORDERS** button.  
4. **Cinematic Resolution:** The game camera shifts. We see the ship move on the hex grid, weapons fire, and dice roll.

## **4\. Audio Design (Crucial for Atmosphere)**

Audio does 50% of the heavy lifting for the "Command Fantasy."

* **Radio Chatter:** When you drag a token to Helm, you hear a radio click: *"Helm acknowledging."* When you hit Execute: *"Punching it, Captain."*  
* **The Admiral:** Directives aren't just text; they should have fully voiced, slightly static-filled radio barks from Command.  
* **Stress Indicators:** As an officer's Stress meter gets high, their voice lines change. Calm acknowledgments become panicked shouts or breathless confirmations.  
* **Damage Klaxons:** Different alarms for Shield Depletion versus Hull Breaches.

## **5\. Tooltips and Information Hierarchy**

Because there are many systems (Stress, Shields, Hull, Directives), tooltips are vital.

* **Hovering over an Enemy Ship:** Shows their threat range (a faint red highlight on the hexes they can hit) and base Target Number (TN).  
* **Hovering over an Officer Action:** Shows exactly what it does, how much Stress it will add, and the CT cost.  
* **Line of Sight:** When preparing a Tactical action, drawing a line from your ship to the target should immediately show the mathematical breakdown: *\[Base TN 5\] \+ \[Long Range \+2\] \= \[Target TN 7\].*