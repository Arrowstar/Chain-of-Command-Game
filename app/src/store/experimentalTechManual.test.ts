import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, LogEntry } from '../types/game';

function makePlayerShip(): ShipState {
  return { kind: 'ship', faction: 'player', id: 's1', name: 'Resolute',
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 2,
    currentHull: 10,
    maxHull: 10,
    shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
    maxShieldsPerSector: 2,
    equippedWeapons: [],
    equippedSubsystems: [],
    criticalDamage: [],
    scars: [],
    armorDie: 'd6',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
  };
}

function makePlayer(): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId: 's1',
    commandTokens: 5,
    maxCommandTokens: 5,
    assignedActions: [],
    pendingCommandTokenBonus: 0,
    briefingCommandTokenBonus: 0,
    officers: [
      { officerId: 'slick-jones', station: 'helm', currentStress: 3, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'boomer-hayes', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'obannon', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      { officerId: 'chatter-singh', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
    ],
  };
}

describe('Manual Experimental Tech Interactions', () => {
  beforeEach(() => {
    useGameStore.setState({
      round: 1,
      phase: 'setup',
      players: [makePlayer()],
      playerShips: [makePlayerShip()],
      enemyShips: [],
      fighterTokens: [],
      torpedoTokens: [],
      experimentalTech: [
        { id: 'astro-caf-synthesizer', name: 'Astro-Caf Synthesizer', category: 'crew', effect: 'Remove stress', flavorText: '', isConsumable: false, isConsumed: false, rarity: 'common', imagePath: '' },
        { id: 'tachyon-targeting-matrix', name: 'Tachyon Targeting Matrix', category: 'tactical', effect: 'Convert hit', flavorText: '', isConsumable: false, isConsumed: false, rarity: 'common', imagePath: '' }
      ],
      pendingAstroCafPlayers: [],
      tachyonMatrixUsedThisScenario: false,
      log: [],
      shipsWithHullDamageThisRound: [],
      terrainMap: new Map(),
    });
  });

  it('Astro-Caf Synthesizer: populates pendingAstroCafPlayers when no hull damage taken', () => {
    useGameStore.getState().executeCleanupPhase();
    const state = useGameStore.getState();
    expect(state.pendingAstroCafPlayers).toContain('p1');
  });

  it('Astro-Caf Synthesizer: resolveAstroCaf reduces stress and clears pending state', () => {
    useGameStore.setState({ pendingAstroCafPlayers: ['p1'] });
    
    useGameStore.getState().resolveAstroCaf('p1', 'slick-jones');
    
    const state = useGameStore.getState();
    const player = state.players[0];
    const helm = player.officers.find(o => o.station === 'helm')!;
    
    expect(helm.currentStress).toBe(2);
    expect(state.pendingAstroCafPlayers).not.toContain('p1');
  });

  it('Tachyon Targeting Matrix: retroactiveTachyonStrike converts standard hit and adjusts damage', () => {
    // Mock a log entry with a standard hit
    const damageResult = {
      volleyResult: {
        totalHits: 2,
        totalStandardHits: 2,
        totalCrits: 0,
        totalCriticalHits: 0,
        dice: [
          { rolls: [5], dieType: 'd6', isHit: true, isCritical: false },
          { rolls: [5], dieType: 'd6', isHit: true, isCritical: false }
        ]
      },
      shieldHits: 1,
      shieldRemaining: 1,
      hullDamage: 0,
      overflowHits: 0,
      struckSector: 'fore',
      isIonWeapon: false
    };

    const logEntry: LogEntry = {
      id: 'log1',
      round: 1,
      phase: 'execution',
      type: 'combat',
      message: 'Attack!',
      timestamp: Date.now(),
      details: { damageResult, targetId: 's1' }
    };

    useGameStore.setState({ 
      log: [logEntry],
      playerShips: [makePlayerShip()] // Target is the player ship for this test
    });

    useGameStore.getState().retroactiveTachyonStrike('log1');

    const state = useGameStore.getState();
    const target = state.playerShips[0];
    
    // Original damage: 1 shield hit.
    // Retroactive change: 
    // - 1 standard hit removed -> 1 shield hit removed -> shield back to 2.
    // - 1 crit added -> 1 hull damage added -> hull to 9.
    expect(target.shields.fore).toBe(2);
    expect(target.currentHull).toBe(9);
    expect(state.tachyonMatrixUsedThisScenario).toBe(true);
    
    // Check if the log details were updated in place (for UI reflect)
    const updatedLog = state.log.find(l => l.id === 'log1')!;
    const updatedResult = updatedLog.details?.damageResult as any;
    expect(updatedResult.volleyResult.totalStandardHits).toBe(1);
    expect(updatedResult.volleyResult.totalCrits).toBe(1);
    expect(updatedResult.shieldRemaining).toBe(2);
    expect(updatedResult.hullDamage).toBe(1);
  });
});
