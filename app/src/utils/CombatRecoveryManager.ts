/**
 * CombatRecoveryManager
 *
 * Handles serialization and restoration of active combat / tutorial state
 * so that battles interrupted by Android OS (phone call, low-memory kill,
 * etc.) can be resumed on the next app launch.
 *
 * Design notes:
 *  - Uses localStorage (synchronous) rather than IndexedDB so the write
 *    completes before the OS terminates the webview process.
 *  - The `terrainMap` (Map<string, TerrainType>) is converted to/from a
 *    plain array of entries for JSON serialization.
 *  - The recovery cache is intentionally lightweight: only combat-mode
 *    states are saved. Campaign-map state is always persisted via the
 *    multi-slot CampaignSaveManager and is not included here.
 */

import { useGameStore } from '../store/useGameStore';

// ─── App Mode type ────────────────────────────────────────────────────────────
// Mirrors the union literal inside App.tsx. Defined here and re-exported so
// that App.tsx can import it (avoiding a circular reference).
export type AppMode =
  | 'menu'
  | 'editor'
  | 'skirmish-builder'
  | 'campaign-builder'
  | 'skirmish'
  | 'campaign'
  | 'campaign-combat'
  | 'tutorial';

// ─── Constants ────────────────────────────────────────────────────────────────

const RECOVERY_KEY = 'CoC_Recovery_Cache';

/** App modes that contain live combat state worth recovering. */
const RECOVERABLE_MODES: AppMode[] = ['skirmish', 'campaign-combat', 'tutorial'];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecoverySnapshot {
  /** ISO timestamp when the snapshot was taken */
  savedAt: string;
  /** The app mode that was active when the snapshot was taken */
  appMode: AppMode;
  /** Serialized game store state (terrainMap converted to entries array) */
  gameState: Record<string, unknown>;
}

// ─── Serialization helpers ────────────────────────────────────────────────────

/**
 * Extracts the serializable slice of the game store state.
 * Converts the `terrainMap` Map into a plain entries array so it can
 * survive JSON.stringify / JSON.parse round-trips.
 */
function serializeGameState(): Record<string, unknown> {
  const state = useGameStore.getState();

  // Only serialize plain-data fields (skip functions).
  const {
    phase,
    round,
    executionStep,
    resolvedSteps,
    players,
    playerShips,
    enemyShips,
    fighterTokens,
    torpedoTokens,
    stations,
    terrainMap,
    tacticDeck,
    fumbleDeck,
    playerCritDeck,
    enemyCritDeck,
    activeRoE,
    roeOverridden,
    currentTactic,
    tacticHazards,
    fleetAssetRoundUses,
    fleetAssetScenarioUses,
    fleetAssetShipRoundUses,
    tacticalOverrideShipIds,
    targetingPackages,
    exposedEnemyShipId,
    flakUmbrellaShipId,
    extractionWindowShipIds,
    fleetFavor,
    startingFleetFavor,
    log,
    smallShipsDestroyedThisMission,
    scenarioId,
    maxRounds,
    gameOver,
    victory,
    gameOverReason,
    objectiveType,
    objectiveMarkers,
    scenarioRules,
    pendingSpawns,
    deploymentMode,
    deploymentBounds,
    deploymentSelectedShipId,
    deploymentRevealLogs,
    warpedOutShipIds,
    salvageCratesCollected,
    dataSiphonedRelayNames,
    successfulEscapes,
    experimentalTech,
    combatModifiers,
    tachyonMatrixUsedThisScenario,
    recycledCoolantUsedThisRound,
    inertialDampenersTriggeredShipIds,
    hardLightTriggeredShipIds,
    shipsWithHullDamageThisRound,
    pendingAstroCafPlayers,
  } = state;

  return {
    phase,
    round,
    executionStep,
    resolvedSteps,
    players,
    playerShips,
    enemyShips,
    fighterTokens,
    torpedoTokens,
    stations,
    // Serialize Map → entries array
    terrainMapEntries: Array.from(terrainMap.entries()),
    tacticDeck,
    fumbleDeck,
    playerCritDeck,
    enemyCritDeck,
    activeRoE,
    roeOverridden,
    currentTactic,
    tacticHazards,
    fleetAssetRoundUses,
    fleetAssetScenarioUses,
    fleetAssetShipRoundUses,
    tacticalOverrideShipIds,
    targetingPackages,
    exposedEnemyShipId,
    flakUmbrellaShipId,
    extractionWindowShipIds,
    fleetFavor,
    startingFleetFavor,
    log,
    smallShipsDestroyedThisMission,
    scenarioId,
    maxRounds,
    gameOver,
    victory,
    gameOverReason,
    objectiveType,
    objectiveMarkers,
    scenarioRules,
    pendingSpawns,
    deploymentMode,
    deploymentBounds,
    deploymentSelectedShipId,
    deploymentRevealLogs,
    warpedOutShipIds,
    salvageCratesCollected,
    dataSiphonedRelayNames,
    successfulEscapes,
    experimentalTech,
    combatModifiers,
    tachyonMatrixUsedThisScenario,
    recycledCoolantUsedThisRound,
    inertialDampenersTriggeredShipIds,
    hardLightTriggeredShipIds,
    shipsWithHullDamageThisRound,
    pendingAstroCafPlayers,
  };
}

