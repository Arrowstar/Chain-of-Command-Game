import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateProceduralScenario } from './scenarioGenerator';

function withRandomSequence(sequence: number[]) {
  let index = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    const value = sequence[index % sequence.length] ?? 0.5;
    index += 1;
    return value;
  });
}

describe('generateProceduralScenario terrain variety', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a wide ion storm front instead of a small center blob', () => {
    withRandomSequence([
      0.95, // objective: Search & Destroy
      0.18, // environment: ion storm front
      0.45, 0.55, 0.35, 0.7, 0.25, 0.65, 0.15, 0.8, 0.2, 0.75,
    ]);

    const scenario = generateProceduralScenario(2, 1, null);
    const nebulaHexes = scenario.terrain.filter(entry => entry.type === 'ionNebula');

    expect(nebulaHexes.length).toBeGreaterThan(8);
    expect(nebulaHexes.some(entry => Math.abs(entry.coord.q) >= 5)).toBe(true);
    expect(scenario.generationReport.some(line => line.includes('ion storm front'))).toBe(true);
  });

  it('keeps terrain off data siphon relay hexes', () => {
    withRandomSequence([
      0.35, // objective: Data Siphon
      0.05, // environment: shattered asteroid belts
      0.12, 0.78, 0.31, 0.62, 0.27, 0.51, 0.43, 0.69, 0.22, 0.88,
    ]);

    const scenario = generateProceduralScenario(1, 2, null);
    const terrainKeys = new Set(scenario.terrain.map(entry => `${entry.coord.q},${entry.coord.r}`));

    expect(terrainKeys.has('-4,0')).toBe(false);
    expect(terrainKeys.has('0,0')).toBe(false);
    expect(terrainKeys.has('4,0')).toBe(false);
  });

  it('can generate mixed hazard boards with overlapping hazard types', () => {
    withRandomSequence([
      0.82, // objective: Search & Destroy
      0.73, // environment: overlapping hazard pockets
      0.14, 0.72, 0.29, 0.61, 0.38, 0.57, 0.46, 0.8, 0.24, 0.68,
    ]);

    const scenario = generateProceduralScenario(3, 2, null);
    const terrainTypes = new Set(scenario.terrain.map(entry => entry.type));

    expect(terrainTypes.has('asteroids')).toBe(true);
    expect(terrainTypes.has('ionNebula')).toBe(true);
    expect(terrainTypes.has('debrisField')).toBe(true);
    expect(terrainTypes.size).toBeGreaterThanOrEqual(3);
  });

  it('keeps enemy spawns off terrain and objective hexes while reporting a themed deployment pattern', () => {
    withRandomSequence([
      0.35, // objective: Data Siphon
      0.18, // environment: ion storm front
      0.45, 0.55, 0.35, 0.7, 0.25, 0.65, 0.15, 0.8, 0.2, 0.75,
      0.9, 0.7, 0.55, 0.35, 0.15, 0.45, 0.8, 0.25, 0.6, 0.4,
    ]);

    const scenario = generateProceduralScenario(3, 2, null);
    const blocked = new Set(scenario.terrain.map(entry => `${entry.coord.q},${entry.coord.r}`));
    blocked.add('-4,0');
    blocked.add('0,0');
    blocked.add('4,0');

    scenario.enemyShips.forEach(ship => {
      expect(blocked.has(`${ship.position.q},${ship.position.r}`)).toBe(false);
      expect(ship.position.r).toBeLessThanOrEqual(-2);
    });

    expect(scenario.generationReport.some(line => line.includes('Enemy Deployment Pattern'))).toBe(true);
  });

  it('uses terrain-aware deployment instead of dropping every enemy into the same edge band', () => {
    withRandomSequence([
      0.95, // objective: Search & Destroy
      0.45, // environment: debris graveyard
      0.12, 0.78, 0.31, 0.62, 0.27, 0.51, 0.43, 0.69, 0.22, 0.88,
      0.95, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.15, 0.05,
    ]);

    const scenario = generateProceduralScenario(3, 2, null);

    expect(scenario.enemyShips.length).toBeGreaterThan(1);
    expect(new Set(scenario.enemyShips.map(ship => ship.position.q)).size).toBeGreaterThan(1);
    expect(scenario.generationReport.some(line => line.includes('wreckfield pickets'))).toBe(true);
  });
});
