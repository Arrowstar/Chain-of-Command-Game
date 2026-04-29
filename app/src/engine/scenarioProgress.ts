import type { EnemyShipState, ObjectiveMarkerState, ShipState, StationState } from '../types/game';

export interface CombatScenarioProgressItem {
  id: string;
  label: string;
  requirement: string;
  statusText: string;
  isComplete: boolean;
}

export interface CombatScenarioProgress {
  title: string;
  summary: string;
  items: CombatScenarioProgressItem[];
  completedCount: number;
  totalCount: number;
}

export interface ScenarioProgressState {
  objectiveType: string;
  scenarioId: string;
  round: number;
  playerShips: ShipState[];
  enemyShips: EnemyShipState[];
  stations: StationState[];
  objectiveMarkers: ObjectiveMarkerState[];
  warpedOutShipIds: string[];
  salvageCratesCollected: number;
  dataSiphonedRelayNames: string[];
  successfulEscapes: number;
}

const DEFAULT_RELAY_NAMES = ['Comm Relay Alpha', 'Comm Relay Beta', 'Comm Relay Gamma'];
const DEFAULT_CRATE_NAMES = ['Supply Crate 1', 'Supply Crate 2', 'Supply Crate 3'];

function sortMarkersByName(markers: ObjectiveMarkerState[]) {
  return [...markers].sort((a, b) => a.name.localeCompare(b.name));
}

function countOperationalShips(playerShips: ShipState[]) {
  return playerShips.filter(ship => !ship.isDestroyed).length;
}

function countDestroyedEnemies(enemyShips: EnemyShipState[]) {
  return enemyShips.filter(ship => ship.isDestroyed).length;
}

function getFlagship(enemyShips: EnemyShipState[]) {
  return enemyShips.find(ship => ship.name.includes('(Flagship)'));
}

function getMarkerStatus(marker: ObjectiveMarkerState | undefined, completeLabel: string, pendingLabel: string) {
  if (!marker) {
    return pendingLabel;
  }

  if (marker.isCollected || marker.isDestroyed) {
    return completeLabel;
  }

  if (marker.maxHull > 0) {
    return `Hull ${Math.max(0, marker.hull)}/${marker.maxHull}`;
  }

  return pendingLabel;
}

function finalizeProgress(title: string, summary: string, items: CombatScenarioProgressItem[]): CombatScenarioProgress {
  const completedCount = items.filter(item => item.isComplete).length;
  return {
    title,
    summary,
    items,
    completedCount,
    totalCount: items.length,
  };
}