/**
 * Restores game store state from a serialized snapshot.
 * Converts the `terrainMapEntries` array back into a Map.
 */
function deserializeGameState(gameState: Record<string, unknown>): void {
  const { terrainMapEntries, ...rest } = gameState;

  const terrainMap = new Map<string, string>(
    (terrainMapEntries as [string, string][]) ?? [],
  );

  // Patch the store directly. This mirrors how CampaignSaveManager.load()
  // works — we bypass initializeGame() so we don't re-shuffle decks or
  // redraw cards, preserving the exact mid-battle state.
  useGameStore.setState({
    ...(rest as unknown as Parameters<typeof useGameStore.setState>[0]),
    terrainMap: terrainMap as Map<string, import('../types/game').TerrainType>,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const CombatRecoveryManager = {
  /**
   * Returns true if a valid recovery snapshot exists in localStorage.
   */
  hasRecovery(): boolean {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return false;
      const snap = JSON.parse(raw) as RecoverySnapshot;
      // Sanity-check: must be a recoverable mode and not already game-over
      return (
        RECOVERABLE_MODES.includes(snap.appMode) &&
        snap.gameState.gameOver === false
      );
    } catch {
      return false;
    }
  },

  /**
   * Reads and returns the recovery snapshot metadata (timestamp & mode)
   * without restoring it, so the UI can display context to the player.
   * Returns null if no valid snapshot exists.
   */
  getSnapshotMeta(): { savedAt: string; appMode: AppMode; round: number } | null {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return null;
      const snap = JSON.parse(raw) as RecoverySnapshot;
      if (!RECOVERABLE_MODES.includes(snap.appMode)) return null;
      return {
        savedAt: snap.savedAt,
        appMode: snap.appMode,
        round: (snap.gameState.round as number) ?? 0,
      };
    } catch {
      return null;
    }
  },

  /**
   * Writes the current game store state to the recovery cache.
   * Only writes if the app is currently in a recoverable mode AND the
   * game is not already over.
   *
   * @param appMode - The active app mode from App.tsx
   */
  saveRecovery(appMode: AppMode): void {
    if (!RECOVERABLE_MODES.includes(appMode)) return;

    const state = useGameStore.getState();
    // Don't cache a finished battle — it has nothing to recover
    if (state.gameOver) return;
    // Don't cache if there are no ships (empty / uninitialized state)
    if (state.playerShips.length === 0) return;

    try {
      const snapshot: RecoverySnapshot = {
        savedAt: new Date().toISOString(),
        appMode,
        gameState: serializeGameState(),
      };
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(snapshot));
    } catch (e) {
      // If storage is full we silently fail — recovery is best-effort
      console.warn('[CombatRecoveryManager] Failed to write recovery cache:', e);
    }
  },

  /**
   * Restores the game store state from the recovery cache.
   * Returns the appMode that should be re-activated, or null if the load
   * failed.
   */
  loadRecovery(): AppMode | null {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return null;
      const snap = JSON.parse(raw) as RecoverySnapshot;
      if (!RECOVERABLE_MODES.includes(snap.appMode)) return null;

      deserializeGameState(snap.gameState);
      // Clear the cache so a second launch won't re-offer recovery
      localStorage.removeItem(RECOVERY_KEY);
      return snap.appMode;
    } catch (e) {
      console.error('[CombatRecoveryManager] Failed to restore recovery cache:', e);
      this.clearRecovery();
      return null;
    }
  },

  /**
   * Deletes the recovery cache unconditionally (e.g. when the player
   * deliberately returns to the main menu, or when a battle completes).
   */
  clearRecovery(): void {
    localStorage.removeItem(RECOVERY_KEY);
  },
};
