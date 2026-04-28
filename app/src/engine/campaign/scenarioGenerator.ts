import type { CombatModifiers } from '../../types/campaignTypes';
import type { DeploymentBounds, EnemyShipState, HexCoord, TerrainType, HexFacing } from '../../types/game';
import { ADVERSARIES } from '../../data/adversaries';
import { hexDistance, hexNeighbors, hexKey } from '../hexGrid';

export interface ProceduralScenarioConfig {
  objectiveType: string;
  terrain: { coord: HexCoord; type: TerrainType }[];
  enemyShips: EnemyShipState[];
  objectiveMarkers: { name: string; position: HexCoord; hull: number; maxHull: number; shieldsPerSector: number }[];
  stationSpawns?: { stationId: string; position: HexCoord; facing?: HexFacing }[];
  scenarioRules: string[];
  generationReport: string[];
  deploymentBounds: DeploymentBounds;
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollD4(): number {
  return Math.floor(Math.random() * 4) + 1;
}

function formatCoord(coord: HexCoord): string {
  return `(${coord.q},${coord.r})`;
}

function describeTerrainType(type: TerrainType): string {
  switch (type) {
    case 'asteroids':
      return 'Asteroid';
    case 'ionNebula':
      return 'Ion Nebula';
    case 'debrisField':
      return 'Debris Field';
    case 'gravityWell':
      return 'Gravity Well';
    default:
      return 'Open Void';
  }
}

const ENEMY_CALLSIGNS = [
  'Iron Decree', 'Solar Inquisitor', 'Hand of the Hegemon', 'Obsidian Arbiter',
  'Silent Sovereign', 'Unyielding Will', 'Grasp of Tyranny', 'Vengeance of Sol',
  'Eternal Vigil', 'Dread Bastion', 'Absolute Authority', 'Steel Apostle',
  'Crown of Obsidian', 'Grim Sanction', 'Apex Sentinel', 'Void Hammer',
  'Imperial Scourge', 'Final Verdict', 'Hallowed Spear', "Zenith's Wrath",
  'Cold Justice', 'Resolute Command', "Titan's Decree", 'Obsidian Throne',
  'Solar Apex', 'Silent Enforcer', "Hegemony's Reach", 'Dark Constellation',
  'Sovereign Guard', 'Iron Gospel', 'Vindicator Prime', 'Eclipse of Mercy',
  'Lawbringer IX', 'Abyssal Warden', 'Purity of Flame', 'Dread Herald',
  'Unspoken Law', 'Iron Sanctity', 'Hammer of Penance', "Sol's Retribution",
  'Obsidian Shield', 'Silent Crusader', "Dominion's Edge", 'Righteous Fury',
  'Grave Authority', 'Starlight Inquisitor', 'Eternal Sanction', 'Iron Crown',
  "Hegemon's Fist", 'Void Arbiter', 'Pillar of Orthodoxy', 'The Golden Mandate',
  "Sol's Unblinking Eye", 'Scepter of the Hegemon', 'Obsidian Vanguard',
  "Zenith's Hammer", 'The Law of Iron', 'Arbitrator Prime', 'Cold Solace',
  'Steel Sacrament', 'The Silent Verdict', 'Radiant Oppression', 'Bastion of Purity',
  'Flare of Judgment', 'The Inflexible Will', 'Obsidian Monolith', "Sol's Harsh Dawn",
  'Eternal Gavel', 'Scepter of Dust', 'Iron Orthodoxy', "Zenith's Sentinel",
  'The Final Amen', 'Stellar Inquisitor', 'The Unmaking Force', 'Penance of the Void',
  'Obsidian Sentry', "The Hegemon's Breath", "Sol's Silent Wrath", 'Indomitable Spires',
  'Verdict of the Stars', 'Steel Covenant', 'The Iron Sentinel', 'Corona of Authority',
  'The Obsidian Shard', "Zenith's Requiem", 'Scepter of the Sun', 'Immutable Sanction',
  "Sol's Iron Halo", 'Silent Watcher', 'Obsidian Fortress', 'Unyielding Pillar',
  "Zenith's Fury", 'Law of the Stars', 'Steel Resolve', 'Mandate of the Iron Heavens',
  "Sol's Blinding Grace", 'Obsidian Anchor', "Zenith's Clarion", 'Final Proclamation',
  "Hegemon's Eternity",
];

function assignCallsigns(roster: string[]): string[] {
  const pool = [...ENEMY_CALLSIGNS].sort(() => Math.random() - 0.5);
  const classCounts: Record<string, number> = {};
  return roster.map(advId => {
    classCounts[advId] = (classCounts[advId] ?? 0) + 1;
    return pool.pop() ?? `Unit-${classCounts[advId]}`;
  });
}

function getRandomHexes(count: number, avoidRadius: number = 2, maxRadius: number = 8): HexCoord[] {
  const result: HexCoord[] = [];
  let attempts = 0;
  while (result.length < count && attempts < 100) {
    attempts++;
    const q = Math.floor(Math.random() * (maxRadius * 2 + 1)) - maxRadius;
    const r = Math.floor(Math.random() * (maxRadius * 2 + 1)) - maxRadius;
    if (Math.abs(q) + Math.abs(q + r) + Math.abs(r) > maxRadius * 2) continue;
    if (Math.abs(q) + Math.abs(q + r) + Math.abs(r) < avoidRadius * 2) continue;

    const collides = result.some(h => h.q === q && h.r === r);
    if (!collides) {
      result.push({ q, r });
    }
  }
  return result;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function isWithinRadius(coord: HexCoord, radius: number): boolean {
  return hexDistance(coord, { q: 0, r: 0 }) <= radius;
}

function buildTerrainPlanner(
  reservedHexes: HexCoord[],
  terrain: { coord: HexCoord; type: TerrainType }[],
  boardRadius: number = 8,
) {
  const terrainMap = new Map<string, TerrainType>();
  const reserved = new Set(reservedHexes.map(hexKey));

  const canPlace = (coord: HexCoord) => isWithinRadius(coord, boardRadius) && !reserved.has(hexKey(coord));

  const addTerrain = (coord: HexCoord, type: TerrainType) => {
    const key = hexKey(coord);
    if (!canPlace(coord)) return false;
    if (terrainMap.has(key)) return false;
    terrainMap.set(key, type);
    terrain.push({ coord, type });
    return true;
  };

  const addCluster = (
    origin: HexCoord,
    type: TerrainType,
    size: number,
    edgeBias: number = 0.65,
  ) => {
    addTerrain(origin, type);
    const frontier: HexCoord[] = [origin];
    const visited = new Set<string>([hexKey(origin)]);

    while (frontier.length > 0 && terrainMap.size < 80) {
      const current = frontier.shift()!;
      const orderedNeighbors = [...hexNeighbors(current)].sort(() => Math.random() - 0.5);
      for (const neighbor of orderedNeighbors) {
        const neighborKey = hexKey(neighbor);
        if (visited.has(neighborKey)) continue;
        visited.add(neighborKey);

        const distance = hexDistance(origin, neighbor);
        const chance = Math.max(0.18, edgeBias - distance * 0.12);
        if (Math.random() <= chance && addTerrain(neighbor, type) && terrainMap.size >= size) {
          return;
        }
        if (canPlace(neighbor) && distance <= 4) {
          frontier.push(neighbor);
        }
      }
    }
  };

  const addChain = (
    start: HexCoord,
    direction: number,
    length: number,
    type: TerrainType,
    driftChance: number = 0.45,
  ) => {
    let current = { ...start };
    let facing = direction;
    for (let i = 0; i < length; i++) {
      addTerrain(current, type);
      if (Math.random() < 0.35) {
        const shoulder = hexNeighbors(current).filter(n => isWithinRadius(n, boardRadius));
        if (shoulder.length > 0) addTerrain(pickRandom(shoulder), type);
      }

      if (Math.random() < driftChance) {
        facing = (facing + (Math.random() < 0.5 ? -1 : 1) + 6) % 6;
      }
      current = hexNeighbors(current)[facing];
      if (!isWithinRadius(current, boardRadius)) break;
    }
  };

  const addScatter = (
    count: number,
    type: TerrainType,
    avoidRadius: number = 2,
    radius: number = boardRadius,
  ) => {
    getRandomHexes(count, avoidRadius, radius).forEach(coord => {
      addTerrain(coord, type);
    });
  };

  return {
    addTerrain,
    addCluster,
    addChain,
    addScatter,
    getCount: () => terrainMap.size,
  };
}

function buildReservedHexes(objectiveMarkers: { position: HexCoord }[]): HexCoord[] {
  return [
    { q: 0, r: 6 },
    { q: 0, r: 7 },
    { q: 0, r: 8 },
    { q: -2, r: -6 },
    { q: 0, r: -6 },
    { q: 2, r: -6 },
    ...objectiveMarkers.map(marker => marker.position),
  ];
}

function buildTerrainMap(terrain: { coord: HexCoord; type: TerrainType }[]): Map<string, TerrainType> {
  return new Map(terrain.map(entry => [hexKey(entry.coord), entry.type]));
}

function getBoardHexes(radius: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const coord = { q, r };
      if (isWithinRadius(coord, radius)) {
        hexes.push(coord);
      }
    }
  }
  return hexes;
}

