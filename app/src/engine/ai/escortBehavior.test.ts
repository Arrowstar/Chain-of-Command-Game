import { describe, expect, it } from 'vitest';
import { previewAITierMovement } from './aiTurn';
import { HexFacing, type EnemyShipState, type ShipState } from '../../types/game';
import { hexDistance, hexKey } from '../hexGrid';

function makePlayerShip(overrides: Partial<ShipState> = {}): ShipState {
  return {
    id: 'player-1',
    name: 'Resolute',
    chassisId: 'paladin',
    ownerId: 'player',
    position: { q: 6, r: 0 }, // Far away
    facing: HexFacing.Fore,
    currentSpeed: 0,
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
    name: 'Escort',
    adversaryId: 'hegemony-escort',
    position: { q: 0, r: 0 },
    facing: HexFacing.Fore,
    currentSpeed: 3,
    currentHull: 8,
    maxHull: 8,
    shields: { fore: 4, foreStarboard: 4, aftStarboard: 4, aft: 4, aftPort: 4, forePort: 4 },
    maxShieldsPerSector: 4,
    criticalDamage: [],
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
    baseEvasion: 5,
    armorDie: 'd4',
    evasionModifiers: 0,
    ...overrides,
  };
}

describe('AI Behavior: Escort vs Support', () => {
  it('Escort behavior: moves toward player to reach range 2-3 when far away', () => {
    const playerShip = makePlayerShip({ position: { q: 6, r: 0 } }); // Dist 6
    const enemyShip = makeEnemyShip({ position: { q: 0, r: 0 }, facing: HexFacing.ForeStarboard }); // Speed 3, facing player
    
    const previews = previewAITierMovement(
      [enemyShip],
      [playerShip],
      [enemyShip],
      null,
      new Set([hexKey(playerShip.position), hexKey(enemyShip.position)]),
      new Map(),
    );

    const preview = previews.get(enemyShip.id);
    expect(preview).toBeDefined();
    const finalDist = hexDistance(preview!.targetHex, playerShip.position);
    
    // Starting at 6, speed 3. Can reach 3.
    expect(finalDist).toBe(3);
    expect(finalDist).toBeLessThan(hexDistance(enemyShip.position, playerShip.position));
  });

  it('Escort behavior: maintains range 2-3 when already close', () => {
    const playerShip = makePlayerShip({ position: { q: 3, r: 0 } }); // Dist 3
    const enemyShip = makeEnemyShip({ position: { q: 0, r: 0 }, facing: HexFacing.ForeStarboard }); // Speed 3, facing player
    
    const previews = previewAITierMovement(
      [enemyShip],
      [playerShip],
      [enemyShip],
      null,
      new Set([hexKey(playerShip.position), hexKey(enemyShip.position)]),
      new Map(),
    );

    const preview = previews.get(enemyShip.id);
    expect(preview).toBeDefined();
    const finalDist = hexDistance(preview!.targetHex, playerShip.position);
    
    // Should stay at distance 3 (or 2) instead of moving to 0 or 6.
    expect(finalDist).toBeGreaterThanOrEqual(2);
    expect(finalDist).toBeLessThanOrEqual(3);
  });

  it('Escort behavior: backs away slightly to range 2 when at range 1', () => {
    const playerShip = makePlayerShip({ position: { q: 1, r: 0 } }); // Dist 1
    const enemyShip = makeEnemyShip({ position: { q: 0, r: 0 }, facing: HexFacing.ForeStarboard }); // Speed 3, facing player
    
    const previews = previewAITierMovement(
      [enemyShip],
      [playerShip],
      [enemyShip],
      null,
      new Set([hexKey(playerShip.position), hexKey(enemyShip.position)]),
      new Map(),
    );

    const preview = previews.get(enemyShip.id);
    expect(preview).toBeDefined();
    const finalDist = hexDistance(preview!.targetHex, playerShip.position);
    
    // Should prefer 2 over 1 or 0.
    expect(finalDist).toBe(2);
  });

  it('Support behavior (baseline): maximizes distance from player', () => {
    // We use Hegemony Carrier which still has 'support'
    const playerShip = makePlayerShip({ position: { q: 3, r: 0 } }); // Dist 3
    const enemyShip = makeEnemyShip({ 
      adversaryId: 'carrier', 
      position: { q: 0, r: 0 },
      facing: HexFacing.Aft // Pointing away
    }); 
    
    const previews = previewAITierMovement(
      [enemyShip],
      [playerShip],
      [enemyShip],
      null,
      new Set([hexKey(playerShip.position), hexKey(enemyShip.position)]),
      new Map(),
    );

    const preview = previews.get(enemyShip.id);
    expect(preview).toBeDefined();
    const finalDist = hexDistance(preview!.targetHex, playerShip.position);
    
    // Starting at 3, speed 1 (Carrier speed). Should move to 4.
    expect(finalDist).toBe(4);
    expect(finalDist).toBeGreaterThan(hexDistance(enemyShip.position, playerShip.position));
  });
});
