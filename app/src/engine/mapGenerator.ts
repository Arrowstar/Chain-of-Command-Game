import { EVENT_NODES } from '../data/eventNodes';

export const NodeType = {
  Start: 'start',
  Combat: 'combat',
  Elite: 'elite',
  Event: 'event',
  Haven: 'haven',
  Boss: 'boss',
} as const;
export type NodeType = (typeof NodeType)[keyof typeof NodeType];

/** @deprecated Use NodeType.Haven. Kept for backward-compat with SectorMapView. */
export const NodeTypeRepair = 'haven';

export interface SectorNode {
  id: string;
  type: NodeType;
  layer: number;
  position: number;
  paths: string[];
  isRevealed: boolean;
  eventId?: string;
}

export interface SectorMap {
  nodes: SectorNode[];
  maxLayer: number;
}

const HAVEN_TIERS = new Set([4, 8, 12]);

export function generateSectorMap(seed: number = Math.random(), totalLayers: number = 15): SectorMap {
  const nodes: SectorNode[] = [];

  let s = Math.floor(seed * 999999) + 1;
  const random = () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };

  let availableEvents = shuffleEventIds(random);
  const getNextEventId = () => {
    if (availableEvents.length === 0) {
      availableEvents = shuffleEventIds(random);
    }
    return availableEvents.pop()!;
  };

  const maxLayer = totalLayers - 1;

  nodes.push({
    id: 'start-0',
    type: NodeType.Start,
    layer: 0,
    position: 0.5,
    paths: [],
    isRevealed: true,
  });

  for (let layer = 1; layer < maxLayer; layer++) {
    const width = getTierWidth(layer, maxLayer, random);
    const havenSlot = HAVEN_TIERS.has(layer) ? Math.floor(random() * width) : -1;

    for (let slot = 0; slot < width; slot++) {
      const type = slot === havenSlot ? NodeType.Haven : pickNodeType(layer, slot, width, random);
      const position = clamp((slot + 1) / (width + 1) + (random() * 0.12 - 0.06), 0.05, 0.95);
      nodes.push({
        id: type === NodeType.Haven ? `haven-${layer}` : `node-${layer}-${slot}`,
        type,
        layer,
        position,
        paths: [],
        isRevealed: false,
        eventId: type === NodeType.Event ? getNextEventId() : undefined,
      });
    }
  }

  nodes.push({
    id: `boss-${maxLayer}`,
    type: NodeType.Boss,
    layer: maxLayer,
    position: 0.5,
    paths: [],
    isRevealed: true,
  });

  for (let layer = 0; layer < maxLayer; layer++) {
    const currNodes = nodes.filter(node => node.layer === layer);
    const nextNodes = nodes.filter(node => node.layer === layer + 1);

    currNodes.forEach(node => {
      const sortedNext = [...nextNodes].sort(
        (a, b) => Math.abs(a.position - node.position) - Math.abs(b.position - node.position),
      );

      const connectionCount = layer === 0 ? nextNodes.length : random() > 0.45 ? 2 : 1;
      for (let i = 0; i < Math.min(connectionCount, sortedNext.length); i++) {
        if (!node.paths.includes(sortedNext[i].id)) {
          node.paths.push(sortedNext[i].id);
        }
      }
    });
  }

  ensureIncomingPaths(nodes, maxLayer);
  keepHavensOptional(nodes, maxLayer);
  uncrossPaths(nodes, maxLayer);

  return { nodes, maxLayer };
}