function buildDeploymentZone(
  objectiveType: string,
  terrain: { coord: HexCoord; type: TerrainType }[],
  playerCount: number,
): DeploymentBounds {
  const terrainMap = buildTerrainMap(terrain);
  const boardHexes = getBoardHexes(8);
  const openPlayerSideHexes = boardHexes.filter(coord =>
    coord.r >= 1 && (terrainMap.get(hexKey(coord)) ?? 'open') === 'open',
  );

  const shape =
    objectiveType === 'Breakout' ? { label: 'forward wedge', width: 4, rows: 4, qShiftPerRow: 1, rStart: 5 }
    : objectiveType === 'Hold the Line' ? { label: 'broad defensive line', width: 6, rows: 3, qShiftPerRow: 0, rStart: 6 }
    : objectiveType === 'Data Siphon' ? { label: 'centered strike lane', width: 4, rows: 4, qShiftPerRow: 0, rStart: 4 }
    : objectiveType === 'Salvage Run' ? { label: 'wide recovery spread', width: 5, rows: 4, qShiftPerRow: 0, rStart: 5 }
    : objectiveType === 'Assassination' ? { label: 'attack column', width: 3, rows: 5, qShiftPerRow: 0, rStart: 4 }
    : { label: 'assault line', width: 5, rows: 4, qShiftPerRow: 0, rStart: 5 };

  const minHexCount = Math.max(playerCount + 5, shape.width * shape.rows - 2);
  const generated: HexCoord[] = [];
  const seen = new Set<string>();

  for (let row = 0; row < shape.rows; row++) {
    const r = shape.rStart + row;
    const centerQ = (row - Math.floor(shape.rows / 2)) * shape.qShiftPerRow;
    const halfWidth = Math.floor(shape.width / 2);
    const rowMinQ = centerQ - halfWidth;
    const rowMaxQ = centerQ + halfWidth - (shape.width % 2 === 0 ? 1 : 0);

    for (let q = rowMinQ; q <= rowMaxQ; q++) {
      const coord = { q, r };
      const key = hexKey(coord);
      if (seen.has(key)) continue;
      if ((terrainMap.get(key) ?? 'open') !== 'open') continue;
      generated.push(coord);
      seen.add(key);
    }
  }

  if (generated.length < minHexCount) {
    const extras = openPlayerSideHexes
      .filter(coord => !seen.has(hexKey(coord)))
      .sort((a, b) => {
        const distA = Math.abs(a.q) + Math.abs(a.r - shape.rStart);
        const distB = Math.abs(b.q) + Math.abs(b.r - shape.rStart);
        return distA - distB;
      });

    for (const coord of extras) {
      generated.push(coord);
      seen.add(hexKey(coord));
      if (generated.length >= minHexCount) break;
    }
  }

  const hexes = generated.length > 0 ? generated : [{ q: 0, r: 6 }];
  const qs = hexes.map(coord => coord.q);
  const rs = hexes.map(coord => coord.r);

  return {
    minQ: Math.min(...qs),
    maxQ: Math.max(...qs),
    minR: Math.min(...rs),
    maxR: Math.max(...rs),
    hexes,
    label: shape.label,
  };
}

