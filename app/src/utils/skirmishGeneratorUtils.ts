import { generateProceduralScenario } from '../engine/campaign/scenarioGenerator';
import type { CustomScenarioConfig } from '../components/setup/ScenarioEditor';
import { HexFacing } from '../types/game';

export function generateSkirmishConfig(
  threatLevel: number,
  expectedPlayerCount: number
): Partial<CustomScenarioConfig> {
  const proceduralConfig = generateProceduralScenario(threatLevel, expectedPlayerCount, null);

  const terrain = proceduralConfig.terrain.map(t => ({
    coord: t.coord,
    type: t.type,
  }));

  const enemies = proceduralConfig.enemyShips.map(e => ({
    id: e.id,
    coord: e.position,
    facing: e.facing as HexFacing,
    adversaryId: e.adversaryId,
  }));

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
