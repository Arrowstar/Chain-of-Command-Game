import { create } from 'zustand';
import type {
  GamePhase, ExecutionStep, ShipState, EnemyShipState, PlayerState,
  RoECard, TacticCard, FumbleCard, CriticalDamageCard,
  HexCoord, TerrainType, LogEntry, QueuedAction, OfficerStation, FighterToken, TorpedoToken, ShieldState, HexFacing, ObjectiveMarkerState, DeploymentBounds, TacticHazardState,
  PendingTargetingPackage, TargetingPackageMode,
} from '../types/game';
import { ShipSize, isSmallCraftSize, isCapitalShipSize } from '../types/game';
import { getNextPhase, checkGameOverConditions, createLogEntry, getShipSizeForStep, isInBreakoutZone } from '../engine/GameStateMachine';
import { createShuffledTacticDeck, drawTacticCard } from '../data/tacticDeck';
import { drawRoECard, getRoECardById } from '../data/roeDeck';
import { createShuffledFumbleDeck, drawFumbleCard } from '../data/fumbleDeck';
import { createShuffledPlayerCritDeck, createShuffledEnemyCritDeck, drawCriticalCard } from '../data/criticalDamage';
import { calculateStressRecovery, recoverStress, resetOfficerRoundState, applyStress, getMaxStress } from '../engine/stress';
import { regenerateShields, resolveAttack, assembleVolleyPool, getValidTargetsForWeapon, getAntiSmallCraftTNModifier } from '../engine/combat';
import { executeDrift, rotateShip, adjustSpeed } from '../engine/movement';
import { moveTorpedo, resolveTorpedoAttack } from '../engine/torpedoMovement';
import { hexKey, hexDistance, checkLineOfSight, parseHexKey, isInFiringArc, hexNeighbors, hexEquals } from '../engine/hexGrid';
import { applyGravityWellPull } from '../engine/gravityWell';
import { getChassisById } from '../data/shipChassis';
import { getWeaponById } from '../data/weapons';
import { useUIStore } from './useUIStore';
import { getAdversaryById, ADVERSARIES } from '../data/adversaries';
import { executeAITier } from '../engine/ai/aiTurn';
import { getOfficerById } from '../data/officers';
import { getActionById, calculateActionCosts } from '../data/actions';
import { getSubsystemById } from '../data/subsystems';
import { rollDie, rollOfficerSkillProc, rollVolley } from '../utils/diceRoller';
import { resolveFighterMovement, resolveFighterAttack, buildCarrierFighters } from '../engine/ai/fighterAI';
import { getScenarioById } from '../data/scenarios';
import { getFleetAssetDefinition } from '../data/fleetAssets';
import type { CombatModifiers, ExperimentalTech } from '../types/campaignTypes';
import {
  applyHardLightPlating,
  applyInertialDampeners,
  applyRecycledCoolant,
  applyPlasmaAccelerators,
  canRerollVoidGlass,
  canUseAstroCaf,
  canUseTachyonMatrix,
  getKineticSiphonShieldRestore,
  getNeuralLinkCT,
  getStimInjectorBonus,
} from '../engine/techEffects';
import { getRoundStartCtState } from '../engine/commandTokens';

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Core Game Store (Zustand)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

interface GameStore {
  // ═ ══ ══ ═ State ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  phase: GamePhase;
  round: number;
  executionStep: ExecutionStep | null;
  resolvedSteps: ExecutionStep[];

  players: PlayerState[];
  playerShips: ShipState[];
  enemyShips: EnemyShipState[];
  fighterTokens: FighterToken[];
  torpedoTokens: TorpedoToken[];

  terrainMap: Map<string, TerrainType>;

  tacticDeck: TacticCard[];
  fumbleDeck: FumbleCard[];
  playerCritDeck: CriticalDamageCard[];
  enemyCritDeck: CriticalDamageCard[];

  /** The single Rules of Engagement card drawn at mission start. Null = overridden or not yet set. */
  activeRoE: RoECard | null;
  /** True if the players spent -3 FF to override the RoE this mission */
  roeOverridden: boolean;
  currentTactic: TacticCard | null;
  tacticHazards: TacticHazardState[];

  fleetAssetRoundUses: Record<string, number>;
  fleetAssetScenarioUses: Record<string, number>;
  fleetAssetShipRoundUses: Record<string, Record<string, number>>;
  tacticalOverrideShipIds: string[];
  targetingPackages: PendingTargetingPackage[];
  exposedEnemyShipId: string | null;
  flakUmbrellaShipId: string | null;
  extractionWindowShipIds: string[];

  fleetFavor: number;
  startingFleetFavor: number;
  log: LogEntry[];
  smallShipsDestroyedThisMission: number;

  scenarioId: string;
  maxRounds: number | null;
  gameOver: boolean;
  victory: boolean | null;
  gameOverReason: string;

  /** Procedural scenario: active mission objective type (e.g. 'Breakout', 'Assassination') */
  objectiveType: string;
  /** Procedural/handcrafted scenario: objective marker tokens placed on the board */
  objectiveMarkers: ObjectiveMarkerState[];
  /** Procedural scenario: human-readable rule text for the active mission */
  scenarioRules: string[];
  /** Pending enemy spawns keyed by round number (filled from ScenarioData.enemySpawns) */
  pendingSpawns: { adversaryId: string; position: HexCoord; spawnRound: number }[];
  deploymentMode: boolean;
  deploymentBounds: DeploymentBounds | null;
  deploymentSelectedShipId: string | null;
  deploymentRevealLogs: string[];
  /** Ship IDs that have successfully jumped to warp (Breakout / Salvage Run) */
  warpedOutShipIds: string[];
  /** Number of supply crates collected so far (Salvage Run) */
  salvageCratesCollected: number;
  /** Names of Comm Relays that have been siphoned this campaign (Data Siphon) */
  dataSiphonedRelayNames: string[];
  /** Number of player ships that successfully escaped via the objective-required zone (Breakout). */
  successfulEscapes: number;
  experimentalTech: ExperimentalTech[];
  combatModifiers: CombatModifiers | null;
  tachyonMatrixUsedThisScenario: boolean;
  recycledCoolantUsedThisRound: boolean;
  inertialDampenersTriggeredShipIds: string[];
  hardLightTriggeredShipIds: string[];
  shipsWithHullDamageThisRound: string[];

  // ═ ══ ══ ═ Actions ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  initializeGame: (config: GameInitConfig) => void;
  advancePhase: () => void;
  advanceExecutionStep: () => void;
  markStepResolved: (step: ExecutionStep) => void;
  evaluateCommandPhaseFumbles: () => void;

  // Command Phase actions
  assignToken: (playerId: string, action: QueuedAction) => void;
  unassignToken: (playerId: string, actionId: string) => void;

  // Execution Phase actions
  resolveDrift: (shipId: string, isAllied: boolean) => void;
  resolveAction: (playerId: string, shipId: string, assignedActionId: string, context?: Record<string, any>) => void;
  resolveEnemyTurn: () => void;

  // Ship state mutations
  updatePlayerShip: (shipId: string, updates: Partial<ShipState>) => void;
  updateEnemyShip: (shipId: string, updates: Partial<EnemyShipState>) => void;

  // Fleet Favor
  adjustFleetFavor: (delta: number) => void;
  useFleetAsset: (assetId: string, payload?: Record<string, any>) => boolean;

  // Logging
  addLog: (type: LogEntry['type'], message: string, details?: Record<string, unknown>) => void;

  // Phase-specific
  executeBriefingPhase: () => void;
  executeCleanupPhase: () => void;
  
  // RoE
  /** Override the active RoE. Costs -3 FF; may only be called during Briefing. */
  overrideRoE: () => void;
  /** Report a Radio Silence violation during the Command Phase. Applies stress to Sensors officer. */
  reportRadioSilenceViolation: (playerId: string) => void;

  // Ghost Maker
  invokeGhostMaker: (playerId: string) => void;

  // Miracle Worker (O'Bannon) ═  once per campaign, free crit repair
  invokeMiracleWorker: (playerId: string, shipId: string, critId: string) => void;

  // Fighter Tokens
  spawnFighter: (token: FighterToken) => void;
  removeFighter: (id: string) => void;
  updateFighter: (id: string, updates: Partial<FighterToken>) => void;
  assignFighterTarget: (playerId: string, targetShipId: string) => void;
  resolveFighterStep: (allegiance: 'allied' | 'enemy') => void;

  // Torpedo Tokens
  spawnTorpedo: (token: TorpedoToken) => void;
  resolveTorpedoStep: (allegiance: 'allied' | 'enemy') => void;

  // CIC Sync (Aegis) ═  spend 1 CT to trigger an allied officer action
  invokeCICSync: (aegisPlayerId: string, targetPlayerId: string, action: QueuedAction) => void;

  getShipName: (shipId: string) => string;
  checkGameOver: () => boolean;
  resetGame: () => void;
  /** Update an objective marker's state (hull, isDestroyed, isCollected). */
  updateObjectiveMarker: (name: string, updates: Partial<ObjectiveMarkerState>) => void;

  // Debug
  /** DEV ONLY: Instantly destroy all enemy ships and trigger victory. */
  debugAutoWin: () => void;
  selectDeploymentShip: (shipId: string) => void;
  setDeploymentShipPosition: (shipId: string, position: HexCoord) => boolean;
  rotateDeploymentShip: (shipId: string, delta?: 1 | -1) => void;
  confirmDeployment: () => void;
}

export interface GameInitConfig {
  scenarioId: string;
  maxRounds: number | null;
  players: PlayerState[];
  playerShips: ShipState[];
  enemyShips: EnemyShipState[];
  terrain: { coord: HexCoord; type: TerrainType }[];
  startingRoEId?: string;  // optional override for testing a specific card
  objectiveMarkers?: ObjectiveMarkerState[];
  objectiveType?: string;
  scenarioRules?: string[];
  scenarioGenerationReport?: string[];
  deploymentMode?: boolean;
  deploymentBounds?: DeploymentBounds;
  deploymentRevealLogs?: string[];
  fleetFavor?: number;
  experimentalTech?: ExperimentalTech[];
  combatModifiers?: CombatModifiers | null;
  /** Delayed enemy spawns loaded from ScenarioData.enemySpawns where spawnRound is set. */
  pendingSpawns?: { adversaryId: string; position: HexCoord; spawnRound: number }[];
}

function hasScar(ship: Pick<ShipState, 'scars'>, scarId: string): boolean {
  return ship.scars.some(scar => scar.fromCriticalId === scarId);
}

function getSpeedCapFromScars(ship: Pick<ShipState, 'scars'>): number | null {
  return hasScar(ship, 'structural-spine-buckled') ? 2 : null;
}

function getNextExecutionStepForScenario(
  current: ExecutionStep | null,
  round: number,
  combatModifiers: CombatModifiers | null,
): ExecutionStep | null {
  const order: ExecutionStep[] = round === 1 && combatModifiers?.playerActsFirst
    ? ['smallAllied', 'smallEnemy', 'mediumAllied', 'mediumEnemy', 'largeAllied', 'largeEnemy']
    : ['smallAllied', 'smallEnemy', 'mediumAllied', 'mediumEnemy', 'largeAllied', 'largeEnemy'];

  if (current === null) return order[0];
  const idx = order.indexOf(current);
  if (idx < order.length - 1) return order[idx + 1];
  return null;
}

function hasActiveTech(tech: ExperimentalTech[], techId: string): boolean {
  return tech.some(item => item.id === techId && !item.isConsumed);
}

function getCombatMaxStress(
  officer: PlayerState['officers'][number],
  officerData: ReturnType<typeof getOfficerById>,
  tech: ExperimentalTech[],
): number | null {
  if (!officerData) return null;
  const baseMaxStress = getMaxStress(officer, officerData);
  if (baseMaxStress === null) return null;
  return baseMaxStress + getStimInjectorBonus(tech);
}

function getEffectiveWeaponForTech(weapon: NonNullable<ReturnType<typeof getWeaponById>>, tech: ExperimentalTech[]) {
  return {
    ...weapon,
    rangeMax: applyPlasmaAccelerators(weapon.rangeMax, weapon.tags.includes('ordnance'), tech),
  };
}

function restoreEnemyShieldsForTactic(enemyShips: EnemyShipState[], amount: number): EnemyShipState[] {
  if (amount <= 0) return enemyShips;
  return enemyShips.map(ship => {
    const maxShieldsPerSector = getAdversaryById(ship.adversaryId)?.shieldsPerSector ?? 0;
    return {
      ...ship,
      shields: {
        fore: Math.min(maxShieldsPerSector, ship.shields.fore + amount),
        foreStarboard: Math.min(maxShieldsPerSector, ship.shields.foreStarboard + amount),
        aftStarboard: Math.min(maxShieldsPerSector, ship.shields.aftStarboard + amount),
        aft: Math.min(maxShieldsPerSector, ship.shields.aft + amount),
        aftPort: Math.min(maxShieldsPerSector, ship.shields.aftPort + amount),
        forePort: Math.min(maxShieldsPerSector, ship.shields.forePort + amount),
      },
    };
  });
}

function buildReserveSquadron(
  enemyShips: EnemyShipState[],
  fighterTokens: FighterToken[],
  terrainMap: Map<string, TerrainType>,
  round: number,
): FighterToken[] {
  const carrier = enemyShips.find(ship => !ship.isDestroyed && !ship.isAllied && getAdversaryById(ship.adversaryId)?.id === 'carrier');
  if (!carrier) return [];

  const occupiedFighterHexes = new Map<string, number>();
  fighterTokens.filter(fighter => !fighter.isDestroyed).forEach(fighter => {
    const key = hexKey(fighter.position);
    occupiedFighterHexes.set(key, (occupiedFighterHexes.get(key) ?? 0) + 1);
  });

  return buildCarrierFighters(
    carrier.id,
    carrier.position,
    carrier.facing,
    occupiedFighterHexes,
    terrainMap,
    `reserve-squadron-${carrier.id}-r${round}-${Date.now()}`
  );
}

function hexesWithinRadius(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = Math.max(-radius, -dq - radius); dr <= Math.min(radius, -dq + radius); dr++) {
      results.push({ q: center.q + dq, r: center.r + dr });
    }
  }
  return results;
}

function buildMinefieldHazards(
  enemyShips: EnemyShipState[],
  playerShips: ShipState[],
  objectiveMarkers: ObjectiveMarkerState[],
  terrainMap: Map<string, TerrainType>,
  round: number,
  count: number,
  radius: number,
  damage: number,
): TacticHazardState[] {
  const occupiedKeys = new Set<string>();
  [...enemyShips, ...playerShips].filter(ship => !ship.isDestroyed).forEach(ship => occupiedKeys.add(hexKey(ship.position)));
  objectiveMarkers.filter(marker => !marker.isDestroyed && !marker.isCollected).forEach(marker => occupiedKeys.add(hexKey(marker.position)));

  const capitalShips = playerShips.filter(ship => {
    if (ship.isDestroyed) return false;
    const chassis = getChassisById(ship.chassisId);
    return isCapitalShipSize(chassis?.size);
  });

  const candidates = capitalShips
    .flatMap(ship => hexesWithinRadius(ship.position, radius))
    .filter(hex => {
      const key = hexKey(hex);
      return !occupiedKeys.has(key) && terrainMap.get(key) === 'open';
    })
    .filter((hex, index, array) => array.findIndex(other => hexEquals(other, hex)) === index)
    .sort((a, b) => {
      const distanceA = Math.min(...capitalShips.map(ship => hexDistance(ship.position, a)));
      const distanceB = Math.min(...capitalShips.map(ship => hexDistance(ship.position, b)));
      if (distanceA !== distanceB) return distanceA - distanceB;
      if (a.q !== b.q) return b.q - a.q;
      return a.r - b.r;
    });

  return candidates.slice(0, count).map((position, index) => ({
    id: `minefield-${round}-${index}-${position.q}-${position.r}`,
    name: 'Calibrated Mine',
    position,
    damage,
    expiresAfterRound: Infinity,
  }));
}

interface PointDefenseAttempt {
  shipId: string;
  shipName: string;
  weaponName: string;
  targetNumber: number;
  rolls: number[];
  hits: number;
  destroyed: boolean;
}

function resolvePointDefenseInterception(
  defendingShips: ShipState[],
  tokenPosition: HexCoord,
  tokenEvasion: number,
): PointDefenseAttempt[] {
  const attempts: PointDefenseAttempt[] = [];

  for (const ship of defendingShips) {
    if (ship.isDestroyed || ship.pdcDisabled) {
      continue;
    }

    for (const weaponId of ship.equippedWeapons) {
      const weapon = weaponId ? getWeaponById(weaponId) : undefined;
      if (!weapon?.tags.includes('pointDefense')) continue;
      if (hexDistance(ship.position, tokenPosition) > weapon.rangeMax) continue;

      const targetNumber = Math.max(1, tokenEvasion + getAntiSmallCraftTNModifier(weapon, ShipSize.Fighter));
      const volley = rollVolley(
        weapon.volleyPool.map(die => ({ type: die, source: 'weapon' })),
        targetNumber,
      );
      const hits = volley.totalHits;
      const destroyed = hits > 0;

      attempts.push({
        shipId: ship.id,
        shipName: ship.name,
        weaponName: weapon.name,
        targetNumber,
        rolls: volley.dice.flatMap(die => die.rolls),
        hits,
        destroyed,
      });

      if (destroyed) {
        return attempts;
      }
    }
  }

  return attempts;
}

interface FighterFlakAttempt {
  fighterId: string;
  fighterName: string;
  targetNumber: number;
  rolls: number[];
  hits: number;
  destroyed: boolean;
}

function resolveFlakAgainstFighter(
  weapon: NonNullable<ReturnType<typeof getWeaponById>>,
  fighter: FighterToken,
  volleyPool: ReturnType<typeof assembleVolleyPool>,
): FighterFlakAttempt {
  const targetNumber = Math.max(1, fighter.baseEvasion + getAntiSmallCraftTNModifier(weapon, ShipSize.Fighter));
  const volley = rollVolley(volleyPool, targetNumber);
  const hits = volley.totalHits;

  return {
    fighterId: fighter.id,
    fighterName: fighter.name,
    targetNumber,
    rolls: volley.dice.flatMap(die => die.rolls),
    hits,
    destroyed: hits > 0,
  };
}

const SHIELD_SECTORS: Array<keyof ShieldState> = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];

function canSpawnDebrisAtHex(
  state: {
    terrainMap: Map<string, TerrainType>;
    playerShips: ShipState[];
    enemyShips: EnemyShipState[];
    fighterTokens: FighterToken[];
    torpedoTokens: TorpedoToken[];
    objectiveMarkers: ObjectiveMarkerState[];
  },
  coord: HexCoord,
  destroyedShipId: string,
): boolean {
  const key = hexKey(coord);
  if (state.terrainMap.get(key) !== 'open') return false;

  const occupiedByShip =
    state.playerShips.some(ship => ship.id !== destroyedShipId && !ship.isDestroyed && hexKey(ship.position) === key) ||
    state.enemyShips.some(ship => ship.id !== destroyedShipId && !ship.isDestroyed && hexKey(ship.position) === key);
  if (occupiedByShip) return false;

  const occupiedByToken =
    state.fighterTokens.some(token => !token.isDestroyed && hexKey(token.position) === key) ||
    state.torpedoTokens.some(token => !token.isDestroyed && hexKey(token.position) === key);
  if (occupiedByToken) return false;

  const occupiedByObjective = state.objectiveMarkers.some(
    marker => !marker.isDestroyed && !marker.isCollected && hexKey(marker.position) === key,
  );
  return !occupiedByObjective;
}

function addDebrisFieldAtHex(state: { terrainMap: Map<string, TerrainType> }, coord: HexCoord) {
  const nextTerrainMap = new Map(state.terrainMap);
  nextTerrainMap.set(hexKey(coord), 'debrisField');
  return nextTerrainMap;
}

function isHexWithinBounds(hex: HexCoord, bounds: DeploymentBounds | null): boolean {
  if (!bounds) return true;
  if (bounds.hexes && bounds.hexes.length > 0) {
    return bounds.hexes.some(coord => coord.q === hex.q && coord.r === hex.r);
  }
  return hex.q >= bounds.minQ && hex.q <= bounds.maxQ && hex.r >= bounds.minR && hex.r <= bounds.maxR;
}

function isHexOpenAndUnoccupied(
  state: {
    terrainMap: Map<string, TerrainType>;
    playerShips: ShipState[];
    enemyShips: EnemyShipState[];
    fighterTokens: FighterToken[];
    torpedoTokens: TorpedoToken[];
    objectiveMarkers: ObjectiveMarkerState[];
  },
  coord: HexCoord,
  shipIdToIgnore?: string,
): boolean {
  const key = hexKey(coord);
  if (state.terrainMap.get(key) !== 'open') return false;
  if (state.playerShips.some(ship => ship.id !== shipIdToIgnore && !ship.isDestroyed && hexKey(ship.position) === key)) return false;
  if (state.enemyShips.some(ship => ship.id !== shipIdToIgnore && !ship.isDestroyed && hexKey(ship.position) === key)) return false;
  if (state.fighterTokens.some(token => !token.isDestroyed && hexKey(token.position) === key)) return false;
  if (state.torpedoTokens.some(token => !token.isDestroyed && hexKey(token.position) === key)) return false;
  return !state.objectiveMarkers.some(marker => !marker.isDestroyed && !marker.isCollected && hexKey(marker.position) === key);
}

function createDeploymentFormation(
  ships: ShipState[],
  bounds: DeploymentBounds,
  terrainMap: Map<string, TerrainType>,
): ShipState[] {
  const candidates: HexCoord[] = bounds.hexes && bounds.hexes.length > 0
    ? [...bounds.hexes].sort((a, b) => b.r - a.r || Math.abs(a.q) - Math.abs(b.q) || a.q - b.q)
    : [];

  if (candidates.length === 0) {
    const targetRows = [bounds.maxR, Math.max(bounds.minR, bounds.maxR - 1), Math.max(bounds.minR, bounds.maxR - 2)];
    const qRange = bounds.maxQ - bounds.minQ;

    for (const r of targetRows) {
      for (let i = 0; i < ships.length + 2; i++) {
        const q = Math.round(bounds.minQ + ((i + 1) / (ships.length + 3)) * qRange);
        candidates.push({ q, r });
      }
    }
  }

  const used = new Set<string>();
  return ships.map((ship, idx) => {
    const fallback = { q: Math.min(bounds.maxQ, Math.max(bounds.minQ, 0)), r: bounds.maxR };
    const pos = candidates.find(candidate => {
      const key = hexKey(candidate);
      return !used.has(key)
        && isHexWithinBounds(candidate, bounds)
        && terrainMap.get(key) === 'open'
        && !used.has(key);
    }) ?? fallback;
    used.add(hexKey(pos));
    return {
      ...ship,
      position: pos,
      facing: ship.facing ?? 0,
    };
  });
}


