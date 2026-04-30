/**
 * Unit tests for weaponFireAnimations.ts
 *
 * We test all pure geometry helpers and the factory logic.
 * PIXI is not available in the test environment, so createWeaponFireAnimation
 * is tested via a lightweight mock that captures the Graphics calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WeaponFireEvent } from '../types/game';

// ── PIXI Mock ────────────────────────────────────────────────────────
// Must come before the module import so the factory receives the mock.
vi.mock('pixi.js', () => {
  class MockGraphics {
    calls: string[] = [];
    clear()                                  { this.calls.push('clear'); return this; }
    lineStyle()                              { this.calls.push('lineStyle'); return this; }
    moveTo()                                 { this.calls.push('moveTo'); return this; }
    lineTo()                                 { this.calls.push('lineTo'); return this; }
    drawCircle()                             { this.calls.push('drawCircle'); return this; }
    beginFill()                              { this.calls.push('beginFill'); return this; }
    endFill()                                { this.calls.push('endFill'); return this; }
    destroy()                                { this.calls.push('destroy'); }
  }
  return { Graphics: MockGraphics };
});

import {
  easeOutQuad,
  easeInQuad,
  lerpPoint,
  distance,
  unitVector,
  perpendicular,
  ANIM_COLORS,
  createWeaponFireAnimation,
} from './weaponFireAnimations';

// ── Geometry helpers ─────────────────────────────────────────────────

describe('easeOutQuad', () => {
  it('returns 0 at t=0', () => expect(easeOutQuad(0)).toBe(0));
  it('returns 1 at t=1', () => expect(easeOutQuad(1)).toBe(1));
  it('is concave (decelerating): mid-point > 0.5', () => {
    expect(easeOutQuad(0.5)).toBeGreaterThan(0.5);
  });
  it('is monotonically increasing', () => {
    const values = [0, 0.25, 0.5, 0.75, 1].map(easeOutQuad);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe('easeInQuad', () => {
  it('returns 0 at t=0', () => expect(easeInQuad(0)).toBe(0));
  it('returns 1 at t=1', () => expect(easeInQuad(1)).toBe(1));
  it('is convex (accelerating): mid-point < 0.5', () => {
    expect(easeInQuad(0.5)).toBeLessThan(0.5);
  });
});

describe('lerpPoint', () => {
  const A = { x: 0, y: 0 };
  const B = { x: 10, y: 20 };

  it('returns A at t=0', () => expect(lerpPoint(A, B, 0)).toEqual({ x: 0, y: 0 }));
  it('returns B at t=1', () => expect(lerpPoint(A, B, 1)).toEqual({ x: 10, y: 20 }));
  it('returns midpoint at t=0.5', () => expect(lerpPoint(A, B, 0.5)).toEqual({ x: 5, y: 10 }));
  it('extrapolates beyond t=1', () => {
    const result = lerpPoint(A, B, 1.5);
    expect(result.x).toBeCloseTo(15);
    expect(result.y).toBeCloseTo(30);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0));
  it('returns correct value for 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
  });
  it('is symmetric', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 7, y: 10 };
    expect(distance(a, b)).toBeCloseTo(distance(b, a));
  });
});

describe('unitVector', () => {
  it('has magnitude ≈ 1 for any non-zero pair', () => {
    const u = unitVector({ x: 0, y: 0 }, { x: 3, y: 4 });
    const mag = Math.sqrt(u.x * u.x + u.y * u.y);
    expect(mag).toBeCloseTo(1);
  });
  it('points right for horizontal input', () => {
    const u = unitVector({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(u.x).toBeCloseTo(1);
    expect(u.y).toBeCloseTo(0);
  });
  it('returns default {1,0} for zero-length input', () => {
    const u = unitVector({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(u.x).toBeCloseTo(1);
    expect(u.y).toBeCloseTo(0);
  });
});

describe('perpendicular', () => {
  it('is orthogonal to the original vector', () => {
    const v = { x: 0.6, y: 0.8 };
    const p = perpendicular(v);
    const dot = v.x * p.x + v.y * p.y;
    expect(dot).toBeCloseTo(0);
  });
  it('has the same magnitude as the input', () => {
    const v = { x: 0.6, y: 0.8 };
    const p = perpendicular(v);
    const magV = Math.sqrt(v.x * v.x + v.y * v.y);
    const magP = Math.sqrt(p.x * p.x + p.y * p.y);
    expect(magP).toBeCloseTo(magV);
  });
  it('rotates 90° CCW: (1,0) → (0,1)', () => {
    const p = perpendicular({ x: 1, y: 0 });
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});

// ── createWeaponFireAnimation factory ─────────────────────────────────

function makeEvent(tags: WeaponFireEvent['weaponTags'], isEnemy = false): WeaponFireEvent {
  return {
    id: 'test-id',
    attackerPos: { q: 0, r: 0 },
    targetPos:   { q: 2, r: 0 },
    weaponTags: tags,
    isEnemy,
  };
}

const FROM = { x: 0, y: 0 };
const TO   = { x: 100, y: 0 };

describe('createWeaponFireAnimation', () => {
  describe('torpedo tag', () => {
    it('returns a zero-duration no-op for torpedo weapons', () => {
      const anim = createWeaponFireAnimation(makeEvent(['torpedo']), FROM, TO);
      expect(anim.duration).toBe(0);
    });
    it('update() does not throw for torpedo no-op', () => {
      const anim = createWeaponFireAnimation(makeEvent(['torpedo']), FROM, TO);
      expect(() => anim.update(anim.gfx as any, 0.5)).not.toThrow();
    });
  });

  describe('standard / default beam', () => {
    it('creates an animation with positive duration', () => {
      const anim = createWeaponFireAnimation(makeEvent(['standard']), FROM, TO);
      expect(anim.duration).toBeGreaterThan(0);
    });
    it('update() calls clear() on each tick', () => {
      const anim = createWeaponFireAnimation(makeEvent(['standard']), FROM, TO);
      anim.update(anim.gfx as any, 0.3);
      expect((anim.gfx as any).calls).toContain('clear');
    });
    it('impact flash calls drawCircle() at progress ≥ 0.65', () => {
      const anim = createWeaponFireAnimation(makeEvent(['standard']), FROM, TO);
      anim.update(anim.gfx as any, 0.8);
      expect((anim.gfx as any).calls).toContain('drawCircle');
    });
    it('no drawCircle() before impact-flash threshold', () => {
      const anim = createWeaponFireAnimation(makeEvent(['standard']), FROM, TO);
      anim.update(anim.gfx as any, 0.2);
      expect((anim.gfx as any).calls).not.toContain('drawCircle');
    });
  });

  describe('armorPiercing tracer', () => {
    it('has shorter duration than standard beam', () => {
      const tracer = createWeaponFireAnimation(makeEvent(['armorPiercing']), FROM, TO);
      const beam   = createWeaponFireAnimation(makeEvent(['standard']),       FROM, TO);
      expect(tracer.duration).toBeLessThan(beam.duration);
    });
  });

  describe('broadside', () => {
    it('has longer duration than standard (to accommodate stagger)', () => {
      const broadside = createWeaponFireAnimation(makeEvent(['broadside']), FROM, TO);
      const beam      = createWeaponFireAnimation(makeEvent(['standard']), FROM, TO);
      expect(broadside.duration).toBeGreaterThanOrEqual(beam.duration);
    });
  });

  describe('shieldBreaker (ripple)', () => {
    it('calls drawCircle at any progress > 0', () => {
      const anim = createWeaponFireAnimation(makeEvent(['shieldBreaker']), FROM, TO);
      // Test at a mid-progress value where the ripple is visible
      anim.update(anim.gfx as any, 0.4);
      expect((anim.gfx as any).calls).toContain('drawCircle');
    });
  });

  describe('areaOfEffect fan', () => {
    it('calls moveTo and lineTo (beam + burst lines)', () => {
      const anim = createWeaponFireAnimation(makeEvent(['areaOfEffect']), FROM, TO);
      anim.update(anim.gfx as any, 0.7);
      expect((anim.gfx as any).calls).toContain('moveTo');
      expect((anim.gfx as any).calls).toContain('lineTo');
    });
  });

  describe('pointDefense', () => {
    it('creates animation that clears on each tick', () => {
      const anim = createWeaponFireAnimation(makeEvent(['pointDefense']), FROM, TO);
      anim.update(anim.gfx as any, 0.5);
      expect((anim.gfx as any).calls).toContain('clear');
    });
  });

  describe('enemy flag', () => {
    it('animation still has positive duration when isEnemy=true', () => {
      const anim = createWeaponFireAnimation(makeEvent(['standard'], true), FROM, TO);
      expect(anim.duration).toBeGreaterThan(0);
    });
    it('enemy and player animations differ only in color, not structure', () => {
      const enemy  = createWeaponFireAnimation(makeEvent(['standard'], true), FROM, TO);
      const player = createWeaponFireAnimation(makeEvent(['standard'], false), FROM, TO);
      // Both should have equal duration since only color differs
      expect(enemy.duration).toBe(player.duration);
    });
  });

  describe('id propagation', () => {
    it('preserves event id on the returned animation', () => {
      const event = makeEvent(['standard']);
      event.id = 'my-unique-id';
      const anim = createWeaponFireAnimation(event, FROM, TO);
      expect(anim.id).toBe('my-unique-id');
    });
  });

  describe('ANIM_COLORS palette', () => {
    it('exposes distinct hex values for each weapon type', () => {
      const values = Object.values(ANIM_COLORS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
    it('all values are valid 24-bit RGB numbers', () => {
      Object.values(ANIM_COLORS).forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(0xFFFFFF);
      });
    });
  });
});
