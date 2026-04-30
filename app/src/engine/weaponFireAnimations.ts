import * as PIXI from 'pixi.js';
import type { WeaponFireEvent, WeaponTag } from '../types/game';

// ═══════════════════════════════════════════════════════════════════
// Weapon Fire Animations — PixiJS visual only, zero game state
// ═══════════════════════════════════════════════════════════════════

/** One active animation managed by HexMap's ticker */
export interface ActiveFireAnimation {
  id: string;
  gfx: PIXI.Graphics;
  /** Elapsed milliseconds since spawn */
  elapsed: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Called every tick with eased progress [0, 1]. Redraws `gfx`. */
  update: (gfx: PIXI.Graphics, progress: number) => void;
}

// ── Colour palette ──────────────────────────────────────────────────

export const ANIM_COLORS = {
  plasma:      0x00EEFF, // standard / ion / default player
  railgun:     0xEEEEFF, // armorPiercing
  broadside:   0xFF9900, // broadside macrocannons
  ion:         0xCC66FF, // shieldBreaker
  flak:        0xCCFF00, // areaOfEffect
  pdc:         0xFF4444, // pointDefense
  enemy:       0xFF6B6B, // enemy attacks (override tint)
} as const;

// ── Easing ──────────────────────────────────────────────────────────

/** Smooth deceleration */
export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/** Sharp acceleration */
export function easeInQuad(t: number): number {
  return t * t;
}

// ── Geometry helpers (pure, easily testable) ─────────────────────────

export interface Point2D { x: number; y: number; }

/** Linearly interpolate between two 2-D points */
export function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Euclidean distance between two points */
export function distance(a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Unit vector from a to b */
export function unitVector(a: Point2D, b: Point2D): Point2D {
  const d = distance(a, b);
  if (d < 0.001) return { x: 1, y: 0 };
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
}

/** Perpendicular (90° CCW) of a unit vector */
export function perpendicular(v: Point2D): Point2D {
  return { x: -v.y, y: v.x };
}

// ── Individual animation factories ──────────────────────────────────

/**
 * Beam: a thick line that expands from attacker to target over the first
 * half of the duration, then fades alpha out over the second half.
 */
function createBeamAnimation(
  from: Point2D, to: Point2D,
  color: number,
  thickness = 3,
  duration = 350,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      // Phase 1 (0→0.5): beam grows from attacker to target
      // Phase 2 (0.5→1): full beam fades out
      const growProgress = Math.min(1, progress / 0.5);
      const fadeProgress = progress > 0.5 ? (progress - 0.5) / 0.5 : 0;
      const alpha = 1 - easeOutQuad(fadeProgress);
      const tip = lerpPoint(from, to, easeOutQuad(growProgress));
      g.lineStyle(thickness, color, alpha * 0.9);
      g.moveTo(from.x, from.y);
      g.lineTo(tip.x, tip.y);
      // Glow line (slightly wider, lower alpha)
      g.lineStyle(thickness * 2.5, color, alpha * 0.25);
      g.moveTo(from.x, from.y);
      g.lineTo(tip.x, tip.y);
    },
  };
}

/**
 * Tracer: a short bright segment that races from attacker to target.
 * Used for railgun / armor-piercing shots.
 */
function createTracerAnimation(
  from: Point2D, to: Point2D,
  color: number,
  duration = 300,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  const tracerLen = 0.18; // fraction of total distance
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      const eased = easeOutQuad(progress);
      const headT = Math.min(1, eased + tracerLen);
      const tailT = Math.max(0, eased);
      const head = lerpPoint(from, to, headT);
      const tail = lerpPoint(from, to, tailT);
      const alpha = progress < 0.85 ? 1 : 1 - ((progress - 0.85) / 0.15);
      g.lineStyle(2, color, alpha);
      g.moveTo(tail.x, tail.y);
      g.lineTo(head.x, head.y);
      g.lineStyle(5, color, alpha * 0.35);
      g.moveTo(tail.x, tail.y);
      g.lineTo(head.x, head.y);
    },
  };
}

