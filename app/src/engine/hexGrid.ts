import type { HexCoord, HexFacing, ShipArc, RangeBand, TerrainType } from '../types/game';

// ═══════════════════════════════════════════════════════════════════
// Hex Grid Math — Flat-top axial coordinate system
// ═══════════════════════════════════════════════════════════════════

/**
 * Axial direction vectors for flat-top hexes.
 * Indexed by HexFacing (0=Fore through 5=ForePort).
 * These are the six neighbor offsets.
 */
export const AXIAL_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: -1 }, // 0: Fore (upper-right)
  { q: 1, r: 0 },  // 1: Fore-Starboard (right)
  { q: 0, r: 1 },  // 2: Aft-Starboard (lower-right)
  { q: -1, r: 1 }, // 3: Aft (lower-left)
  { q: -1, r: 0 }, // 4: Aft-Port (left)
  { q: 0, r: -1 }, // 5: Fore-Port (upper-left)
];

/** Get the hex coordinate one step in the given facing direction */
export function hexNeighbor(hex: HexCoord, direction: number): HexCoord {
  const dir = AXIAL_DIRECTIONS[((direction % 6) + 6) % 6];
  return { q: hex.q + dir.q, r: hex.r + dir.r };
}

/** Get all 6 neighbors of a hex */
export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return AXIAL_DIRECTIONS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

/** Convert axial to cube coordinates */
export function axialToCube(hex: HexCoord): { x: number; y: number; z: number } {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}

/** Manhattan distance between two hexes (using cube coordinates) */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const ac = axialToCube(a);
  const bc = axialToCube(b);
  return Math.max(
    Math.abs(ac.x - bc.x),
    Math.abs(ac.y - bc.y),
    Math.abs(ac.z - bc.z),
  );
}

/** Determine range band from hex distance */
export function getRangeBand(distance: number): RangeBand {
  if (distance <= 2) return 'short' as RangeBand;
  if (distance <= 4) return 'medium' as RangeBand;
  return 'long' as RangeBand;
}

/** Get range modifier for TN calculation */
export function getRangeModifier(distance: number): number {
  const band = getRangeBand(distance);
  switch (band) {
    case 'short': return 0;
    case 'medium': return 1;
    case 'long': return 2;
  }
}

/** Check if two hex coords are equal */
export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/** Create a hex coord string key for maps/sets */
export function hexKey(hex: HexCoord): string {
  return `${hex.q},${hex.r}`;
}

/** Parse a hex key back to coord */
export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

// ─── Hex-to-Pixel Conversion (flat-top) ──────────────────────────

const HEX_SIZE = 40; // pixels from center to corner

/** Convert axial hex coord to pixel position (center of hex, flat-top) */
export function hexToPixel(hex: HexCoord, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2 * hex.q);
  const y = size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
  return { x, y };
}

/** Convert pixel position to nearest axial hex coord (flat-top) */
export function pixelToHex(px: number, py: number, size: number = HEX_SIZE): HexCoord {
  const q = (2 / 3 * px) / size;
  const r = (-1 / 3 * px + Math.sqrt(3) / 3 * py) / size;
  return hexRound({ q, r });
}

/** Round fractional axial coordinates to nearest hex */
export function hexRound(hex: { q: number; r: number }): HexCoord {
  const cube = { x: hex.q, z: hex.r, y: -hex.q - hex.r };
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

/** Get the 6 corner points of a flat-top hex for rendering */
export function hexCorners(center: { x: number; y: number }, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i;
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad),
    });
  }
  return corners;
}

// ─── Line of Sight ──────────────────────────────────────────────

/**
 * Get all hexes along a line from A to B (hex lerp / ray cast).
 * Used for LoS checks and determining which shield sector is struck.
 */
