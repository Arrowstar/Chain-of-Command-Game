import { generateProceduralScenario } from '../engine/campaign/scenarioGenerator';
import type { CustomScenarioConfig } from '../components/setup/ScenarioEditor';
import { HexFacing } from '../types/game';

export function generateSkirmishConfig(
  threatLevel: number,
  expectedPlayerCount: number
): Partial<CustomScenarioConfig> {
  let proceduralConfig;
  let terrain: { coord: any; type: any }[] = [];
  let enemies: { id: string; coord: any; facing: HexFacing; adversaryId: string }[] = [];
  let attempts = 0;

  do {
    proceduralConfig = generateProceduralScenario(threatLevel, expectedPlayerCount, null);

    terrain = proceduralConfig.terrain.map(t => ({
      coord: t.coord,
      type: t.type,
    }));

    enemies = proceduralConfig.enemyShips.map(e => ({
      id: e.id,
      coord: e.position,
      facing: e.facing as HexFacing,
      adversaryId: e.adversaryId,
    }));
    attempts++;
  } while (enemies.length === 0 && attempts < 20);

  // Bulletproof fallback: if no enemies generated, add a default hegemony-corvette
  if (enemies.length === 0) {
    enemies.push({
      id: 'fallback-enemy',
      coord: { q: 0, r: -4 },
      facing: HexFacing.ForePort,
      adversaryId: 'hegemony-corvette',
    });
  }


  // Select player spawns from deployment bounds
  const availableHexes = [...(proceduralConfig.deploymentBounds.hexes || [])];
  
  // Deterministic shuffle for testing purposes if Math.random is stubbed,
  // otherwise it's just random for the actual game.
  availableHexes.sort(() => Math.random() - 0.5);

  const playerSpawns = availableHexes.slice(0, expectedPlayerCount).map((coord, index) => ({
    id: `spawn-${index}`,
    coord,
    facing: HexFacing.Fore,
  }));

  return {
    terrain,
    enemies,
    allies: [],
    playerSpawns,
  };
}
