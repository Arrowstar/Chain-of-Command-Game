import type { FighterToken, TorpedoToken, HexCoord, HexFacing, TerrainType, ShipState, EnemyShipState, DieType, VolleyResult, StationState } from '../../types/game';
import { hexDistance, hexNeighbors, hexKey, getHexFacing } from '../hexGrid';
import { rollVolley } from '../../utils/diceRoller';
import { determineStruckShieldSector } from '../hexGrid';
import { getFighterClassById, pickEnemyFighterClass } from '../../data/fighters';

// ═══════════════════════════════════════════════════════════════════
// Fighter AI / Resolution Engine
// ═══════════════════════════════════════════════════════════════════

const MAX_FIGHTERS_PER_HEX = 3;

export interface FighterMoveResult {
  newPosition: HexCoord;
  moved: boolean;
  traversedHexes: HexCoord[];
  newFacing: HexFacing;
}

export interface FighterAttackResult {
  targetId: string;
  hits: number;
  hullDamage: number;
  shieldDamage: number;
  sector: string;
  struckShieldValue: number;
  rolls: number[];
  targetNumber: number;
  /** True when the target was in an Ion Nebula — shields were bypassed. */
  ionNebulaActive?: boolean;
  volleyResult?: VolleyResult;
}

// ─── BFS Pathfinding ────────────────────────────────────────────

/**
 * Count how many fighters (excluding the mover) occupy a given hex.
 */
function fightersInHex(hex: HexCoord, allFighters: FighterToken[], excludeId: string): number {
  return allFighters.filter(
    f => !f.isDestroyed && f.id !== excludeId && f.position.q === hex.q && f.position.r === hex.r
  ).length;
}

/**
 * BFS toward a target hex, respecting:
 *  - Debris fields (impassable for fighters)
 *  - Stacking cap (max 3 fighters per hex)
 * Returns a list of hexes to travel (up to `speed` steps).
 */
function bfsPath(
  start: HexCoord,
  goal: HexCoord,
  speed: number,
  fighter: FighterToken,
  allFighters: FighterToken[],
  terrainMap: Map<string, TerrainType>,
): HexCoord[] {
  if (hexDistance(start, goal) === 0) return [];

  // Full BFS to find the shortest path to the goal (navigating around debris)
  const queue: { hex: HexCoord; path: HexCoord[] }[] = [{ hex: start, path: [] }];
  const visited = new Set<string>([hexKey(start)]);

  let bestPath: HexCoord[] = [];
  let minDistance = hexDistance(start, goal);

  while (queue.length > 0) {
    const { hex, path } = queue.shift()!;

    for (const neighbor of hexNeighbors(hex)) {
      const key = hexKey(neighbor);
      if (visited.has(key)) continue;
      visited.add(key);

      // Debris field blocks fighters
      const terrain = terrainMap.get(key);
      if (terrain === 'debrisField') continue;

      const newPath = [...path, neighbor];
      const distToGoal = hexDistance(neighbor, goal);

      if (distToGoal === 0) {
        // Found the exact goal hex!
        let resultPath = newPath.slice(0, speed);
        // Check stacking at our final destination step
        while (resultPath.length > 0) {
          const finalHex = resultPath[resultPath.length - 1];
          if (fightersInHex(finalHex, allFighters, fighter.id) < MAX_FIGHTERS_PER_HEX) {
            return resultPath;
          }
          resultPath.pop();
        }
        return [];
      }

      queue.push({ hex: neighbor, path: newPath });

      // Track the closest we can get in case goal is completely unreachable
      if (distToGoal < minDistance) {
        minDistance = distToGoal;
        bestPath = newPath;
      }
    }
  }

  // If goal is unreachable, take the path that gets us closest, up to `speed` steps
  if (bestPath.length > 0) {
    let resultPath = bestPath.slice(0, Math.min(speed, bestPath.length));
    while (resultPath.length > 0) {
      const finalHex = resultPath[resultPath.length - 1];
      if (fightersInHex(finalHex, allFighters, fighter.id) < MAX_FIGHTERS_PER_HEX) {
        return resultPath;
      }
      resultPath.pop();
    }
  }

  // No path found — stay put
  return [];
}

// ─── Fighter Movement ────────────────────────────────────────────

/**
 * Move one fighter toward its target (allied) or nearest player ship (enemy).
 * Returns the new position after moving up to `fighter.speed` hexes.
 */
