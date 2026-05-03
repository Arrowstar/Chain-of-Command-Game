import type { HexCoord, ShipState, EnemyShipState, TerrainType } from '../types/game';
import { hexKey, hexDistance, hexNeighbors } from './hexGrid';
import { rollDie } from '../utils/diceRoller';
import { resolveAsteroidEntry, type AsteroidRollResult } from './movement';

// ═══════════════════════════════════════════════════════════════════
// Gravity Well Engine — Phase 4 forced pull toward well center
// ═══════════════════════════════════════════════════════════════════

export interface GravityPullResult {
  shipId: string;
  isPlayer: boolean;
  fromPos: HexCoord;
  toPos: HexCoord;
  collisionDamage: number;
  asteroidRoll?: AsteroidRollResult;
}

/**
 * Compute the axial direction from `from` toward `to`, returning the
 * neighboring hex of `from` that is closest to `to`.
 * Returns `from` unchanged if they are the same hex.
 */
function stepToward(from: HexCoord, to: HexCoord): HexCoord {
  if (from.q === to.q && from.r === to.r) return from;

  const neighbors = hexNeighbors(from);
  let best = neighbors[0];
  let bestDist = hexDistance(neighbors[0], to);

  for (let i = 1; i < neighbors.length; i++) {
    const d = hexDistance(neighbors[i], to);
    if (d < bestDist) {
      bestDist = d;
      best = neighbors[i];
    }
  }

  return best;
}

/**
 * Apply Gravity Well pull to all ships (player + enemy) that are
 * inside or adjacent to any gravity well hex.
 *
 * Rule (Rulebook §5):
 *   "At the start of Phase 4, any ship inside or adjacent is violently
 *    pulled 1 hex directly toward the center."
 *
 * Each gravity well tile is its own center (single-hex wells).
 * Collision resolution: if a ship is pulled into an occupied hex (another
 * capital ship), we treat it as a standard collision (1D4 hull each).
 */
export function applyGravityWellPull(
  playerShips: ShipState[],
  enemyShips: EnemyShipState[],
  gravityWellHexes: HexCoord[],
  /** Keys of ALL currently occupied hexes (player + enemy combined) */
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  getHelmTrait?: (shipId: string) => string | null,
): GravityPullResult[] {
  if (gravityWellHexes.length === 0) return [];

  const results: GravityPullResult[] = [];

  const processShip = (
    ship: ShipState | EnemyShipState,
    isPlayer: boolean,
  ) => {
    if (ship.isDestroyed) return;

    for (const wellHex of gravityWellHexes) {
      const dist = hexDistance(ship.position, wellHex);

      // Affected if within Range 5 of the well
      if (dist > 5) continue;

      // Already at the well center — no movement needed
      if (dist === 0) continue;

      const destination = stepToward(ship.position, wellHex);
      const destKey = hexKey(destination);

      let collisionDamage = 0;

      // Check if destination is occupied by another capital ship
      const selfKey = hexKey(ship.position);
      const occupiedByOther =
        occupiedHexes.has(destKey) && destKey !== selfKey;

      if (occupiedByOther) {
        collisionDamage = rollDie('d4');
        // Ship stays put (blocked), speed → 0 handled by caller
        results.push({
          shipId: ship.id,
          isPlayer,
          fromPos: ship.position,
          toPos: ship.position, // can't move
          collisionDamage,
        });
      } else {
        const terrain = terrainMap.get(destKey);
        let asteroidRoll: AsteroidRollResult | undefined;
        
        if (terrain === 'asteroids') {
          const helmTrait = getHelmTrait ? getHelmTrait(ship.id) : null;
          // Gravity Well pull is always for a capital ship here (ships list)
          asteroidRoll = resolveAsteroidEntry(false, helmTrait);
        }

        results.push({
          shipId: ship.id,
          isPlayer,
          fromPos: ship.position,
          toPos: destination,
          collisionDamage: 0,
          asteroidRoll,
        });
      }

      // A ship is only affected by the nearest well; break after first match
      break;
    }
  };

  for (const ship of playerShips) processShip(ship, true);
  for (const ship of enemyShips) processShip(ship, false);

  return results;
}