/**
 * Broadside: fires `count` staggered tracers with slight offsets.
 */
function createBroadsideAnimation(
  from: Point2D, to: Point2D,
  color: number,
  duration = 420,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  const u = unitVector(from, to);
  const perp = perpendicular(u);
  const offsets = [-10, 0, 10];
  const delays  = [0, 0.12, 0.24]; // stagger as fraction of duration
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      offsets.forEach((offset, i) => {
        const tracerProgress = Math.max(0, (progress - delays[i]) / (1 - delays[i]));
        if (tracerProgress <= 0) return;
        const tracerLen = 0.14;
        const eased = easeOutQuad(tracerProgress);
        const headT = Math.min(1, eased + tracerLen);
        const tailT = Math.max(0, eased);
        const ox = perp.x * offset;
        const oy = perp.y * offset;
        const head = lerpPoint(from, to, headT);
        const tail = lerpPoint(from, to, tailT);
        const alpha = tracerProgress < 0.85 ? 1 : 1 - ((tracerProgress - 0.85) / 0.15);
        g.lineStyle(2.5, color, alpha);
        g.moveTo(tail.x + ox, tail.y + oy);
        g.lineTo(head.x + ox, head.y + oy);
      });
    },
  };
}

/**
 * Ripple: an expanding ring that travels from attacker to target.
 * Used for ion / shieldBreaker weapons.
 */
function createRippleAnimation(
  from: Point2D, to: Point2D,
  color: number,
  duration = 400,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      const eased = easeOutQuad(progress);
      const center = lerpPoint(from, to, eased);
      const maxRadius = 18;
      const radius = maxRadius * easeInQuad(progress);
      const alpha = progress < 0.6 ? 1 : 1 - ((progress - 0.6) / 0.4);
      g.lineStyle(2, color, alpha * 0.9);
      g.drawCircle(center.x, center.y, Math.max(1, radius));
      g.lineStyle(5, color, alpha * 0.25);
      g.drawCircle(center.x, center.y, Math.max(1, radius * 0.7));
    },
  };
}

/**
 * Fan burst: short arcing lines radiating from the target hex.
 * Used for flak / areaOfEffect weapons.
 */
function createFanAnimation(
  from: Point2D, to: Point2D,
  color: number,
  duration = 380,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  const angles = [0, 60, 120, 180, 240, 300].map(a => a * Math.PI / 180);
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      // Phase 1 (0→0.4): beam from attacker to target
      const beamProg = Math.min(1, progress / 0.4);
      const tip = lerpPoint(from, to, easeOutQuad(beamProg));
      const beamAlpha = beamProg < 1 ? 0.8 : 0.8 * (1 - (progress - 0.4) / 0.6);
      g.lineStyle(2, color, beamAlpha);
      g.moveTo(from.x, from.y);
      g.lineTo(tip.x, tip.y);

      // Phase 2 (0.4→1): burst radiates from target
      if (progress > 0.4) {
        const burstProg = (progress - 0.4) / 0.6;
        const burstRadius = 24 * easeOutQuad(burstProg);
        const burstAlpha = 1 - easeOutQuad(burstProg);
        angles.forEach(angle => {
          const ex = to.x + Math.cos(angle) * burstRadius;
          const ey = to.y + Math.sin(angle) * burstRadius;
          g.lineStyle(2, color, burstAlpha * 0.9);
          g.moveTo(to.x, to.y);
          g.lineTo(ex, ey);
        });
        g.lineStyle(0);
        g.beginFill(color, burstAlpha * 0.15);
        g.drawCircle(to.x, to.y, burstRadius);
        g.endFill();
      }
    },
  };
}

/**
 * PDC flicker: rapid short lines radiating outward near the target.
 */
