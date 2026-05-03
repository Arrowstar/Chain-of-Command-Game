import { describe, expect, it } from 'vitest';
import { generateProceduralScenario } from './scenarioGenerator';

describe('Elite and Boss Node Threat Budget Scaling (Adjusted)', () => {
  it('calculates standard budget for normal nodes', () => {
    // Sector 1, 1 player -> 4 budget
    const scenario = generateProceduralScenario(1, 1, null, 'combat');
    const reportLine = scenario.generationReport.find(l => l.includes('Step 3 - Threat Budget')) ?? '';
    expect(reportLine.toLowerCase()).toContain('sector 1 => 4 threat/player x 1 = 4');
    expect(reportLine.toLowerCase()).toContain('starting budget 4');
  });

  it('applies 25% scaling boost for Elite nodes (no floor)', () => {
    // Sector 1, 1 player -> 4 budget. 4 * 0.25 = 1 bonus. Total 5.
    const scenario = generateProceduralScenario(1, 1, null, 'elite');
    const reportLine = scenario.generationReport.find(l => l.includes('Step 3 - Threat Budget')) ?? '';
    expect(reportLine).toContain('ELITE bonus +1');
    expect(reportLine).toContain('starting budget 5');
  });

  it('applies 50% scaling boost for Boss nodes', () => {
    // Sector 3, 2 players -> 20 budget. 20 * 0.5 = 10 bonus. Total 30.
    const scenario = generateProceduralScenario(3, 2, null, 'boss');
    const reportLine = scenario.generationReport.find(l => l.includes('Step 3 - Threat Budget')) ?? '';
    expect(reportLine).toContain('BOSS bonus +10');
    expect(reportLine).toContain('starting budget 30');
  });

  it('removes the minimum +4 floor requirement', () => {
    // Before, Sector 1 solo would have +4 bonus. Now it should be +1 for Elite, +2 for Boss.
    const eliteScenario = generateProceduralScenario(1, 1, null, 'elite');
    const eliteReport = eliteScenario.generationReport.find(l => l.includes('Step 3 - Threat Budget')) ?? '';
    expect(eliteReport).toContain('ELITE bonus +1');

    const bossScenario = generateProceduralScenario(1, 1, null, 'boss');
    const bossReport = bossScenario.generationReport.find(l => l.includes('Step 3 - Threat Budget')) ?? '';
    expect(bossReport).toContain('BOSS bonus +2');
  });
});
