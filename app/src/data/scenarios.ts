import type { ScenarioData } from '../types/game';

export const SCENARIOS: ScenarioData[] = [
  {
    id: 'ambush-kaelen-iv',
    name: 'Ambush at Kaelen-IV',
    narrative:
      'We jumped out of hyperspace right into a Hegemony listening post. The fleet is scattered. Form up, survive the initial barrage, and destroy their comms array before they call for a Dreadnought.',
    playerCount: { min: 1, max: 4 },
    mapWidth: 16,
    mapHeight: 12,
    terrain: [
      // Dense asteroids in center cluster
      { coord: { q: 7, r: 5 }, type: 'asteroids' as const },
      { coord: { q: 8, r: 5 }, type: 'asteroids' as const },
      { coord: { q: 7, r: 6 }, type: 'asteroids' as const },
      { coord: { q: 8, r: 6 }, type: 'asteroids' as const },
      { coord: { q: 9, r: 5 }, type: 'asteroids' as const },
      { coord: { q: 9, r: 4 }, type: 'asteroids' as const },
      { coord: { q: 6, r: 6 }, type: 'asteroids' as const },
      { coord: { q: 8, r: 4 }, type: 'asteroids' as const },
      // Debris scatter
      { coord: { q: 5, r: 3 }, type: 'debrisField' as const },
      { coord: { q: 11, r: 7 }, type: 'debrisField' as const },
    ],
    playerDeployZone: [
      { q: 1, r: 3 },
      { q: 1, r: 5 },
      { q: 2, r: 4 },
      { q: 2, r: 6 },
    ],
    enemySpawns: [
      { adversaryId: 'hunter-killer', position: { q: 6, r: 4 } },
      { adversaryId: 'hunter-killer', position: { q: 9, r: 6 } },
      { adversaryId: 'hunter-killer', position: { q: 7, r: 7 } },
      // Strike fighters spawn on round 2
      { adversaryId: 'strike-fighter', position: { q: 10, r: 3 }, spawnRound: 2 },
      { adversaryId: 'strike-fighter', position: { q: 10, r: 4 }, spawnRound: 2 },
    ],
    objectiveMarkers: [
      {
        name: 'Hegemony Comms Array',
        position: { q: 8, r: 5 },
        hull: 15,
        maxHull: 15,
        shieldsPerSector: 4,
      },
    ],
    victoryCondition: 'Destroy the Hegemony Comms Array (Hull 15, Shields 4 per sector).',
    defeatCondition:
      'The Hegemony fleet overwhelms you, OR standard Fleet Defeat conditions.',
    maxRounds: null,
    victoryRewardFF: 3,
  },
];

export function getScenarioById(id: string): ScenarioData | undefined {
  return SCENARIOS.find(s => s.id === id);
}
