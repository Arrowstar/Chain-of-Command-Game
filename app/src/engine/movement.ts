import type { HexCoord, HexFacing, ShipState, ShipChassis, TerrainType } from '../types/game';
import { hexNeighbor, hexEquals, hexKey, computeDriftPath } from './hexGrid';
import { rollDie } from '../utils/diceRoller';

// ═══════════════════════════════════════════════════════════════════
// Movement Engine — Drift, Rotation, Speed, Collisions
// ═══════════════════════════════════════════════════════════════════

export interface DriftResult {
  /** Final position after drift */
  finalPosition: HexCoord;
  /** Path traversed (does not include start) */
  path: HexCoord[];
  /** Whether a collision occurred */
  collision: boolean;
  /** If collision, the position just before impact */
  collisionPosition?: HexCoord;
  /** If collision, the hex of the unit collided WITH */
  collidedWithHex?: HexCoord;
  /** Hull damage from collision */
  collisionDamage: number;
  /** Hull damage from terrain (asteroids) */
  terrainDamage: number;
  /** Speed after drift (may be reduced to 0 by collision/asteroids) */
  resultingSpeed: number;
  /** Terrain hazards encountered */
  hazards: { hex: HexCoord; type: TerrainType }[];
}

export interface DriftPreviewResult {
  /** Final projected position after mandatory drift resolves. */
  finalPosition: HexCoord;
  /** Traversed path, excluding the starting hex. */
  path: HexCoord[];
  /** True when projection is interrupted by an occupied hex. */
  collision: boolean;
  /** The hex that blocked the projected drift, if any. */
  collidedWithHex?: HexCoord;
  /** True when the ship halts after entering an asteroid hex. */
  haltedByAsteroids: boolean;
}

/**
 * Execute mandatory momentum drift for a capital ship.
 *
 * Rules:
 * - Ship moves forward (facing direction) exactly `currentSpeed` hexes
 * - Cannot pass through or stop on capital ships or solid asteroids
 * - Collision: ship halts in last valid hex, speed → 0, both take 1D4 hull damage
 * - Asteroids: halt drift, speed → 0, D6 roll: on 1, take 1D4 hull damage
 */
export function executeDrift(
  ship: ShipState,
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  isSmallCraft: boolean = false,
  helmTrait: string | null = null,
  chassisTrait: string | null = null,
): DriftResult {
  const path: HexCoord[] = [];
  const hazards: { hex: HexCoord; type: TerrainType }[] = [];
  let currentPos = { ...ship.position };
  let collision = false;
  let collisionPosition: HexCoord | undefined;
  let collidedWithHex: HexCoord | undefined;
  let collisionDamage = 0;
  let terrainDamage = 0;
  let resultingSpeed = ship.currentSpeed;

  const fullPath = computeDriftPath(ship.position, ship.facing, ship.currentSpeed);

  for (let i = 0; i < fullPath.length; i++) {
    const nextHex = fullPath[i];
    const nextKey = hexKey(nextHex);
    const terrain = terrainMap.get(nextKey);

    // Check for capital ship collision (small craft can pass through)
    if (!isSmallCraft && occupiedHexes.has(nextKey)) {
      collision = true;
      collisionPosition = currentPos;
      collidedWithHex = nextHex;
      collisionDamage = rollDie('d4');
      if (chassisTrait === 'Lumbering') {
        collisionDamage += rollDie('d4'); // 2D4 damage for Minotaur
      }
      resultingSpeed = 0;
      break;
    }

    // Check terrain effects
    if (terrain === 'asteroids') {
      // Asteroids: Small Craft (fighters) can pass through freely.
      // Capital Ships: ship enters the asteroid hex, speed → 0, then rolls D6 for damage.
      if (!isSmallCraft) {
        // Ship enters the hex first, then halts.
        currentPos = nextHex;
        path.push({ ...nextHex });
        hazards.push({ hex: nextHex, type: terrain });
        // D6 entry roll — on a 1, take 1D4 hull damage (Hotshot uses D6 for damage die instead).
        const entryRoll = rollDie('d6');
        if (entryRoll === 1) {
          const hazardDieType = helmTrait === 'Hotshot' ? 'd6' : 'd4';
          terrainDamage += rollDie(hazardDieType);
        }
        resultingSpeed = 0;
        break;
      }
    }

    // Debris Fields: Small Craft (fighters) cannot enter during drift — halt before the hex.
    if (terrain === 'debrisField' && isSmallCraft) {
      // Fighter is halted in its current position; further movement is blocked.
      resultingSpeed = 0;
      break;
    }

    // Ship / craft can move to this hex
    currentPos = nextHex;
    path.push({ ...nextHex });

    // Track terrain passed through (for Ion Nebula, Debris Field effects)
    if (terrain && terrain !== 'open') {
      hazards.push({ hex: nextHex, type: terrain });
    }
  }

  return {
    finalPosition: currentPos,
    path,
    collision,
    collisionPosition,
    collidedWithHex,
    collisionDamage,
    terrainDamage,
    resultingSpeed,
    hazards,
  };
}

