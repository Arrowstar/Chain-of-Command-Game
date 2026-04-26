/**
 * Tutorial scenario configuration.
 * A fixed 1v1 engagement used exclusively by the Combat Tutorial mode.
 * The player commands a single medium cruiser against a single Hunter-Killer.
 */
import type { GameInitConfig } from '../store/useGameStore';

export const TUTORIAL_SCENARIO_ID = 'tutorial';

export function buildTutorialGameConfig(): GameInitConfig {
  return {
    scenarioId: TUTORIAL_SCENARIO_ID,
    maxRounds: null,  // Tutorial has no round limit; player finishes when ready

    players: [
      {
        id: 'tutorial-player',
        name: 'Captain',
        shipId: 'tutorial-player-ship',
        commandTokens: 0,
        maxCommandTokens: 5,
        pendingCommandTokenBonus: 0,
        briefingCommandTokenBonus: 0,
        assignedActions: [],
        officers: [
          {
            officerId: 'slick-jones',
            station: 'helm',
            currentStress: 0,
            currentTier: 'veteran',
            isLocked: false,
            lockDuration: 0,
            traumas: [],
            hasFumbledThisRound: false,
            actionsPerformedThisRound: 0,
          },
          {
            officerId: 'vane',
            station: 'tactical',
            currentStress: 0,
            currentTier: 'veteran',
            isLocked: false,
            lockDuration: 0,
            traumas: [],
            hasFumbledThisRound: false,
            actionsPerformedThisRound: 0,
          },
          {
            officerId: 'sparky',
            station: 'engineering',
            currentStress: 0,
            currentTier: 'veteran',
            isLocked: false,
            lockDuration: 0,
            traumas: [],
            hasFumbledThisRound: false,
            actionsPerformedThisRound: 0,
          },
          {
            officerId: 'vance',
            station: 'sensors',
            currentStress: 0,
            currentTier: 'veteran',
            isLocked: false,
            lockDuration: 0,
            traumas: [],
            hasFumbledThisRound: false,
            actionsPerformedThisRound: 0,
          },
        ],
      },
    ],

    playerShips: [
      {
        id: 'tutorial-player-ship',
        name: 'ISS Perseverance',
        chassisId: 'vanguard',
        ownerId: 'tutorial-player',
        position: { q: -3, r: 0 },
        facing: 0,
        currentSpeed: 2,
        currentHull: 14,
        maxHull: 14,
        shields: {
          fore: 4,
          foreStarboard: 4,
          aftStarboard: 4,
          aft: 4,
          aftPort: 4,
          forePort: 4,
        },
        maxShieldsPerSector: 4,
        equippedWeapons: ['plasma-lance', 'rail-barrage'],
        equippedSubsystems: ['ecm-suite'],
        criticalDamage: [],
        scars: [],
        armorDie: 'd6',
        baseEvasion: 5,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
      },
    ],

    enemyShips: [
      {
        id: 'tutorial-enemy-1',
        name: 'Hegemony Hunter-Killer «Iron Fang»',
        adversaryId: 'hunter-killer',
        position: { q: 3, r: 0 },
        facing: 3,  // facing Aft (pointing toward player)
        currentSpeed: 3,
        currentHull: 6,
        maxHull: 6,
        shields: {
          fore: 3,
          foreStarboard: 3,
          aftStarboard: 3,
          aft: 3,
          aftPort: 3,
          forePort: 3,
        },
        maxShieldsPerSector: 3,
        criticalDamage: [],
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
        baseEvasion: 6,
        armorDie: 'd4',
        evasionModifiers: 0,
      },
    ],

    terrain: [
      // Small asteroid cluster center-left
      { coord: { q: 0, r: -1 }, type: 'asteroids' },
      { coord: { q: 0, r: 0 }, type: 'asteroids' },
      // Debris scatter near enemy start
      { coord: { q: 2, r: -2 }, type: 'debrisField' },
    ],

    fleetFavor: 5,
    experimentalTech: [],
    combatModifiers: null,

    scenarioRules: [
      'TUTORIAL ENGAGEMENT — Defeat the Hegemony Hunter-Killer to complete the exercise.',
    ],
    objectiveType: '',
    objectiveMarkers: [],
    pendingSpawns: [],
  };
}
