import { TerrainType, type HexCoord, type HexFacing, type AIBehaviorTag } from '../../types/game';
import { hexDistance, hexNeighbors, hexKey, hexNeighbor, isInFiringArc } from '../hexGrid';

export interface AlliedDetails {
  pos: HexCoord;
  tag: AIBehaviorTag;
}

// ═══════════════════════════════════════════════════════════════════
// AI Movement Behaviors
// ═══════════════════════════════════════════════════════════════════

export interface AIMovePlan {
  targetHex: HexCoord;
  newFacing: HexFacing;
  path: HexCoord[];
}

export interface MoveState {
  hex: HexCoord;
  facing: HexFacing;
  path: HexCoord[];
}

/**
 * Determine the best movement hex for an AI ship based on its behavior tag.
 * Returns the target hex and desired facing.
 */
export function planAIMovement(
  aiPos: HexCoord,
  aiFacing: HexFacing,
  aiSpeed: number,
  targetPos: HexCoord,
  behaviorTag: AIBehaviorTag,
  weaponRangeMax: number,
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  extraMovement: number = 0,
  isFighter: boolean = false,
  alliedDetails: AlliedDetails[] = [],
): AIMovePlan {
  const effectiveSpeed = Math.max(0, aiSpeed + extraMovement);

  switch (behaviorTag) {
    case 'aggressive':
      return planAggressive(aiPos, aiFacing, effectiveSpeed, targetPos, occupiedHexes, terrainMap, isFighter);
    case 'artillery':
      return planArtillery(aiPos, aiFacing, effectiveSpeed, targetPos, weaponRangeMax, occupiedHexes, terrainMap, isFighter);
    case 'hunter':
      return planHunter(aiPos, aiFacing, effectiveSpeed, targetPos, occupiedHexes, terrainMap, isFighter);
    case 'swarm':
      return planSwarm(aiPos, aiFacing, effectiveSpeed, targetPos, terrainMap, isFighter);
    case 'support':
      return planSupport(aiPos, aiFacing, effectiveSpeed, targetPos, occupiedHexes, terrainMap, isFighter, alliedDetails);
    case 'escort':
      return planEscort(aiPos, aiFacing, effectiveSpeed, targetPos, occupiedHexes, terrainMap, isFighter);
    default:
      return { targetHex: aiPos, newFacing: aiFacing, path: [] };
  }
}

function scoreFacing(state: MoveState, targetPos: HexCoord): number {
  const ideal = facingToward(state.hex, targetPos);
  return Math.min(Math.abs(state.facing - ideal), 6 - Math.abs(state.facing - ideal));
}