function createPDCAnimation(
  _from: Point2D, to: Point2D,
  color: number,
  duration = 280,
  id: string,
): ActiveFireAnimation {
  const gfx = new PIXI.Graphics();
  return {
    id, gfx, elapsed: 0, duration,
    update(g, progress) {
      g.clear();
      // Fast random-ish flicker using sin harmonics
      const alpha = progress < 0.75 ? 1 : 1 - ((progress - 0.75) / 0.25);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + progress * Math.PI * 3;
        const flicker = 0.5 + 0.5 * Math.sin(progress * 40 + i * 1.7);
        const len = 10 * flicker * (1 - easeOutQuad(progress));
        const ex = to.x + Math.cos(angle) * len;
        const ey = to.y + Math.sin(angle) * len;
        g.lineStyle(1.5, color, alpha * flicker);
        g.moveTo(to.x, to.y);
        g.lineTo(ex, ey);
      }
    },
  };
}

// ── Impact flash appended to every animation ─────────────────────────

/**
 * Brief bright circle on the target, overlaid on whatever the base animation is.
 * Starts at progress ≥ 0.65 so it coincides with beam arrival.
 */
function applyImpactFlash(
  anim: ActiveFireAnimation,
  target: Point2D,
  color: number,
  flashDuration = 250,
): ActiveFireAnimation {
  const flashStartFraction = 0.65;
  const originalUpdate = anim.update;
  return {
    ...anim,
    // Extend total duration to accommodate flash
    duration: Math.max(anim.duration, flashDuration / (1 - flashStartFraction) + anim.duration * flashStartFraction),
    update(g, progress) {
      originalUpdate(g, progress);
      if (progress >= flashStartFraction) {
        const flashProg = (progress - flashStartFraction) / (1 - flashStartFraction);
        const alpha = 1 - easeOutQuad(flashProg);
        const radius = 20 * easeOutQuad(flashProg);
        g.lineStyle(0);
        g.beginFill(0xFFFFFF, alpha * 0.45);
        g.drawCircle(target.x, target.y, radius);
        g.endFill();
        g.beginFill(color, alpha * 0.2);
        g.drawCircle(target.x, target.y, radius * 1.5);
        g.endFill();
      }
    },
  };
}

// ── Public factory ─────────────────────────────────────────────────────

/**
 * Selects and builds the appropriate animation for a WeaponFireEvent.
 *
 * @param event   - The fire event (positions + tags)
 * @param fromPx  - Pixel coordinates of the attacker's hex centre
 * @param toPx    - Pixel coordinates of the target's hex centre
 */
export function createWeaponFireAnimation(
  event: WeaponFireEvent,
  fromPx: Point2D,
  toPx: Point2D,
): ActiveFireAnimation {
  const tags: WeaponTag[] = event.weaponTags;

  // Torpedo has its own token — skip entirely (caller should never pass this,
  // but guard defensively so we return a zero-duration no-op).
  if (tags.includes('torpedo')) {
    const noop = new PIXI.Graphics();
    return { id: event.id, gfx: noop, elapsed: 0, duration: 0, update: () => {} };
  }

  const isEnemy = event.isEnemy;

  let base: ActiveFireAnimation;

  if (tags.includes('areaOfEffect')) {
    base = createFanAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.flak, 380, event.id);
  } else if (tags.includes('shieldBreaker')) {
    base = createRippleAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.ion, 400, event.id);
  } else if (tags.includes('broadside')) {
    base = createBroadsideAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.broadside, 420, event.id);
  } else if (tags.includes('armorPiercing')) {
    base = createTracerAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.railgun, 300, event.id);
  } else if (tags.includes('pointDefense')) {
    base = createPDCAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.pdc, 280, event.id);
  } else {
    // standard, ordnance without torpedo, or generic AI fire
    base = createBeamAnimation(fromPx, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.plasma, 3, 350, event.id);
  }

  return applyImpactFlash(base, toPx, isEnemy ? ANIM_COLORS.enemy : ANIM_COLORS.plasma);
}