export function getCombatScenarioProgress(state: ScenarioProgressState): CombatScenarioProgress | null {
  const objectiveType = state.objectiveType || 'Search & Destroy';

  if (state.scenarioId === 'ambush-kaelen-iv') {
    const array = state.objectiveMarkers.find(marker => marker.name === 'Hegemony Comms Array');
    const arrayDestroyed = !!array?.isDestroyed;

    return finalizeProgress(
      'Ambush at Kaelen-IV',
      'Destroy the Hegemony Comms Array before reinforcements arrive.',
      [
        {
          id: 'destroy-comms-array',
          label: 'Destroy Hegemony Comms Array',
          requirement: 'Reduce the array to 0 hull before the mission timer runs out.',
          statusText: getMarkerStatus(array, 'Destroyed', 'Target awaiting engagement'),
          isComplete: arrayDestroyed,
        },
      ],
    );
  }

  if (objectiveType === 'Assassination') {
    const flagship = getFlagship(state.enemyShips);
    const flagshipDestroyed = !!flagship?.isDestroyed;

    return finalizeProgress(
      'Assassination',
      'Destroy the marked flagship. Escort losses are secondary to the kill.',
      [
        {
          id: 'eliminate-flagship',
          label: 'Eliminate the flagship',
          requirement: 'Focus fire on the enemy ship marked as the flagship until it is destroyed.',
          statusText: flagship
            ? (flagshipDestroyed ? 'Flagship destroyed' : `Hull ${flagship.currentHull}/${flagship.maxHull}`)
            : 'Flagship not yet identified',
          isComplete: flagshipDestroyed,
        },
      ],
    );
  }

  if (objectiveType === 'Breakout') {
    const operationalShips = countOperationalShips(state.playerShips);
    const requiredEscapes = Math.max(1, Math.ceil(operationalShips / 2));
    const escapesComplete = state.successfulEscapes >= requiredEscapes;

    return finalizeProgress(
      'Breakout',
      'Get enough surviving ships through the highlighted escape zone, then jump them to warp.',
      [
        {
          id: 'escape-through-zone',
          label: 'Escape through the zone',
          requirement: 'Move ships into the highlighted escape zone and use Jump to Warp from there.',
          statusText: `${state.successfulEscapes}/${requiredEscapes} required zone escapes completed`,
          isComplete: escapesComplete,
        },
      ],
    );
  }

  if (objectiveType === 'Data Siphon') {
    const relayNames = sortMarkersByName(
      state.objectiveMarkers.filter(marker => marker.name.startsWith('Comm Relay')),
    ).map(marker => marker.name);
    const namesToTrack = relayNames.length > 0 ? relayNames : DEFAULT_RELAY_NAMES;

    return finalizeProgress(
      'Data Siphon',
      'End a player ship on or adjacent to each relay during cleanup to siphon its intel.',
      namesToTrack.map(name => {
        const marker = state.objectiveMarkers.find(entry => entry.name === name);
        const isComplete = state.dataSiphonedRelayNames.includes(name) || !!marker?.isCollected;

        return {
          id: `relay-${name}`,
          label: name,
          requirement: 'Finish the round on or adjacent to this relay to complete the siphon.',
          statusText: isComplete ? 'Siphoned' : 'Awaiting ship on or adjacent at cleanup',
          isComplete,
        };
      }),
    );
  }

  if (objectiveType === 'Hold the Line') {
    const operationalShips = countOperationalShips(state.playerShips);
    const survivedToRoundSix = state.round >= 6 && operationalShips > 0;

    return finalizeProgress(
      'Hold the Line',
      'Keep at least one ship operational until the end of Round 6.',
      [
        {
          id: 'survive-until-round-six',
          label: 'Survive until Round 6',
          requirement: 'Maintain the defense until the end of Round 6.',
          statusText: `Round ${Math.min(state.round, 6)}/6`,
          isComplete: survivedToRoundSix,
        },
        {
          id: 'keep-ship-operational',
          label: 'Keep a ship operational',
          requirement: 'At least one allied ship must still be combat-capable.',
          statusText: `${operationalShips} ship(s) still operational`,
          isComplete: operationalShips > 0,
        },
      ],
    );
  }

  if (objectiveType === 'Salvage Run') {
    const crateNames = sortMarkersByName(
      state.objectiveMarkers.filter(marker => marker.name.startsWith('Supply Crate')),
    ).map(marker => marker.name);
    const namesToTrack = crateNames.length > 0 ? crateNames : DEFAULT_CRATE_NAMES;
    const escapedWithSalvage = state.salvageCratesCollected >= 3 && state.warpedOutShipIds.length >= 1;

    return finalizeProgress(
      'Salvage Run',
      'Collect three supply crates, then jump at least one ship to warp with the haul.',
      [
        ...namesToTrack.map(name => {
          const marker = state.objectiveMarkers.find(entry => entry.name === name);
          const isComplete = !!marker?.isCollected;

          return {
            id: `crate-${name}`,
            label: name,
            requirement: 'Move onto this crate hex and use Pick Up Supply Crate.',
            statusText: isComplete ? 'Secured' : 'Awaiting pickup',
            isComplete,
          };
        }),
        {
          id: 'escape-with-salvage',
          label: 'Jump to warp with the salvage',
          requirement: 'After securing 3 crates, jump at least one ship to warp to finish the mission.',
          statusText: `Crates ${state.salvageCratesCollected}/3 | Warped out ${Math.min(state.warpedOutShipIds.length, 1)}/1`,
          isComplete: escapedWithSalvage,
        },
      ],
    );
  }

  if (objectiveType === 'Station Siege') {
    const primaryStations = (state.stations ?? []).filter(s =>
      ['outpost', 'forward-base', 'orbital-station'].includes(s.stationId),
    );
    const totalPrimary = primaryStations.length;
    const destroyedPrimary = primaryStations.filter(s => s.isDestroyed).length;
    const isComplete = totalPrimary > 0 && destroyedPrimary === totalPrimary;

    return finalizeProgress(
      'Station Siege',
      'Destroy the primary Hegemony installations anchored in this sector.',
      [
        {
          id: 'destroy-primary-stations',
          label: 'Destroy primary stations',
          requirement: 'Reduce all primary stations to 0 hull.',
          statusText: `${destroyedPrimary}/${Math.max(totalPrimary, 1)} installations destroyed`,
          isComplete,
        },
      ],
    );
  }

  if (objectiveType === 'Turret Breach') {
    const totalTurrets = (state.stations ?? []).length;
    const destroyedTurrets = (state.stations ?? []).filter(s => s.isDestroyed).length;
    const isComplete = totalTurrets > 0 && destroyedTurrets === totalTurrets;

    return finalizeProgress(
      'Turret Breach',
      'Clear the defensive picket line to allow the fleet to pass.',
      [
        {
          id: 'clear-turret-picket',
          label: 'Clear defensive picket',
          requirement: 'Destroy all defensive platforms and turrets in the area.',
          statusText: `${destroyedTurrets}/${Math.max(totalTurrets, 1)} platforms destroyed`,
          isComplete,
        },
      ],
    );
  }

  const totalEnemies = state.enemyShips.length + (state.stations ?? []).length;
  const destroyedEnemies =
    countDestroyedEnemies(state.enemyShips) + (state.stations ?? []).filter(s => s.isDestroyed).length;
  const allEnemiesDestroyed = totalEnemies === 0 || destroyedEnemies === totalEnemies;

  return finalizeProgress(
    objectiveType === 'Search & Destroy' ? 'Search & Destroy' : objectiveType,
    'Eliminate all hostile forces to secure the battlespace.',
    [
      {
        id: 'eliminate-hostiles',
        label: 'Eliminate hostile forces',
        requirement: 'Destroy every remaining enemy ship and station in the scenario.',
        statusText: `${destroyedEnemies}/${Math.max(totalEnemies, 1)} hostiles eliminated`,
        isComplete: allEnemiesDestroyed,
      },
    ],
  );
}