export function resolveFighterMovement(
  fighter: FighterToken,
  playerShips: ShipState[],
  enemyShips: EnemyShipState[],
  allFighters: FighterToken[],
  terrainMap: Map<string, TerrainType>,
  torpedoTokens: TorpedoToken[],
  stations: StationState[] = []
): FighterMoveResult {
  if (fighter.hasDrifted) return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };

  let goalHex: HexCoord | null = null;
  const isRetreating = fighter.behavior === 'hit_and_run' && fighter.hitAndRunPhase === 'retreat';

  const sourceShip = fighter.allegiance === 'allied' 
    ? playerShips.find(s => s.id === fighter.sourceShipId)
    : enemyShips.find(s => s.id === fighter.sourceShipId);

  // Behavior-specific goal selection
  if (isRetreating) {
    // Retreat: Move in opposite direction from target
    const target = fighter.assignedTargetId 
      ? [...enemyShips, ...playerShips].find(s => s.id === fighter.assignedTargetId)
      : null;
    if (target) {
      const dx = fighter.position.q - target.position.q;
      const dr = fighter.position.r - target.position.r;
      // Simple invert vector for goal
      goalHex = { q: fighter.position.q + dx * 5, r: fighter.position.r + dr * 5 };
    }
  } else if (fighter.behavior === 'escort') {
    // Escort: Stay near source ship
    if (sourceShip) {
      const dist = hexDistance(fighter.position, sourceShip.position);
      if (dist > 1) {
        goalHex = sourceShip.position; // Move toward source ship
      } else {
        // If adjacent, hold position unless enemy is in range
        return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };
      }
    }
  } else if (fighter.behavior === 'screen') {
    // Screen: Target nearest torpedo or fighter within 2 hexes of source ship
    if (sourceShip) {
      const threats = [
        ...torpedoTokens.filter(t => t.allegiance !== fighter.allegiance),
        ...allFighters.filter(f => f.allegiance !== fighter.allegiance && !f.isDestroyed)
      ].filter(t => hexDistance(t.position, sourceShip.position) <= 2);
      
      if (threats.length > 0) {
        threats.sort((a, b) => hexDistance(fighter.position, a.position) - hexDistance(fighter.position, b.position));
        goalHex = threats[0].position;
      }
    }
  } else if (fighter.behavior === 'harass') {
    // Harass (Sticky State): Target assigned/nearest, maintain weaponRangeMax
    let targetShip: ShipState | EnemyShipState | StationState | undefined;
    if (fighter.allegiance === 'allied' && fighter.assignedTargetId) {
      targetShip = enemyShips.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed)
        || stations.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed);
    } else if (fighter.allegiance === 'enemy') {
      const livingShips = playerShips.filter(s => !s.isDestroyed);
      if (livingShips.length > 0) {
        livingShips.sort((a, b) => hexDistance(fighter.position, a.position) - hexDistance(fighter.position, b.position));
        targetShip = livingShips[0];
      }
    }
    
    if (targetShip) {
      const dist = hexDistance(fighter.position, targetShip.position);
      if (dist > fighter.weaponRangeMax) {
        goalHex = targetShip.position; // Move in
      } else if (dist === 1) {
        // Retreat away
        const dx = fighter.position.q - targetShip.position.q;
        const dr = fighter.position.r - targetShip.position.r;
        goalHex = { q: fighter.position.q + dx * 5, r: fighter.position.r + dr * 5 };
      } else {
        // Hold position (sticky state)
        return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };
      }
    }
  } else if (fighter.behavior === 'flanking') {
    // Flanking (Ghost Target): Target hex directly behind enemy
    let targetShip: ShipState | EnemyShipState | StationState | undefined;
    if (fighter.allegiance === 'allied' && fighter.assignedTargetId) {
      targetShip = enemyShips.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed)
        || stations.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed);
    } else if (fighter.allegiance === 'enemy') {
      const livingShips = playerShips.filter(s => !s.isDestroyed);
      if (livingShips.length > 0) {
        livingShips.sort((a, b) => hexDistance(fighter.position, a.position) - hexDistance(fighter.position, b.position));
        targetShip = livingShips[0];
      }
    }
    
    if (targetShip) {
      // Hex behind the target is the opposite of its facing
      const aftDirection = (targetShip.facing + 3) % 6;
      // Approximation of opposite facing offset
      const offsets = [
        { q: -1, r: 1 }, // 0: Fore -> Aft is 3
        { q: -1, r: 0 }, // 1: ForeStarboard -> AftPort is 4
        { q: 0, r: -1 }, // 2: AftStarboard -> ForePort is 5
        { q: 1, r: -1 }, // 3: Aft -> Fore is 0
        { q: 1, r: 0 },  // 4: AftPort -> ForeStarboard is 1
        { q: 0, r: 1 }   // 5: ForePort -> AftStarboard is 2
      ];
      const offset = offsets[targetShip.facing % 6] ?? { q: 0, r: 0 };
      goalHex = { q: targetShip.position.q + offset.q, r: targetShip.position.r + offset.r };
    }
  } else {
    // Default Attack/Swarm behavior
    if (fighter.allegiance === 'allied') {
      if (!fighter.assignedTargetId) return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };
      const target = enemyShips.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed)
        || playerShips.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed)
        || allFighters.find(f => f.id === fighter.assignedTargetId && !f.isDestroyed)
        || stations.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed);
      if (!target) return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };
      goalHex = target.position;
    } else {
      const livingShips = playerShips.filter(s => !s.isDestroyed);
      const livingFighters = allFighters.filter(f => f.allegiance === 'allied' && !f.isDestroyed);
      if (livingShips.length === 0 && livingFighters.length === 0) return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };

      const shipDistances = livingShips.map(s => ({ pos: s.position, dist: hexDistance(fighter.position, s.position) }));
      const fighterDistances = livingFighters.map(f => ({ pos: f.position, dist: hexDistance(fighter.position, f.position) }));
      const allDistances = [...shipDistances, ...fighterDistances].sort((a, b) => a.dist - b.dist);
      goalHex = allDistances[0].pos;
    }
  }

  if (!goalHex) {
    return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };
  }

  const path = bfsPath(fighter.position, goalHex, fighter.speed, fighter, allFighters, terrainMap);

  if (path.length === 0) return { newPosition: fighter.position, moved: false, traversedHexes: [], newFacing: fighter.facing };

  const newPosition = path[path.length - 1];
  const prevHex = path.length > 1 ? path[path.length - 2] : fighter.position;
  const stepFacing = getHexFacing(prevHex, newPosition);
  const newFacing = stepFacing !== null ? stepFacing : fighter.facing;
  return { newPosition, moved: true, traversedHexes: path, newFacing };
}

