import { describe, expect, it } from 'vitest';
import { getCombatScenarioProgress } from './scenarioProgress';
import type { EnemyShipState, ObjectiveMarkerState, ShipState } from '../types/game';
import type { ScenarioProgressState } from './scenarioProgress';

function makeShip(id: string, isDestroyed = false): ShipState {
  return {
    id,
    name: id,
    isDestroyed,
    warpedOut: false,
    position: { q: 0, r: 0 },
    currentHull: isDestroyed ? 0 : 10,
    maxHull: 10,
  } as ShipState;
}

function makeEnemy(id: string, isDestroyed = false, name: string = id): EnemyShipState {
  return {
    id,
    name,
    isDestroyed,
    position: { q: 0, r: 5 },
    currentHull: isDestroyed ? 0 : 10,
    maxHull: 10,
  } as EnemyShipState;
}

function makeMarker(name: string, overrides: Partial<ObjectiveMarkerState> = {}): ObjectiveMarkerState {
  return {
    name,
    position: { q: 1, r: 1 },
    hull: 10,
    maxHull: 10,
    shieldsPerSector: 0,
    ...overrides,
  };
}

function makeState(overrides: Partial<ScenarioProgressState> = {}) {
  return {
    objectiveType: '',
    scenarioId: 'test-scenario',
    round: 1,
    playerShips: [makeShip('p1')],
    enemyShips: [makeEnemy('e1')],
    objectiveMarkers: [],
    warpedOutShipIds: [],
    salvageCratesCollected: 0,
    dataSiphonedRelayNames: [],
    successfulEscapes: 0,
    ...overrides,
  } as ScenarioProgressState;
}

describe('getCombatScenarioProgress', () => {
  it('tracks the default search and destroy objective', () => {
    const progress = getCombatScenarioProgress(makeState({
      enemyShips: [makeEnemy('e1', true), makeEnemy('e2', false)],
    }));

    expect(progress?.title).toBe('Search & Destroy');
    expect(progress?.items[0].statusText).toBe('1/2 hostile ships destroyed');
    expect(progress?.items[0].isComplete).toBe(false);
  });

  it('tracks breakout escape progress against surviving ships', () => {
    const progress = getCombatScenarioProgress(makeState({
      objectiveType: 'Breakout',
      playerShips: [makeShip('p1'), makeShip('p2'), makeShip('p3', true)],
      successfulEscapes: 1,
    }));

    expect(progress?.title).toBe('Breakout');
    expect(progress?.items[0].statusText).toBe('1/1 required zone escapes completed');
    expect(progress?.items[0].isComplete).toBe(true);
  });

  it('lists each data siphon relay separately', () => {
    const progress = getCombatScenarioProgress(makeState({
      objectiveType: 'Data Siphon',
      objectiveMarkers: [
        makeMarker('Comm Relay Alpha'),
        makeMarker('Comm Relay Beta', { isCollected: true }),
        makeMarker('Comm Relay Gamma'),
      ],
      dataSiphonedRelayNames: ['Comm Relay Alpha'],
    }));

    expect(progress?.items).toHaveLength(3);
    expect(progress?.items[0].label).toBe('Comm Relay Alpha');
    expect(progress?.items[0].isComplete).toBe(true);
    expect(progress?.items[1].label).toBe('Comm Relay Beta');
    expect(progress?.items[1].isComplete).toBe(true);
    expect(progress?.items[2].label).toBe('Comm Relay Gamma');
    expect(progress?.items[2].isComplete).toBe(false);
  });

  it('lists each salvage crate and the warp-out requirement', () => {
    const progress = getCombatScenarioProgress(makeState({
      objectiveType: 'Salvage Run',
      objectiveMarkers: [
        makeMarker('Supply Crate 1', { isCollected: true }),
        makeMarker('Supply Crate 2'),
        makeMarker('Supply Crate 3'),
      ],
      salvageCratesCollected: 1,
      warpedOutShipIds: [],
    }));

    expect(progress?.items).toHaveLength(4);
    expect(progress?.items[0].statusText).toBe('Secured');
    expect(progress?.items[3].label).toBe('Jump to warp with the salvage');
    expect(progress?.items[3].statusText).toBe('Crates 1/3 | Warped out 0/1');
    expect(progress?.items[3].isComplete).toBe(false);
  });

  it('tracks the handcrafted comms-array objective', () => {
    const progress = getCombatScenarioProgress(makeState({
      scenarioId: 'ambush-kaelen-iv',
      objectiveMarkers: [makeMarker('Hegemony Comms Array', { hull: 4, maxHull: 10 })],
    }));

    expect(progress?.title).toBe('Ambush at Kaelen-IV');
    expect(progress?.items[0].statusText).toBe('Hull 4/10');
    expect(progress?.items[0].isComplete).toBe(false);
  });
});