function countAdjacentTerrainTypes(coord: HexCoord, terrainMap: Map<string, TerrainType>) {
  let asteroidAdjacency = 0;
  let nebulaAdjacency = 0;
  let debrisAdjacency = 0;
  let gravityAdjacency = 0;

  for (const neighbor of hexNeighbors(coord)) {
    const terrain = terrainMap.get(hexKey(neighbor));
    if (terrain === 'asteroids') asteroidAdjacency += 1;
    if (terrain === 'ionNebula') nebulaAdjacency += 1;
    if (terrain === 'debrisField') debrisAdjacency += 1;
    if (terrain === 'gravityWell') gravityAdjacency += 1;
  }

  return { asteroidAdjacency, nebulaAdjacency, debrisAdjacency, gravityAdjacency };
}

function getThemedSpawnAnchor(
  envRoll: number,
  terrainMap: Map<string, TerrainType>,
): HexCoord | null {
  const matchingType: TerrainType | null =
    envRoll === 1 ? 'asteroids'
    : envRoll === 2 ? 'ionNebula'
    : envRoll === 3 ? 'debrisField'
    : envRoll === 4 ? 'gravityWell'
    : null;

  if (!matchingType) return null;

  const matches = [...terrainMap.entries()]
    .filter(([, type]) => type === matchingType)
    .map(([key]) => {
      const [q, r] = key.split(',').map(Number);
      return { q, r };
    });

  if (matches.length === 0) return null;
  return matches.sort((a, b) => a.r - b.r || Math.abs(a.q) - Math.abs(b.q))[0];
}

function scoreSpawnHex(
  coord: HexCoord,
  adv: typeof ADVERSARIES[number],
  envRoll: number,
  terrainMap: Map<string, TerrainType>,
  anchor: HexCoord | null,
): number {
  const directTerrain = terrainMap.get(hexKey(coord)) ?? 'open';
  const { asteroidAdjacency, nebulaAdjacency, debrisAdjacency, gravityAdjacency } = countAdjacentTerrainTypes(coord, terrainMap);
  const absQ = Math.abs(coord.q);
  const centerBias = 8 - absQ;
  const enemySideDepth = -coord.r;
  const anchorDistance = anchor ? hexDistance(coord, anchor) : 4;

  let score = 0;

  if (directTerrain === 'open') score += 10;
  if (coord.r > -2) score -= 8;
  score += enemySideDepth;

  switch (adv.aiTag) {
    case 'artillery':
      score += centerBias * 1.2;
      score += enemySideDepth * 1.5;
      score -= asteroidAdjacency * 1.5;
      score -= debrisAdjacency;
      score += nebulaAdjacency * 0.5;
      break;
    case 'support':
      score += centerBias;
      score += enemySideDepth;
      score += nebulaAdjacency * 0.6 + debrisAdjacency * 0.4;
      break;
    case 'hunter':
      score += absQ * 1.8;
      score += asteroidAdjacency * 1.2 + debrisAdjacency * 0.8;
      break;
    case 'swarm':
      score += absQ;
      score += nebulaAdjacency + debrisAdjacency;
      break;
    default:
      score += centerBias * 0.7;
      score += asteroidAdjacency + debrisAdjacency * 0.6;
      break;
  }

  switch (envRoll) {
    case 1:
      score += asteroidAdjacency * 2.4;
      score += adv.aiTag === 'hunter' || adv.aiTag === 'swarm' ? absQ * 1.5 : centerBias * 0.6;
      break;
    case 2:
      if (adv.aiTag === 'artillery' || adv.aiTag === 'support') {
        score += Math.max(0, 4 - Math.abs(anchorDistance - 2)) * 2.2;
        score += directTerrain === 'open' ? 3 : 0;
      } else {
        score += nebulaAdjacency * 2.4;
        score += Math.max(0, 4 - anchorDistance) * 1.8;
      }
      break;
    case 3:
      score += debrisAdjacency * 2.1;
      score += asteroidAdjacency * 0.7;
      break;
    case 4: {
      const gravityDistance = anchor ? hexDistance(coord, anchor) : 5;
      score += Math.max(0, 5 - Math.abs(gravityDistance - (adv.aiTag === 'artillery' ? 5 : 4))) * 2.3;
      score += gravityAdjacency * 1.5;
      break;
    }
    case 5:
      score += (asteroidAdjacency + nebulaAdjacency + debrisAdjacency + gravityAdjacency) * 1.4;
      if (adv.aiTag === 'artillery' || adv.aiTag === 'support') {
        score += directTerrain === 'open' ? 2.5 : 0;
      }
      break;
    default:
      score += centerBias + enemySideDepth * 0.5;
      break;
  }

  return score;
}

