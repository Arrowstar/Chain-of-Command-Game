import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { getStationById } from '../data/stations';

describe('Station Initialization', () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.setState({
      stations: [],
    });
  });

  it('should initialize stations with full shields from station data', () => {
    const testConfig = {
      players: [],
      playerShips: [],
      enemyShips: [],
      terrain: [],
      stationSpawns: [
        { stationId: 'outpost', position: { q: 0, r: 0 }, facing: 0 }
      ]
    };

    const stationData = getStationById('outpost');
    if (!stationData) throw new Error('Station data not found');

    useGameStore.getState().initializeGame(testConfig as any);

    const stations = useGameStore.getState().stations;
    expect(stations.length).toBe(1);
    
    const station = stations[0];
    expect(station.name).toBe(stationData.name);
    expect(station.maxShieldsPerSector).toBe(stationData.shieldsPerSector);
    
    expect(station.shields.fore).toBe(stationData.shieldsPerSector);
    expect(station.shields.foreStarboard).toBe(stationData.shieldsPerSector);
    expect(station.shields.aftStarboard).toBe(stationData.shieldsPerSector);
    expect(station.shields.aft).toBe(stationData.shieldsPerSector);
    expect(station.shields.aftPort).toBe(stationData.shieldsPerSector);
    expect(station.shields.forePort).toBe(stationData.shieldsPerSector);
  });

  it('should initialize turrets with correct shield values', () => {
    const testConfig = {
      players: [],
      playerShips: [],
      enemyShips: [],
      terrain: [],
      stationSpawns: [
        { stationId: 'heavy-turret', position: { q: 2, r: 2 }, facing: 3 }
      ]
    };

    const turretData = getStationById('heavy-turret');
    if (!turretData) throw new Error('Turret data not found');

    useGameStore.getState().initializeGame(testConfig as any);

    const stations = useGameStore.getState().stations;
    const turret = stations.find(s => s.stationId === 'heavy-turret');
    
    expect(turret).toBeDefined();
    expect(turret!.shields.fore).toBe(turretData.shieldsPerSector);
    expect(turret!.facing).toBe(3);
  });
});