export function hexLineDraw(a: HexCoord, b: HexCoord): HexCoord[] {
  const dist = hexDistance(a, b);
  if (dist === 0) return [a];

  const results: HexCoord[] = [];
  const aCube = axialToCube(a);
  const bCube = axialToCube(b);

  for (let i = 0; i <= dist; i++) {
    const t = dist === 0 ? 0 : i / dist;
    // Nudge slightly to avoid ambiguous edges
    const nudge = 1e-6;
    const x = aCube.x + (bCube.x - aCube.x + nudge) * t;
    const y = aCube.y + (bCube.y - aCube.y - nudge) * t;
    const z = aCube.z + (bCube.z - aCube.z + nudge) * t;

    // Convert cube lerp back to axial and round
    results.push(hexRound({ q: x, r: z }));
  }

  return results;
}

/**
 * Check line of sight between two hexes.
 * LoS is blocked if any hex along the line contains blocking terrain.
 */
export function checkLineOfSight(
  from: HexCoord,
  to: HexCoord,
  terrainMap: Map<string, TerrainType>,
): { clear: boolean; blockedBy: HexCoord | null } {
  const line = hexLineDraw(from, to);

  // Skip first (attacker) and last (target) hexes
  for (let i = 1; i < line.length - 1; i++) {
    const key = hexKey(line[i]);
    const terrain = terrainMap.get(key);
    if (terrain === 'asteroids') {
      return { clear: false, blockedBy: line[i] };
    }
  }

  return { clear: true, blockedBy: null };
}

// ─── Shield Sector Determination ────────────────────────────────

/**
 * Determine which shield sector of the defender is struck,
 * based on the angle from attacker to defender relative to defender's facing.
 *
 * The facing of the defender determines which hex edge is "Fore".
 * We compute the angle from the attacker to the defender, then subtract
 * the defender's facing angle to get the relative attack angle.
 */
/**
 * The pixel angle of facing-0 (Fore) in our flat-top system.
 * Fore direction (q:1, r:-1) maps to -30° in pixel space, so
 * we offset all facing angle calculations by -30° (equiv: +330°).
 */
const FACING_PIXEL_OFFSET_DEG = -30;

export function determineStruckShieldSector(
  attackerPos: HexCoord,
  defenderPos: HexCoord,
  defenderFacing: HexFacing,
): ShipArc {
  const attackerPx = hexToPixel(attackerPos);
  const defenderPx = hexToPixel(defenderPos);

  // Angle from defender to attacker (where the shot is coming FROM)
  const dx = attackerPx.x - defenderPx.x;
  const dy = attackerPx.y - defenderPx.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Normalize to [0, 360)
  angle = ((angle % 360) + 360) % 360;

  // Subtract the defender's visual facing angle.
  // Each facing is 60° but facing-0 starts at FACING_PIXEL_OFFSET_DEG (-30°).
  const facingAngle = defenderFacing * 60 + FACING_PIXEL_OFFSET_DEG;
  let relativeAngle = ((angle - facingAngle) % 360 + 360) % 360;

  // Map relative angle to arc (each arc spans 60°)
  const arcIndex = Math.floor(((relativeAngle + 30) % 360) / 60);

  const arcs: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
  return arcs[arcIndex % 6];
}

// ─── Firing Arcs ────────────────────────────────────────────────

/**
 * Check if a target is within a specific weapon arc of the attacker.
 * Similar to shield sector but from the attacker's perspective.
 */
export function isInFiringArc(
  attackerPos: HexCoord,
  attackerFacing: HexFacing,
  targetPos: HexCoord,
  validArcs: ShipArc[],
): boolean {
  const attackerPx = hexToPixel(attackerPos);
  const targetPx = hexToPixel(targetPos);

  const dx = targetPx.x - attackerPx.x;
  const dy = targetPx.y - attackerPx.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = ((angle % 360) + 360) % 360;

  // Apply the same visual offset as determineStruckShieldSector
  const facingAngle = attackerFacing * 60 + FACING_PIXEL_OFFSET_DEG;
  const relativeAngle = ((angle - facingAngle) % 360 + 360) % 360;

  const shifted = (relativeAngle + 30) % 360;
  const arcIndex = Math.floor(shifted / 60);
  const arcs: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
  const targetArc = arcs[arcIndex % 6];

  if (validArcs.includes(targetArc)) return true;

  // Boundary hexes (exactly on the seam between two arcs) belong to both.
  // Detect by checking if shifted angle is very close to a multiple of 60°.
  const remainder = shifted % 60;
  if (remainder < 0.1 || remainder > 59.9) {
    const altIndex = ((arcIndex - 1) + 6) % 6;
    if (validArcs.includes(arcs[altIndex])) return true;
  }

  return false;
}