// ─── Fighter Attack ──────────────────────────────────────────────

/**
 * Attempt to attack a target capital ship.
 * Fighter must be within `fighter.weaponRangeMax` hexes of the target.
 * Returns null if no attack occurs (out of range / no target).
 */
/**
 * Attempt to attack a target (Ship or another Fighter).
 * Fighter must be within `fighter.weaponRangeMax` hexes of the target.
 * Returns null if no attack occurs (out of range / no target).
 */
export function resolveFighterAttack(
  fighter: FighterToken,
  playerShips: ShipState[],
  enemyShips: EnemyShipState[],
  allFighters: FighterToken[],
  terrainMap?: Map<string, TerrainType>,
  stations: StationState[] = []
): FighterAttackResult | null {
  if (fighter.hasActed) return null;

  // 1. Identify Target
  let shipTarget: (ShipState | EnemyShipState | StationState) | undefined;
  let fighterTarget: FighterToken | undefined;

  if (fighter.allegiance === 'allied') {
    if (fighter.assignedTargetId) {
      // Priority: Assigned Target
      shipTarget = enemyShips.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed)
        || stations.find(s => s.id === fighter.assignedTargetId && !s.isDestroyed);
      if (!shipTarget) {
        fighterTarget = allFighters.find(f => f.id === fighter.assignedTargetId && !f.isDestroyed && f.allegiance === 'enemy');
      }
    }
  } else {
    // Enemy swarm: Target nearest player ship or nearest allied fighter
    const livingShips = playerShips.filter(s => !s.isDestroyed);
    const livingFighters = allFighters.filter(f => !f.isDestroyed && f.allegiance === 'allied');

    const shipDistances = livingShips.map(s => ({ target: s, dist: hexDistance(fighter.position, s.position) }));
    const fighterDistances = livingFighters.map(f => ({ target: f, dist: hexDistance(fighter.position, f.position) }));

    const allDistances = [
      ...shipDistances.map(d => ({ type: 'ship' as const, ...d })),
      ...fighterDistances.map(d => ({ type: 'fighter' as const, ...d }))
    ].sort((a, b) => a.dist - b.dist);

    if (allDistances.length > 0) {
      const best = allDistances[0];
      if (best.type === 'ship') shipTarget = best.target as ShipState;
      else fighterTarget = best.target as FighterToken;
    }
  }

  // No target found in range
  if (!shipTarget && !fighterTarget) return null;

  const targetPos = shipTarget ? shipTarget.position : fighterTarget!.position;
  const dist = hexDistance(fighter.position, targetPos);
  if (dist > fighter.weaponRangeMax) return null;

  // 2. Roll Attack
  let tn = 5; // Default for fighters
  if (shipTarget) {
    tn = ('chassisId' in shipTarget)
      ? (shipTarget as ShipState).baseEvasion + (shipTarget as ShipState).evasionModifiers
      : (shipTarget as EnemyShipState & { baseEvasion?: number }).baseEvasion ?? 5;
  } else if (fighterTarget) {
    tn = Math.max(1, fighterTarget.baseEvasion - 3); // Dogfight Rule
  }

  const volley = rollVolley(fighter.volleyPool.map(dt => ({ type: dt as DieType, source: 'fighter' })), tn);
  const hits = volley.totalHits;

  const allRolls = volley.dice.flatMap(d => d.rolls);

  if (hits === 0) {
    return { 
      targetId: shipTarget?.id || fighterTarget!.id, 
      hits: 0, 
      hullDamage: 0, 
      shieldDamage: 0, 
      sector: fighterTarget ? 'hull' : 'fore', 
      struckShieldValue: 0,
      rolls: allRolls,
      targetNumber: tn,
      volleyResult: volley
    };
  }

  // 3. Apply Damage
  if (fighterTarget) {
    // Dogfighting: Direct Hull Damage (Fighters have no shields)
    return {
      targetId: fighterTarget.id,
      hits,
      hullDamage: hits, // 1 hit = 1 hull (fighters only have 1 hull)
      shieldDamage: 0,
      sector: 'hull',
      struckShieldValue: 0,
      rolls: allRolls,
      targetNumber: tn,
      volleyResult: volley
    };
  } else if (shipTarget) {
    // Capital Ship Attack
    let sector: string;
    if (dist === 0) {
      // Same-hex attack: Pick random sector
      const sectors = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
      sector = sectors[Math.floor(Math.random() * sectors.length)];
    } else {
      sector = determineStruckShieldSector(fighter.position, shipTarget.position, shipTarget.facing);
    }

    // ── Ion Nebula: shields are bypassed (treated as 0) but not depleted ─────────
    const targetKey = hexKey(shipTarget.position);
    const targetTerrain = terrainMap?.get(targetKey);
    const ionNebulaActive = targetTerrain === 'ionNebula';

    const shieldVal = ionNebulaActive ? 0 : (shipTarget.shields[sector as keyof typeof shipTarget.shields] ?? 0);
    const shieldDmg = Math.min(hits, shieldVal);
    const overflow = hits - shieldDmg;
    const hullDamage = overflow > 0 ? 1 : 0; // standard fighter rules: 1 hull max per volley

    return { 
      targetId: shipTarget.id, 
      hits, 
      hullDamage, 
      shieldDamage: shieldDmg, 
      sector, 
      struckShieldValue: shieldVal,
      rolls: allRolls,
      targetNumber: tn,
      ionNebulaActive: ionNebulaActive || undefined,
      volleyResult: volley
    };
  }

  return null;
}

