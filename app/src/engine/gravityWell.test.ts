import { describe, expect, it, vi } from 'vitest';
import { applyGravityWellPull } from './gravityWell';
import type { ShipState, EnemyShipState, HexCoord } from '../types/game';
import { hexKey } from './hexGrid';

vi.mock('../utils/diceRoller', () => ({
  rollDie: vi.fn(() => 2),
}));

describe('Gravity Well Engine', () => {
  const makeShip = (id: string, pos: HexCoord): ShipState => ({
    id,
    position: pos,
    isDestroyed: false,
  } as any);

  const makeEnemyShip = (id: string, pos: HexCoord): EnemyShipState => ({
    id,
    position: pos,
    isDestroyed: false,
  } as any);

  it('pulls ships within range 5 toward the well', () => {
    const well = { q: 0, r: 0 };
    const playerShip = makeShip('p1', { q: 2, r: 0 }); // dist 2
    const enemyShip = makeEnemyShip('e1', { q: -3, r: 0 }); // dist 3
    
    const results = applyGravityWellPull([playerShip], [enemyShip], [well], new Set());
    
    expect(results.length).toBe(2);
    expect(results[0].shipId).toBe('p1');
    expect(results[0].toPos).toEqual({ q: 1, r: 0 }); // Pulled 1 hex closer
    expect(results[1].shipId).toBe('e1');
    expect(results[1].toPos).toEqual({ q: -2, r: 0 }); // Pulled 1 hex closer
  });

  it('does not pull ships already at the center (dist 0)', () => {
    const well = { q: 0, r: 0 };
    const ship = makeShip('p1', { q: 0, r: 0 });
    
    const results = applyGravityWellPull([ship], [], [well], new Set());
    
    expect(results.length).toBe(0);
  });

  it('does not pull ships beyond range 5', () => {
    const well = { q: 0, r: 0 };
    const ship = makeShip('p1', { q: 6, r: 0 });
    
    const results = applyGravityWellPull([ship], [], [well], new Set());
    
    expect(results.length).toBe(0);
  });

  it('resolves collisions when pulled into an occupied hex', () => {
    const well = { q: 0, r: 0 };
    const ship = makeShip('p1', { q: 2, r: 0 });
    const obstacle = makeShip('p2', { q: 1, r: 0 });
    
    const occupied = new Set([hexKey(ship.position), hexKey(obstacle.position)]);
    const results = applyGravityWellPull([ship, obstacle], [], [well], occupied);
    
    const p1Result = results.find(r => r.shipId === 'p1');
    expect(p1Result).toBeDefined();
    expect(p1Result?.toPos).toEqual({ q: 2, r: 0 }); // Blocked
    expect(p1Result?.collisionDamage).toBeGreaterThan(0);
  });

  it('handles multiple wells by pulling toward the first one in range', () => {
    const wells = [{ q: -10, r: 0 }, { q: 10, r: 0 }];
    const ship = makeShip('p1', { q: 8, r: 0 }); // Closest to well 2 (dist 2), but well 1 is too far
    
    const results = applyGravityWellPull([ship], [], wells, new Set());
    
    expect(results.length).toBe(1);
    expect(results[0].toPos).toEqual({ q: 9, r: 0 }); // Pulled toward well 2
  });
});