function generateEnemySpawnPlan(
  enemyRoster: string[],
  envRoll: number,
  terrain: { coord: HexCoord; type: TerrainType }[],
  objectiveMarkers: { position: HexCoord }[],
): { positions: HexCoord[]; summary: string } {
  const terrainMap = buildTerrainMap(terrain);
  const reserved = new Set(buildReservedHexes(objectiveMarkers).map(hexKey));
  const boardHexes = getBoardHexes(8);
  const anchor = getThemedSpawnAnchor(envRoll, terrainMap);
  const deploymentTheme =
    envRoll === 1 ? 'belt ambush lanes'
    : envRoll === 2 ? 'storm-front staging'
    : envRoll === 3 ? 'wreckfield pickets'
    : envRoll === 4 ? 'anomaly perimeter'
    : envRoll === 5 ? 'fractured pocket deployment'
    : 'broad attack line';

  const candidates = boardHexes.filter(coord => {
    const key = hexKey(coord);
    return coord.r <= -2 && !reserved.has(key) && (terrainMap.get(key) ?? 'open') === 'open';
  });

  const occupied = new Set<string>();
  const occupiedCoords: HexCoord[] = [];
  const sortedRoster = enemyRoster.map((advId, index) => {
    const adv = ADVERSARIES.find(entry => entry.id === advId) ?? ADVERSARIES[0];
    const sizeWeight = adv.size === 'large' ? 0 : adv.size === 'medium' ? 1 : 2;
    return { advId, adv, originalIndex: index, sizeWeight };
  }).sort((a, b) => a.sizeWeight - b.sizeWeight || a.originalIndex - b.originalIndex);

  const chosenByIndex = new Map<number, HexCoord>();

  for (const entry of sortedRoster) {
    const scored = candidates
      .filter(coord => !occupied.has(hexKey(coord)) && occupiedCoords.every(other => hexDistance(coord, other) >= 2))
      .map(coord => ({ coord, score: scoreSpawnHex(coord, entry.adv, envRoll, terrainMap, anchor) }))
      .sort((a, b) => b.score - a.score || a.coord.r - b.coord.r || a.coord.q - b.coord.q);

    const fallback = candidates.find(coord => !occupied.has(hexKey(coord))) ?? { q: 0, r: -6 };
    const chosen = scored[0]?.coord ?? fallback;
    occupied.add(hexKey(chosen));
    occupiedCoords.push(chosen);
    chosenByIndex.set(entry.originalIndex, chosen);
  }

  const positions = enemyRoster.map((_, index) => chosenByIndex.get(index) ?? { q: 0, r: -6 });
  const summary = anchor
    ? `${deploymentTheme} anchored near ${formatCoord(anchor)}`
    : deploymentTheme;

  return { positions, summary };
}

