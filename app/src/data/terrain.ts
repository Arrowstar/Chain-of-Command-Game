import type { TerrainData } from '../types/game';
import { TerrainType } from '../types/game';

export const TERRAIN_DATA: Record<TerrainType, TerrainData> = {
  [TerrainType.Open]: {
    type: TerrainType.Open,
    blocksLoS: false,
    tnModifier: 0,
    movementEffect: 'None',
    special: 'Standard open space.',
  },
  [TerrainType.Asteroids]: {
    type: TerrainType.Asteroids,
    blocksLoS: true,
    tnModifier: 2,
    movementEffect: 'Halts Drift (Speed -> 0)',
    special: 'Entering requires a D6 roll; on a 1, take 1D4 Hull damage. Great for hiding, dangerous at high speeds.',
  },
  [TerrainType.IonNebula]: {
    type: TerrainType.IonNebula,
    blocksLoS: false,
    tnModifier: -1,
    movementEffect: 'None',
    special: 'All Shields are disabled (reduced to 0) while inside. The electrostatic interference makes targeting easier (-1 TN).',
  },
  [TerrainType.DebrisField]: {
    type: TerrainType.DebrisField,
    blocksLoS: false,
    tnModifier: 1,
    movementEffect: 'None',
    special: 'Wreckage provides minor cover. Small Craft (Fighters) cannot enter or pass through.',
  },
  [TerrainType.GravityWell]: {
    type: TerrainType.GravityWell,
    blocksLoS: false,
    tnModifier: 0,
    movementEffect: 'Forced Pull',
    special: 'At the start of Phase 4, any ship inside or adjacent is pulled 1 hex toward the center.',
  },
};

export function getTerrainData(type: TerrainType): TerrainData {
  return TERRAIN_DATA[type];
}
