import { describe, it, expect } from 'vitest';
import { generateSectorMap } from './mapGenerator';

describe('Map Generator Positioning', () => {
  it('should clamp all node horizontal positions between 0.10 and 0.90', () => {
    // Test multiple seeds to ensure robustness
    const seeds = [1, 42, 999, 12345, Math.random()];
    
    seeds.forEach(seed => {
      const sectorMap = generateSectorMap(seed, 15);
      
      sectorMap.nodes.forEach(node => {
        // Start and Boss nodes are typically centered at 0.5, but let's check all
        expect(node.position, `Node ${node.id} in seed ${seed} has out-of-bounds position: ${node.position}`)
          .toBeGreaterThanOrEqual(0.12);
        expect(node.position, `Node ${node.id} in seed ${seed} has out-of-bounds position: ${node.position}`)
          .toBeLessThanOrEqual(0.88);
      });
    });
  });
});
