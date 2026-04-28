import type { GamePhase, ExecutionStep, ShipState, EnemyShipState, PlayerState, RoECard, TacticCard, FumbleCard, CriticalDamageCard, HexCoord, TerrainType, LogEntry, ObjectiveMarkerState, StationState } from '../types/game';
import { ShipSize } from '../types/game';

// ═══════════════════════════════════════════════════════════════════
// Game State Machine — 4-Phase Round Loop
// ═══════════════════════════════════════════════════════════════════

export interface GameState {
  phase: GamePhase;
  round: number;
  executionStep: ExecutionStep | null;
  resolvedSteps: ExecutionStep[];

  // Players
  players: PlayerState[];

  // Ships
  playerShips: ShipState[];
  enemyShips: EnemyShipState[];
  stations: StationState[];

  // Board
  terrainMap: Map<string, TerrainType>;
  occupiedHexes: Set<string>;

  // Decks
  tacticDeck: TacticCard[];
  fumbleDeck: FumbleCard[];
  playerCritDeck: CriticalDamageCard[];
  enemyCritDeck: CriticalDamageCard[];

  // Current cards
  /** The single Rules of Engagement card drawn at mission start. Null = overridden. */
  activeRoE: RoECard | null;
  currentTactic: TacticCard | null;
  /** True if the players already paid -3 FF to override the RoE this mission */
  roeOverridden: boolean;

  // Fleet Favor
  fleetFavor: number;

  // Log
  log: LogEntry[];

  // Combat Stats
  smallShipsDestroyedThisMission: number;

  // Scenario
  scenarioId: string;
  maxRounds: number | null;

  // Scenario objectives
  objectiveType: string;
  objectiveMarkers: ObjectiveMarkerState[];
  /** Ship IDs that have successfully jumped to warp (Breakout / Salvage Run objectives). */
  warpedOutShipIds: string[];
  /** Number of supply crates collected so far (Salvage Run objective). */
  salvageCratesCollected: number;
  /** Names of Comm Relays that have been siphoned (Data Siphon objective). */
  dataSiphonedRelayNames: string[];
  /** Number of player ships that successfully escaped via the objective-required zone (Breakout). */
  successfulEscapes: number;

  // Flags
  gameOver: boolean;
  victory: boolean | null;
}

/**
 * Phase transition logic.
 * BRIEFING → COMMAND → EXECUTION → CLEANUP → (next round) BRIEFING
 */
export function getNextPhase(currentPhase: GamePhase): GamePhase {
  switch (currentPhase) {
    case 'setup': return 'briefing';
    case 'briefing': return 'command';
    case 'command': return 'execution';
    case 'execution': return 'cleanup';
    case 'cleanup': return 'briefing';
    case 'gameOver': return 'gameOver';
    default: return 'briefing';
  }
}

/**
 * Execution sub-step order (by ship size, allied then enemy).
 */
export const EXECUTION_STEP_ORDER: ExecutionStep[] = [
  'smallAllied',
  'smallEnemy',
  'mediumAllied',
  'mediumEnemy',
  'largeAllied',
  'largeEnemy',
];

export function getNextExecutionStep(current: ExecutionStep | null): ExecutionStep | null {
  if (current === null) return EXECUTION_STEP_ORDER[0];
  const idx = EXECUTION_STEP_ORDER.indexOf(current);
  if (idx < EXECUTION_STEP_ORDER.length - 1) return EXECUTION_STEP_ORDER[idx + 1];
  return null; // execution complete
}

export function getShipSizeForStep(step: ExecutionStep): ShipSize {
  if (step.startsWith('small')) return ShipSize.Small;
  if (step.startsWith('medium')) return ShipSize.Medium;
  return ShipSize.Large;
}

export function isAlliedStep(step: ExecutionStep): boolean {
  return step.endsWith('Allied');
}

// ─── Breakout escape zone ────────────────────────────────────────
// "Upper right" of the map — enemy territory.
// A hex qualifies when its axial diagonal (q - r) >= 12, which maps to
// the far upper-right quadrant (high positive q, high negative r).
// Ships that drift beyond the normal GRID_RADIUS also qualify.
export function isInBreakoutZone(pos: HexCoord): boolean {
  return (pos.q - pos.r) >= 12;
}

/**
 * Check victory/defeat conditions — scenario-aware.
 */