export const useGameStore = create<GameStore>((set, get) => ({
  // ═ ══ ══ ═ Initial State ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  phase: 'setup',
  round: 0,
  executionStep: null,
  resolvedSteps: [],

  players: [],
  playerShips: [],
  enemyShips: [],
  fighterTokens: [],
  torpedoTokens: [],

  terrainMap: new Map(),

  tacticDeck: [],
  fumbleDeck: [],
  playerCritDeck: [],
  enemyCritDeck: [],

  activeRoE: null,
  roeOverridden: false,
  currentTactic: null,
  tacticHazards: [],
  fleetAssetRoundUses: {},
  fleetAssetScenarioUses: {},
  fleetAssetShipRoundUses: {},
  tacticalOverrideShipIds: [],
  targetingPackages: [],
  exposedEnemyShipId: null,
  flakUmbrellaShipId: null,
  extractionWindowShipIds: [],

  fleetFavor: 0,
  startingFleetFavor: 0,
  log: [],
  smallShipsDestroyedThisMission: 0,

  scenarioId: '',
  maxRounds: null,
  gameOver: false,
  victory: null,
  gameOverReason: '',
  objectiveType: '',
  objectiveMarkers: [],
  scenarioRules: [],
  pendingSpawns: [],
  deploymentMode: false,
  deploymentBounds: null,
  deploymentSelectedShipId: null,
  deploymentRevealLogs: [],
  warpedOutShipIds: [],
  salvageCratesCollected: 0,
  dataSiphonedRelayNames: [],
  successfulEscapes: 0,
  experimentalTech: [],
  combatModifiers: null,
  tachyonMatrixUsedThisScenario: false,
  recycledCoolantUsedThisRound: false,
  inertialDampenersTriggeredShipIds: [],
  hardLightTriggeredShipIds: [],
  shipsWithHullDamageThisRound: [],

  // ═ ══ ══ ═ Initialize ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  initializeGame: (config) => {
    const terrainMap = new Map<string, TerrainType>();
    // Always populate a baseline grid so the board is visible
    const GRID_RADIUS = 10;
    for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
      for (let r = -GRID_RADIUS; r <= GRID_RADIUS; r++) {
        if (Math.abs(q + r) <= GRID_RADIUS) {
          terrainMap.set(`${q},${r}`, 'open' as TerrainType);
        }
      }
    }
    // Overlay scenario-specific terrain on top
    for (const t of config.terrain) {
      terrainMap.set(hexKey(t.coord), t.type);
    }

    // Draw one RoE card for the entire mission (sync — imported at top of file)
    const activeRoE = config.startingRoEId
      ? (getRoECardById(config.startingRoEId) ?? drawRoECard())
      : drawRoECard();
    const combatModifiers = config.combatModifiers ?? null;
    const deploymentMode = config.deploymentMode ?? false;
    const deploymentBounds = config.deploymentBounds ?? null;
    const deploymentRevealLogs = config.deploymentRevealLogs ?? [];

    const initialPlayers = config.players.map(player => {
      let officers = [...player.officers];
      if ((config.fleetFavor ?? 0) < 0) {
        officers = officers.map(o => {
          if (o.traumas.some(t => t.id === 'defeatist')) {
            return { ...o, currentStress: o.currentStress + 2 };
          }
          return o;
        });
      }
      return {
        ...player,
        officers,
        commandTokens: 0,
        pendingCommandTokenBonus: 0,
        briefingCommandTokenBonus: 0,
        assignedActions: [],
      };
    });

    const initialPlayerShips = config.playerShips.map(ship => {
      const chassis = getChassisById(ship.chassisId);
      const maxSpeedPenalty = combatModifiers?.playerMaxSpeedReduction ?? 0;
      const effectiveMaxSpeed = Math.max(0, (chassis?.maxSpeed ?? 4) - maxSpeedPenalty);
      const scarSpeedCap = getSpeedCapFromScars(ship);
      const finalSpeedCap = scarSpeedCap === null ? effectiveMaxSpeed : Math.min(effectiveMaxSpeed, scarSpeedCap);
      const currentSpeed = combatModifiers?.playerStartSpeed3
        ? Math.min(3, finalSpeedCap)
        : Math.min(ship.currentSpeed, finalSpeedCap);
      return { ...ship, currentSpeed };
    });

    const deployedPlayerShips = deploymentMode && deploymentBounds
      ? createDeploymentFormation(initialPlayerShips, deploymentBounds, terrainMap)
      : initialPlayerShips;

    const initialEnemyShips = config.enemyShips.map(ship => (
      combatModifiers?.enemyShieldsZeroRound1
        ? {
            ...ship,
            shields: {
              fore: 0,
              foreStarboard: 0,
              aftStarboard: 0,
              aft: 0,
              aftPort: 0,
              forePort: 0,
            },
          }
        : ship
    ));

    set({
      phase: 'setup',
      round: 0,
      executionStep: null,
      resolvedSteps: [],
      players: initialPlayers,
      playerShips: deployedPlayerShips,
      enemyShips: initialEnemyShips,
      fighterTokens: [],
      torpedoTokens: [],
      terrainMap,
      tacticDeck: createShuffledTacticDeck(initialEnemyShips),
      fumbleDeck: createShuffledFumbleDeck(),
      playerCritDeck: createShuffledPlayerCritDeck(),
      enemyCritDeck: createShuffledEnemyCritDeck(),
      activeRoE,
      roeOverridden: false,
      currentTactic: null,
      tacticHazards: [],
      fleetAssetRoundUses: {},
      fleetAssetScenarioUses: {},
      fleetAssetShipRoundUses: {},
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      exposedEnemyShipId: null,
      flakUmbrellaShipId: null,
      extractionWindowShipIds: [],
      fleetFavor: config.fleetFavor ?? 0,
      startingFleetFavor: config.fleetFavor ?? 0,
      log: [],
      smallShipsDestroyedThisMission: 0,
      scenarioId: config.scenarioId,
      maxRounds: config.maxRounds,
      gameOver: false,
      victory: null,
      gameOverReason: '',
      objectiveType: config.objectiveType ?? '',
      objectiveMarkers: (config.objectiveMarkers ?? []).map(m => ({ ...m, maxHull: m.maxHull ?? m.hull })),
      scenarioRules: config.scenarioRules ?? [],
      pendingSpawns: config.pendingSpawns ?? [],
      deploymentMode,
      deploymentBounds,
      deploymentSelectedShipId: deployedPlayerShips[0]?.id ?? null,
      deploymentRevealLogs,
      warpedOutShipIds: [],
      salvageCratesCollected: 0,
      dataSiphonedRelayNames: [],
      successfulEscapes: 0,
      experimentalTech: config.experimentalTech ?? [],
      combatModifiers,
      tachyonMatrixUsedThisScenario: false,
      recycledCoolantUsedThisRound: false,
      inertialDampenersTriggeredShipIds: [],
      hardLightTriggeredShipIds: [],
      shipsWithHullDamageThisRound: [],
    });

    (config.scenarioGenerationReport ?? []).forEach(line => {
      get().addLog('system', line);
    });
    
    if (!deploymentMode) {
      // Automatically advance from setup to briefing for round 1
      get().advancePhase();
    }
  },

  resetGame: () => {
    useUIStore.getState().resetUI();
    set({
      phase: 'setup',
      gameOver: false,
      victory: null,
      gameOverReason: '',
      round: 0,
      log: [],
      smallShipsDestroyedThisMission: 0,
      fleetAssetRoundUses: {},
      fleetAssetScenarioUses: {},
      fleetAssetShipRoundUses: {},
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      exposedEnemyShipId: null,
      flakUmbrellaShipId: null,
      extractionWindowShipIds: [],
      currentTactic: null,
      tacticHazards: [],
      deploymentMode: false,
      deploymentBounds: null,
      deploymentSelectedShipId: null,
      deploymentRevealLogs: [],
      experimentalTech: [],
      combatModifiers: null,
      tachyonMatrixUsedThisScenario: false,
      recycledCoolantUsedThisRound: false,
      inertialDampenersTriggeredShipIds: [],
      hardLightTriggeredShipIds: [],
      shipsWithHullDamageThisRound: [],
    });
  },

  // ═ ══ ══ ═ Game Over Check ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  checkGameOver: () => {
    const state = get();
    const result = checkGameOverConditions(state as any);
    if (result.gameOver) {
      set({ gameOver: true, victory: result.victory, phase: 'gameOver' });
      
      if (result.victory) {
        let rewardText = [];
        let totalReward = 0;

        // 1. Scenario Base Reward
        const scenario = getScenarioById(state.scenarioId);
        if (scenario?.victoryRewardFF) {
          totalReward += scenario.victoryRewardFF;
          rewardText.push(`Base Objective (+${scenario.victoryRewardFF})`);
        }

        // 2. Obedience Bonus
        if (!state.roeOverridden && state.activeRoE) {
          totalReward += 2;
          rewardText.push(`Exemplary Obedience (+2)`);
        }

        // 3. Flawless Execution (No ships lost)
        const flawless = state.playerShips.every(s => !s.isDestroyed);
        if (flawless) {
          totalReward += 2;
          rewardText.push(`Flawless Execution (+2)`);
        }

        get().adjustFleetFavor(totalReward);
        
        get().addLog('phase', `★  VICTORY ═  ${result.reason}`);
        if (totalReward > 0) {
          get().addLog('system', `🏆 Victory Rewards: +${totalReward} Fleet Favor [${rewardText.join(', ')}]`);
        }
      } else {
        get().addLog('phase', `★  DEFEAT ═  ${result.reason}`);
      }
      
      return true;
    }
    return false;
  },

  // ═ ══ ══ ═ Phase Advancement ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  advancePhase: () => {
    const state = get();
    const nextPhase = getNextPhase(state.phase);

    if (nextPhase === 'briefing') {
      // New round
      set({
        phase: nextPhase,
        round: state.round + 1,
        executionStep: null,
        resolvedSteps: [],
        recycledCoolantUsedThisRound: false,
        shipsWithHullDamageThisRound: [],
      });
      get().executeBriefingPhase();
    } else if (nextPhase === 'execution') {
      set({ phase: nextPhase, executionStep: null, resolvedSteps: [] });
      get().addLog('phase', `══ ${state.phase.toUpperCase()} ═   EXECUTION PHASE`);
      get().evaluateCommandPhaseFumbles();
      // Initialize the first step
      get().advanceExecutionStep();
    } else if (nextPhase === 'cleanup') {
      set({ phase: nextPhase, executionStep: null, resolvedSteps: [] });
      get().addLog('phase', `══ EXECUTION COMPLETE ═   CLEANUP PHASE`);
    } else {
      set({ phase: nextPhase, executionStep: null, resolvedSteps: [] });
      get().addLog('phase', `══ Phase ═   ${nextPhase.toUpperCase()}`);
    }
  },

  markStepResolved: (step) => {
    set(state => ({
      resolvedSteps: [...state.resolvedSteps, step]
    }));
  },

  advanceExecutionStep: () => {
    const state = get();
    const nextStep = getNextExecutionStepForScenario(state.executionStep, state.round, state.combatModifiers);
    if (nextStep === null) {
      // Execution complete, move to cleanup
      set({ phase: 'cleanup', executionStep: null });
      get().addLog('phase', `══ All execution steps complete ═   CLEANUP PHASE`);
      get().executeCleanupPhase();
    } else {
      set({ executionStep: nextStep });
      get().addLog('phase', `══ Execution Step: ${nextStep.toUpperCase()}`);
    }
  },

  evaluateCommandPhaseFumbles: () => {
    const state = get();
    let remainingDeck = [...state.fumbleDeck];

    const updatedPlayers = state.players.map(player => {
      let currentCT = player.commandTokens;
      let newOfficers = [...player.officers];
      let newAssignedActions = [...player.assignedActions];
      let commsBlackout = player.commsBlackout;
      
      const pShipIdx = state.playerShips.findIndex(s => s.id === player.shipId);
      const playerShip = pShipIdx !== -1 ? state.playerShips[pShipIdx] : null;

      let shipUpdates: Partial<ShipState> = {};
      
      for (let i = 0; i < newOfficers.length; i++) {
        const officer = newOfficers[i];
        const officerData = getOfficerById(officer.officerId);
        if (!officerData || officerData.stressLimit === null) continue;
        if (officerData.traitName === 'By The Book') continue;

        const maxStress = getCombatMaxStress(officer, officerData, state.experimentalTech);
        if (maxStress !== null && officer.currentStress > maxStress && !officer.hasFumbledThisRound) {
          if (remainingDeck.length === 0) remainingDeck = createShuffledFumbleDeck();
          const { card, remainingDeck: newDeck } = drawFumbleCard(remainingDeck, officer.station);
          remainingDeck = newDeck;

          // Process immediate mechanical effects
          if (card) {
            useUIStore.getState().queueModal('fumble', { card });
            get().addLog('fumble', `═a═ FUMBLE RUN: ${officerData.name} ═  ${card.name}: ${card.effect}`);

            const mech = card.mechanicalEffect;
            if (mech.stressToOthers) {
              get().addLog('stress', `Effect Applied: All other officers gain +${mech.stressToOthers} stress!`);
              // Apply stress to all other officers
              newOfficers = newOfficers.map((otherOfficer, j) => {
                if (i === j) return otherOfficer;
                const otherOfficerData = getOfficerById(otherOfficer.officerId);
                return {
                  ...otherOfficer,
                  currentStress: otherOfficerData?.stressLimit !== null 
                    ? Math.min(
                        getCombatMaxStress(otherOfficer, otherOfficerData, state.experimentalTech) ?? 99,
                        otherOfficer.currentStress + mech.stressToOthers!,
                      )
                    : otherOfficer.currentStress
                };
              });
            }
            if (mech.ctLost) {
              currentCT = Math.max(0, currentCT - mech.ctLost);
              get().addLog('system', `Effect Applied: Captain lost ${mech.ctLost} Command Token(s)!`);
            }
            if (mech.fleetFavorChange) {
              get().adjustFleetFavor(mech.fleetFavorChange);
            }
            if (mech.actionCanceled) {
              const actionIdx = newAssignedActions.findIndex(a => a.station === officer.station && !a.resolved);
              if (actionIdx !== -1) {
                const canceledAction = newAssignedActions[actionIdx];
                newAssignedActions.splice(actionIdx, 1);
                const actionName = getActionById(canceledAction.actionId)?.name || canceledAction.actionId;
                if (mech.ctRefunded) {
                  currentCT += canceledAction.ctCost;
                  get().addLog('system', `Action [${actionName}] canceled. +${canceledAction.ctCost} CT refunded.`);
                } else {
                  get().addLog('system', `Action [${actionName}] canceled. (CT wasted)`);
                }
              }
            }
            if (mech.stationLocked) {
              newOfficers[i].isLocked = true;
              newOfficers[i].lockDuration = Math.max(newOfficers[i].lockDuration, mech.lockDuration);
              const durationMsg = mech.lockDuration === 1 ? 'for the remainder of the round' : `for ${mech.lockDuration} rounds`;
              get().addLog('system', `Fumble Effect: ${officerData.name}'s station is LOCKED ${durationMsg}.`);
            }
            if (mech.skillDieStepDown) {
              newOfficers[i].hasNerveCollapse = true;
              if (newOfficers[i].currentTier === 'legendary') newOfficers[i].currentTier = 'elite';
              else if (newOfficers[i].currentTier === 'elite') newOfficers[i].currentTier = 'veteran';
              else if (newOfficers[i].currentTier === 'veteran') newOfficers[i].currentTier = 'rookie';
              get().addLog('system', `Fumble Effect: ${officerData.name} suffered Nerve Collapse (skill die degraded).`);
            }
            if (mech.evasionChange) {
              shipUpdates.evasionModifiers = (shipUpdates.evasionModifiers ?? playerShip?.evasionModifiers ?? 0) + mech.evasionChange;
              get().addLog('system', `Fumble Effect: Ship's Evasion changed by ${mech.evasionChange > 0 ? '+' : ''}${mech.evasionChange}.`);
            }
            if (mech.randomDrift && playerShip) {
              const randomFacing = Math.floor(Math.random() * 6) as HexFacing;
              const occupiedHexes = new Set<string>();
              get().playerShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
              get().enemyShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
              occupiedHexes.delete(hexKey(playerShip.position));
              const result = executeDrift({ ...playerShip, facing: randomFacing }, occupiedHexes, get().terrainMap, false, null, null);
              
              shipUpdates.position = result.finalPosition;
              shipUpdates.currentSpeed = result.resultingSpeed;
              shipUpdates.hasDrifted = true;
              
              if (result.collisionDamage > 0 || result.terrainDamage > 0) {
                shipUpdates.currentHull = Math.max(0, (shipUpdates.currentHull ?? playerShip.currentHull) - result.collisionDamage - result.terrainDamage);
                if (shipUpdates.currentHull === 0) shipUpdates.isDestroyed = true;

                // Collision Symmetry (Rule 2.4): Both units take 1D4 damage
                if (result.collision && result.collidedWithHex) {
                  const allShips = [...get().playerShips, ...get().enemyShips];
                  const targetShip = allShips.find(s => !s.isDestroyed && hexEquals(s.position, result.collidedWithHex!));
                  if (targetShip) {
                    const symDamage = rollDie('d4');
                    const targetUpdates = {
                      currentHull: Math.max(0, targetShip.currentHull - symDamage),
                      isDestroyed: Math.max(0, targetShip.currentHull - symDamage) === 0
                    };
                    const isTargetAllied = get().playerShips.some(ps => ps.id === targetShip.id);
                    if (isTargetAllied) {
                      get().updatePlayerShip(targetShip.id, targetUpdates);
                    } else {
                      get().updateEnemyShip(targetShip.id, targetUpdates as Partial<EnemyShipState>);
                    }
                    get().addLog('combat', `Collision Symmetry: ${get().getShipName(targetShip.id)} also took ${symDamage} hull damage from ${get().getShipName(playerShip.id)}!`);
                  }
                }
              }
              get().addLog('movement', `Fumble! Ship drifted unpredictably to (${result.finalPosition.q},${result.finalPosition.r}).`);
            }
            if (mech.hullDamage && playerShip) {
              shipUpdates.currentHull = Math.max(0, (shipUpdates.currentHull ?? playerShip.currentHull) - mech.hullDamage);
              if (shipUpdates.currentHull === 0) shipUpdates.isDestroyed = true;
              get().addLog('combat', `Fumble Effect: Ship suffered ${mech.hullDamage} internal hull damage!`);
            }
            if (mech.weaponDamaged && playerShip) {
              const action = newAssignedActions.find(a => a.station === officer.station && a.actionId === 'fire-primary');
              if (action) {
                const wIdx = action.weaponSlotIndex ?? playerShip.equippedWeapons.findIndex(w => w !== null);
                shipUpdates.disabledWeaponIndices = [...(shipUpdates.disabledWeaponIndices ?? playerShip.disabledWeaponIndices ?? []), wIdx];
                get().addLog('system', `Fumble Effect: Fired weapon system took 1 damage and is disabled for next round.`);
              }
            }
            if (mech.panicFire) {
              const action = newAssignedActions.find(a => a.station === officer.station && a.actionId === 'fire-primary');
              if (action && playerShip) {
                const weaponId = action.weaponSlotIndex !== undefined ? playerShip.equippedWeapons[action.weaponSlotIndex] : playerShip.equippedWeapons.find(w => w !== null);
                const weapon = getWeaponById(weaponId ?? '');
                if (weapon) {
                  const allShips = [...get().playerShips, ...get().enemyShips].filter(s => s.id !== playerShip.id && !s.isDestroyed);
                  const validTargetIds = getValidTargetsForWeapon(
                    shipUpdates.position ?? playerShip.position,
                    shipUpdates.facing ?? playerShip.facing,
                    weapon,
                    allShips,
                    get().terrainMap
                  );
                  
                  let closestDist = Infinity;
                  let closestId: string | null = null;
                  
                  for (const tId of validTargetIds) {
                    const s = allShips.find(ship => ship.id === tId);
                    if (s) {
                      const d = hexDistance(shipUpdates.position ?? playerShip.position, s.position);
                      if (d < closestDist) {
                        closestDist = d;
                        closestId = s.id;
                      }
                    }
                  }
                  
                  if (closestId) {
                    action.targetShipId = closestId;
                    get().addLog('fumble', `Panic Fire aimed at closest valid target: ${get().getShipName(closestId)}`);
                  } else {
                    action.context = { ...(action.context || {}), discharge: true };
                    get().addLog('fumble', `Panic Fire triggered but no valid targets in range/arc. Discharging blindly!`);
                  }
                }
              }
            }
            if (mech.pdcDisabled) {
               shipUpdates.pdcDisabled = true;
               get().addLog('system', `Fumble Effect: Point Defense Cannons disabled for this round.`);
            }
            if (mech.armorDisabled) {
               shipUpdates.armorDisabled = true;
               get().addLog('system', `Fumble Effect: Ship Armor is offline for this round!`);
            }
            if (mech.ordnanceJammed) {
               shipUpdates.ordnanceJammed = true;
               get().addLog('system', `Fumble Effect: Ordnance loading mechanisms jammed.`);
            }
            if (mech.navLockout) {
               shipUpdates.navLockout = true;
               shipUpdates.navLockoutDuration = mech.navLockoutDuration;
               get().addLog('system', `Fumble Effect: Navigational Lockout! Helm maneuvers blocked for ${mech.navLockoutDuration} round(s).`);
            }
            if (mech.commsBlackout) {
               commsBlackout = true;
               get().addLog('system', `Fumble Effect: Comms Blackout! Fleet Favor is unavailable.`);
            }
            if (mech.shieldSectorStripped && playerShip) {
               let bestSector: keyof ShieldState = 'fore';
               let maxVal = -1;
               const shields: ShieldState = shipUpdates.shields ? { ...shipUpdates.shields } : { ...playerShip.shields };
               for (const [sec, val] of Object.entries(shields)) {
                 if (val > maxVal) {
                   maxVal = val;
                   bestSector = sec as keyof ShieldState;
                 }
               }
               (shields as any)[bestSector] = 0;
               shipUpdates.shields = shields;
               get().addLog('system', `Catastrophic Reroute stripped ${bestSector.toUpperCase()} shields!`);
            }
            if (mech.enemyEvasionBoost && playerShip) {
               const enemies = get().enemyShips.filter(s => !s.isDestroyed);
               let closestDist = Infinity;
               let closestEnemy: string | null = null;
               for (const e of enemies) {
                 const d = hexDistance(shipUpdates.position ?? playerShip.position, e.position);
                 if (d < closestDist) {
                   closestDist = d;
                   closestEnemy = e.id;
                 }
               }
               if (closestEnemy) {
                 const enemyShip = get().enemyShips.find(s => s.id === closestEnemy);
                 if (enemyShip) {
                   get().updateEnemyShip(closestEnemy, { evasionModifiers: (enemyShip.evasionModifiers ?? 0) + mech.enemyEvasionBoost });
                   get().addLog('fumble', `Ghost Contacts boosted evasion for ${enemyShip.name} (+${mech.enemyEvasionBoost})`);
                 }
               }
            }

            const resetStress = Math.floor(maxStress / 2);
            newOfficers[i] = {
              ...newOfficers[i],
              currentStress: resetStress,
            };
            get().addLog('stress', `${officerData.name} steadies after the fumble (${resetStress}/${maxStress} Stress).`);
          }

          newOfficers[i] = {
            ...newOfficers[i],
            hasFumbledThisRound: true,
          };
        }
      }
      
      if (playerShip && Object.keys(shipUpdates).length > 0) {
         get().updatePlayerShip(player.shipId, shipUpdates);
      }
      
      return { ...player, commandTokens: currentCT, officers: newOfficers, assignedActions: newAssignedActions, commsBlackout };
    });

    set({ players: updatedPlayers, fumbleDeck: remainingDeck });
  },

  // ═ ══ ══ ═ Command Phase ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  assignToken: (playerId, action) => {
    set(state => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;
      
      const player = state.players[playerIndex];
      const officerIndex = player.officers.findIndex(o => o.station === action.station);
      if (officerIndex === -1) return state;

      const officer = player.officers[officerIndex];
      const officerData = getOfficerById(officer.officerId);
      
      if (!officerData) return state;

      // By The Book check
      const currentMaxStress = getCombatMaxStress(officer, officerData, state.experimentalTech);
      if (officerData.traitName === 'By The Book' && currentMaxStress !== null && officer.currentStress >= currentMaxStress) {
        // block assignment
        return state;
      }

      const ship = state.playerShips.find(s => s.id === player.shipId);
      
      // Fumble Lockouts
      if (ship) {
        if (ship.navLockout && (action.actionId === 'adjust-speed' || action.actionId === 'rotate')) {
          get().addLog('system', `Navigational Lockout prevents ${action.actionId}!`);
          return state;
        }
        if (ship.ordnanceJammed && action.actionId === 'load-ordinance') {
          get().addLog('system', `Ordnance Jam prevents loading ordnance!`);
          return state;
        }
        if (action.actionId === 'fire-primary' && action.weaponSlotIndex !== undefined) {
          if (ship.disabledWeaponIndices?.includes(action.weaponSlotIndex)) {
             get().addLog('system', `Cannot fire that weapon; it is damaged from a Power Surge!`);
             return state;
          }
        }
      }

      // Trauma Lockouts
      const hasTrauma = (id: string) => officer.traumas.some(t => t.id === id);

      if (hasTrauma('trigger-happy') && (action.actionId === 'target-lock' || action.actionId === 'vector-orders')) {
        get().addLog('system', `Trigger-Happy prevents assigning ${action.actionId}!`);
        return state;
      }
      if (hasTrauma('tremors') && action.actionId === 'load-ordinance') {
        get().addLog('system', `Tremors prevents loading ordnance!`);
        return state;
      }
      if (hasTrauma('over-compensator') && action.actionId === 'reinforce-shields') {
        const sector = action.context?.sector;
        const ship = state.playerShips.find(s => s.id === player.shipId);
        if (sector && sector !== 'fore') {
          // Allow non-fore only if fore is already maxed
          const foreMaxed = ship ? ship.shields.fore >= (ship.maxShieldsPerSector ?? 99) : false;
          if (!foreMaxed) {
            get().addLog('system', `Over-Compensator forces reinforcing Fore shields first!`);
            return state;
          }
        }
      }
      if (hasTrauma('comms-phobic') && action.actionId === 'cyber-warfare') {
        get().addLog('system', `Comms-Phobic prevents assigning ${action.actionId}!`);
        return state;
      }
      if (state.currentTactic?.mechanicalEffect.disablePlayerStation === action.station) {
        get().addLog('system', `${state.currentTactic.name} prevents ${action.station} actions this round!`);
        return state;
      }

      // Repeat-assignment cumulative stress: each additional assignment of the same
      // action at this station adds +1 stress on top of the (trait-modified) base cost.
      // 1st time: +0, 2nd time: +1, 3rd time: +2, etc.
      const priorAssignmentCount = player.assignedActions.filter(
        a => a.station === action.station && a.actionId === action.actionId
      ).length;

      const isFirstActionAssignedThisRound = player.assignedActions.filter(
        a => a.station === action.station
      ).length === 0;

      let { ctCost: baseCt, stressCost, usedMethodical } = calculateActionCosts(
        { actionId: action.actionId, ctCost: action.ctCost, stressCost: action.stressCost },
        officerData,
        priorAssignmentCount,
        action.context,
        officer.usedMethodicalThisRound,
        officer.traumas,
        isFirstActionAssignedThisRound
      );

      if (ship && action.station === 'engineering' && hasScar(ship, 'coolant-leak')) {
        stressCost += 1;
      }
      if (ship && action.station === 'sensors' && hasScar(ship, 'sensor-mast-damaged')) {
        stressCost += 1;
      }

      const fatiguePenalty = officer.traumas.some(t => t.id === 'lethargic') ? 2 : 1;
      const baseFatiguePenalty = priorAssignmentCount * fatiguePenalty;
      const coolantResult = applyRecycledCoolant(
        baseFatiguePenalty,
        state.recycledCoolantUsedThisRound,
        state.experimentalTech,
      );
      if (coolantResult.consumed) {
        stressCost = Math.max(0, stressCost - (baseFatiguePenalty - coolantResult.finalPenalty));
        get().addLog('system', `Experimental Tech: Recycled Coolant negated this round's fatigue spike for ${officerData.name}.`);
      }
      const recycledCoolantUsedThisRound = state.recycledCoolantUsedThisRound || coolantResult.consumed;

      // ─── RoE: "Hold Together With Duct Tape" — Damage Control costs 3 CT ───
      const activeRoE = state.activeRoE;
      let ctCost = baseCt;
      if (action.actionId === 'damage-control' && activeRoE?.mechanicalEffect.damageControlCostOverride !== undefined) {
        ctCost = activeRoE.mechanicalEffect.damageControlCostOverride;
      }
      if (ship && player.assignedActions.length === 0 && hasScar(ship, 'power-bus-leak')) {
        ctCost += 1;
      }
      if (player.commandTokens < ctCost) {
        get().addLog('system', `[CMD] ${officerData.name} cannot assign ${action.actionId}: need ${ctCost} CT, have ${player.commandTokens}.`);
        return state;
      }

      // ─── RoE: "Live-Fire Telemetry" — No shield targeting in rounds 1-3 ───
      if (action.actionId === 'fire-primary' && activeRoE?.mechanicalEffect.shieldTargetBanRounds !== undefined) {
        if (state.round <= activeRoE.mechanicalEffect.shieldTargetBanRounds) {
          // Shield ban: only block if targetShipId is set and that ship has shields > 0 on any sector
          const targetId = action.targetShipId || action.context?.targetShipId;
          if (targetId) {
            const targetShip = state.enemyShips.find(s => s.id === targetId);
            if (targetShip) {
              const hasShields = Object.values(targetShip.shields).some(v => v > 0);
              const canOverride = state.tacticalOverrideShipIds.includes(player.shipId);
              if (hasShields && !canOverride) {
                get().addLog('roe', `🚫 LIVE-FIRE TELEMETRY: Cannot target ${targetShip.name} — enemy has active shields (forbidden until Round ${activeRoE.mechanicalEffect.shieldTargetBanRounds! + 1})!`);
                return state;
              }
            }
          }
        }
      }

      // Lumbering (Minotaur) ═  block speed-increase actions entirely
      if (action.actionId === 'adjust-speed') {
        const ship = state.playerShips.find(s => s.id === player.shipId);
        const shipChassis = getChassisById(ship?.chassisId || '');
        if (shipChassis?.uniqueTraitName === 'Lumbering' && ship && ship.currentSpeed >= 1) {
          // Speed already at cap ═  refuse the assignment
          return state;
        }
      }

      // Apply Stress
      // Apply Stress
      const { newStress } = applyStress(
        officer,
        officerData,
        stressCost
      );

      const modifiedOfficer = {
        ...officer,
        currentStress: newStress,
        actionsPerformedThisRound: officer.actionsPerformedThisRound + 1,
        usedMethodicalThisRound: usedMethodical,
      };

      const updatedPlayers = [...state.players];
      const updatedOfficers = [...player.officers];
      updatedOfficers[officerIndex] = modifiedOfficer;
      
      updatedPlayers[playerIndex] = {
        ...player,
        commandTokens: player.commandTokens - ctCost,
        assignedActions: [...player.assignedActions, { ...action, stressCost, ctCost }],
        officers: updatedOfficers,
      };

      // Capture values for post-set logging
      const _officerName = officerData.name;
      const _actionDef = getActionById(action.actionId) || getSubsystemById(action.actionId);
      const _stressCost = stressCost;
      const _ctCost = ctCost;
      const _newStress = newStress;

      setTimeout(() => {
        get().addLog('system', `[CMD] ${_officerName} assigned ${_actionDef?.name ?? action.actionId} (${_ctCost} CT, +${_stressCost} Stress ═   ${_newStress} total)`);
        if (_stressCost > 0) {
          get().addLog('stress', `${_officerName} stress: +${_stressCost} ═   ${_newStress}`);
        }
      }, 0);

      return {
        players: updatedPlayers,
        recycledCoolantUsedThisRound,
      };
    });
  },

  unassignToken: (playerId, actionId) => {
    set(state => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;
      const player = state.players[playerIndex];
      const actionIndex = player.assignedActions.findIndex(a => a.id === actionId);
      if (actionIndex === -1) return state;
      const action = player.assignedActions[actionIndex];

      const ship = state.playerShips.find(s => s.id === player.shipId);
      const chassis = getChassisById(ship?.chassisId || '');

      let updatedOfficers = player.officers;
      let usedVersatile = player.usedVersatileThisRound;

      const officerIndex = player.officers.findIndex(o => o.station === action.station);
      const officer = officerIndex !== -1 ? player.officers[officerIndex] : null;

      // Refund stress when an action is unassigned
      let newStress = officer?.currentStress ?? 0;
      if (action.stressCost > 0) {
        newStress = Math.max(0, newStress - action.stressCost);
      }

      if (officer) {
        updatedOfficers = [...player.officers];
        updatedOfficers[officerIndex] = {
          ...officer,
          currentStress: newStress,
          actionsPerformedThisRound: Math.max(0, officer.actionsPerformedThisRound - 1),
        };
      }

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = {
        ...player,
        commandTokens: player.commandTokens + action.ctCost,
        assignedActions: player.assignedActions.filter(a => a.id !== actionId),
        officers: updatedOfficers,
        usedVersatileThisRound: usedVersatile,
      };

      // Capture values for post-set logging
      const _actionForLog = action;
      setTimeout(() => {
        const actionDef = getActionById(_actionForLog.actionId) || getSubsystemById(_actionForLog.actionId);
        get().addLog('system', `[CMD] Unassigned ${actionDef?.name ?? _actionForLog.actionId} (+${_actionForLog.ctCost} CT refunded)`);
      }, 0);

      return {
        players: updatedPlayers,
      };
    });
  },

  // ═ ══ ══ ═ Execution Phase Resolvers ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  resolveDrift: (shipId, isAllied) => {
    const state = get();
    const shipList = isAllied ? state.playerShips : state.enemyShips;
    const ship = shipList.find(s => s.id === shipId);
    if (!ship || ship.hasDrifted) return;

    let helmTrait: string | null = null;
    let chassisTrait: string | null = null;

    if (isAllied) {
      const player = state.players.find(p => p.shipId === shipId);
      if (player) {
        const helmOff = player.officers.find(o => o.station === 'helm');
        if (helmOff) {
          const offData = getOfficerById(helmOff.officerId);
          helmTrait = offData?.traitName || null;
        }
      }
    }
    
    // Chassis traits exist for both player and enemy
    const chassis = getChassisById((ship as ShipState).chassisId ?? '');
    chassisTrait = chassis?.uniqueTraitName || null;

    const occupiedHexes = new Set<string>();
    state.playerShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
    state.enemyShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
    occupiedHexes.delete(hexKey(ship.position)); // Don't collide with self

    const result = executeDrift(ship as ShipState, occupiedHexes, state.terrainMap, false, helmTrait, chassisTrait);
    const triggeredHazards = state.tacticHazards.filter(hazard =>
      hazard.expiresAfterRound >= state.round &&
      result.path.some(step => hexKey(step) === hexKey(hazard.position))
    );
    const mineDamage = triggeredHazards.reduce((sum, hazard) => sum + hazard.damage, 0);

    const updates: Partial<ShipState> = {
      position: result.finalPosition,
      currentSpeed: result.resultingSpeed,
      hasDrifted: true,
    };

    if (result.collisionDamage > 0 || result.terrainDamage > 0) {
      // ─── RoE: "Ramming Speed Authorized" — 2D6 unblockable collision damage ───
      const driftRoE = state.activeRoE;
      let movingShipCollisionDmg = result.collisionDamage;
      let symmetricDmgFn: () => number = () => rollDie('d4');

      if (result.collision && driftRoE?.mechanicalEffect.rammingDamageDice) {
        movingShipCollisionDmg = driftRoE.mechanicalEffect.rammingDamageDice.reduce((sum, die) => sum + rollDie(die), 0);
        symmetricDmgFn = () => driftRoE.mechanicalEffect.rammingDamageDice!.reduce((sum, die) => sum + rollDie(die), 0);
        get().addLog('roe', `🚀 RAMMING SPEED AUTHORIZED: ${get().getShipName(shipId)} rams for ${movingShipCollisionDmg} unblockable hull damage!`);
      }

      if (result.collision && isAllied) {
        const dampenerResult = applyInertialDampeners(
          movingShipCollisionDmg,
          shipId,
          new Set(state.inertialDampenersTriggeredShipIds),
          state.experimentalTech,
        );
        movingShipCollisionDmg = dampenerResult.finalDamage;
        if (dampenerResult.negated) {
          set(s => ({
            inertialDampenersTriggeredShipIds: [...s.inertialDampenersTriggeredShipIds, shipId],
          }));
          get().addLog('system', `Experimental Tech: Inertial Dampeners negated collision damage on ${get().getShipName(shipId)}.`);
        }
      }

      updates.currentHull = Math.max(0, ship.currentHull - movingShipCollisionDmg - result.terrainDamage - mineDamage);
      if (updates.currentHull === 0) updates.isDestroyed = true;

      // Collision Symmetry (Rule 2.4): Both units take damage
      if (result.collision && result.collidedWithHex) {
        const allShips = [...state.playerShips, ...state.enemyShips];
        const targetShip = allShips.find(s => !s.isDestroyed && hexEquals(s.position, result.collidedWithHex!));
        if (targetShip) {
          let symDamage = symmetricDmgFn();
          const targetUpdates = {
            currentHull: 0,
            isDestroyed: false,
          };
          const isTargetAllied = state.playerShips.some(ps => ps.id === targetShip.id);
          if (isTargetAllied) {
            const dampenerResult = applyInertialDampeners(
              symDamage,
              targetShip.id,
              new Set(get().inertialDampenersTriggeredShipIds),
              get().experimentalTech,
            );
            symDamage = dampenerResult.finalDamage;
            if (dampenerResult.negated) {
              set(s => ({
                inertialDampenersTriggeredShipIds: [...s.inertialDampenersTriggeredShipIds, targetShip.id],
              }));
              get().addLog('system', `Experimental Tech: Inertial Dampeners negated collision damage on ${get().getShipName(targetShip.id)}.`);
            }
          }
          targetUpdates.currentHull = Math.max(0, targetShip.currentHull - symDamage);
          targetUpdates.isDestroyed = targetUpdates.currentHull === 0;
          if (isTargetAllied) {
            get().updatePlayerShip(targetShip.id, targetUpdates);
          } else {
            get().updateEnemyShip(targetShip.id, targetUpdates as Partial<EnemyShipState>);
          }
          get().addLog('combat', `Collision Symmetry: ${get().getShipName(targetShip.id)} also took ${symDamage} hull damage from ${get().getShipName(shipId)}!`);
        }
      }
    }

    if (result.collisionDamage === 0 && result.terrainDamage === 0 && mineDamage > 0) {
      updates.currentHull = Math.max(0, ship.currentHull - mineDamage);
      if (updates.currentHull === 0) updates.isDestroyed = true;
    }


    if (isAllied) {
      get().updatePlayerShip(shipId, updates);
    } else {
      get().updateEnemyShip(shipId, updates as Partial<EnemyShipState>);
    }

    if (triggeredHazards.length > 0) {
      set(storeState => ({
        tacticHazards: storeState.tacticHazards.filter(hazard => !triggeredHazards.some(triggered => triggered.id === hazard.id)),
      }));
      get().addLog('combat', `[TACTIC] ${get().getShipName(shipId)} triggered ${triggeredHazards.length} calibrated mine(s) for ${mineDamage} hull damage.`);
    }

    const fromPos = ship.position;
    const moved = fromPos.q !== result.finalPosition.q || fromPos.r !== result.finalPosition.r;
    let driftMsg = `${isAllied ? '═ ═' : '═ ═[ENEMY]'} ${get().getShipName(shipId)} drifted`;
    driftMsg += moved
      ? ` (${fromPos.q},${fromPos.r}) ═   (${result.finalPosition.q},${result.finalPosition.r})`
      : ` (stationary ═  speed 0)`;
    if (result.collisionDamage > 0) driftMsg += ` | COLLISION: ${result.collisionDamage} hull dmg`;
    if (result.terrainDamage > 0)   driftMsg += ` | TERRAIN: ${result.terrainDamage} hull dmg`;
    if (mineDamage > 0) driftMsg += ` | MINES: ${mineDamage} hull dmg`;
    get().addLog('movement', driftMsg, {
      from: fromPos,
      to: result.finalPosition,
      speedBefore: ship.currentSpeed,
      speedAfter: result.resultingSpeed,
      collisionDamage: result.collisionDamage,
      terrainDamage: result.terrainDamage,
    });
  },
  
  resolveAction: (playerId, shipId, assignedActionId, context) => {
    const state = get();
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return;
    const player = state.players[playerIndex];
    
    const actionList = player.assignedActions;
    const actionIndex = actionList.findIndex(a => a.id === assignedActionId);
    if (actionIndex === -1) return;
    if (actionList[actionIndex].resolved) return;
    const action = actionList[actionIndex];

    // ─── Waste Action fallback ───────────────────────────────────────
    if (context?.wasted) {
      const actionName = getActionById(action.actionId)?.name || action.actionId;
      const officer = player.officers.find(o => o.station === action.station);
      const officerData = officer ? getOfficerById(officer.officerId) : null;
      const officerName = officerData?.name ?? action.station.toUpperCase();
      
      get().addLog('system', `${actionName} was wasted by ${officerName}${context.reason ? ` (${context.reason})` : ''}.`);
      
      // Mark action as resolved immediately and return
      set(s => {
        const ps = [...s.players];
        const p = { ...ps[playerIndex] };
        const as = [...p.assignedActions];
        as[actionIndex] = { ...as[actionIndex], resolved: true };
        p.assignedActions = as;
        ps[playerIndex] = p;
        return { players: ps };
      });
      return;
    }

    
    const ship = state.playerShips.find(s => s.id === shipId);
    if (!ship) return;
    const chassis = getChassisById(ship.chassisId);
    
    // Resolve specific actions
    const updates: Partial<ShipState> = {};
    
    switch (action.actionId) {
      case 'adjust-speed': {
        // Enforce the delta that was queued during Planning
        let delta = action.context?.delta ?? context?.delta ?? 1;
        // Zephyr (Afterburners) gives +/▶ 2 instead of 1
        if (chassis?.uniqueTraitName === 'Afterburners') {
          delta = delta > 0 ? 2 : -2;
        }
        // Over-Cautious: helm officer caps max speed at 2
        const helmOfficer = state.players
          .find(p => p.shipId === shipId)?.officers
          .find(o => o.station === 'helm');
        const hasOverCautious = helmOfficer?.traumas.some(t => t.id === 'over-cautious');
        const scarSpeedPenalty = hasScar(ship, 'thrusters-offline') ? 1 : 0;
        const eventSpeedPenalty = state.combatModifiers?.playerMaxSpeedReduction ?? 0;
        const chassisMaxSpeed = Math.max(0, (chassis?.maxSpeed ?? 4) - scarSpeedPenalty - eventSpeedPenalty);
        const scarSpeedCap = getSpeedCapFromScars(ship);
        const effectiveMaxSpeed = Math.min(
          hasOverCautious ? Math.min(2, chassisMaxSpeed) : chassisMaxSpeed,
          scarSpeedCap ?? Number.POSITIVE_INFINITY,
        );
        if (hasOverCautious && delta > 0 && ship.currentSpeed >= 2) {
          get().addLog('system', `Over-Cautious: ${get().getShipName(shipId)} speed is capped at 2!`);
        }
        if (scarSpeedCap !== null && delta > 0 && ship.currentSpeed >= scarSpeedCap) {
          get().addLog('system', `Buckled Structural Spine: ${get().getShipName(shipId)} speed is capped at ${scarSpeedCap}.`);
        }
        const newSpeed = adjustSpeed(ship.currentSpeed, delta, effectiveMaxSpeed);
        updates.currentSpeed = newSpeed;
        get().addLog('movement', `${get().getShipName(shipId)} speed adjusted ${ship.currentSpeed} ═   ${newSpeed} (${delta > 0 ? '+' : ''}${delta})`);
        break;
      }
      case 'rotate': {
        const dir = context?.direction ?? 'clockwise';
        updates.facing = rotateShip(ship.facing, dir);
        const dirLabel = dir === 'clockwise' ? 'STARBOARD (CW)' : 'PORT (CCW)';
        get().addLog('movement', `${get().getShipName(shipId)} rotated ${dirLabel}`);
        break;
      }
      case 'evasive-pattern': {
        const officer = player.officers.find(o => o.station === action.station);
        const officerData = officer ? getOfficerById(officer.officerId) : null;
        const procResult = officer ? rollOfficerSkillProc(officer.currentTier) : null;
        const precisionSucceeded = !!procResult?.isSuccess;
        const evasionBonus = officerData?.traitName === 'Paranoia' || precisionSucceeded ? 3 : 2;
        updates.evasionModifiers = ship.evasionModifiers + evasionBonus;
        get().addLog('system', `${officerData?.name ?? 'Helm'} executed Evasive Pattern on ${get().getShipName(shipId)} (+${evasionBonus} Evasion TN)`);
        if (procResult) {
          const outcome = procResult.isCritical ? 'CRITICAL' : procResult.isSuccess ? 'SUCCESS' : 'FAIL';
          useUIStore.getState().queueModal('skill-proc', {
            data: {
              title: 'Precision Maneuvering',
              officerName: officerData?.name ?? 'Helm',
              station: 'helm',
              actionName: 'Evasive Pattern',
              result: procResult,
              standardEffect: '+3 Base Evasion this round.',
              failureEffect: 'Base action resolves at +2 Base Evasion.',
              criticalEffect: `+3 Base Evasion and ${action.stressCost} Stress refunded.`,
            },
          });
          get().addLog(
            'system',
            `Precision Maneuvering: ${officerData?.name ?? 'Helm'} rolled ${procResult.roll} on ${procResult.dieType.toUpperCase()} (${outcome}).`,
          );
          if (procResult.isCritical && officer) {
            const updatedOfficers = [...player.officers];
            const officerIndex = updatedOfficers.findIndex(o => o.station === action.station);
            if (officerIndex !== -1) {
              updatedOfficers[officerIndex] = {
                ...updatedOfficers[officerIndex],
                currentStress: Math.max(0, updatedOfficers[officerIndex].currentStress - action.stressCost),
              };
              const ps = [...state.players];
              ps[playerIndex] = { ...ps[playerIndex], officers: updatedOfficers };
              set({ players: ps });
              get().addLog('stress', `Precision Maneuvering: ${officerData?.name ?? 'Helm'} refunded ${action.stressCost} Stress.`);
            }
          }
        }
        break;
      }
      case 'reroute-power': {
        const officer = player.officers.find(o => o.station === action.station);
        const officerData = officer ? getOfficerById(officer.officerId) : null;
        let ctGain = 2;
        if (officerData?.traitName === 'Redliner') {
          ctGain = 3;
          updates.currentHull = Math.max(0, ship.currentHull - 1);
          if (updates.currentHull === 0) updates.isDestroyed = true;
          get().addLog('damage', `${officerData.name} (Redliner): Rerouted power at cost of 1 hull!`);
        }
        // Reckless Abandon: rerouting power deals 1 unblockable hull damage
        if (officer?.traumas.some(t => t.id === 'reckless-abandon')) {
          const currentHull = updates.currentHull ?? ship.currentHull;
          updates.currentHull = Math.max(0, currentHull - 1);
          if (updates.currentHull === 0) updates.isDestroyed = true;
          get().addLog('damage', `[Trauma] Reckless Abandon: ${officerData?.name ?? 'Engineering'} took 1 unblockable hull damage!`);
        }
        
        // Schedule a one-time CT bonus for the next round's Briefing phase.
        const ps = [...state.players];
        const p = { ...ps[playerIndex] };
        p.pendingCommandTokenBonus = (p.pendingCommandTokenBonus ?? 0) + ctGain;
        ps[playerIndex] = p;
        set({ players: ps });

        get().addLog('system', `${officerData?.name ?? 'Engineering'} rerouted power on ${get().getShipName(shipId)} ═  next round gains +${ctGain} CT`);
        break;
      }
      case 'steady-nerves': {
        const targetOfficerId = context?.targetOfficerId;
        if (!targetOfficerId) {
          get().addLog('system', `${ship.name}: Steady Nerves needs an officer target.`);
          break;
        }

        const targetOfficerIndex = player.officers.findIndex(o => o.officerId === targetOfficerId);
        if (targetOfficerIndex === -1) {
          get().addLog('system', `${ship.name}: Steady Nerves failed - officer target not found.`);
          break;
        }

        const targetOfficer = player.officers[targetOfficerIndex];
        const updatedOfficers = [...player.officers];
        updatedOfficers[targetOfficerIndex] = {
          ...targetOfficer,
          currentStress: Math.max(0, targetOfficer.currentStress - 1),
        };

        const ps = [...state.players];
        ps[playerIndex] = { ...ps[playerIndex], officers: updatedOfficers };
        set({ players: ps });

        const engineerName = getOfficerById(player.officers.find(o => o.station === 'engineering')?.officerId ?? '')?.name ?? 'Engineering';
        const targetOfficerName = getOfficerById(targetOfficer.officerId)?.name ?? targetOfficer.station.toUpperCase();
        get().addLog('stress', `${engineerName} used Steady Nerves on ${targetOfficerName} (-1 Stress).`);
        break;
      }
      case 'target-lock': {
        const targetId = action.targetShipId || context?.targetShipId;
        if (!targetId) break;
        const allTargets = [...state.enemyShips, ...state.playerShips];
        const target = allTargets.find(s => s.id === targetId);
        if (!target) break;

        const officer = player.officers.find(o => o.station === action.station);
        const officerData = officer ? getOfficerById(officer.officerId) : null;
        const hasAnalysisParalysis = officer?.traumas.some(t => t.id === 'analysis-paralysis');
        const hasEagleEye = officerData?.traitName === 'Eagle Eye';
        const procResult = officer ? rollOfficerSkillProc(officer.currentTier) : null;
        
        const baseLockValue = hasEagleEye ? -2 : -1;
        const improvedLockValue = hasEagleEye ? -3 : -2;
        let lockValue = baseLockValue;
        let rerollValue = 0;
        let armorPiercingShots = 0;

        if (hasAnalysisParalysis) {
          lockValue = 0;
          rerollValue = 1;
        } else if (procResult?.isSuccess) {
          lockValue = improvedLockValue;
          if (procResult.isCritical) {
            armorPiercingShots = 1;
          }
        }
        
        const targetUpdates: Partial<ShipState & EnemyShipState> = {};
        if (lockValue < 0) {
          targetUpdates.targetLocks = [...(target.targetLocks || []), lockValue];
        }
        if (rerollValue > 0) {
          targetUpdates.targetLocksRerolls = (target.targetLocksRerolls || 0) + rerollValue;
        }
        if (armorPiercingShots > 0) {
          targetUpdates.targetLockArmorPiercingShots = (target.targetLockArmorPiercingShots || 0) + armorPiercingShots;
        }

        if (state.enemyShips.some(s => s.id === target.id)) {
          get().updateEnemyShip(target.id, targetUpdates);
        } else {
          get().updatePlayerShip(target.id, targetUpdates);
        }
        
        const logMsg = hasAnalysisParalysis 
          ? `${ship.name} acquired Target Lock on ${target.name} (1 Reroll granted instead of TN modifier due to Analysis Paralysis).`
          : `${ship.name} acquired Target Lock on ${target.name} (${lockValue} TN).`;
        
        get().addLog('system', logMsg);
        if (procResult && !hasAnalysisParalysis) {
          const outcome = procResult.isCritical ? 'CRITICAL' : procResult.isSuccess ? 'SUCCESS' : 'FAIL';
          useUIStore.getState().queueModal('skill-proc', {
            data: {
              title: 'Target Painting',
              officerName: officerData?.name ?? 'Sensors',
              station: 'sensors',
              actionName: 'Target Lock',
              result: procResult,
              standardEffect: hasEagleEye
                ? 'Target Lock improves from -2 TN to -3 TN for the rest of the round due to Eagle Eye.'
                : 'Target Lock improves to -2 TN for the rest of the round.',
              failureEffect: `Base action resolves at ${baseLockValue} TN.`,
              criticalEffect: hasEagleEye
                ? 'Target Lock improves from -2 TN to -3 TN for the rest of the round, and the next volley gains [Armor Piercing].'
                : 'Target Lock improves to -2 TN for the rest of the round and the next volley gains [Armor Piercing].',
            },
          });
          get().addLog(
            'system',
            `Target Painting: ${officerData?.name ?? 'Sensors'} rolled ${procResult.roll} on ${procResult.dieType.toUpperCase()} (${outcome}).`,
          );
          if (procResult.isCritical) {
            get().addLog('system', `Target Painting: ${target.name} is marked for one [Armor Piercing] volley.`);
          }
        }
        break;
      }
      case 'reinforce-shields': {
        const officer = player.officers.find(o => o.station === action.station);
        const officerData = officer ? getOfficerById(officer.officerId) : null;
        const sector = context?.sector;
        if (!sector) break;

        let amount = 2;
        if (officerData?.traitName === 'Deflector Specialist' && (sector === 'fore' || sector === 'aft')) {
          amount = 3;
        }
        const newShields = { ...ship.shields } as Record<string, number>;
        newShields[sector] = Math.min(ship.maxShieldsPerSector, (newShields[sector] ?? 0) + amount);
        updates.shields = newShields as unknown as typeof ship.shields;
        get().addLog('system', `${officerData?.name ?? 'Engineering'} reinforced ${sector.toUpperCase()} shields on ${get().getShipName(shipId)} (+${amount} ═   ${newShields[sector]})`);
        break;
      }
      case 'fire-primary': {
        const targetId = context?.targetShipId;
        const targetHex = context?.targetHex;
        let initialTarget = targetId ? (state.enemyShips.find(s => s.id === targetId) || state.playerShips.find(s => s.id === targetId)) : null;
        let tacticalOverrideConsumed = false;

        // Read weapon from context or fallback to first equipped
        const weaponIndex = context?.weaponIndex !== undefined 
          ? context.weaponIndex 
          : ship.equippedWeapons.findIndex(w => w !== null);

        if (ship.disabledWeaponIndices?.includes(weaponIndex)) {
          get().addLog('system', `Weapon system is damaged and cannot fire!`);
          break;
        }

        const weaponId = context?.weaponId || ship.equippedWeapons[weaponIndex];
        const baseWeapon = getWeaponById(weaponId || '');
        if (!baseWeapon) break;
        let weapon = getEffectiveWeaponForTech(baseWeapon, state.experimentalTech);
        if (hasScar(ship, 'shield-generator-offline')) {
          weapon = {
            ...weapon,
            rangeMax: Math.max(weapon.rangeMin, weapon.rangeMax - 1),
          };
        }

        // ─── Ordnance check: block firing if expended ─────────────────────────
        const isOrdnanceWeapon = weapon.tags?.includes('ordnance');
        const loadedStatus = ship.ordnanceLoadedStatus ?? {};
        if (isOrdnanceWeapon && loadedStatus[weaponIndex] === false) {
          get().addLog('system', `🚫 ${weapon.name} is not loaded — use Load Ordnance to prime it!`);
          break;
        }

        // ─── Auto-Loader check: block firing if loaded this round without Auto-Loader ───
        if (isOrdnanceWeapon && ship.ordnanceLoadedIndicesThisRound?.includes(weaponIndex)) {
          if (!ship.equippedSubsystems.includes('auto-loader')) {
            get().addLog('system', `🚫 ${weapon.name} was loaded this round and must cycle. You cannot fire it until next round (requires Auto-Loader Network)!`);
            break;
          }
        }

        const isAoE = weapon.tags?.includes('areaOfEffect');
        const centerHex = targetHex || initialTarget?.position;

        if (context?.discharge) {
          const allShips = [...state.playerShips, ...state.enemyShips].filter(s => s.id !== ship.id);
          const validTargets = getValidTargetsForWeapon(ship.position, ship.facing, weapon, allShips, state.terrainMap);
          if (validTargets.length === 0) {
            get().addLog('combat', `🌌 ${ship.name} discharged ${weapon.name} into deep space (no valid targets).`);
            updates.firedWeaponThisRound = true;
            if (isOrdnanceWeapon) {
              updates.ordnanceLoadedStatus = {
                ...(ship.ordnanceLoadedStatus ?? {}),
                [weaponIndex]: false,
              };
            }
            const currentFired = ship.firedWeaponIndicesThisRound || [];
            updates.firedWeaponIndicesThisRound = [...currentFired, weaponIndex];
            break; // Stop evaluating targets, action is resolved
          } else {
             get().addLog('system', `Cannot discharge weapon; valid targets exist.`);
             break;
          }
        }

        if (!isAoE && !initialTarget) break;
        if (isAoE && !centerHex) break;

        const currentFired = ship.firedWeaponIndicesThisRound || [];
        updates.firedWeaponIndicesThisRound = [...currentFired, weaponIndex];

        if (weapon.tags?.includes('torpedo') && initialTarget) {
          get().spawnTorpedo({
            id: `torpedo-${Date.now()}`,
            name: `${weapon.name}`,
            allegiance: 'allied',
            sourceShipId: shipId,
            targetShipId: initialTarget.id,
            position: ship.position,
            facing: ship.facing,
            currentHull: 1,
            maxHull: 1,
            speed: 4,
            baseEvasion: 5,
            isDestroyed: false,
            hasMoved: false,
          });
          get().addLog('combat', `🚀 ${ship.name} fired ${weapon.name} at ${initialTarget.name}! It enters the hex grid.`);
          updates.firedWeaponThisRound = true;
          break;
        }

        const tacOfficer = player.officers.find(o => o.station === 'tactical');
        const tacOfficerData = tacOfficer ? getOfficerById(tacOfficer.officerId) : null;
        const ignoreRangePenalty = chassis?.uniqueTraitName === 'Advanced Telemetry';

        // ─── RoE: "Rigid Firing Lines" — Forward 180° only ─────────────────
        const fireRoE = state.activeRoE;
        const canTacticalOverride = state.tacticalOverrideShipIds.includes(ship.id);
        if (fireRoE?.mechanicalEffect.shieldTargetBanRounds !== undefined && initialTarget && state.round <= fireRoE.mechanicalEffect.shieldTargetBanRounds) {
          const hasShields = Object.values(initialTarget.shields).some(v => v > 0);
          if (hasShields) {
            if (canTacticalOverride) {
              tacticalOverrideConsumed = true;
              get().addLog('roe', `Fleet Asset: Tactical Override bypassed Live-Fire Telemetry for ${ship.name}.`);
            } else {
              get().addLog('roe', `🚫 LIVE-FIRE TELEMETRY: ${ship.name} cannot target ${initialTarget.name} until Round ${fireRoE.mechanicalEffect.shieldTargetBanRounds + 1}.`);
              break;
            }
          }
        }
        if (fireRoE?.mechanicalEffect.forwardArcOnly && initialTarget) {
          const forwardArcs: import('../types/game').ShipArc[] = ['fore', 'forePort', 'foreStarboard'];
          if (!isInFiringArc(ship.position, ship.facing, initialTarget.position, forwardArcs)) {
            if (canTacticalOverride && !tacticalOverrideConsumed) {
              tacticalOverrideConsumed = true;
              get().addLog('roe', `Fleet Asset: Tactical Override bypassed Rigid Firing Lines for ${ship.name}.`);
            } else {
              get().addLog('roe', `🚫 RIGID FIRING LINES: ${ship.name} cannot fire on ${initialTarget.name} — target is outside the Forward 180° arc!`);
              break;
            }
          }
        }

        let targetsToEvaluate: Array<{
          id: string;
          target: ShipState | EnemyShipState | FighterToken;
          isEnemy: boolean;
          isFighter?: boolean;
          isMarker?: boolean;
        }> = [];
        let targetingPackages = [...state.targetingPackages];
        let tachyonMatrixUsed = state.tachyonMatrixUsedThisScenario;
        
        if (isAoE && centerHex) {
            const blastHexes = [centerHex, ...hexNeighbors(centerHex)];
            state.playerShips.forEach(s => {
                if (!s.isDestroyed && blastHexes.some(h => hexEquals(h, s.position))) {
                    targetsToEvaluate.push({ id: s.id, target: s, isEnemy: false });
                }
            });
            state.enemyShips.forEach(s => {
                if (!s.isDestroyed && blastHexes.some(h => hexEquals(h, s.position))) {
                    targetsToEvaluate.push({ id: s.id, target: s, isEnemy: true });
                }
            });
            state.fighterTokens.forEach(f => {
                if (!f.isDestroyed && blastHexes.some(h => hexEquals(h, f.position))) {
                    targetsToEvaluate.push({ id: f.id, target: f, isEnemy: f.allegiance !== 'allied', isFighter: true });
                }
            });
        } else if (targetId) {
            const isEnemy = state.enemyShips.some(s => s.id === targetId);
            const marker = state.objectiveMarkers.find(m => m.name === targetId);
            if (marker) {
                targetsToEvaluate.push({ id: marker.name, target: marker as any, isEnemy: true, isMarker: true } as any);
            } else if (initialTarget) {
                targetsToEvaluate.push({ id: initialTarget.id, target: initialTarget, isEnemy });
            }
        }

        const allDamageResults: any[] = [];
        let usedSurgicalStrike = false;
        let anyHullDamageThisAction = false; // for Overclocked Reactors crit trigger

        targetsToEvaluate.forEach(({ id, target, isEnemy, isMarker, isFighter }: any) => {
            let pool = assembleVolleyPool(weapon, tacOfficer!, false, ship.predictiveVolleyActive);
            if (hasScar(ship, 'targeting-array-damaged')) {
              const damagedDieIndex = pool.findIndex(die => typeof die !== 'string' && die.source === 'weapon');
              if (damagedDieIndex >= 0) {
                pool.splice(damagedDieIndex, 1);
              }
            }
            if (hasScar(ship, 'weapon-mount-warped') && !ship.firedWeaponThisRound) {
              const warpedMountDieIndex = pool.findIndex(die => typeof die !== 'string' && die.source === 'weapon');
              if (warpedMountDieIndex >= 0) {
                pool.splice(warpedMountDieIndex, 1);
                get().addLog('system', `[Scar] Warped Cannon Mount: ${weapon.name} lost 1 weapon die on its first shot this round.`);
              }
            }
            
            const targetMaxHull = isMarker 
                ? (target as ObjectiveMarkerState).maxHull
                : (isEnemy
                    ? getAdversaryById((target as EnemyShipState).adversaryId)?.hull || 0
                    : (target as ShipState).maxHull);
            
            if (tacOfficerData?.traitName === 'Bloodlust' && target.currentHull <= targetMaxHull / 2) {
                pool.push({ type: 'd6', source: 'trait' });
            }

            if (isFighter) {
                const fighterTarget = target as FighterToken;
                const flakResult = resolveFlakAgainstFighter(weapon, fighterTarget, pool);

                if (flakResult.destroyed) {
                    set(s => ({
                        fighterTokens: s.fighterTokens.map(f =>
                            f.id === fighterTarget.id ? { ...f, currentHull: 0, isDestroyed: true } : f
                        ),
                    }));

                    if (fighterTarget.allegiance === 'enemy') {
                        const currentState = get();
                        const newCount = currentState.smallShipsDestroyedThisMission + 1;
                        set({ smallShipsDestroyedThisMission: newCount });
                        if (newCount % 2 !== 0) {
                            get().adjustFleetFavor(1);
                            get().addLog('system', `☠ ${fighterTarget.name} destroyed ═  High Command is pleased (+1 Fleet Favor)`);
                        } else {
                            get().addLog('system', `☠ ${fighterTarget.name} destroyed`);
                        }
                    }
                }

                let flakMsg = `═a  ${tacOfficerData?.name ?? 'Tactical'}: ${weapon.name} ═   ${fighterTarget.name} | TN ${flakResult.targetNumber} | ${flakResult.hits} hit${flakResult.hits !== 1 ? 's' : ''}`;
                flakMsg += flakResult.destroyed ? ` | DESTROYED | Rolls [${flakResult.rolls.join(', ')}]` : ` | MISS | Rolls [${flakResult.rolls.join(', ')}]`;
                get().addLog('combat', flakMsg);

                return;
            }

            const losCheck = checkLineOfSight(ship.position, target.position, state.terrainMap);
            if (!losCheck.clear) {
                get().addLog('combat',
                    `║  ${get().getShipName(shipId)}: ${weapon.name} ═  LoS BLOCKED by asteroid at (${losCheck.blockedBy!.q},${losCheck.blockedBy!.r}). No effect for ${target.name}.`
                );
                return;
            }

            const targetTerrain = state.terrainMap.get(hexKey(target.position));
            const adversaryData = isEnemy && !isMarker ? getAdversaryById((target as EnemyShipState).adversaryId) : null;
            let targetEvasion = isMarker ? 0 : (adversaryData 
                ? adversaryData.baseEvasion + ((target as EnemyShipState).evasionModifiers ?? 0)
                : (target as ShipState).baseEvasion + ((target as ShipState).evasionModifiers ?? 0));
            if (isEnemy && !isMarker && state.exposedEnemyShipId === target.id) {
                targetEvasion -= 1;
            }
              
            if (!isEnemy && !isMarker) {
                const isAdjacentPaladin = state.playerShips.some(s => {
                    if (s.id === target.id || s.isDestroyed) return false;
                    if (hexDistance(s.position, target.position) === 1) {
                        const c = getChassisById(s.chassisId);
                        return c?.uniqueTraitName === 'Bulwark';
                    }
                    return false;
                });
                if (isAdjacentPaladin) targetEvasion += 1;

                const isFleetComms = state.players.some(p => {
                    const s = state.playerShips.find(sh => sh.id === p.shipId);
                    if (!s || s.isDestroyed || hexDistance(s.position, target.position) > 2) return false;
                    const chatter = p.officers.find(o => o.station === 'sensors');
                    if (chatter && getOfficerById(chatter.officerId)?.traitName === 'Fleet Comms' && chatter.currentStress === 0) return true;
                    return false;
                });
                if (isFleetComms) targetEvasion += 1;
            }

            const targetArmorDie = isMarker ? 'd4' : (adversaryData ? adversaryData.armorDie : (target as ShipState).armorDie) || 'd4';
            let targetLockModifier = 0;
            const finalTargetLocks = [...((target as any).targetLocks || [])];
            if (finalTargetLocks.length > 0) {
                targetLockModifier = finalTargetLocks[0]!;
            }
            const targetLockRerolls = isMarker ? 0 : (target as any).targetLocksRerolls || 0;
            const targetLockArmorPiercingShots = isMarker ? 0 : (target as any).targetLockArmorPiercingShots || 0;
            const targetPaintingArmorPiercing = targetLockArmorPiercingShots > 0;
            const hadTargetLockBeforeAttack = finalTargetLocks.length > 0 || targetLockModifier !== 0 || targetLockRerolls > 0 || targetLockArmorPiercingShots > 0;
            const targetingPackageIndex = targetingPackages.findIndex(pkg => pkg.attackerShipId === ship.id && pkg.targetShipId === target.id);
            const targetingPackage = targetingPackageIndex !== -1 ? targetingPackages[targetingPackageIndex] : null;
            if (targetingPackage?.mode === 'tn') {
              targetLockModifier -= 1;
            }
            const bonusTargetRerolls = targetingPackage?.mode === 'reroll' ? 1 : 0;
            const bonusHitPackage = targetingPackage?.mode === 'bonusHit';

            let surgicalStrike = false;
            if (tacOfficerData?.traitName === 'Surgical Strike' && !tacOfficer?.usedSurgicalStrikeThisRound && !usedSurgicalStrike) {
                surgicalStrike = true;
            }
            const tachyonStrike = canUseTachyonMatrix(tachyonMatrixUsed, state.experimentalTech);

            const evasiveManeuvers = isMarker ? 0 : (target as ShipState).evasiveManeuvers ?? 0;

            const targetSize = isFighter
                ? ShipSize.Fighter
                : isEnemy && !isMarker
                    ? getAdversaryById((target as EnemyShipState).adversaryId)?.size
                    : (!isMarker ? getChassisById((target as ShipState).chassisId)?.size : undefined);

            const damageResult = resolveAttack(
                ship.position, ship.facing,
                target.position, 
                (target as any).facing ?? 0, 
                isMarker ? 3 : targetEvasion,
                isMarker ? {
                    fore: (target as ObjectiveMarkerState).shieldsPerSector, foreStarboard: (target as ObjectiveMarkerState).shieldsPerSector,
                    aftStarboard: (target as ObjectiveMarkerState).shieldsPerSector, aft: (target as ObjectiveMarkerState).shieldsPerSector,
                    aftPort: (target as ObjectiveMarkerState).shieldsPerSector, forePort: (target as ObjectiveMarkerState).shieldsPerSector,
                } : (target as any).shields,
                isMarker ? 'd4' : targetArmorDie,
                target.currentHull ?? (target as any).hull,
                targetMaxHull,
                isMarker ? false : (target as any).hasDroppedBelow50,
                weapon,
                pool,
                targetTerrain,
                isMarker ? 0 : evasiveManeuvers,
                targetLockModifier,
                isMarker ? false : (target as any).armorDisabled,
                weapon.tags?.includes('shieldBreaker'),
                targetPaintingArmorPiercing,
                ignoreRangePenalty,
                targetSize,
                surgicalStrike,
                tachyonStrike,
                isMarker ? false : (target as any).pdcDisabled,
                targetLockRerolls + bonusTargetRerolls,
                ship.isJammed || false,
                canRerollVoidGlass(1, state.experimentalTech),
                state.currentTactic?.mechanicalEffect.critThresholdOverride,
                false, // upgradeOneDie handled in assembleVolleyPool
                ship.spoofedFireControlActive || false
            );
            if (targetingPackageIndex !== -1) {
              targetingPackages.splice(targetingPackageIndex, 1);
            }

            if (tachyonStrike && damageResult.volleyResult.totalStandardHits > 0) {
              tachyonMatrixUsed = true;
              set({ tachyonMatrixUsedThisScenario: true });
              get().addLog('system', 'Experimental Tech: Tachyon Targeting Matrix converted a standard hit into a critical hit.');
            }

            if (surgicalStrike && damageResult.volleyResult.totalHits > damageResult.volleyResult.totalCrits - (surgicalStrike ? 1 : 0)) {
                usedSurgicalStrike = true;
            }

            const isAoEWeapon = weapon.tags?.includes('areaOfEffect');
            const isPiercing = weapon.tags?.includes('armorPiercing');
            let finalHullDamage = damageResult.hullDamage;
            let bonusShieldDamage = 0;
            if (fireRoE?.mechanicalEffect.aoePiercingBonusDamage && (isAoEWeapon || isPiercing) && damageResult.hullDamage > 0) {
                finalHullDamage += fireRoE.mechanicalEffect.aoePiercingBonusDamage;
                get().addLog('roe', `💥 COLLATERAL DAMAGE APPROVED: +${fireRoE.mechanicalEffect.aoePiercingBonusDamage} hull damage from ${weapon.name}!`);
            }
            if (bonusHitPackage && hadTargetLockBeforeAttack && damageResult.volleyResult.totalHits > 0) {
                if (!damageResult.ionNebulaActive && damageResult.shieldRemaining > 0) {
                    bonusShieldDamage = 1;
                    damageResult.shieldRemaining = Math.max(0, damageResult.shieldRemaining - 1);
                } else {
                    finalHullDamage += 1;
                }
                get().addLog('system', `Fleet Asset: Targeting Package added an extra hit on ${target.name}.`);
            }

            if (fireRoE?.mechanicalEffect.stressOnWhiff && damageResult.volleyResult.totalHits === 0 && !damageResult.outOfArc) {
                const tacStress = fireRoE.mechanicalEffect.stressOnWhiff;
                const tacOfficerIdx = player.officers.findIndex(o => o.station === 'tactical');
                if (tacOfficerIdx !== -1) {
                    const tacOff = player.officers[tacOfficerIdx];
                    const tacOffData = getOfficerById(tacOff.officerId);
                    const { newStress: whiffStress } = applyStress(tacOff, tacOffData!, tacStress);
                    const updOfficers = [...player.officers];
                    updOfficers[tacOfficerIdx] = { ...tacOff, currentStress: whiffStress };
                    const ps = [...state.players];
                    ps[playerIndex] = { ...ps[playerIndex], officers: updOfficers };
                    set({ players: ps });
                    get().addLog('roe', `📦 AMMO CONSERVATION: ${tacOffData?.name ?? 'Tactical'} suffers +${tacStress} Stress — wasted ordnance! (${whiffStress} total)`);
                }
            }

            if (fireRoE?.mechanicalEffect.missedShotFriendlyFire && damageResult.volleyResult.totalHits === 0 && isEnemy && !isMarker && !damageResult.outOfArc) {
                const allies = get().playerShips.filter(s => !s.isDestroyed && s.id !== shipId);
                let closestAlly: ShipState | null = null;
                let closestDist = Infinity;
                for (const ally of allies) {
                    const losResult = checkLineOfSight(ship.position, ally.position, state.terrainMap);
                    if (!losResult.clear) continue;
                    const d = hexDistance(ship.position, ally.position);
                    if (d < closestDist) { closestDist = d; closestAlly = ally; }
                }
                if (closestAlly) {
                    const ffDmg = 1;
                    const newHull = Math.max(0, closestAlly.currentHull - ffDmg);
                    get().updatePlayerShip(closestAlly.id, { currentHull: newHull, isDestroyed: newHull === 0 });
                    get().addLog('roe', `💥 COLLATERAL DAMAGE APPROVED: Missed shot hits ${closestAlly.name}! (-${ffDmg} hull, friendly fire!)`);
                }
            }

            if (isMarker) {
                const newHull = Math.max(0, ((target as ObjectiveMarkerState).hull) - finalHullDamage);
                get().updateObjectiveMarker((target as ObjectiveMarkerState).name, {
                    hull: newHull,
                    isDestroyed: newHull === 0,
                    shieldsPerSector: damageResult.shieldRemaining,
                });
            } else {
                const targetUpdates: Partial<EnemyShipState & ShipState> = {
                    shields: { ...target.shields, [damageResult.struckSector]: damageResult.shieldRemaining },
                    currentHull: Math.max(0, (target as any).currentHull - finalHullDamage),
                    targetLocks: finalTargetLocks,
                    targetLocksRerolls: targetLockRerolls,
                    targetLockArmorPiercingShots: Math.max(0, targetLockArmorPiercingShots - (targetPaintingArmorPiercing ? 1 : 0)),
                };
                if (targetUpdates.currentHull === 0) targetUpdates.isDestroyed = true;

                if (isEnemy) {
                    get().updateEnemyShip(target.id, targetUpdates);
                    
                    if (damageResult.criticalTriggered && !targetUpdates.isDestroyed) {
                        const { card: critCard, remainingDeck: newDeck } = drawCriticalCard(get().enemyCritDeck, 'enemy');
                        set({ enemyCritDeck: newDeck });
                        const currentEnemy = (target as EnemyShipState);
                        get().updateEnemyShip(target.id, {
                            criticalDamage: [...currentEnemy.criticalDamage, critCard],
                            hasDroppedBelow50: (target as any).currentHull > targetMaxHull / 2 && (targetUpdates.currentHull ?? 0) <= targetMaxHull / 2
                        });
                        get().addLog('critical', `══& CRITICAL HIT! ${target.name} suffered: ${critCard.name}!`);
                        useUIStore.getState().queueModal('critical', { card: critCard });
                    }
                } else {
                    get().updatePlayerShip(target.id, targetUpdates);
                }

                if (isEnemy && targetUpdates.isDestroyed) {
                    const enemySize = getAdversaryById((target as EnemyShipState).adversaryId)?.size;
                    if (enemySize) {
                      const shieldRestore = getKineticSiphonShieldRestore(enemySize, state.experimentalTech);
                      if (shieldRestore > 0) {
                        const attackerShip = get().playerShips.find(s => s.id === ship.id);
                        if (attackerShip) {
                          const restoredShields = { ...attackerShip.shields };
                          SHIELD_SECTORS.forEach(sector => {
                            restoredShields[sector] = Math.min(attackerShip.maxShieldsPerSector, restoredShields[sector] + shieldRestore);
                          });
                          get().updatePlayerShip(attackerShip.id, { shields: restoredShields });
                          get().addLog('system', `Experimental Tech: Kinetic Siphon restored ${shieldRestore} shield to every sector on ${attackerShip.name}.`);
                        }
                      }
                    }
                }

                if (targetUpdates.isDestroyed && !isEnemy) {
                    const destroyedFFOverride = fireRoE?.mechanicalEffect.destroyedShipFFOverride;
                    if (destroyedFFOverride !== undefined) {
                        get().adjustFleetFavor(destroyedFFOverride);
                        get().addLog('roe', `☠ ACCEPTABLE LOSSES: ${target.name} destroyed — ${destroyedFFOverride >= 0 ? '+' : ''}${destroyedFFOverride} FF (High Command notes the sacrifice).`);
                    } else {
                        get().adjustFleetFavor(-3);
                        get().addLog('roe', `☠ ${target.name} destroyed — -3 Fleet Favor.`);
                    }
                }
            }

            const tacOfficerName = tacOfficerData?.name ?? 'Tactical';
            if (damageResult.outOfArc) {
                get().addLog('combat',
                    `═a  ${tacOfficerName}: ${weapon.name} ═   ${target.name} [OUT OF ARC ═  no effect]`,
                    { damageResult }
                );
            } else if (damageResult.outOfRange) {
                get().addLog('combat',
                    `═a  ${tacOfficerName}: ${weapon.name} ═   ${target.name} [OUT OF RANGE ═  no effect]`,
                    { damageResult }
                );
            } else {
                const tn = damageResult.tnBreakdown.total;
                const hits = damageResult.volleyResult.totalHits;
                const crits = damageResult.volleyResult.totalCrits;
                const shieldDmg = damageResult.shieldHits;
                const hullDmg = finalHullDamage;
                let combatMsg = `═a  ${tacOfficerName}: ${weapon.name} ═   ${target.name} | TN ${tn} | ${hits} hit${hits !== 1 ? 's' : ''}`;
                if (crits > 0)    combatMsg += ` (${crits}══&)`;
                if (damageResult.ionNebulaActive) combatMsg += ` | ⚡ ION NEBULA — shields bypassed`;
                if (targetPaintingArmorPiercing) combatMsg += ` | TARGET PAINTED — ARMOR PIERCING`;
                if (shieldDmg + bonusShieldDamage > 0) combatMsg += ` | -${shieldDmg + bonusShieldDamage} ${damageResult.struckSector.toUpperCase()} shield`;
                if (hullDmg > 0)   combatMsg += ` | -${hullDmg} hull`;
                if (hullDmg === 0 && shieldDmg === 0) combatMsg += ` | ABSORBED`;
                if (damageResult.criticalTriggered) combatMsg += ` | ══& CRITICAL!`;
                get().addLog('combat', combatMsg, { damageResult });
            }

            allDamageResults.push({
                damageResult,
                defenderId: target.id,
                defenderName: target.name,
                outOfArc: damageResult.outOfArc ?? false,
                outOfRange: damageResult.outOfRange ?? false,
            });
        });

        if (ship.spoofedFireControlActive || (get().playerShips.find(s => s.id === shipId)?.spoofedFireControlActive)) {
            updates.spoofedFireControlActive = false;
        }

        if (tacticalOverrideConsumed) {
          set(s => ({ tacticalOverrideShipIds: s.tacticalOverrideShipIds.filter(id => id !== ship.id) }));
        }
        if (targetingPackages.length !== state.targetingPackages.length) {
          set({ targetingPackages });
        }

        const neuralLinkBonusCt = getNeuralLinkCT(action.stressCost, state.experimentalTech);
        if (neuralLinkBonusCt > 0) {
          set(s => {
            const updatedPlayers = [...s.players];
            updatedPlayers[playerIndex] = {
              ...updatedPlayers[playerIndex],
              commandTokens: updatedPlayers[playerIndex].commandTokens + neuralLinkBonusCt,
            };
            return { players: updatedPlayers };
          });
          get().addLog('system', `Experimental Tech: Neural Link Uplink granted +${neuralLinkBonusCt} CT to ${player.name}.`);
        }

        if (fireRoE?.mechanicalEffect.hullDamageTriggersCrit) {
            allDamageResults.forEach(({ damageResult, defenderId, defenderName, outOfArc }: any) => {
                if (!outOfArc && damageResult.hullDamage > 0) {
                    const affectedPlayerShip = get().playerShips.find(s => s.id === defenderId);
                    if (affectedPlayerShip) {
                        const { card: critCard } = (() => {
                            const deck = get().playerCritDeck;
                            if (deck.length === 0) {
                                const fresh = createShuffledPlayerCritDeck();
                                return { card: fresh[0] };
                            }
                            return { card: deck[0] };
                        })();
                        get().updatePlayerShip(affectedPlayerShip.id, {
                            criticalDamage: [...affectedPlayerShip.criticalDamage, { ...critCard, isRepaired: false }],
                        });
                        set({ playerCritDeck: get().playerCritDeck.slice(1) });
                        get().addLog('roe', `⚡ OVERCLOCKED REACTORS: ${defenderName} took hull damage — forced Critical Draw! [${critCard.name}]`);
                        useUIStore.getState().queueModal('critical', { card: critCard });
                    }
                }
            });
        }

        if (usedSurgicalStrike) {
            const updatedOfficers = [...player.officers];
            const tacIdx = updatedOfficers.findIndex(o => o.station === 'tactical');
            if (tacIdx !== -1) {
                updatedOfficers[tacIdx] = { ...updatedOfficers[tacIdx], usedSurgicalStrikeThisRound: true };
                const ps = [...state.players];
                const p = { ...ps[playerIndex], officers: updatedOfficers };
                ps[playerIndex] = p;
                set({ players: ps });
            }
        }

        updates.firedWeaponThisRound = true;
        if (ship.predictiveVolleyActive || (get().playerShips.find(s => s.id === shipId)?.predictiveVolleyActive)) {
            updates.predictiveVolleyActive = false;
        }

        // ─── Ordnance side-effect: mark weapon as expended ───────────────────
        if (weapon.tags?.includes('ordnance')) {
          updates.ordnanceLoadedStatus = {
            ...(ship.ordnanceLoadedStatus ?? {}),
            [weaponIndex]: false,
          };
          get().addLog('system', `⚠ ${weapon.name} expended — Load Ordnance to fire again.`);
        }

        if (allDamageResults.length > 0) {
            useUIStore.getState().showModal('volley', { 
                results: allDamageResults, 
                attackerId: ship.id, 
                weaponName: weapon.name,
            });
        }
        
        break;
      }

      case 'damage-control': {
        const targetId = context?.targetShipId || shipId;
        const target = state.playerShips.find(s => s.id === targetId);
        if (!target) break;

        const dcOfficer = player.officers.find(o => o.station === action.station);
        const dcOfficerData = dcOfficer ? getOfficerById(dcOfficer.officerId) : null;
        const dcName = dcOfficerData?.name ?? 'Engineering';
        const procResult = dcOfficer && !context?.clearCritId ? rollOfficerSkillProc(dcOfficer.currentTier) : null;

        const targetUpdates: Partial<ShipState> = {};
        if (context?.clearCritId) {
          const critCard = target.criticalDamage.find(c => c.id === context.clearCritId);
          const roll = rollDie('d6');
          if (roll >= 4) {
            targetUpdates.criticalDamage = target.criticalDamage.filter(c => c.id !== context.clearCritId);
            get().addLog('repair', `═x ═ ${dcName}: Repaired "${critCard?.name ?? context.clearCritId}" on ${target.name} (d6 roll: ${roll} ═S )`);
          } else {
            get().addLog('repair', `═x ═ ${dcName}: Repair FAILED for "${critCard?.name ?? context.clearCritId}" on ${target.name} (d6 roll: ${roll} ═S )`, { roll, needed: 4 });
          }
        } else {
          const hullRepairAmount = procResult?.isSuccess ? 2 : 1;
          targetUpdates.currentHull = Math.min(target.maxHull, target.currentHull + hullRepairAmount);
          get().addLog('repair', `═x ═ ${dcName}: Repaired 1 hull on ${target.name} (${target.currentHull} ═   ${targetUpdates.currentHull}/${target.maxHull})`);
        }
        
        if (!context?.clearCritId) {
          const hullRepairAmount = procResult?.isSuccess ? 2 : 1;
          if (procResult) {
            useUIStore.getState().queueModal('skill-proc', {
              data: {
                title: 'Miracle Work',
                officerName: dcName,
                station: 'engineering',
                actionName: 'Damage Control',
                result: procResult,
                standardEffect: 'Repair 2 Hull instead of 1.',
                failureEffect: 'Base action resolves at 1 Hull repaired.',
                criticalEffect: 'Repair 2 Hull and gain +1 Command Token immediately.',
              },
            });
          }
          if (procResult?.isSuccess) {
            get().addLog('repair', `Miracle Work boosted ${dcName}'s hull repair to ${hullRepairAmount}.`);
          }
          if (procResult) {
            const outcome = procResult.isCritical ? 'CRITICAL' : procResult.isSuccess ? 'SUCCESS' : 'FAIL';
            get().addLog(
              'system',
              `Miracle Work: ${dcName} rolled ${procResult.roll} on ${procResult.dieType.toUpperCase()} (${outcome}).`,
            );
          }
          if (procResult?.isCritical) {
            const ps = [...state.players];
            const p = { ...ps[playerIndex] };
            p.commandTokens += 1;
            ps[playerIndex] = p;
            set({ players: ps });
            get().addLog('system', `Miracle Work: ${dcName} optimized the power grid and gained +1 CT.`);
          }
        }

        if (targetId === shipId) {
          Object.assign(updates, targetUpdates);
        } else {
          get().updatePlayerShip(targetId, targetUpdates);
        }
        break;
      }
      case 'cyber-warfare': {
        const targetId = context?.targetShipId;
        const target = state.enemyShips.find(s => s.id === targetId) || state.playerShips.find(s => s.id === targetId);
        const sector = context?.sector;
        if (!target || !sector) break;

        const cwOfficer = player.officers.find(o => o.station === action.station);
        const cwOfficerData = cwOfficer ? getOfficerById(cwOfficer.officerId) : null;
        const prevShield = target.shields[sector as keyof typeof target.shields];
        if (prevShield <= 0) {
          get().addLog(
            'system',
            `${cwOfficerData?.name ?? 'Sensors'}: Cyber Warfare failed - ${target.name} has no active ${sector.toUpperCase()} shields.`,
          );
          break;
        }

        const targetUpdates: Partial<ShipState & EnemyShipState> = {
          shields: { ...target.shields, [sector]: 0 }
        };

        if (state.enemyShips.some(s => s.id === target.id)) {
          get().updateEnemyShip(target.id, targetUpdates);
        } else {
          get().updatePlayerShip(target.id, targetUpdates);
        }
        
        get().addLog('system',
          `${cwOfficerData?.name ?? 'Sensors'}: Cyber Warfare ═  ${sector.toUpperCase()} shields on ${target.name} stripped (was ${prevShield})`);
        break;
      }
      case 'load-ordinance': {
        // Identify which ordnance weapon slot to reload.
        // Prefer an explicit weaponIndex from context (player picked one),
        // otherwise auto-find the first unloaded ordnance slot.
        let reloadIndex = context?.weaponIndex as number | undefined;
        if (reloadIndex === undefined) {
          reloadIndex = ship.equippedWeapons.findIndex((wId, idx) => {
            if (!wId) return false;
            const w = getWeaponById(wId);
            return w?.tags?.includes('ordnance') && (ship.ordnanceLoadedStatus ?? {})[idx] === false;
          });
        }

        if (reloadIndex === undefined || reloadIndex < 0) {
          get().addLog('system', `Load Ordnance: no unloaded [Ordnance] weapon found.`);
          break;
        }

        const reloadWeaponId = ship.equippedWeapons[reloadIndex];
        const reloadWeapon = reloadWeaponId ? getWeaponById(reloadWeaponId) : null;

        if (!reloadWeapon?.tags?.includes('ordnance')) {
          get().addLog('system', `Load Ordnance: weapon in slot ${reloadIndex} is not an [Ordnance] weapon.`);
          break;
        }
        if ((ship.ordnanceLoadedStatus ?? {})[reloadIndex] !== false) {
          get().addLog('system', `Load Ordnance: ${reloadWeapon.name} is already loaded.`);
          break;
        }

        updates.ordnanceLoadedStatus = {
          ...(ship.ordnanceLoadedStatus ?? {}),
          [reloadIndex]: true,
        };
        updates.ordnanceLoadedIndicesThisRound = [
          ...(ship.ordnanceLoadedIndicesThisRound ?? []),
          reloadIndex,
        ];
        get().addLog('system', `🔄 ${reloadWeapon.name} reloaded and primed — ready to fire!`);
        break;
      }
      case 'reinforced-bulkheads': {
        const upgradeDie = (d: string) => d === 'd4' ? 'd6' : d === 'd6' ? 'd8' : d === 'd8' ? 'd10' : d === 'd10' ? 'd12' : 'd20';
        updates.armorDie = upgradeDie(ship.armorDie) as any;
        get().addLog('system', `Polarize Plating active on ${ship.name}   Armor upgraded to ${updates.armorDie}!`);
        break;
      }
      case 'alien-phase-vanes': {
        const targetHex = context?.targetHex as HexCoord | undefined;
        if (targetHex) {
          updates.position = targetHex;
          updates.evasionModifiers = (ship.evasionModifiers ?? 0) + 1;
          get().addLog('system', `🌀 ${ship.name} phased to (${targetHex.q},${targetHex.r}) — Evasion increased!`);
        }
        break;
      }
      case 'ecm': {
        const targetId = context?.targetShipId;
        const target = state.enemyShips.find(s => s.id === targetId) || state.playerShips.find(s => s.id === targetId);
        if (target) {
          const dist = hexDistance(ship.position, target.position);
          if (dist < 1 || dist > 5) {
            get().addLog('system', `Active Jamming failed — target ${target.name} out of range (dist: ${dist}, req: 1-5).`);
          } else {
            if (state.enemyShips.some(s => s.id === target.id)) {
              get().updateEnemyShip(target.id, { isJammed: true });
            } else {
              get().updatePlayerShip(target.id, { isJammed: true });
            }
            get().addLog('system', `Active Jamming deployed from ${ship.name} against ${target.name}.`);
          }
        } else {
          get().addLog('system', `Active Jamming failed — no target found.`);
        }
        break;
      }
      case 'black-market-targeting-suite': {
        const targetId = context?.targetShipId;
        const target = state.playerShips.find(s => s.id === targetId) || state.enemyShips.find(s => s.id === targetId);
        if (target) {
          const dist = hexDistance(ship.position, target.position);
          if (dist > 4) {
            get().addLog('system', `Spoofed Fire Control failed — target ${target.name} out of range (dist: ${dist}, max: 4).`);
          } else {
            if (state.enemyShips.some(s => s.id === target.id)) {
              get().updateEnemyShip(target.id, { spoofedFireControlActive: true });
            } else {
              if (target.id === ship.id) {
                updates.spoofedFireControlActive = true;
              } else {
                get().updatePlayerShip(target.id, { spoofedFireControlActive: true });
              }
            }
            get().addLog('system', `Spoofed Fire Control from ${ship.name} active on ${target.name}. Next attack will be boosted.`);
          }
        } else {
          get().addLog('system', `Spoofed Fire Control failed — no target found.`);
        }
        break;
      }
      case 'medical-bay': {
        const nonEngOfficers = player.officers.filter(o => o.station !== 'engineering' && o.currentStress > 0);
        if (nonEngOfficers.length > 0) {
          nonEngOfficers.sort((a, b) => b.currentStress - a.currentStress);
          const targetOfficer = nonEngOfficers[0];
          
          const updatedOfficers = player.officers.map(o => 
            o.station === targetOfficer.station ? { ...o, currentStress: Math.max(0, o.currentStress - 2) } : o
          );
          
          const ps = [...state.players];
          ps[playerIndex] = { ...ps[playerIndex], officers: updatedOfficers };
          set({ players: ps });
          const officerData = getOfficerById(targetOfficer.officerId);
          get().addLog('repair', `Emergency Triage activated on ${ship.name}   ${officerData?.name || targetOfficer.station.toUpperCase()} recovered 2 Stress.`);
        } else {
          get().addLog('repair', `Emergency Triage activated on ${ship.name}   But no other officers had stress.`);
        }
        break;
      }
      case 'remote-disarm-drone-rig': {
        const targetId = action.targetShipId || context?.targetShipId;
        if (!targetId) break;

        const officer = player.officers.find(o => o.station === 'engineering');
        const officerData = officer ? getOfficerById(officer.officerId) : null;
        const procResult = officer ? rollOfficerSkillProc(officer.currentTier, 4) : null;
        const succeeded = !!procResult?.isSuccess;

        if (procResult) {
          const outcome = procResult.isCritical ? 'CRITICAL' : procResult.isSuccess ? 'SUCCESS' : 'FAIL';
          useUIStore.getState().queueModal('skill-proc', {
            data: {
              title: 'Remote Neutralization',
              officerName: officerData?.name ?? 'Engineering',
              station: 'engineering',
              actionName: 'Remote Neutralization',
              result: procResult,
              standardEffect: 'Hostile token removed from play.',
              failureEffect: 'Target remains in play.',
              criticalEffect: `Target removed from play and ${action.stressCost} Stress refunded.`,
            },
          });
          get().addLog(
            'system',
            `Remote Neutralization: ${officerData?.name ?? 'Engineering'} rolled ${procResult.roll} on ${procResult.dieType.toUpperCase()} (${outcome}).`,
          );
        }

        if (succeeded) {
          // Find and remove Mine
          const hazardIndex = state.tacticHazards.findIndex(h => h.id === targetId);
          if (hazardIndex !== -1) {
            const hazard = state.tacticHazards[hazardIndex];
            set(s => ({
              tacticHazards: s.tacticHazards.filter(h => h.id !== targetId),
            }));
            get().addLog('combat', `Remote Drone neutralized hostile Mine at (${hazard.position.q}, ${hazard.position.r}).`);
          } else {
            // Find and remove Torpedo
            const torpedoIndex = state.torpedoTokens.findIndex(t => t.id === targetId);
            if (torpedoIndex !== -1) {
              const torpedo = state.torpedoTokens[torpedoIndex];
              set(s => ({
                torpedoTokens: s.torpedoTokens.filter(t => t.id !== targetId),
              }));
              get().addLog('combat', `Remote Drone neutralized hostile Torpedo at (${torpedo.position.q}, ${torpedo.position.r}).`);
            } else {
              // Find and remove Hostile Fighter
              const fighterIndex = state.fighterTokens.findIndex(f => f.id === targetId && f.allegiance === 'enemy');
              if (fighterIndex !== -1) {
                const fighter = state.fighterTokens[fighterIndex];
                set(s => ({
                  fighterTokens: s.fighterTokens.map(f => f.id === targetId ? { ...f, isDestroyed: true, currentHull: 0 } : f),
                }));
                get().addLog('combat', `Remote Drone neutralized hostile Fighter ${fighter.name} at (${fighter.position.q}, ${fighter.position.r}).`);
              }
            }
          }

          if (procResult?.isCritical && officer) {
            const updatedOfficers = [...player.officers];
            const offIndex = updatedOfficers.findIndex(o => o.station === 'engineering');
            if (offIndex !== -1) {
              updatedOfficers[offIndex] = {
                ...updatedOfficers[offIndex],
                currentStress: Math.max(0, updatedOfficers[offIndex].currentStress - action.stressCost),
              };
              const ps = [...state.players];
              ps[playerIndex] = { ...ps[playerIndex], officers: updatedOfficers };
              set({ players: ps });
              get().addLog('stress', `Remote Neutralization: ${officerData?.name ?? 'Engineering'} refunded ${action.stressCost} Stress.`);
            }
          }
        } else {
          get().addLog('system', `Remote Neutralization: Target acquisition failed.`);
        }
        break;
      }
      case 'fighter-hangar': {
        // Two-phase deploy: deployHex from hex-targeting (phase 1), targetShipId from ship-targeting (phase 2).
        const deployHex = context?.deployHex as HexCoord | undefined;
        if (!deployHex) {
          get().addLog('system', `Fighter Hangar on ${ship.name} ready   select an adjacent hex to deploy.`);
          break;
        }
        // ─── Debris Field: fighters cannot enter ──────────────────────
        const deployTerrain = state.terrainMap.get(hexKey(deployHex));
        if (deployTerrain === 'debrisField') {
          get().addLog('system',
            `Cannot deploy fighter to (${deployHex.q},${deployHex.r}) ═  Debris Field blocks Small Craft!`);
          break;
        }
        const fighterCount = state.fighterTokens.filter(
          f => !f.isDestroyed && f.position.q === deployHex.q && f.position.r === deployHex.r
        ).length;
        if (fighterCount >= 3) {
          get().addLog('system', `Cannot deploy   hex (${deployHex.q},${deployHex.r}) is at stacking capacity.`);
          break;
        }
        const assignedTargetId: string | null = (context?.targetShipId as string) ?? null;
        const newFighter: FighterToken = {
          id: `allied-fighter-${ship.id}-${Date.now()}`,
          name: `Strike Group ${ship.id.split('-').pop()?.toUpperCase() ?? ''}${state.fighterTokens.filter(f => f.sourceShipId === ship.id).length + 1}`,
          allegiance: 'allied',
          sourceShipId: ship.id,
          position: deployHex,
          facing: ship.facing,
          currentHull: 1,
          maxHull: 1,
          speed: 4,
          baseEvasion: 5,
          volleyPool: ['d4', 'd4', 'd4'],
          weaponRange: 1,
          isDestroyed: false,
          hasDrifted: false,
          hasActed: false,
          assignedTargetId,
        };
        set(s => ({ fighterTokens: [...s.fighterTokens, newFighter] }));
        const targetLabel = assignedTargetId
          ? `targeting ${get().getShipName(assignedTargetId)}`
          : 'no target   use Vector Orders to assign';
        get().addLog('system', `Strike Fighter from ${ship.name} to (${deployHex.q},${deployHex.r}) | ${targetLabel}`);
        break;
      }
      case 'auxiliary-reactor': {
        updates.currentHull = Math.max(0, ship.currentHull - 1);
        if (updates.currentHull === 0) updates.isDestroyed = true;
        const ps = [...state.players];
        const p = { ...ps[playerIndex] };
        p.commandTokens += 4;
        ps[playerIndex] = p;
        set({ players: ps });
        get().addLog('damage', `Auxiliary Core Overcharged on ${ship.name}! +4 CT, -1 Hull.`);
        break;
      }
      case 'hermit-reactor-baffles': {
        const roundCtState = getRoundStartCtState({
          player,
          round: state.round,
          activeRoE: state.activeRoE,
          combatModifiers: state.combatModifiers,
          shipScars: ship.scars,
        });
        const updatedPlayers = [...state.players];
        const updatedPlayer = { ...updatedPlayers[playerIndex] };
        const engineeringIndex = updatedPlayer.officers.findIndex(o => o.station === 'engineering');

        if (engineeringIndex !== -1) {
          const updatedOfficers = [...updatedPlayer.officers];
          updatedOfficers[engineeringIndex] = {
            ...updatedOfficers[engineeringIndex],
            currentStress: Math.max(0, updatedOfficers[engineeringIndex].currentStress - 1),
          };
          updatedPlayer.officers = updatedOfficers;
        }

        updatedPlayer.commandTokens = Math.min(roundCtState.roundStartCt, updatedPlayer.commandTokens + 1);
        updatedPlayers[playerIndex] = updatedPlayer;
        set({ players: updatedPlayers });
        get().addLog('system', `${ship.name} bled reactor heat: Engineering recovered 1 Stress and restored 1 CT (up to round maximum).`);
        break;
      }
      case 'salvaged-ai-coprocessor': {
        const targetId = context?.targetShipId;
        const target = state.playerShips.find(s => s.id === targetId) || state.enemyShips.find(s => s.id === targetId);
        if (target) {
          const dist = hexDistance(ship.position, target.position);
          if (dist > 4) {
            get().addLog('system', `Predictive Volley failed — target ${target.name} out of range (dist: ${dist}, max: 4).`);
          } else {
            if (state.enemyShips.some(s => s.id === target.id)) {
              get().updateEnemyShip(target.id, { predictiveVolleyActive: true });
            } else {
              if (target.id === ship.id) {
                updates.predictiveVolleyActive = true;
              } else {
                get().updatePlayerShip(target.id, { predictiveVolleyActive: true });
              }
            }
            get().addLog('system', `Predictive Volley from ${ship.name} active on ${target.name}. Next attack will be upgraded.`);
          }
        } else {
          get().addLog('system', `Predictive Volley failed — no target found.`);
        }
        break;
      }
      case 'vector-orders': {
        // context.targetShipId set by HexMap ship-targeting click handler
        const targetId = context?.targetShipId;
        if (!targetId) {
          get().addLog('system', `Vector Orders issued from ${ship.name}   awaiting target designation.`);
          break;
        }
        // Assign all allied fighters sourced from this ship to the target
        set(s => ({
          fighterTokens: s.fighterTokens.map(f =>
            f.allegiance === 'allied' && f.sourceShipId === ship.id
              ? { ...f, assignedTargetId: targetId }
              : f
          ),
        }));
        const targetName = get().getShipName(targetId);
        get().addLog('system', `⬡ Vector Orders from ${ship.name}: fighters vectored to ${targetName}.`);
        break;
      }
      case 'jump-to-warp': {
        // Mark ship as warped out — removed from active board
        updates.warpedOut = true;
        const inZone = isInBreakoutZone(ship.position) || state.extractionWindowShipIds.includes(ship.id);
        set(s => ({
          warpedOutShipIds: [...s.warpedOutShipIds, ship.id],
          successfulEscapes: inZone ? s.successfulEscapes + 1 : s.successfulEscapes,
        }));
        if (inZone) {
          get().addLog('system', `🌀 ${ship.name} jumped to warp from the escape zone!`);
        } else {
          get().addLog('system', `🌀 ${ship.name} retreated to warp. (Did not count toward objective)`);
        }
        break;
      }
      case 'pickup-supply-crate': {
        const storeState = get();
        // Find an uncollected, undestroyed crate on the same hex
        const crate = storeState.objectiveMarkers.find(
          m =>
            !m.isCollected &&
            !m.isDestroyed &&
            m.name.startsWith('Supply Crate') &&
            m.position.q === ship.position.q &&
            m.position.r === ship.position.r,
        );
        if (!crate) {
          get().addLog('system', `🚫 No supply crate at this hex. Move to a crate position first.`);
          break;
        }
        get().updateObjectiveMarker(crate.name, { isCollected: true });
        const newCount = storeState.salvageCratesCollected + 1;
        set({ salvageCratesCollected: newCount });
        get().addLog('system', `📦 ${ship.name} collected ${crate.name}! Total crates: ${newCount}/3.`);
        if (newCount >= 3) {
          get().addLog('system', `🏆 3 crates secured! Jump to warp to complete the Salvage Run!`);
        }
        break;
      }
      default:
        get().addLog('system', `Resolved action: ${action.actionId}`);
    }


    if (Object.keys(updates).length > 0) {
      get().updatePlayerShip(shipId, updates);
    }
    
    // Mark action as resolved
    set(s => {
      const ps = [...s.players];
      const p = { ...ps[playerIndex] };
      const as = [...p.assignedActions];
      as[actionIndex] = { ...as[actionIndex], resolved: true };
      p.assignedActions = as;
      ps[playerIndex] = p;
      return { players: ps };
    });

    // Check for victory/defeat after player action
    get().checkGameOver();
  },

  resolveEnemyTurn: () => {
    const state = get();
    const currentStep = state.executionStep;
    if (!currentStep) return;

    const size = getShipSizeForStep(currentStep);
    
    // Filter to undrifted enemies of the appropriate size
    const actingEnemies = state.enemyShips.filter(enemy => {
      if (enemy.isDestroyed || enemy.hasDrifted) return false;
      const adversary = getAdversaryById(enemy.adversaryId);
      // 'fighter' sized EnemyShipStates act during the 'small' execution step
      if (size === ShipSize.Small && adversary?.size === ShipSize.Fighter) return true;
      return adversary?.size === size;
    });

    if (actingEnemies.length > 0) {
      const occupiedHexes = new Set<string>();
      state.playerShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
      state.enemyShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
      
      const { actions, shipUpdates, playerDamage, consumedHazardIds } = executeAITier(
        actingEnemies,
        state.playerShips,
        state.enemyShips,
        state.currentTactic,
        occupiedHexes,
        state.terrainMap,
        state.players,
        state.tacticHazards
      );

      if (consumedHazardIds.length > 0) {
        set(storeState => ({
          tacticHazards: storeState.tacticHazards.filter(hazard => !consumedHazardIds.includes(hazard.id)),
        }));
      }

      // Apply updates to enemies
      shipUpdates.forEach((updates, enemyId) => {
        get().updateEnemyShip(enemyId, { ...updates, hasDrifted: true });
      });

      // Also ensure any enemies that didn't generate explicit move updates are marked as drifted
      // (e.g. if they had overwhelmingly firepower and couldn't move)
      actingEnemies.forEach(enemy => {
        if (!shipUpdates.has(enemy.id)) {
          get().updateEnemyShip(enemy.id, { hasDrifted: true });
        }
      });

      // Apply damage to targets (could be player ships or allied enemy ships)
      playerDamage.forEach(dmg => {
        const liveState = get();
        const playerShip = liveState.playerShips.find(s => s.id === dmg.targetId);
        if (playerShip) {
          const updates: Partial<ShipState> = {};
          if (dmg.shieldDamage > 0) {
            updates.shields = { ...playerShip.shields, [dmg.sector]: playerShip.shields[dmg.sector] - dmg.shieldDamage };
          }
          if (dmg.hullDamage > 0) {
            updates.currentHull = Math.max(0, playerShip.currentHull - dmg.hullDamage);
            if (updates.currentHull === 0) updates.isDestroyed = true;
          }
          get().updatePlayerShip(dmg.targetId, updates);
          if ((dmg.officerStress ?? 0) > 0) {
            set(storeState => {
              const playerIndex = storeState.players.findIndex(player => player.shipId === dmg.targetId);
              if (playerIndex === -1) return storeState;
              const player = storeState.players[playerIndex];
              const officers = player.officers.map(officer => {
                const officerData = getOfficerById(officer.officerId);
                const maxStress = getCombatMaxStress(officer, officerData, storeState.experimentalTech) ?? 99;
                return { ...officer, currentStress: Math.min(maxStress, officer.currentStress + (dmg.officerStress ?? 0)) };
              });
              const players = [...storeState.players];
              players[playerIndex] = { ...player, officers };
              return { players };
            });
          }
        } else {
          const enemyShip = liveState.enemyShips.find(s => s.id === dmg.targetId);
          if (enemyShip) {
            const updates: Partial<EnemyShipState> = {};
            if (dmg.shieldDamage > 0) {
              updates.shields = { ...enemyShip.shields, [dmg.sector]: enemyShip.shields[dmg.sector] - dmg.shieldDamage };
            }
            if (dmg.hullDamage > 0) {
              updates.currentHull = Math.max(0, enemyShip.currentHull - dmg.hullDamage);
              if (updates.currentHull === 0) updates.isDestroyed = true;
            }
            get().updateEnemyShip(dmg.targetId, updates);
          }
        }
      });

      // Log actions ═  grouped by ship with detailed attack breakdown
      actions.forEach(a => {
        console.log('Action type:', a.type, 'Target:', (a.details as any)?.target);
        if (a.type === 'move') {
          const to = a.details.to as HexCoord;
          const triggeredHazardIds = ((a.details as Record<string, unknown>).triggeredHazardIds as string[] | undefined) ?? [];
          void triggeredHazardIds;
          const adversary = getAdversaryById(
            state.enemyShips.find(e => e.id === a.shipId)?.adversaryId ?? ''
          );
          get().addLog('movement',
            `═ ═[ENEMY] ${adversary?.name ?? a.shipId} moved ═   (${to.q},${to.r})`);
        } else if (a.type === 'attack') {
          const det = a.details as Record<string, any>;
          const attackingShip = state.enemyShips.find(e => e.id === a.shipId);
          const adversary = getAdversaryById(attackingShip?.adversaryId ?? '');
          const attackerName = attackingShip?.name ?? adversary?.name ?? a.shipId;
          const defenderName = get().getShipName(det.target);
          const tn = det.damageResult?.tnBreakdown?.total ?? '?';
          let atkMsg = `═a [ENEMY] ${attackerName} ═   ${defenderName} | TN ${tn} | ${det.hits} hit${det.hits !== 1 ? 's' : ''}`;
          if ((det.shieldDmg ?? 0) > 0) atkMsg += ` | -${det.shieldDmg} ${String(det.sector ?? '').toUpperCase()} shield`;
          if ((det.hullDmg ?? 0) > 0)   atkMsg += ` | -${det.hullDmg} hull`;
          get().addLog('combat', atkMsg, { damageResult: det.damageResult });

          // Queue volley modal — sequential per attack (same as player attacks)
          useUIStore.getState().queueModal('volley', {
            results: [{
              damageResult: det.damageResult,
              defenderId: det.target,
              defenderName,
              outOfArc: false,
            }],
            weaponName: `${attackerName}'s weapons`,
            attackerId: attackerName,
          });

          // Trauma Hook: Shell-Shocked (+1 stress on ≥3 hull damage)
          if (det.target && (det.hullDmg ?? 0) >= 3) {
             set(state => {
                const pIndex = state.players.findIndex(p => p.shipId === det.target);
                if (pIndex === -1) return state;
                const player = state.players[pIndex];
                const newOfficers = player.officers.map(o => {
                    if (!o.traumas.some(t => t.id === 'shell-shocked')) return o;
                    const officerData = getOfficerById(o.officerId);
                    get().addLog('stress', `[Trauma] Shell-Shocked: ${officerData?.name} gained +1 Stress from heavy hull damage!`);
                    const maxStress = getCombatMaxStress(o, officerData, get().experimentalTech) ?? 99;
                    return { ...o, currentStress: Math.min(maxStress, o.currentStress + 1) };
                });
                if (newOfficers.some((o, i) => o.currentStress !== player.officers[i].currentStress)) {
                   const newPlayers = [...state.players];
                   newPlayers[pIndex] = { ...player, officers: newOfficers };
                   return { players: newPlayers };
                }
                return state;
             });
          }
        }
      });

      // Trauma Hook: Flincher — triggered when an enemy CAPITAL SHIP ends movement adjacent to a player ship
      // Capital ships = 'large' size adversaries
      const latestState = get();
      actions.forEach(a => {
        if (a.type !== 'move') return;
        const movingEnemy = latestState.enemyShips.find(e => e.id === a.shipId);
        if (!movingEnemy) return;
        const adversaryData = getAdversaryById(movingEnemy.adversaryId);
        if (adversaryData?.size !== 'large') return; // Only Capital Ships trigger Flincher
        const finalPos = (a.details as any).to as HexCoord;
        // Check each player ship for adjacency (distance === 1)
        latestState.players.forEach(player => {
          const pShip = latestState.playerShips.find(s => s.id === player.shipId);
          if (!pShip || pShip.isDestroyed) return;
          if (hexDistance(finalPos, pShip.position) !== 1) return;
          set(state => {
            const pIdx = state.players.findIndex(p => p.id === player.id);
            if (pIdx === -1) return state;
            const pl = state.players[pIdx];
            const newOfficers = pl.officers.map(o => {
              if (!o.traumas.some(t => t.id === 'flincher')) return o;
              const officerData = getOfficerById(o.officerId);
              get().addLog('stress', `[Trauma] Flincher: ${officerData?.name} gained +1 Stress — enemy capital ship moved adjacent!`);
              const maxStress = getCombatMaxStress(o, officerData, get().experimentalTech) ?? 99;
              return { ...o, currentStress: Math.min(maxStress, o.currentStress + 1) };
            });
            if (newOfficers.some((o, i) => o.currentStress !== pl.officers[i].currentStress)) {
              const newPlayers = [...state.players];
              newPlayers[pIdx] = { ...pl, officers: newOfficers };
              return { players: newPlayers };
            }
            return state;
          });
        });
      });

      // Log player damage summary
      playerDamage.forEach(dmg => {
        if (dmg.hullDamage > 0 || dmg.shieldDamage > 0) {
          const ps = state.playerShips.find(s => s.id === dmg.targetId);
          const targetName = get().getShipName(dmg.targetId);
          let dmgMsg = `═x ═ ${targetName} took`;
          if (dmg.shieldDamage > 0) dmgMsg += ` -${dmg.shieldDamage} ${dmg.sector.toUpperCase()} shield`;
          if (dmg.hullDamage > 0) dmgMsg += ` -${dmg.hullDamage} hull (${Math.max(0,(ps?.currentHull ?? 0) - dmg.hullDamage)} remaining)`;
        get().addLog('damage', dmgMsg);
        }
      });
    }

    if (size === 'small') {
      get().resolveFighterStep('enemy');
      get().resolveTorpedoStep('enemy');
    }

    // ═ ══ ═ Carrier Fighter Spawning ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
    // Any Support-tagged enemy (Carrier) spawns 2 fighters during its execution step
    {
      const liveState = get(); // re-read after updates
      const carrierEnemies = liveState.enemyShips.filter(s => {
        if (s.isDestroyed) return false;
        const adv = getAdversaryById(s.adversaryId);
        return adv?.aiTag === 'support';
      });

      if (carrierEnemies.length > 0) {
        const occupiedFighterHexes = new Map<string, number>();
        liveState.fighterTokens.filter(f => !f.isDestroyed).forEach(f => {
          const k = hexKey(f.position);
          occupiedFighterHexes.set(k, (occupiedFighterHexes.get(k) ?? 0) + 1);
        });

        const newFighters: import('../types/game').FighterToken[] = [];
        carrierEnemies.forEach(carrier => {
          const spawned = buildCarrierFighters(
            carrier.id,
            carrier.position,
            carrier.facing,
            occupiedFighterHexes,
            liveState.terrainMap,
            `enemy-fighter-${carrier.id}-r${liveState.round}-${Date.now()}`
          );
          spawned.forEach(f => newFighters.push(f));
          if (spawned.length > 0) {
            get().addLog('system', `⬡ [CARRIER] ${carrier.id} launched ${spawned.length} Strike Fighter(s).`);
          }
        });

        if (newFighters.length > 0) {
          set(s => ({ fighterTokens: [...s.fighterTokens, ...newFighters] }));
        }
      }
    }

    get().markStepResolved(currentStep);
    get().addLog('phase', `══ Enemy step complete: ${currentStep.toUpperCase()}`);

    // Check for victory/defeat after enemy turn
    get().checkGameOver();
  },

  // ═ ══ ══ ═ Fighter & Torpedo Token CRUD ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  spawnFighter: (token) => {
    set(s => ({ fighterTokens: [...s.fighterTokens, token] }));
  },

  spawnTorpedo: (token) => {
    set(s => ({ torpedoTokens: [...s.torpedoTokens, token] }));
  },

  removeFighter: (id) => {
    set(s => ({ fighterTokens: s.fighterTokens.filter(f => f.id !== id) }));
  },

  updateFighter: (id, updates) => {
    set(s => ({
      fighterTokens: s.fighterTokens.map(f => f.id === id ? { ...f, ...updates } : f),
    }));
  },

  assignFighterTarget: (playerId, targetShipId) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;
    set(s => ({
      fighterTokens: s.fighterTokens.map(f =>
        f.allegiance === 'allied' && f.sourceShipId === player.shipId
          ? { ...f, assignedTargetId: targetShipId }
          : f
      ),
    }));
    const targetName = get().getShipName(targetShipId);
    get().addLog('system', `⬡ Fighter target assigned ═   ${targetName}`);
  },

  // ═ ══ ══ ═ Fighter Step Resolution ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
    resolveFighterStep: (allegiance) => {
    const state = get();
    const fighters = state.fighterTokens.filter(f => f.allegiance === allegiance && !f.isDestroyed && !f.hasDrifted);
    if (fighters.length === 0) return;

    const allFighters = state.fighterTokens;
    let updatedFighters = [...state.fighterTokens];

    fighters.forEach(fighter => {
      // 1. Move
      const moveResult = resolveFighterMovement(
        fighter, state.playerShips, state.enemyShips, allFighters, state.terrainMap
      );

      const fIndex = updatedFighters.findIndex(f => f.id === fighter.id);
      if (fIndex !== -1) {
        updatedFighters[fIndex] = {
          ...updatedFighters[fIndex],
          position: moveResult.newPosition,
          hasDrifted: true,
        };
      }

      if (moveResult.moved) {
        get().addLog('movement',
          `⬡ ${allegiance === 'allied' ? '═ ═' : '═ ═[ENEMY]'} ${fighter.name} ═   (${fighter.position.q},${fighter.position.r}) → (${moveResult.newPosition.q},${moveResult.newPosition.r})`
        );
      }

      if (allegiance === 'enemy' && moveResult.moved) {
        let pdcInterceptHex: HexCoord | null = null;

        for (const traversedHex of moveResult.traversedHexes) {
          const pdcAttempts = resolvePointDefenseInterception(
            get().playerShips,
            traversedHex,
            fighter.baseEvasion,
          );

          for (const attempt of pdcAttempts) {
            const outcome = attempt.destroyed ? 'INTERCEPTED' : 'missed';
            get().addLog(
              'combat',
              `🛡 ${attempt.shipName}: ${attempt.weaponName} engaged ${fighter.name} | TN ${attempt.targetNumber} | Rolls [${attempt.rolls.join(', ')}] | ${outcome}`,
            );
          }

          if (pdcAttempts.some(attempt => attempt.destroyed)) {
            pdcInterceptHex = traversedHex;
            break;
          }
        }

        if (pdcInterceptHex) {
          if (fIndex !== -1) {
            updatedFighters[fIndex] = {
              ...updatedFighters[fIndex],
              position: pdcInterceptHex,
              hasDrifted: true,
              hasActed: true,
              currentHull: 0,
              isDestroyed: true,
            };
          }
          get().addLog('system', `☠ ${fighter.name} was shredded by point defense fire.`);
          return;
        }
      }

      // 2. Attack (using updated position from move)
      const movedFighter = { ...fighter, position: moveResult.newPosition, hasDrifted: true };
      const attackResult = resolveFighterAttack(movedFighter, state.playerShips, state.enemyShips, allFighters, state.terrainMap);

      if (attackResult) {
        const targetName = get().getShipName(attackResult.targetId);

        // Apply damage to target
        const fighterTargetIdx = updatedFighters.findIndex(f => f.id === attackResult.targetId);

        if (fighterTargetIdx !== -1) {
          // Dogfighting: Target is a fighter
          const targetFighter = updatedFighters[fighterTargetIdx];
          const newHull = Math.max(0, targetFighter.currentHull - attackResult.hullDamage);
          const wasDestroyed = targetFighter.currentHull > 0 && newHull === 0;

          updatedFighters[fighterTargetIdx] = {
            ...targetFighter,
            currentHull: newHull,
            isDestroyed: newHull === 0,
          };

          if (wasDestroyed && targetFighter.allegiance === 'enemy') {
            const currentState = get();
            const newCount = currentState.smallShipsDestroyedThisMission + 1;
            set({ smallShipsDestroyedThisMission: newCount });
            if (newCount % 2 !== 0) {
              get().adjustFleetFavor(1);
              get().addLog('system', `☠ ${targetFighter.name} destroyed ═  High Command is pleased (+1 Fleet Favor)`);
            } else {
              get().addLog('system', `☠ ${targetFighter.name} destroyed`);
            }
          }
        } else if (allegiance === 'allied') {
          // Capital Ship Target (Enemy)
          const liveState = get();
          const enemyIdx = liveState.enemyShips.findIndex(e => e.id === attackResult.targetId);
          if (enemyIdx !== -1) {
            const enemy = liveState.enemyShips[enemyIdx];
            // Ion Nebula: shields bypassed but not depleted — don't write shield update
            const newShields = attackResult.ionNebulaActive
              ? enemy.shields
              : { ...enemy.shields, [attackResult.sector]: Math.max(0, (enemy.shields[attackResult.sector as keyof typeof enemy.shields] ?? 0) - attackResult.shieldDamage) };
            const newHull = Math.max(0, enemy.currentHull - attackResult.hullDamage);
            get().updateEnemyShip(attackResult.targetId, {
              shields: newShields,
              currentHull: newHull,
              isDestroyed: newHull === 0,
            });
          }
        } else {
          // Capital Ship Target (Player)
          const liveState = get();
          const playerShip = liveState.playerShips.find(s => s.id === attackResult.targetId);
          if (playerShip) {
            if (liveState.flakUmbrellaShipId === playerShip.id) {
              get().addLog('system', `Fleet Asset: Flak Umbrella protected ${playerShip.name} from fighter damage.`);
            } else {
              // Ion Nebula: shields bypassed but not depleted — don't write shield update
              const newShields = attackResult.ionNebulaActive
                ? playerShip.shields
                : { ...playerShip.shields, [attackResult.sector]: Math.max(0, (playerShip.shields[attackResult.sector as keyof typeof playerShip.shields] ?? 0) - attackResult.shieldDamage) };
              const newHull = Math.max(0, playerShip.currentHull - attackResult.hullDamage);
              get().updatePlayerShip(attackResult.targetId, {
                shields: newShields,
                currentHull: newHull,
                isDestroyed: newHull === 0,
              });
            }
          }
        }

        // Mark fighter as having acted
        const fi2 = updatedFighters.findIndex(f => f.id === fighter.id);
        if (fi2 !== -1) updatedFighters[fi2] = { ...updatedFighters[fi2], hasActed: true };

        // Combat Log with TN and Rolls
        const rollsStr = attackResult.rolls.join(', ');
        let atkMsg = `═a  ${fighter.name} ═   ${targetName} | TN: ${attackResult.targetNumber} | Rolls: [${rollsStr}]`;

        if (attackResult.hits > 0) {
          atkMsg += ` | ${attackResult.hits} hit(s)`;
          if (attackResult.sector === 'hull') {
            atkMsg += ` | DOGFIGHT: SPLASH ONE!`;
          } else {
            if (attackResult.ionNebulaActive) atkMsg += ` | ⚡ ION NEBULA — shields bypassed`;
            if (attackResult.shieldDamage > 0) atkMsg += ` | -${attackResult.shieldDamage} ${attackResult.sector.toUpperCase()} shield`;
            if (attackResult.hullDamage > 0) atkMsg += ` | -${attackResult.hullDamage} hull`;
          }
        } else {
          atkMsg += ` | MISS`;
        }
        get().addLog('combat', atkMsg);
      }
    });

    set({ fighterTokens: updatedFighters });

    // Check for victory/defeat after fighters act
    get().checkGameOver();
  },

  resolveTorpedoStep: (allegiance) => {
    const state = get();
    const torpedoes = state.torpedoTokens.filter(t => t.allegiance === allegiance && !t.isDestroyed && !t.hasMoved);
    if (torpedoes.length === 0) return;

    let updatedTorpedoes = [...state.torpedoTokens];

    torpedoes.forEach(torpedo => {
      // 1. Identify active target
      const liveState = get();
      let targetShip = liveState.enemyShips.find(s => s.id === torpedo.targetShipId && !s.isDestroyed) as (ShipState | EnemyShipState) | undefined;
      if (!targetShip) {
        targetShip = liveState.playerShips.find(s => s.id === torpedo.targetShipId && !s.isDestroyed);
      }

      const tIdx = updatedTorpedoes.findIndex(t => t.id === torpedo.id);
      
      if (!targetShip) {
        // Target destroyed or lost ═  torpedo auto-destructs
        if (tIdx !== -1) updatedTorpedoes[tIdx] = { ...updatedTorpedoes[tIdx], isDestroyed: true, hasMoved: true };
        get().addLog('movement', `🚀 ${torpedo.name} self-destructed (target lost).`);
        return;
      }

      // 2. Move towards target
      const moveResult = moveTorpedo(torpedo, targetShip.position, state.terrainMap);
      let pdcInterceptHex: HexCoord | null = null;

      if (!moveResult.isDestroyed && allegiance === 'enemy') {
        for (const traversedHex of moveResult.traversedHexes) {
          const pdcAttempts = resolvePointDefenseInterception(
            get().playerShips,
            traversedHex,
            torpedo.baseEvasion,
          );

          for (const attempt of pdcAttempts) {
            const outcome = attempt.destroyed ? 'INTERCEPTED' : 'missed';
            get().addLog(
              'combat',
              `🛡 ${attempt.shipName}: ${attempt.weaponName} engaged ${torpedo.name} | TN ${attempt.targetNumber} | Rolls [${attempt.rolls.join(', ')}] | ${outcome}`,
            );
          }

          if (pdcAttempts.some(attempt => attempt.destroyed)) {
            pdcInterceptHex = traversedHex;
            break;
          }
        }
      }
      
      if (tIdx !== -1) {
        updatedTorpedoes[tIdx] = {
          ...updatedTorpedoes[tIdx],
          position: pdcInterceptHex ?? moveResult.newPosition,
          isDestroyed: moveResult.isDestroyed || pdcInterceptHex !== null || updatedTorpedoes[tIdx].isDestroyed,
          hasMoved: true,
        };
      }

      if (moveResult.isDestroyed) {
        get().addLog('movement',
          `🚀 ${torpedo.name} entered Debris Field and was DESTROYED!`
        );
      } else {
        const moved = torpedo.position.q !== moveResult.newPosition.q || torpedo.position.r !== moveResult.newPosition.r;
        if (moved) {
          get().addLog('movement',
            `🚀 ${torpedo.name} moved ═   (${moveResult.newPosition.q},${moveResult.newPosition.r})`
          );
        }
      }

      if (pdcInterceptHex) {
        get().addLog('system', `☠ ${torpedo.name} was destroyed by point defense before impact.`);
        return;
      }

      // 3. Attack if reached target
      if (moveResult.reachedTarget) {
        const targetEvasion = ('chassisId' in targetShip)
          ? (targetShip as ShipState).baseEvasion + (targetShip as ShipState).evasionModifiers
          : (targetShip as EnemyShipState & { baseEvasion?: number }).baseEvasion ?? 5; // Default for adversaries if no baseEvasion

        const attackResult = resolveTorpedoAttack(torpedo, targetEvasion);
        
        let atkMsg = `═a  🚀 ${torpedo.name} impacted ${targetShip.name} | TN: ${attackResult.targetNumber} | Roll: [${attackResult.rolls.join(', ')}]`;

        if (attackResult.hit) {
          atkMsg += ` | -${attackResult.hullDamage} hull (DIRECT HIT)`;
          
          // Apply Damage directly to Hull
          const maxHull = ('chassisId' in targetShip)
              ? (targetShip as ShipState).maxHull
              : getAdversaryById((targetShip as EnemyShipState).adversaryId)?.hull ?? 10;
              
          const newHull = Math.max(0, targetShip.currentHull - attackResult.hullDamage);
          const updates: Partial<ShipState & EnemyShipState> = { currentHull: newHull };
          if (newHull === 0) updates.isDestroyed = true;
          
          if ('chassisId' in targetShip) {
            get().updatePlayerShip(targetShip.id, updates);
          } else {
            get().updateEnemyShip(targetShip.id, updates);
            
            // Critical Hit if 3+ hull damage (torpedoes deal 3)
            if (attackResult.hullDamage >= 3 && !updates.isDestroyed) {
                const { card: critCard, remainingDeck: newDeck } = drawCriticalCard(get().enemyCritDeck, 'enemy');
                set({ enemyCritDeck: newDeck });
                const currentEnemy = (targetShip as EnemyShipState);
                get().updateEnemyShip(targetShip.id, {
                    criticalDamage: [...currentEnemy.criticalDamage, critCard],
                    hasDroppedBelow50: targetShip.currentHull > maxHull / 2 && newHull <= maxHull / 2
                });
                get().addLog('critical', `══& CRITICAL HIT! ${targetShip.name} suffered: ${critCard.name}!`);
                useUIStore.getState().queueModal('critical', { card: critCard });
            }
          }
          
        } else {
          atkMsg += ` | MISS (Evaded)`;
        }
        
        get().addLog('combat', atkMsg);

        // Destroy the torpedo after impact
        if (tIdx !== -1) updatedTorpedoes[tIdx] = { ...updatedTorpedoes[tIdx], isDestroyed: true };
      }
    });

    set({ torpedoTokens: updatedTorpedoes });

    // Check for victory/defeat after torpedoes impact
    get().checkGameOver();
  },

  // ═ ══ ══ ═ Ships ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  updatePlayerShip: (shipId, updates) => {
    set(state => {
      const ship = state.playerShips.find(s => s.id === shipId);
      if (!ship) return state;

      let effectiveUpdates = { ...updates };
      let hardLightTriggered = false;
      const requestedHull = effectiveUpdates.currentHull;
      if (typeof requestedHull === 'number' && requestedHull < ship.currentHull) {
        const incomingDamage = ship.currentHull - requestedHull;
        const hardLightResult = applyHardLightPlating(
          incomingDamage,
          shipId,
          new Set(state.hardLightTriggeredShipIds),
          state.experimentalTech,
        );
        if (hardLightResult.triggered) {
          hardLightTriggered = true;
          effectiveUpdates.currentHull = ship.currentHull - hardLightResult.finalDamage;
          effectiveUpdates.isDestroyed = (effectiveUpdates.currentHull ?? ship.currentHull) <= 0;
        }
      }

      const wasDestroyed = ship?.isDestroyed ?? false;
      const nextPlayerShips = state.playerShips.map(s =>
        s.id === shipId ? { ...s, ...effectiveUpdates } : s,
      );

      let terrainMap = state.terrainMap;
      const isNewlyDestroyed = !wasDestroyed && (effectiveUpdates.isDestroyed === true || effectiveUpdates.currentHull === 0);
      if (isNewlyDestroyed && canSpawnDebrisAtHex({ ...state, playerShips: nextPlayerShips }, ship.position, shipId)) {
        terrainMap = addDebrisFieldAtHex(state, ship.position);
      }

      const nextShip = nextPlayerShips.find(s => s.id === shipId) ?? ship;
      const hullDamageApplied = nextShip.currentHull < ship.currentHull;
      const hardLightTriggeredShipIds = state.hardLightTriggeredShipIds.includes(shipId)
        ? state.hardLightTriggeredShipIds
        : hardLightTriggered
          ? [...state.hardLightTriggeredShipIds, shipId]
          : state.hardLightTriggeredShipIds;
      const shipsWithHullDamageThisRound = hullDamageApplied && !state.shipsWithHullDamageThisRound.includes(shipId)
        ? [...state.shipsWithHullDamageThisRound, shipId]
        : state.shipsWithHullDamageThisRound;

      return {
        playerShips: nextPlayerShips,
        terrainMap,
        hardLightTriggeredShipIds,
        shipsWithHullDamageThisRound,
      };
    });
  },

  updateEnemyShip: (shipId, updates) => {
    const currentState = get();
    const ship = currentState.enemyShips.find(s => s.id === shipId);
    
    // Immediate Bounty Payouts
    if (ship && !ship.isDestroyed && updates.isDestroyed) {
      const adv = getAdversaryById(ship.adversaryId);
      if (adv) {
        if (adv.size === 'small' || isSmallCraftSize(adv.size)) {
          const newCount = currentState.smallShipsDestroyedThisMission + 1;
          set({ smallShipsDestroyedThisMission: newCount });
          if (newCount % 2 !== 0) {
            get().adjustFleetFavor(1);
            get().addLog('system', `☠ ${ship.name} destroyed ═  High Command is pleased (+1 Fleet Favor)`);
          } else {
            get().addLog('system', `☠ ${ship.name} destroyed`);
          }
        } else if (adv.size === 'medium') {
          get().adjustFleetFavor(1);
          get().addLog('system', `☠ ${ship.name} destroyed ═  High Command is pleased (+1 Fleet Favor)`);
        } else if (adv.size === 'large') {
          get().adjustFleetFavor(2);
          get().addLog('system', `☠ ${ship.name} destroyed ═  High Command is ecstatic (+2 Fleet Favor)`);
        }
      }
    }

    set(state => {
      const nextEnemyShips = state.enemyShips.map(s =>
        s.id === shipId ? { ...s, ...updates } : s,
      );

      let terrainMap = state.terrainMap;
      const isNewlyDestroyed = ship && !ship.isDestroyed && (updates.isDestroyed === true || updates.currentHull === 0);
      if (ship && isNewlyDestroyed && canSpawnDebrisAtHex({ ...state, enemyShips: nextEnemyShips }, ship.position, shipId)) {
        terrainMap = addDebrisFieldAtHex(state, ship.position);
      }

      return {
        enemyShips: nextEnemyShips,
        terrainMap,
      };
    });
  },

  updateObjectiveMarker: (name, updates) => {
    set(state => ({
      objectiveMarkers: state.objectiveMarkers.map(m =>
        m.name === name
          ? { ...m, ...updates, hull: Math.max(0, updates.hull ?? m.hull) }
          : m,
      ),
    }));
  },


  // ═ ══ ══ ═ Fleet Favor ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  adjustFleetFavor: (delta) => {
    set(state => ({ fleetFavor: state.fleetFavor + delta }));
  },

  useFleetAsset: (assetId, payload = {}) => {
    const state = get();
    const asset = getFleetAssetDefinition(assetId as any);
    if (!asset) return false;

    const roundUses = state.fleetAssetRoundUses[assetId] ?? 0;
    const scenarioUses = state.fleetAssetScenarioUses[assetId] ?? 0;
    const shipId = payload.shipId as string | undefined;
    const shipRoundUses = shipId ? (state.fleetAssetShipRoundUses[assetId]?.[shipId] ?? 0) : 0;

    const hasBlockedBeneficiary = (targetShipId?: string) => {
      if (!targetShipId) return false;
      const beneficiary = state.players.find(p => p.shipId === targetShipId);
      return beneficiary?.commsBlackout === true;
    };

    if (state.fleetFavor < asset.ffCost) {
      get().addLog('system', `${asset.name} unavailable: not enough Fleet Favor.`);
      return false;
    }
    if (payload.shipId && hasBlockedBeneficiary(payload.shipId)) {
      get().addLog('system', `${asset.name} blocked: target ship is under Comms Blackout.`);
      return false;
    }

    if (assetId === 'tactical-override' && roundUses >= 1) return false;
    if (assetId === 'emergency-reinforcement' && (roundUses >= 2 || shipRoundUses >= 1)) return false;
    if (assetId === 'damage-control-authorization' && roundUses >= 2) return false;
    if (assetId === 'intel-feed' && roundUses >= 1) return false;
    if (assetId === 'morale-discipline' && roundUses >= 2) return false;
    if (assetId === 'escort-support-call' && roundUses >= 1) return false;
    if (assetId === 'extraction-window' && scenarioUses >= 1) return false;

    let success = false;

    if (assetId === 'tactical-override' && payload.shipId) {
      set(s => ({
        tacticalOverrideShipIds: Array.from(new Set([...s.tacticalOverrideShipIds, payload.shipId])),
      }));
      success = true;
      get().addLog('system', `Fleet Asset: Tactical Override authorized for ${get().getShipName(payload.shipId)}. One RoE restriction may be ignored this round.`);
    }

    if (assetId === 'emergency-reinforcement' && payload.shipId) {
      const player = state.players.find(p => p.shipId === payload.shipId);
      if (!player) return false;
      set(s => ({
        players: s.players.map(p => p.id === player.id ? { ...p, commandTokens: p.commandTokens + 1 } : p),
      }));
      success = true;
      get().addLog('system', `Fleet Asset: Emergency Reinforcement granted +1 CT to ${get().getShipName(payload.shipId)}.`);
    }

    if (assetId === 'targeting-package' && payload.attackerShipId && payload.targetShipId && payload.mode) {
      set(s => ({
        targetingPackages: [
          ...s.targetingPackages.filter(pkg => !(pkg.attackerShipId === payload.attackerShipId && pkg.targetShipId === payload.targetShipId)),
          {
            attackerShipId: payload.attackerShipId,
            targetShipId: payload.targetShipId,
            mode: payload.mode as TargetingPackageMode,
          },
        ],
      }));
      success = true;
      get().addLog('system', `Fleet Asset: ${asset.name} queued for ${get().getShipName(payload.attackerShipId)} vs ${get().getShipName(payload.targetShipId)}.`);
    }

    if (assetId === 'damage-control-authorization' && payload.shipId) {
      const ship = state.playerShips.find(s => s.id === payload.shipId);
      if (!ship || ship.isDestroyed) return false;
      const mode = payload.mode as string | undefined;
      if (mode === 'hull') {
        get().updatePlayerShip(ship.id, { currentHull: Math.min(ship.maxHull, ship.currentHull + 1) });
        success = true;
        get().addLog('repair', `Fleet Asset: ${ship.name} restored 1 Hull.`);
      }
      if (mode === 'shield' && payload.sector) {
        get().updatePlayerShip(ship.id, {
          shields: {
            ...ship.shields,
            [payload.sector]: Math.max(1, ship.shields[payload.sector as keyof ShieldState] ?? 0),
          } as ShieldState,
        });
        success = true;
        get().addLog('repair', `Fleet Asset: ${ship.name} restored ${String(payload.sector).toUpperCase()} shields to 1.`);
      }
      if (mode === 'clear-impairment' && payload.effectType) {
        const effectType = String(payload.effectType);
        const shipUpdates: Partial<ShipState> = {};
        if (effectType === 'pdcDisabled') shipUpdates.pdcDisabled = false;
        if (effectType === 'ordnanceJammed') shipUpdates.ordnanceJammed = false;
        if (effectType === 'armorDisabled') shipUpdates.armorDisabled = false;
        if (Object.keys(shipUpdates).length === 0) return false;
        get().updatePlayerShip(ship.id, shipUpdates);
        success = true;
        get().addLog('repair', `Fleet Asset: ${ship.name} cleared ${effectType}.`);
      }
    }

    if (assetId === 'intel-feed') {
      const mode = payload.mode as string | undefined;
      if (mode === 'delay-reinforcement' && Number.isInteger(payload.spawnIndex)) {
        const spawnIndex = Number(payload.spawnIndex);
        const spawn = state.pendingSpawns[spawnIndex];
        if (!spawn) return false;
        set(s => ({
          pendingSpawns: s.pendingSpawns.map((entry, index) =>
            index === spawnIndex ? { ...entry, spawnRound: entry.spawnRound + 1 } : entry
          ),
        }));
        success = true;
        get().addLog('system', `Fleet Asset: Intel Feed delayed a reinforcement group to round ${spawn.spawnRound + 1}.`);
      }
      if (mode === 'cancel-tactic' && state.currentTactic) {
        set({ currentTactic: null, tacticHazards: [] });
        success = true;
        get().addLog('tactic', `Fleet Asset: Intel Feed canceled the current enemy tactic.`);
      }
      if (mode === 'expose-enemy' && payload.targetShipId) {
        set({ exposedEnemyShipId: payload.targetShipId });
        success = true;
        get().addLog('system', `Fleet Asset: ${get().getShipName(payload.targetShipId)} exposed until end of round (-1 TN against it).`);
      }
    }

    if (assetId === 'morale-discipline') {
      const mode = payload.mode as string | undefined;
      if (mode === 'remove-stress' && payload.playerId && payload.officerId) {
        set(s => ({
          players: s.players.map(player => player.id !== payload.playerId ? player : {
            ...player,
            officers: player.officers.map(officer =>
              officer.officerId !== payload.officerId
                ? officer
                : { ...officer, currentStress: Math.max(0, officer.currentStress - 1) }
            ),
          }),
        }));
        success = true;
        get().addLog('stress', `Fleet Asset: Morale / Discipline removed 1 Stress.`);
      }
      if (mode === 'unlock-station' && payload.playerId && payload.station) {
        set(s => ({
          players: s.players.map(player => player.id !== payload.playerId ? player : {
            ...player,
            officers: player.officers.map(officer =>
              officer.station !== payload.station
                ? officer
                : { ...officer, isLocked: false, lockDuration: 0 }
            ),
          }),
        }));
        success = true;
        get().addLog('system', `Fleet Asset: Morale / Discipline unlocked ${String(payload.station).toUpperCase()}.`);
      }
      if (mode === 'clear-fumble-side-effect') {
        if (payload.playerId && payload.station) {
          set(s => ({
            players: s.players.map(player => player.id !== payload.playerId ? player : {
              ...player,
              officers: player.officers.map(officer =>
                officer.station !== payload.station
                  ? officer
                  : { ...officer, isLocked: false, lockDuration: 0 }
              ),
            }),
          }));
          success = true;
        } else if (payload.shipId && payload.effectType) {
          const shipUpdates: Partial<ShipState> = {};
          const effectType = String(payload.effectType);
          if (effectType === 'pdcDisabled') shipUpdates.pdcDisabled = false;
          if (effectType === 'ordnanceJammed') shipUpdates.ordnanceJammed = false;
          if (effectType === 'armorDisabled') shipUpdates.armorDisabled = false;
          if (effectType === 'navLockout') {
            shipUpdates.navLockout = false;
            shipUpdates.navLockoutDuration = 0;
          }
          if (Object.keys(shipUpdates).length > 0) {
            get().updatePlayerShip(payload.shipId, shipUpdates);
            success = true;
          }
        }
        if (success) get().addLog('system', `Fleet Asset: Morale / Discipline cleared a fumble side effect.`);
      }
    }

    if (assetId === 'escort-support-call') {
      const mode = payload.mode as string | undefined;
      if (mode === 'interceptor-screen' && payload.torpedoId) {
        set(s => ({
          torpedoTokens: s.torpedoTokens.map(t => t.id === payload.torpedoId ? { ...t, isDestroyed: true, hasMoved: true } : t),
        }));
        success = true;
        get().addLog('system', `Fleet Asset: Interceptor Screen destroyed an incoming torpedo.`);
      }
      if (mode === 'flak-umbrella' && payload.shipId) {
        set({ flakUmbrellaShipId: payload.shipId });
        success = true;
        get().addLog('system', `Fleet Asset: ${get().getShipName(payload.shipId)} is under Flak Umbrella until end of round.`);
      }
      if (mode === 'off-board-strike' && payload.targetShipId) {
        const target = state.enemyShips.find(ship => ship.id === payload.targetShipId);
        if (!target || target.isDestroyed) return false;
        get().updateEnemyShip(target.id, {
          currentHull: Math.max(0, target.currentHull - 1),
          isDestroyed: Math.max(0, target.currentHull - 1) === 0,
        });
        success = true;
        get().addLog('combat', `Fleet Asset: Off-board strike hit ${target.name} for 1 hull.`);
      }
    }

    if (assetId === 'extraction-window' && payload.shipId) {
      const ship = state.playerShips.find(s => s.id === payload.shipId);
      if (!ship || ship.isDestroyed || ship.warpedOut) return false;
      set(s => ({
        extractionWindowShipIds: Array.from(new Set([...s.extractionWindowShipIds, payload.shipId])),
      }));
      success = true;
      get().addLog('system', `Fleet Asset: Extraction Window opened for ${ship.name}. It may count as a safe warp-out from anywhere.`);
    }

    if (!success) return false;

    set(s => ({
      fleetFavor: s.fleetFavor - asset.ffCost,
      fleetAssetRoundUses: {
        ...s.fleetAssetRoundUses,
        [assetId]: (s.fleetAssetRoundUses[assetId] ?? 0) + 1,
      },
      fleetAssetScenarioUses: {
        ...s.fleetAssetScenarioUses,
        [assetId]: (s.fleetAssetScenarioUses[assetId] ?? 0) + 1,
      },
      fleetAssetShipRoundUses: shipId ? {
        ...s.fleetAssetShipRoundUses,
        [assetId]: {
          ...(s.fleetAssetShipRoundUses[assetId] ?? {}),
          [shipId]: ((s.fleetAssetShipRoundUses[assetId] ?? {})[shipId] ?? 0) + 1,
        },
      } : s.fleetAssetShipRoundUses,
    }));
    get().addLog('system', `Fleet Asset spent: ${asset.name} (-${asset.ffCost} FF).`);
    get().checkGameOver();
    return true;
  },

  // ═ ══ ══ ═ Logging ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  addLog: (type, message, details) => {
    const state = get();
    const entry = createLogEntry(state.round, state.phase, type, message, details);
    set(state => ({ log: [...state.log, entry] }));
    // Notify UI store so badge updates when panel is closed
    useUIStore.getState().incrementUnread();
  },

  // ═ ══ ══ ═ Briefing Phase ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  executeBriefingPhase: () => {
    const state = get();

    // ─── RoE: CT Generation Modifier (Power Grid Rationing / Overclocked Reactors) ─────
    const roe = state.activeRoE;
    const roeCtMod = (roe?.mechanicalEffect.ctGenerationMod ?? 0) + (roe?.mechanicalEffect.bonusCTPerRound ?? 0);

    // 1. Refresh CT for all players (with RoE modifier applied)
    const updatedPlayers = state.players.map(p => {
      let officers = p.officers.map(o => resetOfficerRoundState(o));
      const ship = state.playerShips.find(s => s.id === p.shipId);
      const bridgeScarPenalty = ship && hasScar(ship, 'bridge-hit') ? 1 : 0;
      const roundOneCtModifier = state.round === 1 ? (state.combatModifiers?.playerCTRound1Modifier ?? 0) : 0;
      const roundOneCtZeroPenalty = state.round === 1 && state.combatModifiers?.playerCTZeroRound1
        ? p.maxCommandTokens
        : 0;
      const pendingCommandTokenBonus = p.pendingCommandTokenBonus ?? 0;

      // Trauma: Insubordinate (+1 Stress if RoE not overridden)
      if (!state.roeOverridden) {
        officers = officers.map(o => {
          if (o.traumas.some(t => t.id === 'insubordinate')) {
            const data = getOfficerById(o.officerId);
            if (data) return { ...o, currentStress: applyStress(o, data, 1).newStress };
          }
          return o;
        });
      }

      // Trauma: Phantom Scanners (D6 roll 1-2 -> +1 Stress)
      officers = officers.map(o => {
        if (o.traumas.some(t => t.id === 'phantom-scanners')) {
          const roll = Math.ceil(Math.random() * 6);
          if (roll <= 2) {
            const data = getOfficerById(o.officerId);
            if (data) return { ...o, currentStress: applyStress(o, data, 1).newStress };
          }
        }
        return o;
      });

      if (ship && hasScar(ship, 'command-spine-exposed')) {
        officers = officers.map(o => {
          if (o.station !== 'helm') return o;
          const data = getOfficerById(o.officerId);
          if (!data) return o;
          return { ...o, currentStress: applyStress(o, data, 1).newStress };
        });
      }

      return {
        ...p,
        commandTokens: Math.max(0, p.maxCommandTokens + roeCtMod + roundOneCtModifier - bridgeScarPenalty - roundOneCtZeroPenalty + pendingCommandTokenBonus),
        maxCommandTokens: p.maxCommandTokens, // base is unchanged — modifier is runtime-only
        pendingCommandTokenBonus: 0,
        briefingCommandTokenBonus: pendingCommandTokenBonus,
        assignedActions: [],
        officers,
        usedVersatileThisRound: false,
        commsBlackout: false,
      };
    });

    // 2. Draw new tactic card
    const { card: newTactic, remainingDeck: remainingTactics } = drawTacticCard(state.tacticDeck, state.enemyShips);

    // ─── Ion Nebula: strip all shields to 0 for ships inside ────────
    const applyNebulaShieldStrip = (ships: typeof state.playerShips) =>
      ships.map(s => {
        const terrain = state.terrainMap.get(hexKey(s.position));
        if (terrain !== 'ionNebula') return s;
        const zeroShields = {
          fore: 0, foreStarboard: 0, aftStarboard: 0,
          aft: 0, aftPort: 0, forePort: 0,
        };
        get().addLog('system',
          `⚡ ION NEBULA: ${s.name} shields stripped to 0 by electrostatic interference!`);
        return { ...s, shields: zeroShields };
      });

    const updatedPlayerShips = applyNebulaShieldStrip(
      state.playerShips.map(s => ({
        ...s,
        evasionModifiers: 0,
        hasDrifted: false,
        positionAtStartOfRound: s.position,
        firedWeaponPreviousRound: s.firedWeaponThisRound || false,
        firedWeaponThisRound: false,
        firedWeaponIndicesThisRound: [],
        ordnanceLoadedIndicesThisRound: [],
        pdcDisabled: false,
        armorDisabled: false,
        disabledWeaponIndices: [],
        ordnanceJammed: false,
        navLockout: s.navLockoutDuration ? s.navLockoutDuration > 1 : false,
        navLockoutDuration: Math.max(0, (s.navLockoutDuration ?? 0) - 1),
        isJammed: false
      }))
    );

    let updatedEnemyShips: EnemyShipState[] = state.enemyShips.map(s => ({
      ...s,
      evasionModifiers: 0,
      hasDrifted: false,
      firedWeaponIndicesThisRound: [],
      isJammed: false,
    }));

    // Reset fighter round-state flags (survivors carry over, only flags reset)
    let updatedFighters = state.fighterTokens
      .filter(f => !f.isDestroyed)
      .map(f => ({ ...f, hasDrifted: false, hasActed: false }));

    const updatedTorpedoes = state.torpedoTokens
      .filter(t => !t.isDestroyed)
      .map(t => ({ ...t, hasMoved: false }));

    let updatedTacticHazards = state.tacticHazards.filter(hazard => hazard.expiresAfterRound >= state.round + 1);

    if (newTactic.mechanicalEffect.shieldRestore) {
      updatedEnemyShips = restoreEnemyShieldsForTactic(updatedEnemyShips, newTactic.mechanicalEffect.shieldRestore);
    }

    if (newTactic.mechanicalEffect.reserveSquadronLaunch) {
      const reserveFighters = buildReserveSquadron(updatedEnemyShips, updatedFighters, state.terrainMap, state.round + 1);
      if (reserveFighters.length > 0) {
        updatedFighters = [...updatedFighters, ...reserveFighters];
      }
    }

    if (
      newTactic.mechanicalEffect.minefieldCount &&
      newTactic.mechanicalEffect.minefieldRadius &&
      newTactic.mechanicalEffect.mineDamage
    ) {
      updatedTacticHazards = buildMinefieldHazards(
        updatedEnemyShips,
        updatedPlayerShips,
        state.objectiveMarkers,
        state.terrainMap,
        state.round + 1,
        newTactic.mechanicalEffect.minefieldCount,
        newTactic.mechanicalEffect.minefieldRadius,
        newTactic.mechanicalEffect.mineDamage,
      );
    }

    set({
      players: updatedPlayers,
      playerShips: updatedPlayerShips,
      enemyShips: updatedEnemyShips,
      fighterTokens: updatedFighters,
      torpedoTokens: updatedTorpedoes,
      currentTactic: newTactic,
      tacticHazards: updatedTacticHazards,
      tacticDeck: remainingTactics,
      fleetAssetRoundUses: {},
      fleetAssetShipRoundUses: {},
      tacticalOverrideShipIds: [],
      targetingPackages: [],
      exposedEnemyShipId: null,
      flakUmbrellaShipId: null,
    });

    // ═ ══ ═ Round start banner ═ ══ ═
    const newRound = get().round;
    get().addLog('phase', `${'═'.repeat(30)} ROUND ${newRound} BEGIN ${'═'.repeat(30)}`);

    // ═ ══ ═ CT refresh per player ═ ══ ═
    updatedPlayers.forEach(p => {
      const briefingBonus = state.players.find(existing => existing.id === p.id)?.pendingCommandTokenBonus ?? 0;
      const ship = state.playerShips.find(s => s.id === p.shipId);
      const appliedCt = p.maxCommandTokens
        + roeCtMod
        + (newRound === 1 ? (state.combatModifiers?.playerCTRound1Modifier ?? 0) : 0)
        - (ship && hasScar(ship, 'bridge-hit') ? 1 : 0)
        - (newRound === 1 && state.combatModifiers?.playerCTZeroRound1 ? p.maxCommandTokens : 0)
        + briefingBonus;
      const ctMsg = briefingBonus > 0
        ? `${Math.max(0, appliedCt)} CT (+${briefingBonus} from last round's Reroute Power)`
        : roeCtMod !== 0
        ? `${p.maxCommandTokens + roeCtMod} CT (${roeCtMod > 0 ? '+' : ''}${roeCtMod} from RoE: ${roe?.name ?? ''})`
        : `${p.maxCommandTokens} CT`;
      get().addLog('system', `[BRIEFING] ${p.name}: Command Tokens replenished ═  ${ctMsg} available`);
    });

    // ═ ══ ═ Tactic card ═ ══ ═
    get().addLog('tactic', `═x}═ ENEMY TACTIC: ${newTactic.name} ═  ${newTactic.effect}`);

    // ═ ══ ═ RoE Reminder ═ ══ ═
    if (newTactic.mechanicalEffect.shieldRestore) {
      get().addLog('system', `[TACTIC] Enemy shields restored by ${newTactic.mechanicalEffect.shieldRestore} in every sector.`);
    }
    if (newTactic.mechanicalEffect.reserveSquadronLaunch) {
      const reserveCount = updatedFighters.length - state.fighterTokens.filter(f => !f.isDestroyed).length;
      if (reserveCount > 0) {
        get().addLog('system', `[TACTIC] Reserve Squadron Launch deployed ${reserveCount} Strike Fighter(s).`);
      }
    }
    if (updatedTacticHazards.length > 0 && newTactic.mechanicalEffect.minefieldCount) {
      updatedTacticHazards.forEach(hazard => {
        get().addLog('system', `[TACTIC] ${hazard.name} armed at (${hazard.position.q},${hazard.position.r}).`);
      });
    }

    if (roe && !state.roeOverridden) {
      get().addLog('roe', `📋 RoE IN EFFECT: "${roe.name}" ═  ${roe.rule}`);
    } else if (state.roeOverridden) {
      get().addLog('roe', `📋 RoE: OVERRIDDEN — operating on own parameters.`);
    }

    // ═ ══ ═ Delayed Enemy Spawns (spawnRound) ═ ══ ═
    const currentRound = get().round;
    const spawnState = get();
    const dueSpawns = spawnState.pendingSpawns.filter(s => s.spawnRound === currentRound);
    if (dueSpawns.length > 0) {
      const newEnemies: EnemyShipState[] = dueSpawns.map((spawn, idx) => {
        const adv = getAdversaryById(spawn.adversaryId) ?? ADVERSARIES[0];
        return {
          id: `e-spawn-${currentRound}-${idx}`,
          name: `${adv.name} «Reinforcement»`,
          adversaryId: adv.id,
          position: spawn.position,
          facing: 3 as HexFacing,
          currentSpeed: adv.speed,
          currentHull: adv.hull,
          maxHull: adv.hull,
          baseEvasion: adv.baseEvasion,
          armorDie: adv.armorDie,
          shields: {
            fore: adv.shieldsPerSector, foreStarboard: adv.shieldsPerSector,
            aftStarboard: adv.shieldsPerSector, aft: adv.shieldsPerSector,
            aftPort: adv.shieldsPerSector, forePort: adv.shieldsPerSector,
          },
          maxShieldsPerSector: adv.shieldsPerSector,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
        };
      });

      set(s => ({
        enemyShips: [...s.enemyShips, ...newEnemies],
        pendingSpawns: s.pendingSpawns.filter(sp => sp.spawnRound !== currentRound),
      }));
      newEnemies.forEach(e => {
        get().addLog('system', `⚠ REINFORCEMENTS: ${e.name} entered the engagement zone at (${e.position.q},${e.position.r})!`);
      });
    }
  },


  // ═ ══ ══ ═ Override RoE ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  overrideRoE: () => {
    const state = get();
    if (state.roeOverridden || !state.activeRoE) return; // already overridden
    if (state.phase !== 'briefing') {
      get().addLog('system', 'Override can only be declared at the start of Phase 1 (Briefing).');
      return;
    }
    const roeName = state.activeRoE.name;
    set({ activeRoE: null, roeOverridden: true });
    get().adjustFleetFavor(-3);
    get().addLog('roe', `⚠ INSUBORDINATION: The War Council has overridden "${roeName}"! (-3 Fleet Favor). Operating on own parameters.`);
  },

  // ═ ══ ══ ═ Radio Silence Violation ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  reportRadioSilenceViolation: (playerId) => {
    const state = get();
    const roe = state.activeRoE;
    if (!roe || roe.id !== 'strict-radio-silence' || state.roeOverridden) {
      get().addLog('system', 'No active Radio Silence RoE — violation has no mechanical effect.');
      return;
    }
    const stressPenalty = roe.mechanicalEffect.commsViolationStress ?? 1;
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    const sensorsIdx = player.officers.findIndex(o => o.station === 'sensors');
    if (sensorsIdx === -1) return;
    const officer = player.officers[sensorsIdx];
    const officerData = getOfficerById(officer.officerId);

    const { newStress } = applyStress(officer, officerData!, stressPenalty);
    const updatedOfficers = [...player.officers];
    updatedOfficers[sensorsIdx] = { ...officer, currentStress: newStress };

    const updatedPlayers = state.players.map(p =>
      p.id === playerId ? { ...p, officers: updatedOfficers } : p
    );
    set({ players: updatedPlayers });
    get().addLog('roe', `🔇 RADIO SILENCE VIOLATION: ${officerData?.name ?? 'Sensors'} suffers +${stressPenalty} Stress for open comms! (${newStress} total)`);
  },

  invokeGhostMaker: (playerId) => {
    set(state => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;
      const player = state.players[playerIndex];
      const officerIndex = player.officers.findIndex(o => {
        return getOfficerById(o.officerId)?.traitName === 'Ghost Maker';
      });
      if (officerIndex === -1 || player.commandTokens < 1) return state;

      const officer = player.officers[officerIndex];
      const officerData = getOfficerById(officer.officerId);
      
      // Take 3 stress
      const { newStress } = applyStress(
        officer, officerData!, 3
      );

      const modifiedOfficer = {
        ...officer,
        currentStress: newStress,
      };

      const updatedPlayers = [...state.players];
      const updatedOfficers = [...player.officers];
      updatedOfficers[officerIndex] = modifiedOfficer;
      
      updatedPlayers[playerIndex] = {
        ...player,
        commandTokens: player.commandTokens - 1,
        officers: updatedOfficers,
      };

      return {
        players: updatedPlayers,
        currentTactic: null, // Cancel the tactic!
      };
    });
    get().addLog('system', `Ghost Maker activated! AI Tactic completely canceled.`);
  },

  // ═ ══ ══ ═ Miracle Worker (O'Bannon) ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  invokeMiracleWorker: (playerId, shipId, critId) => {
    set(state => {
      const playerIndex = state.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return state;
      const player = state.players[playerIndex];

      // Find O'Bannon (Miracle Worker trait)
      const officerIndex = player.officers.findIndex(o =>
        getOfficerById(o.officerId)?.traitName === 'Miracle Worker'
      );
      if (officerIndex === -1) return state;

      const officer = player.officers[officerIndex];
      if (officer.usedMiracleWorker) return state; // once per campaign

      // Remove the crit from the target ship
      const shipIndex = state.playerShips.findIndex(s => s.id === shipId);
      if (shipIndex === -1) return state;
      const targetShip = state.playerShips[shipIndex];

      const updatedShips = [...state.playerShips];
      updatedShips[shipIndex] = {
        ...targetShip,
        criticalDamage: targetShip.criticalDamage.filter(c => c.id !== critId),
      };

      // Mark O'Bannon as used (campaign-persistent)
      const updatedOfficers = [...player.officers];
      updatedOfficers[officerIndex] = { ...officer, usedMiracleWorker: true };

      const updatedPlayers = [...state.players];
      updatedPlayers[playerIndex] = { ...player, officers: updatedOfficers };

      return {
        players: updatedPlayers,
        playerShips: updatedShips,
      };
    });
    get().addLog('system', `O'Bannon calls in a miracle ═  critical damage cleared for free!`);
  },

  // ═ ══ ══ ═ CIC Sync (Aegis) ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  invokeCICSync: (aegisPlayerId, targetPlayerId, action) => {
    set(state => {
      const aegisPlayerIndex = state.players.findIndex(p => p.id === aegisPlayerId);
      if (aegisPlayerIndex === -1) return state;
      const aegisPlayer = state.players[aegisPlayerIndex];

      // Must have an Aegis chassis
      const aegisShip = state.playerShips.find(s => s.id === aegisPlayer.shipId);
      const chassis = getChassisById(aegisShip?.chassisId || '');
      if (chassis?.uniqueTraitName !== 'CIC Sync') return state;

      // Must have at least 1 CT
      if (aegisPlayer.commandTokens < 1) return state;

      const targetPlayerIndex = state.players.findIndex(p => p.id === targetPlayerId);
      if (targetPlayerIndex === -1) return state;
      const targetPlayer = state.players[targetPlayerIndex];

      if (targetPlayer.officers.some(o => o.traumas.some(t => t.id === 'comms-phobic'))) {
         get().addLog('system', `CIC Sync blocked: Target ship has a Comms-Phobic officer!`);
         return state;
      }

      // Find the target officer at the action's station
      const targetOfficerIndex = targetPlayer.officers.findIndex(o => o.station === action.station);
      if (targetOfficerIndex === -1) return state;
      const targetOfficer = targetPlayer.officers[targetOfficerIndex];
      const targetOfficerData = getOfficerById(targetOfficer.officerId);
      if (!targetOfficerData) return state;

      // Apply stress to the TARGET officer (Aegis pays CT, target suffers stress)
      const { newStress } = applyStress(
        targetOfficer, targetOfficerData, action.stressCost
      );

      const updatedTargetOfficers = [...targetPlayer.officers];
      updatedTargetOfficers[targetOfficerIndex] = {
        ...targetOfficer,
        currentStress: newStress,
        actionsPerformedThisRound: targetOfficer.actionsPerformedThisRound + 1,
      };

      const updatedPlayers = [...state.players];
      // Deduct 1 CT from Aegis player
      updatedPlayers[aegisPlayerIndex] = {
        ...aegisPlayer,
        commandTokens: aegisPlayer.commandTokens - 1,
      };
      
      // Update target player properly if it's the exact same player
      const isAegisSameAsTarget = aegisPlayerIndex === targetPlayerIndex;
      const targetPlayerRef = isAegisSameAsTarget ? updatedPlayers[aegisPlayerIndex] : targetPlayer;
      
      // Add action to target player's queue (they resolve it)
      updatedPlayers[targetPlayerIndex] = {
        ...targetPlayerRef,
        assignedActions: [...targetPlayerRef.assignedActions, { ...action, id: `cic-${Date.now()}` }],
        officers: updatedTargetOfficers,
      };

      return {
        players: updatedPlayers,
      };
    });
    get().addLog('system', `CIC Sync activated — allied officer action queued!`);
  },

  getShipName: (shipId) => {
    const s = get();
    const ship = s.playerShips.find(x => x.id === shipId) 
              || s.enemyShips.find(x => x.id === shipId)
              || s.fighterTokens.find(x => x.id === shipId);
    return ship?.name || shipId;
  },

  debugAutoWin: () => {
    get().addLog('system', '⚡ [DEBUG] Auto-Win triggered — all enemy ships destroyed.');
    set(state => ({
      enemyShips: state.enemyShips.map(e => ({ ...e, isDestroyed: true, currentHull: 0 })),
    }));
    get().checkGameOver();
  },

  selectDeploymentShip: (shipId) => {
    set(state => (state.deploymentMode ? { deploymentSelectedShipId: shipId } : state));
  },

  setDeploymentShipPosition: (shipId, position) => {
    const state = get();
    if (!state.deploymentMode) return false;
    if (!isHexWithinBounds(position, state.deploymentBounds)) return false;
    if (!isHexOpenAndUnoccupied(state, position, shipId)) return false;

    set({
      playerShips: state.playerShips.map(ship =>
        ship.id === shipId ? { ...ship, position } : ship,
      ),
      deploymentSelectedShipId: shipId,
    });
    return true;
  },

  rotateDeploymentShip: (shipId, delta = 1) => {
    const state = get();
    if (!state.deploymentMode) return;
    set({
      playerShips: state.playerShips.map(ship =>
        ship.id === shipId
          ? { ...ship, facing: (((ship.facing + delta) % 6 + 6) % 6) as HexFacing }
          : ship,
      ),
      deploymentSelectedShipId: shipId,
    });
  },

  confirmDeployment: () => {
    const state = get();
    if (!state.deploymentMode) return;
    set({
      deploymentMode: false,
      deploymentBounds: null,
      deploymentSelectedShipId: null,
    });
    state.deploymentRevealLogs.forEach(line => get().addLog('system', line));
    get().advancePhase();
  },

  // ═ ══ ══ ═ Cleanup Phase ═ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ══ ═
  executeCleanupPhase: () => {
    const state = get();
    const roe = state.activeRoE;

    get().addLog('phase', `══ CLEANUP PHASE ═  Round ${state.round}`);

    // ─── RoE: "Zero-Tolerance for Cowardice" — Stress on retreat/stationary ───
    let currentPlayers = state.players;
    if (roe?.mechanicalEffect.stressOnRetreatOrStationary && !state.roeOverridden) {
      const stressAmount = roe.mechanicalEffect.stressOnRetreatOrStationary;
      
      currentPlayers = currentPlayers.map(player => {
        const pShip = state.playerShips.find(s => s.id === player.shipId);
        if (!pShip || pShip.isDestroyed || !pShip.positionAtStartOfRound) return player;

        let cowardly = false;
        if (pShip.currentSpeed === 0) {
          cowardly = true;
          get().addLog('roe', `🚫 ZERO-TOLERANCE FOR COWARDICE: ${pShip.name} ended Execution with Speed 0!`);
        } else {
          let minDistAtStart = Infinity;
          let minDistNow = Infinity;

          state.enemyShips.forEach(eShip => {
            if (eShip.isDestroyed) return;
            const dStart = hexDistance(pShip.positionAtStartOfRound!, eShip.position);
            const dNow = hexDistance(pShip.position, eShip.position);
            if (dStart < minDistAtStart) minDistAtStart = dStart;
            if (dNow < minDistNow) minDistNow = dNow;
          });

          if (minDistNow > minDistAtStart && minDistNow !== Infinity) {
            cowardly = true;
            get().addLog('roe', `🚫 ZERO-TOLERANCE FOR COWARDICE: ${pShip.name} is retreating from nearest enemies (Dist: ${minDistAtStart} ═  ${minDistNow})!`);
          }
        }

        if (cowardly) {
          let newOfficers = [...player.officers];
          const helmIdx = newOfficers.findIndex(o => o.station === 'helm');
          if (helmIdx !== -1) {
            const helmOff = newOfficers[helmIdx];
            const helmData = getOfficerById(helmOff.officerId);
            const { newStress } = applyStress(helmOff, helmData!, stressAmount);
            newOfficers[helmIdx] = { ...helmOff, currentStress: newStress };
            get().addLog('roe', `HELM OFFICER suffers +${stressAmount} Stress! (${newStress} total)`);
          }
          return { ...player, officers: newOfficers };
        }
        return player;
      });
      // Do NOT set yet, pass it down to recovery logic below
    }


    // ─── 0. Gravity Well pull ────────────────────────────────────────
    // Collect all gravity well hexes from the terrain map
    const gravityWellHexes: HexCoord[] = [];
    state.terrainMap.forEach((type, key) => {
      if (type === 'gravityWell') gravityWellHexes.push(parseHexKey(key));
    });

    if (gravityWellHexes.length > 0) {
      const occupiedHexes = new Set<string>();
      state.playerShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));
      state.enemyShips.forEach(s => !s.isDestroyed && occupiedHexes.add(hexKey(s.position)));

      const pullResults = applyGravityWellPull(
        state.playerShips, state.enemyShips, gravityWellHexes, occupiedHexes
      );

      pullResults.forEach(result => {
        const movedOrNot = result.fromPos.q !== result.toPos.q || result.fromPos.r !== result.toPos.r;
        const shipName = get().getShipName(result.shipId);
        if (result.collisionDamage > 0) {
          // Collision: ship stays, takes hull damage
          if (result.isPlayer) {
            const s = state.playerShips.find(x => x.id === result.shipId);
            if (s) get().updatePlayerShip(result.shipId, {
              currentHull: Math.max(0, s.currentHull - result.collisionDamage),
              isDestroyed: (s.currentHull - result.collisionDamage) <= 0,
            });
          } else {
            const s = state.enemyShips.find(x => x.id === result.shipId);
            if (s) get().updateEnemyShip(result.shipId, {
              currentHull: Math.max(0, s.currentHull - result.collisionDamage),
              isDestroyed: (s.currentHull - result.collisionDamage) <= 0,
            });
          }
          get().addLog('movement',
            `🌀 GRAVITY WELL: ${shipName} pulled but BLOCKED by occupied hex ═  ${result.collisionDamage} hull damage!`);
        } else if (movedOrNot) {
          if (result.isPlayer) {
            get().updatePlayerShip(result.shipId, { position: result.toPos });
          } else {
            get().updateEnemyShip(result.shipId, { position: result.toPos });
          }
          get().addLog('movement',
            `🌀 GRAVITY WELL: ${shipName} pulled (${result.fromPos.q},${result.fromPos.r}) ═  (${result.toPos.q},${result.toPos.r})`);
        }
      });
    }

    // Re-read state after gravity pull mutations
    const stateAfterGravity = get();

    const extractionShips = stateAfterGravity.playerShips.filter(ship =>
      stateAfterGravity.extractionWindowShipIds.includes(ship.id) && !ship.isDestroyed && !ship.warpedOut
    );
    if (extractionShips.length > 0) {
      set(s => ({
        playerShips: s.playerShips.map(ship =>
          extractionShips.some(extractionShip => extractionShip.id === ship.id)
            ? { ...ship, warpedOut: true }
            : ship
        ),
        warpedOutShipIds: Array.from(new Set([...s.warpedOutShipIds, ...extractionShips.map(ship => ship.id)])),
        successfulEscapes: s.successfulEscapes + extractionShips.length,
      }));
      extractionShips.forEach(ship => {
        get().addLog('system', `Fleet Asset: Extraction Window withdrew ${ship.name} at end of round.`);
      });
    }

    // 1. Shield regeneration (read from updated state)
    const updatedShips = stateAfterGravity.playerShips.map(ship => {
      const generatorOffline = ship.criticalDamage.some(c => c.id === 'shield-generator-offline');
      const insideNebula = stateAfterGravity.terrainMap.get(hexKey(ship.position)) === 'ionNebula';
      // Ion Nebula and offline generator both suppress regen
      const newShields = (insideNebula || generatorOffline)
        ? ship.shields
        : regenerateShields(ship.shields, ship.maxShieldsPerSector, false);
      return {
        ...ship,
        shields: newShields,
        evasionModifiers: 0, // reset evasion modifiers
        targetLocks: [],
        targetLocksRerolls: 0,
        targetLockArmorPiercingShots: 0,
      };
    });

    const updatedEnemyShips = stateAfterGravity.enemyShips.map(ship => {
      const adversary = getAdversaryById(ship.adversaryId);
      const maxPerSector = adversary?.shieldsPerSector ?? 0;
      const generatorOffline = ship.criticalDamage?.some(c => c.id === 'enemy-generator-offline');
      const insideNebula = stateAfterGravity.terrainMap.get(hexKey(ship.position)) === 'ionNebula';
      const newShields = (insideNebula || generatorOffline || maxPerSector === 0)
        ? ship.shields
        : regenerateShields(ship.shields, maxPerSector, false);
      return {
        ...ship,
        shields: newShields,
        targetLocks: [],
        targetLocksRerolls: 0,
        targetLockArmorPiercingShots: 0,
        evasionModifiers: 0,
      };
    });

    // Log shield regen — player ships
    updatedShips.forEach((ship, i) => {
      const prev = stateAfterGravity.playerShips[i];
      const generatorOffline = prev.criticalDamage.some(c => c.id === 'shield-generator-offline');
      const insideNebula = stateAfterGravity.terrainMap.get(hexKey(ship.position)) === 'ionNebula';
      if (insideNebula) {
        get().addLog('system', `${ship.name}: Inside Ion Nebula ═  shields cannot regenerate`);
      } else if (generatorOffline) {
        get().addLog('system', `${ship.name}: Shield generator OFFLINE ═  no regen`);
      } else {
        const sectors = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'] as const;
        const gained = sectors.reduce((sum, s) => sum + (ship.shields[s] - prev.shields[s]), 0);
        if (gained > 0) {
          get().addLog('system', `${ship.name}: Shields regenerated (+${gained} total)`);
        } else {
          get().addLog('system', `${ship.name}: Shields at max ═  no regen needed`);
        }
      }
    });

    // Log shield regen — enemy ships
    updatedEnemyShips.forEach((ship, i) => {
      const prev = stateAfterGravity.enemyShips[i];
      const adversary = getAdversaryById(ship.adversaryId);
      const maxPerSector = adversary?.shieldsPerSector ?? 0;
      if (maxPerSector === 0) return; // fighters have no shields
      const generatorOffline = prev.criticalDamage?.some(c => c.id === 'enemy-generator-offline');
      const insideNebula = stateAfterGravity.terrainMap.get(hexKey(ship.position)) === 'ionNebula';
      if (insideNebula) {
        get().addLog('system', `${ship.name}: Inside Ion Nebula ═  shields cannot regenerate`);
      } else if (generatorOffline) {
        get().addLog('system', `${ship.name}: Shield generator OFFLINE ═  no regen`);
      } else {
        const sectors = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'] as const;
        const gained = sectors.reduce((sum, s) => sum + (ship.shields[s] - prev.shields[s]), 0);
        if (gained > 0) {
          get().addLog('system', `${ship.name}: Shields regenerated (+${gained} total)`);
        } else {
          get().addLog('system', `${ship.name}: Shields at max ═  no regen needed`);
        }
      }
    });

    const isSafeSpace = (shipLevelPos: HexCoord) => {
      // Check if any enemy is within range 3
      return !stateAfterGravity.enemyShips.some(enemy => !enemy.isDestroyed && hexDistance(enemy.position, shipLevelPos) <= 3);
    };

    let updatedPlayers = currentPlayers.map(player => {
      const ship = updatedShips.find(s => s.id === player.shipId);
      const safe = ship ? isSafeSpace(ship.position) : false;
      
      return {
        ...player,
        officers: player.officers.map(o => {
          const recovery = calculateStressRecovery(o, safe);
          const newStress = recoverStress(o.currentStress, recovery);

          const officerData = getOfficerById(o.officerId);
          const name = officerData?.name ?? o.station;

          // Log stress recovery
          if (recovery < 0 && o.currentStress > 0) {
            get().addLog('stress',
              `${name}: Stress ${o.currentStress} ═   ${newStress} (recovered ${Math.abs(recovery)})${safe && o.actionsPerformedThisRound === 1 ? ' [safe space]' : ''}`
            );
          } else if (recovery === 0 && o.currentStress > 0) {
            if (o.actionsPerformedThisRound > 1) {
              get().addLog('stress', `${name}: No stress recovery ═  Heavy workload (2+ actions)`);
            }
          }

          // Recover from Nerve Collapse if stress hits 0
          let restoredTier = o.currentTier;
          let recoveredNerve = false;
          if (newStress === 0 && o.hasNerveCollapse && officerData) {
            restoredTier = officerData.defaultTier;
            recoveredNerve = true;
          }

          if (recoveredNerve) {
             get().addLog('system', `${name} recovered their composure (Nerve Collapse ended).`);
          }

          return { 
             ...o, 
             currentStress: newStress,
             hasNerveCollapse: newStress === 0 ? false : o.hasNerveCollapse,
             currentTier: restoredTier 
          };
        })
      };
    });

    if (hasActiveTech(stateAfterGravity.experimentalTech, 'astro-caf-synthesizer')) {
      updatedPlayers = updatedPlayers.map(player => {
        const ship = updatedShips.find(s => s.id === player.shipId);
        if (!ship || ship.isDestroyed || !canUseAstroCaf(stateAfterGravity.shipsWithHullDamageThisRound.includes(ship.id), stateAfterGravity.experimentalTech)) {
          return player;
        }

        let recoveredOfficerName: string | null = null;
        const updatedOfficers = player.officers.map(officer => ({ ...officer }));
        const stressedOfficer = updatedOfficers
          .filter(officer => officer.currentStress > 0)
          .sort((a, b) => b.currentStress - a.currentStress)[0];

        if (!stressedOfficer) {
          get().addLog('system', `Experimental Tech: Astro-Caf Synthesizer had no stress to clear on ${ship.name}.`);
          return player;
        }

        const stressedOfficerIndex = updatedOfficers.findIndex(officer => officer.officerId === stressedOfficer.officerId);
        if (stressedOfficerIndex !== -1) {
          updatedOfficers[stressedOfficerIndex] = {
            ...updatedOfficers[stressedOfficerIndex],
            currentStress: Math.max(0, updatedOfficers[stressedOfficerIndex].currentStress - 1),
          };
          recoveredOfficerName = getOfficerById(stressedOfficer.officerId)?.name ?? stressedOfficer.station;
        }

        if (recoveredOfficerName) {
          get().addLog('system', `Experimental Tech: Astro-Caf Synthesizer removed 1 Stress from ${recoveredOfficerName} aboard ${ship.name}.`);
        }

        return { ...player, officers: updatedOfficers };
      });
    }

    set({ playerShips: updatedShips, enemyShips: updatedEnemyShips, players: updatedPlayers });

    // Trauma Hook: Claustrophobic — +2 Stress if ship ends Execution adjacent to Asteroid/Debris terrain.
    // Applied AFTER recovery so stress recovery in this same cleanup phase doesn't wipe it.
    const claustroTerrain = new Set<string>();
    state.terrainMap.forEach((type, key) => {
      if (type === 'asteroids' || type === 'debrisField') claustroTerrain.add(key);
    });
    if (claustroTerrain.size > 0) {
      get().players.forEach(player => {
        const pShip = get().playerShips.find(s => s.id === player.shipId);
        if (!pShip || pShip.isDestroyed) return;
        const isAdjacentToTerrain = Array.from(claustroTerrain).some(key => {
          const [q, r] = key.split(',').map(Number);
          return hexDistance(pShip.position, { q, r }) === 1;
        });
        if (!isAdjacentToTerrain) return;
        set(innerState => {
          const pIdx = innerState.players.findIndex(p => p.id === player.id);
          if (pIdx === -1) return innerState;
          const pl = innerState.players[pIdx];
          const newOfficers = pl.officers.map(o => {
            if (!o.traumas.some(t => t.id === 'claustrophobic')) return o;
            const officerData = getOfficerById(o.officerId);
            get().addLog('stress', `[Trauma] Claustrophobic: ${officerData?.name} gained +2 Stress — ship adjacent to hazardous terrain!`);
            const maxStress = getCombatMaxStress(o, officerData, get().experimentalTech) ?? 99;
            return { ...o, currentStress: Math.min(maxStress, o.currentStress + 2) };
          });
          if (newOfficers.some((o, i) => o.currentStress !== pl.officers[i].currentStress)) {
            const newPlayers = [...innerState.players];
            newPlayers[pIdx] = { ...pl, officers: newOfficers };
            return { players: newPlayers };
          }
          return innerState;
        });
      });
    }

    // ─── Solar Flare Hazard ───────────────────────────────────────────
    // If a Solar Flare rule is active, roll D6 at the end of each round.
    // On 1 or 2, ALL ships (player + enemy) take 1 unblockable hull damage.
    const flareRule = get().scenarioRules.find(r => r.startsWith('Solar Flare'));
    if (flareRule) {
      const flareRoll = rollDie('d6');
      get().addLog('system', `☀ SOLAR FLARE ACTIVITY: D6 roll = ${flareRoll}${flareRoll <= 2 ? ' — FLARE HITS! All ships take 1 unblockable hull damage!' : ' — No flare this round.'}`);
      if (flareRoll <= 2) {
        get().playerShips
          .filter(s => !s.isDestroyed && !s.warpedOut)
          .forEach(s => {
            const newHull = Math.max(0, s.currentHull - 1);
            get().updatePlayerShip(s.id, { currentHull: newHull, isDestroyed: newHull === 0 });
            get().addLog('damage', `☀ Solar Flare: ${s.name} takes 1 unblockable hull damage (${newHull} remaining).`);
          });
        get().enemyShips
          .filter(s => !s.isDestroyed)
          .forEach(s => {
            const newHull = Math.max(0, s.currentHull - 1);
            get().updateEnemyShip(s.id, { currentHull: newHull, isDestroyed: newHull === 0 });
            get().addLog('damage', `☀ Solar Flare: ${s.name} takes 1 unblockable hull damage (${newHull} remaining).`);
          });
      }
    }

    // ─── Data Siphon: adjacency check ───────────────────────────────
    // Each round, for each unsiphoned Comm Relay, check if any player ship
    // ended the round on or adjacent to it. If so, mark it siphoned.
    if (get().objectiveType === 'Data Siphon') {
      const relayNames = ['Comm Relay Alpha', 'Comm Relay Beta', 'Comm Relay Gamma'];
      const liveMarkers = get().objectiveMarkers;
      const alreadySiphoned = get().dataSiphonedRelayNames;
      const livePlayerShips = get().playerShips.filter(s => !s.isDestroyed && !s.warpedOut);

      const newlySiphoned: string[] = [];
      relayNames.forEach(relayName => {
        if (alreadySiphoned.includes(relayName)) return; // already done
        const relay = liveMarkers.find(m => m.name === relayName && !m.isCollected && !m.isDestroyed);
        if (!relay) return;
        const shipAdjacent = livePlayerShips.some(s => hexDistance(s.position, relay.position) <= 1);
        if (shipAdjacent) {
          newlySiphoned.push(relayName);
          get().updateObjectiveMarker(relayName, { isCollected: true });
          get().addLog('system', `📡 DATA SIPHON: ${relayName} successfully siphoned! (${alreadySiphoned.length + newlySiphoned.length}/3)`);
        }
      });

      if (newlySiphoned.length > 0) {
        set(s => ({ dataSiphonedRelayNames: [...s.dataSiphonedRelayNames, ...newlySiphoned] }));
      }
    }

    get().checkGameOver();
    if (!get().gameOver) {
      get().advancePhase();
    }
  },
}));
