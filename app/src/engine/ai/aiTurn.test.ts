import { describe, expect, it } from 'vitest';
import { executeAITier, previewAITierMovement } from './aiTurn';
import { TACTIC_DECK } from '../../data/tacticDeck';
import { HexFacing, type EnemyShipState, type PlayerState, type ShipState } from '../../types/game';
import { hexKey } from '../hexGrid';

function makePlayerShip(overrides: Partial<ShipState> = {}): ShipState {
  return {
    id: 'player-1',
    name: 'Resolute',
    chassisId: 'paladin',
    ownerId: 'player',
    position: { q: 3, r: 0 },
    facing: HexFacing.Aft,
    currentSpeed: 2,
    currentHull: 12,
    maxHull: 12,
    shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
    maxShieldsPerSector: 3,
    equippedWeapons: [],
    equippedSubsystems: [],
    criticalDamage: [],
    scars: [],
    armorDie: 'd6',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    ...overrides,
  };
}

function makeEnemyShip(overrides: Partial<EnemyShipState> = {}): EnemyShipState {
  return {
    id: 'enemy-1',
    name: 'Raider',
    adversaryId: 'hunter-killer',
    position: { q: 0, r: 0 },
    facing: HexFacing.Aft,
    currentSpeed: 3,
    currentHull: 6,
    maxHull: 6,
    shields: { fore: 3, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    maxShieldsPerSector: 3,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 6,
    armorDie: 'd4',
    evasionModifiers: 0,
    ...overrides,
  };
}

describe('AI movement preview', () => {
  it('matches live AI movement updates for a ship that must turn before moving', () => {
    const playerShip = makePlayerShip();
    const enemyShip = makeEnemyShip();
    const occupiedHexes = new Set<string>([hexKey(playerShip.position), hexKey(enemyShip.position)]);
    const terrainMap = new Map();

    const preview = previewAITierMovement(
      [enemyShip],
      [playerShip],
      [enemyShip],
      null,
      new Set(occupiedHexes),
      terrainMap,
    ).get(enemyShip.id);
    const result = executeAITier(
      [makeEnemyShip()],
      [makePlayerShip()],
      [makeEnemyShip()],
      null,
      new Set(occupiedHexes),
      terrainMap,
      [] as PlayerState[],
    );

    expect(preview).toBeDefined();
    expect(result.shipUpdates.get(enemyShip.id)).toMatchObject({
      position: preview?.targetHex,
      facing: preview?.newFacing,
    });
    expect(preview?.targetHex).not.toEqual(enemyShip.position);
    expect(preview?.newFacing).not.toBe(enemyShip.facing);
  });
});
