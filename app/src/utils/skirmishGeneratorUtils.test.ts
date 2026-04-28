import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSkirmishConfig } from './skirmishGeneratorUtils';
import * as scenarioGenerator from '../engine/campaign/scenarioGenerator';
import { HexFacing } from '../types/game';

vi.mock('../engine/campaign/scenarioGenerator', () => {
  return {
    generateProceduralScenario: vi.fn(),
  };
});

describe('generateSkirmishConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map procedural scenario config to skirmish scenario config correctly', () => {
    // Arrange
    const mockProceduralConfig = {
      objectiveType: 'Search & Destroy',
      terrain: [
        { coord: { q: 0, r: 0 }, type: 'asteroids' as const },
        { coord: { q: 1, r: 1 }, type: 'ionNebula' as const },
      ],
      enemyShips: [
        { id: 'e1', position: { q: -2, r: -2 }, facing: HexFacing.Aft, adversaryId: 'hegemony-corvette' },
      ],
      objectiveMarkers: [],
      scenarioRules: [],
      generationReport: [],
      deploymentBounds: {
        minQ: 0, maxQ: 2, minR: 0, maxR: 2,
        hexes: [
          { q: 0, r: 6 },
          { q: 1, r: 6 },
          { q: 2, r: 6 }
        ],
        label: 'test'
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(scenarioGenerator.generateProceduralScenario).mockReturnValue(mockProceduralConfig as any);

    // Mock Math.random to make the shuffle deterministic for predictable spawn selection
    const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);

    // Act
    const result = generateSkirmishConfig(2, 2);

    // Assert
    expect(scenarioGenerator.generateProceduralScenario).toHaveBeenCalledWith(2, 2, null);
    
    expect(result.terrain).toHaveLength(2);
    expect(result.terrain).toEqual([
      { coord: { q: 0, r: 0 }, type: 'asteroids' },
      { coord: { q: 1, r: 1 }, type: 'ionNebula' },
    ]);

    expect(result.enemies).toHaveLength(1);
    expect(result.enemies).toEqual([
      { id: 'e1', coord: { q: -2, r: -2 }, facing: HexFacing.Aft, adversaryId: 'hegemony-corvette' }
    ]);

    expect(result.allies).toEqual([]);

    expect(result.playerSpawns).toHaveLength(2);
    // Spawns come from the deployment bounds hexes. We mocked Math.random to 0.99, so
    // Math.random() - 0.5 is > 0, keeping the original order generally or reversing it depending on JS engine.
    // We just check that the coords exist in the original hexes array and we have exactly 2.
    result.playerSpawns?.forEach((spawn) => {
      const existsInBounds = mockProceduralConfig.deploymentBounds.hexes.some(
        h => h.q === spawn.coord.q && h.r === spawn.coord.r
      );
      expect(existsInBounds).toBe(true);
      expect(spawn.facing).toBe(HexFacing.Fore);
      expect(spawn.id).toMatch(/^spawn-\d+$/);
    });

    mathRandomSpy.mockRestore();
  });

  it('should handle generating with more requested player counts than available bounds (cap at bounds length)', () => {
    // Arrange
    const mockProceduralConfig = {
      terrain: [],
      enemyShips: [],
      deploymentBounds: {
        hexes: [{ q: 0, r: 5 }]
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(scenarioGenerator.generateProceduralScenario).mockReturnValue(mockProceduralConfig as any);

    // Act
    const result = generateSkirmishConfig(1, 4);

    // Assert
    expect(result.playerSpawns).toHaveLength(1);
    expect(result.playerSpawns?.[0].coord).toEqual({ q: 0, r: 5 });
  });
});