// ─── Carrier Spawn Helper ────────────────────────────────────────

/**
 * Builds two enemy FighterToken objects to be spawned adjacent to a Carrier.
 * The fighter class is chosen randomly each call so waves vary in composition.
 * Caller is responsible for adding them to game state.
 */
export function buildCarrierFighters(
  shipId: string,
  shipPosition: HexCoord,
  shipFacing: number,
  occupiedFighterHexes: Map<string, number>, // hex key → current fighter count
  terrainMap: Map<string, TerrainType>,
  idPrefix: string,
): FighterToken[] {
  const neighbors = hexNeighbors(shipPosition);
  const validHexes = neighbors.filter(h => {
    const key = hexKey(h);
    const terrain = terrainMap.get(key);
    if (terrain === 'debrisField') return false;
    return (occupiedFighterHexes.get(key) ?? 0) < MAX_FIGHTERS_PER_HEX;
  });

  // Pick a random class for this wave — all fighters in the wave share the same class
  const { fighterClass, behavior } = pickEnemyFighterClass();

  const results: FighterToken[] = [];
  for (let i = 0; i < 2 && i < validHexes.length; i++) {
    const hex = validHexes[i];
    const key = hexKey(hex);
    occupiedFighterHexes.set(key, (occupiedFighterHexes.get(key) ?? 0) + 1);

    results.push({
      id: `${idPrefix}-${i}`,
      name: `${fighterClass.name} ${idPrefix.split('-').pop()?.toUpperCase() ?? ''}${i + 1}`,
      classId: fighterClass.id,
      allegiance: 'enemy',
      sourceShipId: shipId,
      position: hex,
      facing: shipFacing as any,
      currentHull: fighterClass.hull,
      maxHull: fighterClass.hull,
      speed: fighterClass.speed,
      baseEvasion: fighterClass.baseEvasion,
      volleyPool: fighterClass.volleyPool,
      weaponRangeMax: fighterClass.weaponRangeMax,
      behavior,
      isDestroyed: false,
      hasDrifted: false,
      hasActed: false,
      assignedTargetId: null,
    });
  }

  return results;
}