/** Aggressive: close to range 1, then seek weakest shield arc */
function planAggressive(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): AIMovePlan {
  const candidates = getReachableStates(aiPos, aiFacing, speed, occupied, terrain, isFighter);
  candidates.sort((a, b) => {
    const distA = hexDistance(a.hex, targetPos);
    const distB = hexDistance(b.hex, targetPos);
    
    // Penalty for ending in asteroids
    const terrainA = terrain.get(hexKey(a.hex)) === TerrainType.Asteroids ? 0.5 : 0;
    const terrainB = terrain.get(hexKey(b.hex)) === TerrainType.Asteroids ? 0.5 : 0;

    if (distA + terrainA !== distB + terrainB) return (distA + terrainA) - (distB + terrainB);
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });
  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

/** Artillery: maintain max weapon range, retreat if too close */
function planArtillery(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, maxRange: number, occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): AIMovePlan {
  const candidates = getReachableStates(aiPos, aiFacing, speed, occupied, terrain, isFighter);
  candidates.sort((a, b) => {
    const distA = Math.abs(hexDistance(a.hex, targetPos) - maxRange);
    const distB = Math.abs(hexDistance(b.hex, targetPos) - maxRange);
    if (distA !== distB) return distA - distB;
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });
  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

/** Hunter: avoid fore arc, get to rear arc */
function planHunter(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): AIMovePlan {
  const candidates = getReachableStates(aiPos, aiFacing, speed, occupied, terrain, isFighter);
  candidates.sort((a, b) => {
    const distA = hexDistance(a.hex, targetPos);
    const distB = hexDistance(b.hex, targetPos);
    const scoreA = Math.abs(distA - 2.5);
    const scoreB = Math.abs(distB - 2.5);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });
  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

/** Swarm: move directly into target hex (small craft stacking) */
function planSwarm(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): AIMovePlan {
  // Move toward target, small craft can stack (ignore occupiedHexes)
  const candidates = getReachableStates(aiPos, aiFacing, speed, new Set(), terrain, isFighter);
  candidates.sort((a, b) => {
    const distA = hexDistance(a.hex, targetPos);
    const distB = hexDistance(b.hex, targetPos);
    if (distA !== distB) return distA - distB;
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });
  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

/** Support (Anchored): stay near the nearest non-support ally (Guardian), while maximizing distance from player. */
function planSupport(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean, alliedDetails: AlliedDetails[],
): AIMovePlan {
  const candidates = getReachableStates(aiPos, aiFacing, speed, occupied, terrain, isFighter);

  // Find a "Guardian": nearest non-support, non-artillery ally
  const guardians = alliedDetails
    .filter(a => a.tag !== 'support' && a.tag !== 'artillery')
    .sort((a, b) => hexDistance(aiPos, a.pos) - hexDistance(aiPos, b.pos));
  
  const guardian = guardians[0];

  candidates.sort((a, b) => {
    const distToPlayerA = hexDistance(a.hex, targetPos);
    const distToPlayerB = hexDistance(b.hex, targetPos);

    if (guardian) {
      const distToGuardianA = hexDistance(a.hex, guardian.pos);
      const distToGuardianB = hexDistance(b.hex, guardian.pos);

      // Ideal range to guardian is 2.5
      const guardianScoreA = Math.abs(distToGuardianA - 2.5);
      const guardianScoreB = Math.abs(distToGuardianB - 2.5);

      // We want to be far from player, but close to guardian.
      // Combined score: lower is better. 
      // Proximity to guardian is primary, but we break ties with distance from player.
      if (guardianScoreA !== guardianScoreB) return guardianScoreA - guardianScoreB;
      return distToPlayerB - distToPlayerA; // Maximize player distance
    }

    // No guardian? Just maximize distance from player.
    if (distToPlayerA !== distToPlayerB) return distToPlayerB - distToPlayerA;
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });

  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

/** Escort: maintain medium range (2-3), avoid closing to point blank unless necessary */
function planEscort(
  aiPos: HexCoord, aiFacing: HexFacing, speed: number,
  targetPos: HexCoord, occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): AIMovePlan {
  const candidates = getReachableStates(aiPos, aiFacing, speed, occupied, terrain, isFighter);
  candidates.sort((a, b) => {
    const distA = hexDistance(a.hex, targetPos);
    const distB = hexDistance(b.hex, targetPos);
    
    // Ideal range is 2.5 (minimizes difference from 2 or 3)
    const scoreA = Math.abs(distA - 2.5);
    const scoreB = Math.abs(distB - 2.5);
    
    if (scoreA !== scoreB) return scoreA - scoreB;
    return scoreFacing(a, targetPos) - scoreFacing(b, targetPos);
  });
  const best = candidates[0] ?? { hex: aiPos, facing: aiFacing, path: [] };
  return { targetHex: best.hex, newFacing: best.facing, path: best.path };
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Get all hexes reachable within a given speed (Dijkstra respecting facing/turning) */
function getReachableStates(
  start: HexCoord, startFacing: HexFacing, speed: number,
  occupied: Set<string>, terrain: Map<string, TerrainType>,
  isFighter: boolean,
): MoveState[] {
  const visited = new Map<string, number>();
  const queue: { hex: HexCoord, facing: HexFacing, cost: number, path: HexCoord[] }[] = [{ hex: start, facing: startFacing, cost: 0, path: [] }];
  const reachable: MoveState[] = [];
  
  const stateKey = (h: HexCoord, f: HexFacing) => `${h.q},${h.r},${f}`;
  visited.set(stateKey(start, startFacing), 0);
  reachable.push({ hex: start, facing: startFacing, path: [] });

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);
    const curr = queue.shift()!;

    if (curr.cost >= speed) continue;

    // Option 1: Move forward
    const fwd = hexNeighbor(curr.hex, curr.facing);
    const fwdKeyHex = hexKey(fwd);
    const fwdStateKey = stateKey(fwd, curr.facing);
    
    if (!occupied.has(fwdKeyHex)) {
      const t = terrain.get(fwdKeyHex);
      let canMove = true;
      if (isFighter && t === TerrainType.DebrisField) canMove = false;
      if (canMove) {
        const nextCost = curr.cost + 1;
        const prevCost = visited.get(fwdStateKey) ?? Infinity;
        if (nextCost < prevCost) {
          const nextPath = [...curr.path, fwd];
          visited.set(fwdStateKey, nextCost);
          if (prevCost === Infinity) reachable.push({ hex: fwd, facing: curr.facing, path: nextPath });
          
          // If it's an asteroid hex and NOT a fighter, the ship is halted.
          const isHalted = t === TerrainType.Asteroids && !isFighter;
          if (!isHalted) {
            queue.push({ hex: fwd, facing: curr.facing, cost: nextCost, path: nextPath });
          }
        }
      }
    }

    // Option 2 & 3: Turn left or right
    const turns = [
      (curr.facing + 5) % 6 as HexFacing, // Left
      (curr.facing + 1) % 6 as HexFacing, // Right
    ];
    for (const newFacing of turns) {
      const nextCost = curr.cost + 1;
      const turnStateKey = stateKey(curr.hex, newFacing);
      const prevCost = visited.get(turnStateKey) ?? Infinity;
      if (nextCost < prevCost) {
        visited.set(turnStateKey, nextCost);
        if (prevCost === Infinity) reachable.push({ hex: curr.hex, facing: newFacing, path: curr.path });
        queue.push({ hex: curr.hex, facing: newFacing, cost: nextCost, path: curr.path });
      }
    }
  }

  return reachable;
}

/** Determine facing direction toward target */
function facingToward(from: HexCoord, to: HexCoord): HexFacing {
  let bestFacing = 0 as HexFacing;
  let bestDist = Infinity;
  for (let f = 0; f < 6; f++) {
    const neighbor = hexNeighbor(from, f);
    const dist = hexDistance(neighbor, to);
    if (dist < bestDist) {
      bestDist = dist;
      bestFacing = f as HexFacing;
    }
  }
  return bestFacing;
}