function shuffleEventIds(random: () => number): string[] {
  const ids = [...EVENT_NODES.map(event => event.id)];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function getTierWidth(layer: number, maxLayer: number, random: () => number): number {
  if (layer === 1 || layer === maxLayer - 1) return 2;
  if (HAVEN_TIERS.has(layer)) return Math.floor(random() * 2) + 2;
  return Math.floor(random() * 3) + 2;
}

function ensureIncomingPaths(nodes: SectorNode[], maxLayer: number) {
  for (let layer = 1; layer <= maxLayer; layer++) {
    const prev = nodes.filter(node => node.layer === layer - 1);
    const curr = nodes.filter(node => node.layer === layer);

    curr.forEach(currNode => {
      const hasIncoming = prev.some(prevNode => prevNode.paths.includes(currNode.id));
      if (hasIncoming || prev.length === 0) return;

      const closest = [...prev].sort(
        (a, b) => Math.abs(a.position - currNode.position) - Math.abs(b.position - currNode.position),
      )[0];

      if (!closest.paths.includes(currNode.id)) {
        closest.paths.push(currNode.id);
      }
    });
  }
}

function keepHavensOptional(nodes: SectorNode[], maxLayer: number) {
  for (const havenLayer of HAVEN_TIERS) {
    if (havenLayer > maxLayer) continue;

    const havenNode = nodes.find(node => node.layer === havenLayer && node.type === NodeType.Haven);
    const alternateTargets = nodes.filter(node => node.layer === havenLayer && node.type !== NodeType.Haven);
    const prevLayerNodes = nodes.filter(node => node.layer === havenLayer - 1);

    if (!havenNode || alternateTargets.length === 0 || prevLayerNodes.length < 2) continue;

    const nodesLeadingToHaven = prevLayerNodes.filter(node => node.paths.includes(havenNode.id));
    if (nodesLeadingToHaven.length !== prevLayerNodes.length) continue;

    const rerouteNode = [...nodesLeadingToHaven].sort(
      (a, b) => Math.abs(b.position - havenNode.position) - Math.abs(a.position - havenNode.position),
    )[0];
    const alternateTarget = [...alternateTargets].sort(
      (a, b) => Math.abs(a.position - rerouteNode.position) - Math.abs(b.position - rerouteNode.position),
    )[0];

    rerouteNode.paths = rerouteNode.paths.map(pathId => pathId === havenNode.id ? alternateTarget.id : pathId);
    rerouteNode.paths = Array.from(new Set(rerouteNode.paths));
  }
}

function uncrossPaths(nodes: SectorNode[], maxLayer: number) {
  for (let layer = 0; layer < maxLayer; layer++) {
    const currNodes = nodes.filter(node => node.layer === layer).sort((a, b) => a.position - b.position);
    const nextNodes = nodes.filter(node => node.layer === layer + 1).sort((a, b) => a.position - b.position);

    let crossingFound = true;
    while (crossingFound) {
      crossingFound = false;

      for (let i = 0; i < currNodes.length; i++) {
        for (let j = i + 1; j < currNodes.length; j++) {
          const nodeA = currNodes[i];
          const nodeB = currNodes[j];

          for (let pA = 0; pA < nodeA.paths.length; pA++) {
            for (let pB = 0; pB < nodeB.paths.length; pB++) {
              const idA = nodeA.paths[pA];
              const idB = nodeB.paths[pB];
              const targetA = nextNodes.find(node => node.id === idA);
              const targetB = nextNodes.find(node => node.id === idB);

              if (targetA && targetB && targetA.position > targetB.position) {
                nodeA.paths[pA] = idB;
                nodeB.paths[pB] = idA;
                crossingFound = true;
                break;
              }
            }

            if (crossingFound) break;
          }

          if (crossingFound) {
            nodeA.paths = Array.from(new Set(nodeA.paths));
            nodeB.paths = Array.from(new Set(nodeB.paths));
            break;
          }
        }

        if (crossingFound) break;
      }
    }
  }
}

function pickNodeType(
  layer: number,
  position: number,
  width: number,
  random: () => number,
): NodeType {
  void position;
  void width;

  const r = random();

  if (layer === 1) {
    return r < 0.3 ? NodeType.Event : NodeType.Combat;
  }

  if (layer === 13) {
    return r > 0.6 ? NodeType.Event : NodeType.Combat;
  }

  const eliteTierBlocks: [number, number][] = [[2, 3], [5, 7], [9, 11]];
  const isInEliteBlock = eliteTierBlocks.some(([lo, hi]) => layer >= lo && layer <= hi);

  if (isInEliteBlock) {
    if (r < 0.18) return NodeType.Elite;
    if (r < 0.45) return NodeType.Event;
    return NodeType.Combat;
  }

  if (r < 0.3) return NodeType.Event;
  return NodeType.Combat;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
