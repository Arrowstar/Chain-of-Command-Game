import { describe, it, expect } from 'vitest';
import { getCombatScenarioProgress } from './scenarioProgress';

describe('getCombatScenarioProgress station tracking', () => {
  const baseState = {
    scenarioId: 'test-scenario',
    round: 1,
    playerShips: [],
    enemyShips: [],
    stations: [],
    objectiveMarkers: [],
    warpedOutShipIds: [],
    salvageCratesCollected: 0,
    dataSiphonedRelayNames: [],
    successfulEscapes: 0,
  };

  it('tracks Station Siege objective correctly', () => {
    const state = {
      ...baseState,
      objectiveType: 'Station Siege',
      stations: [
        { id: 's1', stationId: 'outpost', isDestroyed: false } as any
      ]
    };

    const progress = getCombatScenarioProgress(state);
    expect(progress?.items[0].isComplete).toBe(false);
    expect(progress?.items[0].statusText).toBe('0/1 installations destroyed');

    // Mark destroyed
    state.stations[0].isDestroyed = true;
    const progressDone = getCombatScenarioProgress(state);
    expect(progressDone?.items[0].isComplete).toBe(true);
    expect(progressDone?.items[0].statusText).toBe('1/1 installations destroyed');
  });

  it('tracks Turret Breach objective correctly', () => {
    const state = {
      ...baseState,
      objectiveType: 'Turret Breach',
      stations: [
        { id: 't1', stationId: 'defense-turret', isDestroyed: false } as any,
        { id: 't2', stationId: 'defense-turret', isDestroyed: true } as any
      ]
    };

    const progress = getCombatScenarioProgress(state);
    expect(progress?.items[0].isComplete).toBe(false);
    expect(progress?.items[0].statusText).toBe('1/2 platforms destroyed');

    // Mark all destroyed
    state.stations[0].isDestroyed = true;
    const progressDone = getCombatScenarioProgress(state);
    expect(progressDone?.items[0].isComplete).toBe(true);
  });

  it('tracks stations in Search & Destroy objective', () => {
    const state = {
      ...baseState,
      objectiveType: 'Search & Destroy',
      enemyShips: [
        { id: 'ship1', isDestroyed: true } as any
      ],
      stations: [
        { id: 'station1', isDestroyed: false } as any
      ]
    };

    const progress = getCombatScenarioProgress(state);
    // Ship is destroyed, but station is not. Should be incomplete.
    expect(progress?.items[0].isComplete).toBe(false);
    expect(progress?.items[0].statusText).toBe('1/2 hostiles eliminated');

    // Mark station destroyed
    state.stations[0].isDestroyed = true;
    const progressDone = getCombatScenarioProgress(state);
    expect(progressDone?.items[0].isComplete).toBe(true);
    expect(progressDone?.items[0].statusText).toBe('2/2 hostiles eliminated');
  });
});