function generateEnvironment(
  envRoll: number,
  terrain: { coord: HexCoord; type: TerrainType }[],
  rules: string[],
  objectiveMarkers: { position: HexCoord }[],
): string {
  const planner = buildTerrainPlanner(buildReservedHexes(objectiveMarkers), terrain);

  switch (envRoll) {
    case 1: {
      const variant = Math.random();
      if (variant < 0.5) {
        const originA = pickRandom(getRandomHexes(1, 3, 7));
        const originB = pickRandom(getRandomHexes(1, 3, 7));
        planner.addChain(originA ?? { q: -5, r: 1 }, 1, rollD4() + 3, 'asteroids', 0.3);
        planner.addChain(originB ?? { q: 4, r: -2 }, 4, rollD4() + 3, 'asteroids', 0.35);
        planner.addScatter(rollD4(), 'debrisField', 2, 8);
        return 'Shattered asteroid belts crisscross the battlespace, with wreckage caught in their wake.';
      }

      const clusterCount = rollD4() + 1;
      getRandomHexes(clusterCount, 2, 7).forEach(origin => {
        planner.addCluster(origin, 'asteroids', planner.getCount() + rollD4() + 1, 0.72);
      });
      planner.addScatter(rollD4(), 'asteroids', 2, 8);
      return 'Broken asteroid reefs form irregular cover pockets across the engagement zone.';
    }
    case 2: {
      const laneR = Math.floor(Math.random() * 5) - 2;
      for (let q = -6; q <= 6; q++) {
        const main = { q, r: laneR };
        const upper = { q, r: laneR - 1 };
        const lower = { q, r: laneR + 1 };
        if (Math.random() > 0.18) planner.addTerrain(main, 'ionNebula');
        if (Math.random() > 0.45) planner.addTerrain(upper, 'ionNebula');
        if (Math.random() > 0.45) planner.addTerrain(lower, 'ionNebula');
      }
      planner.addScatter(rollD4() + 1, 'debrisField', 2, 8);
      if (Math.random() < 0.6) {
        getRandomHexes(2, 2, 7).forEach(origin => planner.addCluster(origin, 'asteroids', planner.getCount() + 2, 0.5));
      }
      return 'An ion storm front cuts a hazy corridor through the battlefield, littered with trapped wreckage.';
    }
    case 3: {
      const graveyardPockets = rollD4() + 2;
      getRandomHexes(graveyardPockets, 2, 8).forEach(origin => {
        planner.addCluster(origin, 'debrisField', planner.getCount() + rollD4() + 1, 0.68);
      });
      planner.addScatter(rollD4(), 'asteroids', 2, 8);
      if (Math.random() < 0.55) {
        const seamOrigin = pickRandom(getRandomHexes(1, 3, 7)) ?? { q: -4, r: 2 };
        planner.addChain(seamOrigin, Math.floor(Math.random() * 6), rollD4() + 2, 'debrisField', 0.4);
      }
      return 'A drifting graveyard of shattered hulls and cold slag turns the combat zone into a kill box.';
    }
    case 4: {
      const anchor = pickRandom(getRandomHexes(1, 2, 4)) ?? { q: -2, r: 2 };
      planner.addTerrain(anchor, 'gravityWell');
      hexNeighbors(anchor).forEach((neighbor, index) => {
        planner.addTerrain(neighbor, index % 2 === 0 ? 'debrisField' : 'ionNebula');
      });
      if (Math.random() < 0.6) {
        const offAxis = hexNeighbors(anchor)[Math.floor(Math.random() * 6)];
        planner.addChain(offAxis, Math.floor(Math.random() * 6), rollD4() + 2, 'asteroids', 0.25);
      }
      rules.push(`Gravity Anomaly: At the end of every round, all ships within Range 5 are pulled 1 hex directly toward the anomaly at (${anchor.q},${anchor.r}).`);
      return `A violent gravity shear centered on ${formatCoord(anchor)} distorts the surrounding void into a lethal hazard halo.`;
    }
    case 5: {
      const mixedOrigins = getRandomHexes(3, 2, 7);
      mixedOrigins.forEach((origin, index) => {
        const type: TerrainType = index === 0 ? 'asteroids' : index === 1 ? 'ionNebula' : 'debrisField';
        planner.addCluster(origin, type, planner.getCount() + rollD4() + 2, 0.64);
      });
      if (Math.random() < 0.5) {
        const anchor = pickRandom(getRandomHexes(1, 3, 5)) ?? { q: 3, r: -1 };
        planner.addTerrain(anchor, 'gravityWell');
        rules.push(`Localized Gravity Tear: The anomaly at (${anchor.q},${anchor.r}) still counts as a Gravity Well for movement and end-of-round pull effects.`);
      }
      planner.addScatter(rollD4() + 1, pickRandom(['asteroids', 'ionNebula', 'debrisField']), 2, 8);
      return 'Multiple overlapping hazard pockets create a fractured battlespace with no single safe lane.';
    }
    default: {
      planner.addScatter(rollD4() + 1, 'asteroids', 2, 8);
      planner.addScatter(rollD4() + 1, 'debrisField', 2, 8);
      if (Math.random() < 0.5) {
        const pocket = pickRandom(getRandomHexes(1, 2, 6)) ?? { q: 2, r: 1 };
        planner.addCluster(pocket, 'ionNebula', planner.getCount() + rollD4(), 0.56);
      }
      rules.push('Solar Flare Activity: At the start of Phase 4, roll a D6. On a 1 or 2, ALL ships take 1 unblockable Hull damage.');
      return 'Solar flare activity lashes a cluttered combat zone, forcing both fleets to fight through intermittent space weather.';
    }
  }
}