/**
 * Get the geometric segments for a weapon's firing arcs.
 * Groups contiguous arcs together into single segments and returns radius/angle bounds.
 */
export function getWeaponArcSegments(
  shipPos: HexCoord,
  shipFacing: HexFacing,
  arcNames: ShipArc[],
  minRangeHexes: number = 0,
  maxRangeHexes: number = 6,
): { startRad: number; endRad: number; minRadius: number; maxRadius: number }[] {
  const ARC_ORDER: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
  
  const coveredIndices = arcNames.map(a => ARC_ORDER.indexOf(a)).filter(i => i >= 0).sort((a, b) => a - b);
  if (coveredIndices.length === 0) return [];

  const groups: number[][] = [];
  let currentGroup: number[] = [coveredIndices[0]];
  groups.push(currentGroup);

  for (let i = 1; i < coveredIndices.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    const curr = coveredIndices[i];
    if (curr === prev + 1) {
      currentGroup.push(curr);
    } else {
      currentGroup = [curr];
      groups.push(currentGroup);
    }
  }

  if (groups.length > 1) {
    const firstGroup = groups[0];
    const lastGroup = groups[groups.length - 1];
    if (lastGroup[lastGroup.length - 1] === 5 && firstGroup[0] === 0) {
      firstGroup.unshift(...lastGroup);
      groups.pop();
    }
  }

  const baseFacingDeg = shipFacing * 60 + FACING_PIXEL_OFFSET_DEG;
  const toRad = (d: number) => d * Math.PI / 180;
  
  const minRadius = Math.max(minRangeHexes * 86, 0);
  const maxRadius = maxRangeHexes * 86;

  return groups.map(group => {
    const startIdx = group[0];
    const startDeg = baseFacingDeg + startIdx * 60 - 30;
    const endDeg = startDeg + group.length * 60;

    return {
      startRad: toRad(startDeg),
      endRad: toRad(endDeg),
      minRadius,
      maxRadius
    };
  });
}

// ─── Movement / Drift Path ──────────────────────────────────────

/**
 * Compute the mandatory drift path for a ship.
 * The ship moves forward (in its facing direction) a number of hexes equal to speed.
 * Returns the list of hexes traversed (excluding starting position).
 */
export function computeDriftPath(
  startPos: HexCoord,
  facing: HexFacing,
  speed: number,
): HexCoord[] {
  const path: HexCoord[] = [];
  let current = startPos;

  for (let i = 0; i < speed; i++) {
    current = hexNeighbor(current, facing);
    path.push({ ...current });
  }

  return path;
}

// ─── Hex Grid Generation (Infinite-capable) ─────────────────────

/**
 * Generate hex coordinates for a rectangular region.
 * Supports dynamic expansion — call with larger bounds to grow the grid.
 */
export function generateHexGrid(
  minQ: number,
  maxQ: number,
  minR: number,
  maxR: number,
): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = minQ; q <= maxQ; q++) {
    for (let r = minR; r <= maxR; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

/**
 * Get the bounding box of a set of hex coordinates.
 */
export function getHexBounds(hexes: HexCoord[]): {
  minQ: number; maxQ: number;
  minR: number; maxR: number;
} {
  if (hexes.length === 0) return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };

  let minQ = Infinity, maxQ = -Infinity;
  let minR = Infinity, maxR = -Infinity;

  for (const h of hexes) {
    if (h.q < minQ) minQ = h.q;
    if (h.q > maxQ) maxQ = h.q;
    if (h.r < minR) minR = h.r;
    if (h.r > maxR) maxR = h.r;
  }

  return { minQ, maxQ, minR, maxR };
}
