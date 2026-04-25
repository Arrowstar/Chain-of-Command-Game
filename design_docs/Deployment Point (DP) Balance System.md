# **Deployment Point (DP) Balance System**

This document outlines the mathematical foundation for balancing the *Chain of Command* campaign. The goal is to provide a "100 DP Budget" for players to outfit a single ship.

## **1\. Ship Hull Balance Formula**

Hulls are the most expensive component as they dictate the action economy (CT) and survivability.  
**Formula:**  
DP \= (Base Hull / 2\) \+ (Max Shields \* 2.5) \+ (CT Generation \* 5\) \+ (Size Modifier)

* **Size Modifiers:** Small (+0), Medium (+5), Large (+10).  
* **Special Traits:** Cloaking/Stealth (+10), Armor Die D6 (+8).

### **Calculated Hull Costs (Estimates based on known Chassis)**

| Chassis | Hull | Shields | CT | Size | Traits | Total DP |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Zephyr** | 8 | 1 | 4 | Small | High Speed | **40 DP** |
| **Vanguard** | 12 | 2 | 5 | Med | Balanced | **45 DP** |
| **Wraith** | 6 | 1 | 4 | Small | Stealth (+10) | **40 DP** |
| **Stalker** | 10 | 2 | 5 | Med | Pursuit | **48 DP** |
| **Bulwark** | 18 | 3 | 4 | Med | Heavy Armor (+8) | **60 DP** |
| **Minotaur** | 24 | 2 | 4 | Large | 4 Slots (+10) | **70 DP** |
| **Paladin** | 16 | 4 | 5 | Large | Support | **75 DP** |
| **Titan** | 30 | 3 | 4 | Large | Dreadnought | **85 DP** |

## **2\. Weapon System Balance Formula**

Weapons are priced by their "Reliability" and "Tag Value."  
**Formula:** DP \= (Average Damage) \+ (Tag Bonus) \+ (Range Bonus)

* **Average Damage:** Sum of all dice faces / 2\. (e.g., 3d8 \= 12 DP).  
* **Tag Bonus:** \* ArmorPiercing: \+6 DP  
  * Ordnance: \+2 DP  
  * PointDefense: \+4 DP  
  * Broadside: \-4 DP (Restriction penalty)  
* **Range Bonus:** Long Range (4+ hexes): \+5 DP.

## **3\. Subsystem Balance Roster**

Subsystems are priced by their impact on the core game loop, specifically focusing on action economy, survival, and specialized tactical utility.

| Subsystem | Category | Effect | DP Cost |
| :---- | :---- | :---- | :---- |
| **Auto-Loader Network** | Action Economy | Execute "Fire Primary" a second time in one round. | **20 DP** |
| **Auxiliary Reactor** | Action Economy | Gain \+4 CT immediately (at cost of 1 Hull damage). | **20 DP** |
| **Fighter Hangar** | Specialized | Launch a Strike Fighter squadron token to an adjacent hex. | **15 DP** |
| **Advanced Medical Bay** | Specialized | Instantly reduce the highest Stress of one other officer to 0\. | **12 DP** |
| **Electronic Countermeasures (ECM)** | Survival | Target one enemy to suffer a \-2 penalty to attack dice. | **10 DP** |
| **Reinforced Bulkheads** | Survival | Upgrade the ship's Armor Die by one tier for the round. | **8 DP** |

## **4\. Officer DP Roster (Calculated from officers.ts)**

Officer costs are determined by their Stress Limit and the "Tier" of their TraitEffect.  
**Officer Tiers:**

* **Tier 1 (Utility):** 3 DP (Small efficiency gains).  
* **Tier 2 (Specialist):** 6 DP (Strong tactical advantages).  
* **Tier 3 (Game Changer):** 10 DP (Alters core mechanics or cancels enemy turns).

**Formula:** DP \= (Stress Limit) \+ (Tier Value)

### **Helm Officers**

| ID | Name | Trait Tier | Stress | Total DP |
| :---- | :---- | :---- | :---- | :---- |
| slick-jones | Lt. "Slick" Jones | Tier 1 | 4 | **7 DP** |
| tlari | Lt. Cmdr. T'Lari | Tier 1 | 6 | **9 DP** |
| jitters-kael | Ensign "Jitters" Kael | Tier 1 | 3 | **6 DP** |
| orlov | Crewman 1st Class Orlov | Tier 1 | 5 | **8 DP** |

### **Tactical Officers**

| ID | Name | Trait Tier | Stress | Total DP |
| :---- | :---- | :---- | :---- | :---- |
| vane | Lt. Vane | Tier 2 | 5 | **11 DP** |
| rutherford | Ensign Rutherford | Tier 1 | 4 | **7 DP** |
| boomer-hayes | Gunner Sgt. Hayes | Tier 3 | 6 | **16 DP** |
| vex | Sub-Commander Vex | Tier 3 | 5 | **15 DP** |

### **Engineering Officers**

| ID | Name | Trait Tier | Stress | Total DP |
| :---- | :---- | :---- | :---- | :---- |
| obannon | Chief O'Bannon | Tier 2 | 6 | **12 DP** |
| sparks | Specialist Sparks | Tier 2 | 4 | **10 DP** |
| aris | Specialist Dr. Aris | Tier 2 | 5 | **11 DP** |
| malikov | Engineer Malikov | Tier 1 | 6 | **9 DP** |

### **Sensors Officers**

| ID | Name | Trait Tier | Stress | Total DP |
| :---- | :---- | :---- | :---- | :---- |
| vance | Lt. Cmdr. Vance | Tier 2 | 5 | **11 DP** |
| xel | Operative Xel | Tier 2 | 4 | **10 DP** |
| chatter-singh | Lt. "Chatter" Singh | Tier 2 | 5 | **11 DP** |
| dvesh | CPO D'Vesh | Tier 3 | 5 | **15 DP** |

## **5\. Usage in Campaign**

A standard "Vanguard" build with high-tier officers will hit exactly **100 DP**.  
**Build Example:**

* **Vanguard Hull:** 45 DP  
* **2x Plasma Batteries:** 24 DP  
* **Auto-Loader Subsystem:** 20 DP  
* **Officer: Lt. "Slick" Jones (Helm):** 7 DP  
* **Officer: Ensign Rutherford (Tactical):** 7 DP  
* **TOTAL:** **103 / 100 DP** (Slightly over budget \- requires compromise).