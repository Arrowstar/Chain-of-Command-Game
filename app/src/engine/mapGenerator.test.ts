import { describe, it, expect } from 'vitest';
import { generateSectorMap, NodeType } from './mapGenerator';

describe('generateSectorMap - 15-tier structure', () => {
  it('maxLayer is 14 (15 total tiers: 0-14)', () => {
    const map = generateSectorMap(1234, 15);
    expect(map.maxLayer).toBe(14);
  });

  it('has exactly one Start node at layer 0', () => {
    const map = generateSectorMap(1234, 15);
    const starts = map.nodes.filter(n => n.type === NodeType.Start);
    expect(starts).toHaveLength(1);
    expect(starts[0].layer).toBe(0);
  });

  it('has exactly one Boss node at layer 14', () => {
    const map = generateSectorMap(1234, 15);
    const bosses = map.nodes.filter(n => n.type === NodeType.Boss);
    expect(bosses).toHaveLength(1);
    expect(bosses[0].layer).toBe(14);
  });

  it('has exactly 3 Haven nodes (at tiers 4, 8, 12)', () => {
    const map = generateSectorMap(1234, 15);
    const havens = map.nodes.filter(n => n.type === NodeType.Haven);
    expect(havens).toHaveLength(3);
    const layers = havens.map(n => n.layer).sort((a, b) => a - b);
    expect(layers).toEqual([4, 8, 12]);
  });

  it('haven tiers keep alternate non-market routes', () => {
    const map = generateSectorMap(1234, 15);

    for (const layer of [4, 8, 12]) {
      const tierNodes = map.nodes.filter(n => n.layer === layer);
      const havens = tierNodes.filter(n => n.type === NodeType.Haven);

      expect(havens, `Tier ${layer} should still include one haven`).toHaveLength(1);
      expect(tierNodes.length, `Tier ${layer} should have alternate nodes`).toBeGreaterThan(1);
      expect(
        tierNodes.some(n => n.type !== NodeType.Haven),
        `Tier ${layer} should include a non-haven route`,
      ).toBe(true);
    }
  });

  it('has at least 2 Elite nodes in the middle tiers', () => {
    const map = generateSectorMap(9999, 15);
    const elites = map.nodes.filter(n => n.type === NodeType.Elite);
    expect(elites.length).toBeGreaterThanOrEqual(2);
  });

  it('no Elite nodes appear at tier 1 (protected first step)', () => {
    const map = generateSectorMap(1234, 15);
    const tier1Nodes = map.nodes.filter(n => n.layer === 1);
    expect(tier1Nodes.every(n => n.type !== NodeType.Elite)).toBe(true);
  });

  it('has at least 3 Event nodes per map', () => {
    const map = generateSectorMap(5678, 15);
    const events = map.nodes.filter(n => n.type === NodeType.Event);
    expect(events.length).toBeGreaterThanOrEqual(3);
  });

  it('all paths point forward only (layer n -> layer n+1)', () => {
    const map = generateSectorMap(1234, 15);
    for (const node of map.nodes) {
      for (const pathId of node.paths) {
        const target = map.nodes.find(n => n.id === pathId);
        expect(target, `Target ${pathId} not found`).toBeDefined();
        expect(target!.layer, `Path from ${node.id} goes backward`).toBe(node.layer + 1);
      }
    }
  });

  it('every non-start node has at least one incoming connection (no orphans)', () => {
    const map = generateSectorMap(5678, 15);
    const allPaths = new Set(map.nodes.flatMap(n => n.paths));
    const nonStartNodes = map.nodes.filter(n => n.type !== NodeType.Start);
    for (const node of nonStartNodes) {
      expect(allPaths.has(node.id), `Node ${node.id} is an orphan`).toBe(true);
    }
  });

  it('every non-boss node has at least one outgoing path', () => {
    const map = generateSectorMap(5678, 15);
    const nonBossNodes = map.nodes.filter(n => n.type !== NodeType.Boss);
    for (const node of nonBossNodes) {
      expect(node.paths.length, `Node ${node.id} has no outgoing paths`).toBeGreaterThan(0);
    }
  });

  it('all middle tiers (1-13) have 2-4 nodes each', () => {
    const map = generateSectorMap(1234, 15);
    for (let layer = 1; layer <= 13; layer++) {
      const nodes = map.nodes.filter(n => n.layer === layer);
      expect(nodes.length, `Tier ${layer} has wrong node count`).toBeGreaterThanOrEqual(2);
      expect(nodes.length, `Tier ${layer} has too many nodes`).toBeLessThanOrEqual(4);
    }
  });

  it('market tiers are not mandatory funnels from the previous layer', () => {
    for (const seed of [1, 42, 1234, 5678, 9999]) {
      const map = generateSectorMap(seed, 15);

      for (const layer of [4, 8, 12]) {
        const haven = map.nodes.find(n => n.layer === layer && n.type === NodeType.Haven);
        const prevNodes = map.nodes.filter(n => n.layer === layer - 1);

        expect(haven, `Seed ${seed} missing haven on tier ${layer}`).toBeDefined();
        expect(
          prevNodes.some(node => !node.paths.includes(haven!.id)),
          `Seed ${seed} tier ${layer} still funnels every path into the haven`,
        ).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    const map1 = generateSectorMap(42, 15);
    const map2 = generateSectorMap(42, 15);
    expect(map1.nodes.length).toBe(map2.nodes.length);
    expect(map1.nodes.map(n => n.id)).toEqual(map2.nodes.map(n => n.id));
    expect(map1.nodes.map(n => n.type)).toEqual(map2.nodes.map(n => n.type));
  });

  it('different seeds produce different maps', () => {
    const map1 = generateSectorMap(1, 15);
    const map2 = generateSectorMap(999, 15);
    const types1 = map1.nodes.map(n => n.type).join(',');
    const types2 = map2.nodes.map(n => n.type).join(',');
    expect(types1).not.toBe(types2);
  });
});