/**
 * Predict where a ship will end up when mandatory drift resolves.
 * This mirrors the non-random positional parts of drift resolution so the UI can
 * show a stable projection without rolling damage dice or mutating state.
 */
export function projectDriftPreview(
  ship: Pick<ShipState, 'position' | 'facing' | 'currentSpeed'>,
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  isSmallCraft: boolean = false,
): DriftPreviewResult {
  const path: HexCoord[] = [];
  let currentPos = { ...ship.position };
  let collision = false;
  let collidedWithHex: HexCoord | undefined;
  let haltedByAsteroids = false;

  const fullPath = computeDriftPath(ship.position, ship.facing, ship.currentSpeed);

  for (const nextHex of fullPath) {
    const nextKey = hexKey(nextHex);
    const terrain = terrainMap.get(nextKey);

    if (!isSmallCraft && occupiedHexes.has(nextKey)) {
      collision = true;
      collidedWithHex = nextHex;
      break;
    }

    if (terrain === 'asteroids' && !isSmallCraft) {
      currentPos = nextHex;
      path.push({ ...nextHex });
      haltedByAsteroids = true;
      break;
    }

    if (terrain === 'debrisField' && isSmallCraft) {
      break;
    }

    currentPos = nextHex;
    path.push({ ...nextHex });
  }

  return {
    finalPosition: currentPos,
    path,
    collision,
    collidedWithHex,
    haltedByAsteroids,
  };
}

/**
 * Rotate the ship 60° in the given direction.
 * Returns the new facing. Note: rotation changes facing immediately,
 * but the new forward vector applies to NEXT round's drift.
 */
export function rotateShip(
  currentFacing: HexFacing,
  direction: 'clockwise' | 'counterclockwise',
): HexFacing {
  if (direction === 'clockwise') {
    return ((currentFacing + 1) % 6) as HexFacing;
  } else {
    return (((currentFacing - 1) % 6 + 6) % 6) as HexFacing;
  }
}

/**
 * Adjust speed.
 * Returns new speed clamped between 0 and chassis max.
 * Delta is typically ±1, but Zephyr (Afterburners) uses ±2.
 */
export function adjustSpeed(
  currentSpeed: number,
  delta: number,
  maxSpeed: number,
): number {
  return Math.max(0, Math.min(maxSpeed, currentSpeed + delta));
}

/**
 * Check if a ship can move to a given hex.
 * Capital ships cannot stack; small craft can (up to 3).
 */
export function canOccupyHex(
  hex: HexCoord,
  occupiedCapitalShips: Set<string>,
  smallCraftCount: Map<string, number>,
  isSmallCraft: boolean,
): boolean {
  const key = hexKey(hex);

  if (isSmallCraft) {
    const count = smallCraftCount.get(key) ?? 0;
    return count < 3;
  }

  return !occupiedCapitalShips.has(key);
}