export function generateProceduralScenario(
  sector: number,
  playerCount: number,
  combatModifiers: CombatModifiers | null,
): ProceduralScenarioConfig {
  const rules: string[] = [];
  const generationReport: string[] = [];
  const objectiveMarkers: { name: string; position: HexCoord; hull: number; maxHull: number; shieldsPerSector: number }[] = [];
  const terrain: { coord: HexCoord; type: TerrainType }[] = [];

  const objRoll = Math.floor(Math.random() * 8) + 1;
  let objectiveType = '';
  let objectiveSummary = '';
  let spawnStationSiege = false;
  let spawnTurretBreach = false;

  switch (objRoll) {
    case 1:
      objectiveType = 'Breakout';
      objectiveSummary = 'Escape with at least half of the surviving fleet through the upper-right warp corridor.';
      rules.push('Breakout: Reach the upper-right escape zone (q - r >= 12) and use the "Jump to Warp" Helm action. Escape with 50% of your surviving fleet to win.');
      break;
    case 2:
      objectiveType = 'Assassination';
      objectiveSummary = 'Destroy the designated flagship, which receives a survivability boost.';
      rules.push('Assassination: The Enemy Fleet spawns with one Flagship (upgraded with +1 Evasion and +5 Hull). Destroy it to win.');
      break;
    case 3:
      objectiveType = 'Data Siphon';
      objectiveSummary = 'End adjacent to each Comm Relay long enough to siphon all three data caches.';
      rules.push('Data Siphon: Spend at least one round ending adjacent to each of the 3 Comm Relays to siphon their data. Siphon all 3 to win.');
      objectiveMarkers.push({ name: 'Comm Relay Alpha', position: { q: -4, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 });
      objectiveMarkers.push({ name: 'Comm Relay Beta', position: { q: 0, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 });
      objectiveMarkers.push({ name: 'Comm Relay Gamma', position: { q: 4, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 });
      break;
    case 4:
      objectiveType = 'Hold the Line';
      objectiveSummary = 'Stay alive through Round 6 to cover the evacuation corridor.';
      rules.push('Hold the Line: Survive for exactly 6 Rounds without jumping away to cover civilian transports.');
      break;
    case 5:
      objectiveType = 'Salvage Run';
      objectiveSummary = 'Recover supply crates from the battlespace, then jump away with the haul.';
      rules.push('Salvage Run: Collect 3 Supply Crate tokens by moving to their hex and using "Pick Up Supply Crate" (Sensors), then jump to warp to win.');
      {
        const crateCoords = getRandomHexes(5, 3, 7);
        crateCoords.forEach((coord, i) => {
          objectiveMarkers.push({ name: `Supply Crate ${i + 1}`, position: coord, hull: 5, maxHull: 5, shieldsPerSector: 0 });
        });
      }
      break;
    case 6:
      objectiveType = 'Station Siege';
      objectiveSummary = 'Destroy the heavily fortified Hegemony central station.';
      rules.push('Station Siege: A primary Hegemony station is anchored in the sector. Destroy it to win.');
      spawnStationSiege = true;
      break;
    case 7:
      objectiveType = 'Turret Breach';
      objectiveSummary = 'Clear the defensive picket line of automated turrets.';
      rules.push('Turret Breach: A defensive line of automated turrets blocks your path. Destroy all turrets to win.');
      spawnTurretBreach = true;
      break;
    default:
      objectiveType = 'Search & Destroy';
      objectiveSummary = 'Destroy every hostile capital ship deployed into the engagement zone.';
      rules.push('Search & Destroy: Utterly destroy every Enemy Capital Ship on the board.');
      break;
  }

  generationReport.push(`[PROCGEN] Sector ${sector} procedural combat generation initiated for ${playerCount} player ship${playerCount === 1 ? '' : 's'}.`);
  generationReport.push(`[PROCGEN] Step 1 - Objective Roll: 1d8 = ${objRoll} -> ${objectiveType}. ${objectiveSummary}`);
  if (objectiveMarkers.length > 0) {
    generationReport.push(`[PROCGEN] Objective Markers: ${objectiveMarkers.map(marker => `${marker.name} ${formatCoord(marker.position)} [Hull ${marker.hull}, Shields/Sector ${marker.shieldsPerSector}]`).join(' | ')}`);
  } else {
    generationReport.push('[PROCGEN] Objective Markers: none required for this mission.');
  }

  const envRoll = rollD6();
  const environmentSummary = generateEnvironment(envRoll, terrain, rules, objectiveMarkers);
  const deploymentBounds = buildDeploymentZone(objectiveType, terrain, playerCount);

  generationReport.push(`[PROCGEN] Step 2 - Environment Roll: d6 = ${envRoll} -> ${environmentSummary}`);
  generationReport.push(
    `[PROCGEN] Player Deployment Zone: ${deploymentBounds.label ?? 'custom zone'} with ${deploymentBounds.hexes?.length ?? 0} open hexes from Q ${deploymentBounds.minQ}..${deploymentBounds.maxQ}, R ${deploymentBounds.minR}..${deploymentBounds.maxR}.`,
  );
  if (terrain.length > 0) {
    const terrainGroups = terrain.reduce<Record<string, string[]>>((acc, entry) => {
      const key = describeTerrainType(entry.type);
      if (!acc[key]) acc[key] = [];
      acc[key].push(formatCoord(entry.coord));
      return acc;
    }, {});
    Object.entries(terrainGroups).forEach(([type, coords]) => {
      generationReport.push(`[PROCGEN] Terrain Placement - ${type}: ${coords.length} hex${coords.length === 1 ? '' : 'es'} at ${coords.join(', ')}`);
    });
  } else {
    generationReport.push('[PROCGEN] Terrain Placement: no map hazards generated.');
  }

  let threatPerPlayer = 4;
  if (sector === 2) threatPerPlayer = 7;
  if (sector === 3) threatPerPlayer = 10;

  const baseBudget = playerCount * threatPerPlayer;
  const modifierBudgetBonus =
    (combatModifiers?.threatBudgetBonus ?? 0) +
    (combatModifiers?.propagandaExposedBonus ?? 0) +
    (combatModifiers?.highPriorityBounty ? 3 : 0);
  let budget = baseBudget + modifierBudgetBonus;
  const startingBudget = budget;

  const shipTable = [
    { id: 'strike-fighter', cost: 1 },
    { id: 'hegemony-corvette', cost: 2 },
    { id: 'hunter-killer', cost: 4 },
    { id: 'hunter-killer', cost: 4 },
    { id: 'monitor', cost: 7 },
    { id: 'hegemony-dreadnought', cost: 10 },
  ];

  const stationTable = [
    { id: 'pdc-turret', cost: 2 },
    { id: 'heavy-turret', cost: 3 },
    { id: 'missile-turret', cost: 3 },
    { id: 'outpost', cost: 4 },
    { id: 'forward-base', cost: 8 },
    { id: 'orbital-station', cost: 15 },
  ];

  const modifierNotes: string[] = [];
  if (modifierBudgetBonus !== 0) modifierNotes.push(`threat budget ${modifierBudgetBonus > 0 ? '+' : ''}${modifierBudgetBonus}`);
  if (combatModifiers?.guaranteedEliteSpawn) modifierNotes.push('guaranteed elite spawn');
  if (combatModifiers?.enemyShieldsZeroRound1) modifierNotes.push('enemy shields zero on Round 1');
  if (combatModifiers?.playerActsFirst) modifierNotes.push('players act first on Round 1');
  if (combatModifiers?.playerStartSpeed3) modifierNotes.push('players start at Speed 3');
  if (combatModifiers?.playerCTRound1Modifier) modifierNotes.push(`player CT modifier ${combatModifiers.playerCTRound1Modifier > 0 ? '+' : ''}${combatModifiers.playerCTRound1Modifier}`);
  if (combatModifiers?.playerMaxSpeedReduction) modifierNotes.push(`player max speed reduced by ${combatModifiers.playerMaxSpeedReduction}`);
  if (combatModifiers?.playerCTZeroRound1) modifierNotes.push('players start Round 1 with 0 CT');
  if (combatModifiers?.flagshipBonus) modifierNotes.push(`flagship bonus +${combatModifiers.flagshipBonus.evasion} EVA / +${combatModifiers.flagshipBonus.hull} Hull`);
  if (combatModifiers?.highPriorityBounty) modifierNotes.push('high priority bounty (+3 threat)');
  if (combatModifiers?.propagandaExposedBonus) modifierNotes.push(`propaganda exposed bonus +${combatModifiers.propagandaExposedBonus}`);

  generationReport.push(`[PROCGEN] Step 3 - Threat Budget: sector ${sector} => ${threatPerPlayer} threat/player x ${playerCount} = ${baseBudget}; modifiers ${modifierBudgetBonus >= 0 ? '+' : ''}${modifierBudgetBonus}; starting budget ${startingBudget}.`);
  generationReport.push(`[PROCGEN] Combat Modifiers: ${modifierNotes.length > 0 ? modifierNotes.join(', ') : 'none'}.`);

  const stationSpawns: { stationId: string; position: HexCoord; facing?: number }[] = [];
  const enemyRoster: string[] = [];

  const getOpenHexInZone = (minR: number, maxR: number): HexCoord => {
    let attempts = 0;
    while(attempts++ < 50) {
      const q = Math.floor(Math.random() * 15) - 7;
      const r = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
      if (Math.abs(q) + Math.abs(q + r) + Math.abs(r) > 16) continue;
      const key = hexKey({q, r});
      if (!terrain.some(t => hexKey(t.coord) === key) && !stationSpawns.some(s => hexKey(s.position) === key) && !objectiveMarkers.some(m => hexKey(m.position) === key)) {
        return {q, r};
      }
    }
    return { q: 0, r: minR };
  };

  // Station and Turret Spawning
  if (spawnStationSiege) {
    const availableStations = ['orbital-station', 'forward-base', 'outpost'];
    let selected = 'outpost';
    for (const st of availableStations) {
      const cost = stationTable.find(s => s.id === st)?.cost ?? 4;
      if (budget >= cost || st === 'outpost') {
        selected = st;
        budget -= cost;
        break;
      }
    }
    stationSpawns.push({ stationId: selected, position: getOpenHexInZone(-6, -6), facing: 3 });
    generationReport.push(`[PROCGEN] Objective Constraint: spawned ${selected} as primary target. Remaining budget ${budget}.`);
  } else if (spawnTurretBreach) {
    const turretTypes = ['heavy-turret', 'missile-turret', 'pdc-turret'];
    let numTurrets = Math.min(5, Math.max(3, Math.floor(budget / 3)));
    const qStart = -Math.floor(numTurrets / 2) * 2;
    for(let i=0; i<numTurrets; i++) {
        const type = pickRandom(turretTypes);
        const cost = stationTable.find(s => s.id === type)?.cost ?? 3;
        budget -= cost;
        stationSpawns.push({ stationId: type, position: getOpenHexInZone(-5, -4), facing: 3 });
    }
    generationReport.push(`[PROCGEN] Objective Constraint: spawned ${numTurrets} turrets for picket line. Remaining budget ${budget}.`);
  } else {
    // 30% chance for a Turret Picket in other missions
    if (Math.random() < 0.3 && budget >= 4) {
      const numTurrets = pickRandom([1, 2]);
      const turretTypes = ['heavy-turret', 'missile-turret', 'pdc-turret'];
      let spawnedCount = 0;
      for(let i=0; i<numTurrets; i++) {
        const type = pickRandom(turretTypes);
        const cost = stationTable.find(s => s.id === type)?.cost ?? 3;
        if (budget >= cost) {
          budget -= cost;
          stationSpawns.push({ stationId: type, position: getOpenHexInZone(-5, -3), facing: 3 });
          spawnedCount++;
        }
      }
      if (spawnedCount > 0) {
        generationReport.push(`[PROCGEN] Turret Picket: spawned ${spawnedCount} defensive turrets. Remaining budget ${budget}.`);
      }
    }
  }

  if (combatModifiers?.guaranteedEliteSpawn) {
    const eliteOpts = shipTable.filter(s => s.cost <= budget && s.cost >= 7);
    if (eliteOpts.length > 0) {
      const elite = eliteOpts[Math.floor(Math.random() * eliteOpts.length)];
      enemyRoster.push(elite.id);
      budget -= elite.cost;
      generationReport.push(`[PROCGEN] Elite Override: inserted ${elite.id} (cost ${elite.cost}) before standard rolls. Remaining budget ${budget}.`);
    } else {
      generationReport.push(`[PROCGEN] Elite Override: requested, but no elite option fit remaining budget ${budget}.`);
    }
  }

  while (budget > 0) {
    const roll = rollD6();
    let selected = shipTable[roll - 1];
    let selectionReason = `table result ${selected.id} (cost ${selected.cost})`;

    if (selected.cost > budget) {
      const affordable = [...shipTable].reverse().find(s => s.cost <= budget);
      if (!affordable) {
        generationReport.push(`[PROCGEN] Fleet Roll: d6 = ${roll} but no unit fit remaining budget ${budget}; deployment ended.`);
        break;
      }
      selected = affordable;
      selectionReason = `table result unaffordable; downgraded to ${selected.id} (cost ${selected.cost})`;
    }

    enemyRoster.push(selected.id);
    budget -= selected.cost;
    generationReport.push(`[PROCGEN] Fleet Roll: d6 = ${roll} -> ${selectionReason}. Remaining budget ${budget}.`);
  }

  const callsigns = assignCallsigns(enemyRoster);
  generationReport.push(`[PROCGEN] Enemy Roster Selected: ${enemyRoster.length > 0 ? enemyRoster.map((id, index) => `${id} as "${callsigns[index]}"`).join(' | ') : 'none'}.`);
  
  // Pass stationSpawns mapped to positions so generateEnemySpawnPlan respects them
  const objectiveMarkersWithStations = [
    ...objectiveMarkers,
    ...stationSpawns.map(s => ({ name: 'Station', position: s.position, hull: 1, maxHull: 1, shieldsPerSector: 0 }))
  ];
  const spawnPlan = generateEnemySpawnPlan(enemyRoster, envRoll, terrain, objectiveMarkersWithStations);
  generationReport.push(`[PROCGEN] Step 4 - Enemy Deployment Pattern: ${spawnPlan.summary}.`);

  const enemyShips: EnemyShipState[] = enemyRoster.map((advId, idx) => {
    let adv = ADVERSARIES.find(a => a.id === advId);
    if (!adv) adv = ADVERSARIES[0];

    const callsign = callsigns[idx];
    let isFlagship = false;
    let flagshipEvaBonus = 0;
    let flagshipHullBonus = 0;

    if (objectiveType === 'Assassination' && idx === 0) {
      isFlagship = true;
      flagshipEvaBonus = 1;
      flagshipHullBonus = 5;
    }

    const spawnPos = spawnPlan.positions[idx] ?? { q: 0, r: -6 };

    const shipName = isFlagship
      ? `${adv.name} «${callsign}» (Flagship)`
      : `${adv.name} «${callsign}»`;

    return {
      id: `e${idx + 1}`,
      name: shipName,
      adversaryId: adv.id,
      position: spawnPos,
      facing: 3,
      currentSpeed: adv.speed,
      currentHull: adv.hull + flagshipHullBonus,
      maxHull: adv.hull + flagshipHullBonus,
      baseEvasion: adv.baseEvasion + flagshipEvaBonus,
      armorDie: adv.armorDie,
      shields: {
        fore: adv.shieldsPerSector,
        foreStarboard: adv.shieldsPerSector,
        aftStarboard: adv.shieldsPerSector,
        aft: adv.shieldsPerSector,
        aftPort: adv.shieldsPerSector,
        forePort: adv.shieldsPerSector,
      },
      maxShieldsPerSector: adv.shieldsPerSector,
      criticalDamage: [],
      isDestroyed: false,
      hasDroppedBelow50: false,
      hasDrifted: false,
      targetLocks: [],
    };
  });

  if (objectiveType === 'Assassination' && enemyShips.length > 0) {
    enemyShips.sort((a, b) => b.maxHull - a.maxHull);
    enemyShips.forEach((ship, index) => {
      ship.name = ship.name.replace(' (Flagship)', '');
      if (index === 0) {
        ship.name += ' (Flagship)';
        ship.maxHull += 5;
        ship.currentHull += 5;
        ship.baseEvasion += 1;
      }
    });
    generationReport.push(`[PROCGEN] Flagship Assignment: ${enemyShips[0].name} promoted as mission flagship after hull sort.`);
  }

  if (combatModifiers?.flagshipBonus && enemyShips.length > 0) {
    const flagship = [...enemyShips].sort((a, b) => b.maxHull - a.maxHull)[0];
    if (flagship) {
      flagship.maxHull += combatModifiers.flagshipBonus.hull;
      flagship.currentHull += combatModifiers.flagshipBonus.hull;
      flagship.baseEvasion += combatModifiers.flagshipBonus.evasion;
      if (!flagship.name.includes('(Flagship)')) {
        flagship.name += ' (Flagship)';
      }
      generationReport.push(
        `[PROCGEN] Event Flagship Bonus: ${flagship.name} gains +${combatModifiers.flagshipBonus.evasion} EVA and +${combatModifiers.flagshipBonus.hull} Hull.`,
      );
    }
  }

  enemyShips.forEach(ship => {
    const adversary = ADVERSARIES.find(entry => entry.id === ship.adversaryId);
    generationReport.push(
      `[PROCGEN] Enemy Spawn: ${ship.name} deployed at ${formatCoord(ship.position)} facing ${ship.facing} | Hull ${ship.currentHull}/${ship.maxHull} | EVA ${ship.baseEvasion} | Speed ${ship.currentSpeed}${adversary?.special ? ` | AI: ${adversary.special}` : ''}`,
    );
  });

  generationReport.push(`[PROCGEN] Mission Rules Loaded: ${rules.length > 0 ? rules.join(' | ') : 'none'}.`);

  return {
    objectiveType,
    terrain,
    enemyShips,
    objectiveMarkers,
    stationSpawns: stationSpawns as { stationId: string; position: HexCoord; facing?: HexFacing | undefined; }[],
    scenarioRules: rules,
    generationReport,
    deploymentBounds,
  };
}
