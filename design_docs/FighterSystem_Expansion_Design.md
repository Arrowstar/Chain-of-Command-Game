# Chain of Command: Fighter System Expansion & Refinement Design Doc

## 1. Introduction
This document outlines proposed architectural and mechanical changes to the `FighterToken` system in *Chain of Command*. The goal is to move beyond simple "swarm" mechanics into a tiered ecosystem of specialized craft, while fixing the current mechanical impossibility of fighter-vs-fighter combat (dogfighting).

---

_Ref: Implementation targets `app/src/types/game.ts`, `app/src/engine/ai/fighterAI.ts`, and `app/src/store/useGameStore.ts`._

---

## 2. Dogfighting Mechanics Fix
**Problem:** Current stats (3d4 vs TN 8 for enemy, 3d4 vs TN 5 for ally) make hits mathematically impossible.

### Proposed Solution: The "Dogfight Rule"
When a `FighterToken` initiates an attack where the target is also a `FighterToken`, apply the following modifiers to the resolution logic in `resolveFighterAttack`:

1.  **TN Reduction:** Apply a flat **-3 TN modifier**.
    *   Enemy (TN 8 $\to$ 5): Now achievable with 3d4 rolls.
    *   Ally (TN 5 $\to$ 2): Nearly guaranteed hits, reflecting pilot skill.

---

## 3. New Fighter Class Specifications
To differentiate from the baseline "Strike Fighter," we will introduce five distinct archetypes by varying the properties in `FighterToken`.

### A. Heavy Bomber
*   **Role:** Long-range bombardment.
*   **Stats:**
    *   `hull`: 2
    *   `speed`: 2
    *   `weaponRangeMax`: 3
    *   `volleyPool`: `['d8', 'd8']`
    *   `baseEvasion`: 4
*   **Niche:** High damage per hit, but slow and vulnerable to PDC/Flak.

### B. Electronic Warfare Fighter
*   **Role:** Support and debuffing via proximity.
*   **Stats:**
    *   `speed`: 3
    *   `weaponRangeMax`: 2
    *   `baseEvasion`: 7
    *   `volleyPool`: `['d4', 'd4']`
*   **Mechanic:** Upon reaching range of an enemy capital ship, applies a temporary `-1 TN` effect to all friendly volleys against that target.

### C. Intercept Screen Fighter
*   **Role:** Anti-torpedo/Anti-fighter defense.
*   **Stats:**
    *   `speed`: 5
    *   `baseEvasion`: 6
    *   `weaponRangeMax`: 1
	*   `volleyPool`: `['d4']`
*   **Niche:** Extremely fast; prioritized target selection logic (see Section 4) allows it to intercept `TorpedoTokens` before they reach capital ships.

### D. Armored Gunship
*   **Role:** Durable close-range combatant.
*   **Stats:**
    *   `hull`: 2
    *   `speed`: 3
    *   `baseEvasion`: 3
    *   `volleyPool`: `['d6', 'd6', 'd6']`
*   **Niche:** High survival rate; can absorb hits that would destroy standard fighters, but is an easy target for PDCs.

---

## 4. Advanced Fighter AI Behaviors
The `FighterToken` interface will be extended with a `behavior` property to drive the logic in `resolveFighterMovement`.

### Interface Update
```ts
export interface FighterToken {
  // ... existing fields ...
  behavior: 'attack' | 'escort' | 'flanking' | 'hit_and_run' | 'screen' | 'harass';
  hitAndRunPhase?: 'engage' | 'retreat'; // Required for hit_and_run logic
}
```

### Behavior Logic Implementations

| Behavior | Pathfinding / Target Logic | Implementation Detail |
|---|---|---|
| **Attack** (Baseline) | BFS straight to `assignedTargetId`. | Existing implementation. |
| **Escort** | Goal = Position of assigned `sourceShipId` or friendly capital ship. | Avoids enemies; prioritizes staying in adjacent hexes to the donor ship.  Attacks enemies that enter within weapons range. |
| **Flanking** | Weighted BFS targeting target's rear arcs. | Pathfinding weights edges leading to target's `aft`, `aftPort`, and `aftStarboard` sectors higher. |
| **Hit & Run** | Target $\to$ Attack $\to$ Retreat. | On attack success or failure, sets `hitAndRunPhase = 'retreat'` and moves in opposite direction for 1 round. |
| **Screen** | Prioritize `TorpedoToken` and `EnemyFighter` targets. | Moves toward the nearest incoming threat within a defined radius (2 hexes) of the capital ship. |
| **Harass** | Maintain distance (Range 2-3). | Uses BFS to find hexes where `distance > 1` but `< target.weaponRangeMax`. |

---

## 5. Structural Requirements & Risks
*   **Data Integrity:** The `assignedTargetId` must be validated in the engine; for `escort`, it may reference a friendly ship ID, whereas for `attack`, it must reference an enemy.
*   **Complexity Risk:** Increasing AI complexity (especially **Flanking** and **Hit & Run**) increases the computational load on `resolveFighterMovement`. Ensure pathfinding weights are pre-calculated or lightweight to prevent frame drops during the Execution Phase.
*   **State Management:** The `hitAndRunPhase` must be reset every Briefing Phase in `useGameStore.ts`.

---
*End of Design Document*
