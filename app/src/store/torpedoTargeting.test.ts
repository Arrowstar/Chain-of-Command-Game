import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { FighterToken, StationState, ObjectiveMarkerState, TorpedoToken } from '../types/game';

describe('Torpedo Targeting Expansion', () => {
  beforeEach(() => {
    useGameStore.setState({
      playerShips: [],
      enemyShips: [],
      stations: [],
      fighterTokens: [],
      torpedoTokens: [],
      objectiveMarkers: [],
      terrainMap: new Map(),
      log: [],
    });
    vi.restoreAllMocks();
  });

  it('can target and damage a Station', () => {
    useGameStore.setState({
      stations: [
        {
          id: 'station-1',
          name: 'Defense Platform',
          stationId: 'heavy-platform',
          position: { q: 2, r: 0 },
          currentHull: 10,
          maxHull: 10,
          isDestroyed: false,
          baseEvasion: 2,
        } as any,
      ],
      torpedoTokens: [
        {
          kind: 'torpedo',
          faction: 'allied',
          id: 't1',
          name: 'Seeker Torpedo',
          targetShipId: 'station-1',
          position: { q: 0, r: 0 },
          currentHull: 1,
          speed: 4,
          isDestroyed: false,
          hasMoved: false,
        } as any,
      ],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.9); // Ensure hit
    useGameStore.getState().resolveTorpedoStep('allied');

    const station = useGameStore.getState().stations.find(s => s.id === 'station-1');
    expect(station?.currentHull).toBe(7); // 10 - 3
    expect(useGameStore.getState().log.some(l => l.message.includes('impacted Defense Platform'))).toBe(true);
  });

  it('can target and destroy a Fighter Token', () => {
    useGameStore.setState({
      fighterTokens: [
        {
          id: 'f1',
          name: 'Enemy Interceptor',
          classId: 'interceptor',
          kind: 'fighter',
          faction: 'hegemony',
          position: { q: 1, r: 0 },
          currentHull: 1,
          maxHull: 1,
          isDestroyed: false,
          baseEvasion: 8,
        } as any,
      ],
      torpedoTokens: [
        {
          kind: 'torpedo',
          faction: 'allied',
          id: 't2',
          name: 'Seeker Torpedo',
          targetShipId: 'f1',
          position: { q: 0, r: 0 },
          currentHull: 1,
          speed: 4,
          isDestroyed: false,
          hasMoved: false,
        } as any,
      ],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.9); // Ensure hit
    useGameStore.getState().resolveTorpedoStep('allied');

    const fighter = useGameStore.getState().fighterTokens.find(f => f.id === 'f1');
    expect(fighter?.isDestroyed).toBe(true);
    expect(useGameStore.getState().log.some(l => l.message.includes('Enemy Interceptor destroyed by torpedo impact'))).toBe(true);
  });

  it('can target and damage an Objective Marker', () => {
    useGameStore.setState({
      objectiveMarkers: [
        {
          name: 'Sensor Relay',
          position: { q: 1, r: 0 },
          hull: 5,
          maxHull: 5,
          isDestroyed: false,
        } as any,
      ],
      torpedoTokens: [
        {
          id: 't3',
          name: 'Seeker Torpedo',
          faction: 'allied',
          targetShipId: 'Sensor Relay',
          position: { q: 0, r: 0 },
          currentHull: 1,
          speed: 4,
          isDestroyed: false,
          hasMoved: false,
        } as any,
      ],
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.9); // Ensure hit
    useGameStore.getState().resolveTorpedoStep('allied');

    const marker = useGameStore.getState().objectiveMarkers.find(m => m.name === 'Sensor Relay');
    expect(marker?.hull).toBe(2); // 5 - 3
    expect(useGameStore.getState().log.some(l => l.message.includes('impacted Sensor Relay'))).toBe(true);
  });

  it('self-destructs if target is lost', () => {
    useGameStore.setState({
      torpedoTokens: [
        {
          id: 't4',
          name: 'Seeker Torpedo',
          faction: 'allied',
          targetShipId: 'missing-target',
          position: { q: 0, r: 0 },
          currentHull: 1,
          speed: 4,
          isDestroyed: false,
          hasMoved: false,
        } as any,
      ],
    });

    useGameStore.getState().resolveTorpedoStep('allied');

    const torpedo = useGameStore.getState().torpedoTokens.find(t => t.id === 't4');
    expect(torpedo?.isDestroyed).toBe(true);
    expect(useGameStore.getState().log.some(l => l.message.includes('self-destructed (target lost)'))).toBe(true);
  });
});