export function checkGameOverConditions(state: GameState): {
  gameOver: boolean;
  victory: boolean | null;
  reason: string;
} {
  // ── Universal Defeat: Fleet Favor ────────────────────────────────
  if (state.fleetFavor <= -5) {
    return { gameOver: true, victory: false, reason: 'Fleet Favor dropped to -5. High Command has abandoned you.' };
  }

  // ── Universal Defeat: All ships destroyed (warped-out ships are safe) ──
  const notWarped = state.playerShips.filter(s => !s.warpedOut);
  if (notWarped.length > 0 && notWarped.every(s => s.isDestroyed)) {
    return { gameOver: true, victory: false, reason: 'All player ships destroyed.' };
  }

  // ── Objective-specific Victory conditions ────────────────────────
  const obj = state.objectiveType;

  // Default / Search & Destroy
  if (!obj || obj === 'Search & Destroy') {
    const enemiesExist = state.enemyShips.length > 0 || (state.stations ?? []).length > 0;
    const allEnemiesDestroyed = state.enemyShips.every(s => s.isDestroyed) && (state.stations ?? []).every(s => s.isDestroyed);
    if (enemiesExist && allEnemiesDestroyed) {
      return { gameOver: true, victory: true, reason: 'All enemy forces eliminated. Victory!' };
    }
  }

  if (obj === 'Assassination') {
    const flagship = state.enemyShips.find(s => s.name.includes('(Flagship)'));
    if (flagship?.isDestroyed) {
      return { gameOver: true, victory: true, reason: 'Flagship eliminated. The Hegemony command structure is broken. Victory!' };
    }
  }

  if (obj === 'Station Siege') {
    const primaryStations = (state.stations ?? []).filter(s => ['outpost', 'forward-base', 'orbital-station'].includes(s.stationId));
    if (primaryStations.length > 0 && primaryStations.every(s => s.isDestroyed)) {
      return { gameOver: true, victory: true, reason: 'Primary station destroyed. Mission accomplished. Victory!' };
    }
  }

  if (obj === 'Turret Breach') {
    if ((state.stations ?? []).length > 0 && (state.stations ?? []).every(s => s.isDestroyed)) {
      return { gameOver: true, victory: true, reason: 'Defensive picket cleared. Victory!' };
    }
  }

  if (obj === 'Breakout') {
    const surviving = state.playerShips.filter(s => !s.isDestroyed);
    const needed = Math.ceil(surviving.length / 2);
    if (state.successfulEscapes >= Math.max(1, needed)) {
      return { gameOver: true, victory: true, reason: `${state.successfulEscapes} ship(s) successfully escaped through the zone. Breakout successful!` };
    }
  }

  if (obj === 'Data Siphon') {
    const relayNames = ['Comm Relay Alpha', 'Comm Relay Beta', 'Comm Relay Gamma'];
    const allSiphoned = relayNames.every(n => state.dataSiphonedRelayNames.includes(n));
    if (allSiphoned) {
      return { gameOver: true, victory: true, reason: 'All Comm Relays siphoned. Intelligence extracted. Victory!' };
    }
  }

  if (obj === 'Hold the Line') {
    const alivePlayers = state.playerShips.filter(s => !s.isDestroyed);
    if ((state.round > 6 || (state.round === 6 && state.phase === 'cleanup')) && alivePlayers.length > 0) {
      return { gameOver: true, victory: true, reason: 'Civilian transports safely evacuated. The line held. Victory!' };
    }
  }

  if (obj === 'Salvage Run') {
    // Collect 3 crates, then jump to warp
    if (state.salvageCratesCollected >= 3 && state.warpedOutShipIds.length >= 1) {
      return { gameOver: true, victory: true, reason: `${state.salvageCratesCollected} supply crates salvaged and fleet jumped to safety. Victory!` };
    }
  }

  // Handcrafted "Ambush at Kaelen-IV": Comms Array destruction = victory
  if (state.scenarioId === 'ambush-kaelen-iv') {
    const commsArray = state.objectiveMarkers.find(m => m.name === 'Hegemony Comms Array');
    if (commsArray?.isDestroyed) {
      return { gameOver: true, victory: true, reason: 'Hegemony Comms Array destroyed before reinforcements arrived. Victory!' };
    }
  }

  // Generic fallback: all enemies dead
  const enemiesExistFallback = state.enemyShips.length > 0 || (state.stations ?? []).length > 0;
  const allEnemiesDestroyedFallback = state.enemyShips.every(s => s.isDestroyed) && (state.stations ?? []).every(s => s.isDestroyed);
  if (enemiesExistFallback && allEnemiesDestroyedFallback) {
    return { gameOver: true, victory: true, reason: 'All enemy forces eliminated. Victory!' };
  }

  // ── Universal Defeat: Round Limit ────────────────────────────────
  if (state.maxRounds && state.round > state.maxRounds) {
    return { gameOver: true, victory: false, reason: `Round ${state.maxRounds} ended. The enemy fleet has arrived.` };
  }
  
  if (state.maxRounds && state.round === state.maxRounds && state.phase === 'cleanup') {
    return { gameOver: true, victory: false, reason: `Round ${state.maxRounds} ended. The enemy fleet has arrived.` };
  }

  // ── Universal Defeat: Retreat/Abandonment ──────────────────────
  // If no player ships are left on the map (all either destroyed or warped out)
  // and we haven't met any victory conditions above, it's a loss.
  const shipsOnBoard = state.playerShips.filter(s => !s.isDestroyed && !s.warpedOut);
  if (shipsOnBoard.length === 0) {
    return { gameOver: true, victory: false, reason: 'All player ships have either been destroyed or retreated to warp without completing the objective.' };
  }

  return { gameOver: false, victory: null, reason: '' };
}

/**
 * Create a log entry.
 */
export function createLogEntry(
  round: number,
  phase: GamePhase,
  type: LogEntry['type'],
  message: string,
  details?: Record<string, unknown>,
): LogEntry {
  return {
    id: `${round}-${phase}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    round,
    phase,
    timestamp: Date.now(),
    type,
    message,
    details,
  };
}
