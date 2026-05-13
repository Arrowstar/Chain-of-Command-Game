import type { WeaponFireEvent } from '../types/game';
import { useSettingsStore } from '../store/useSettingsStore';

// ═══════════════════════════════════════════════════════════════════
// Combat SFX — singleton audio elements pre-loaded at module init
//
// Mirrors the pattern used in main.tsx for button-click / hover sfx:
// module-level Audio objects reset to t=0 before each play so rapid
// successive shots don't overlap into cacophony.
// ═══════════════════════════════════════════════════════════════════

/**
 * Delays for impact sounds relative to when the animation is spawned.
 * Weapon fire plays immediately; impact plays after ~65% of the anim
 * duration (matching `applyImpactFlash`'s flashStartFraction = 0.65).
 */
const FIRE_IMPACT_DELAY_MS = 220;

// Guard for SSR / test environments where Audio is unavailable
const canAudio = typeof Audio !== 'undefined';

function makeAudio(src: string): HTMLAudioElement | null {
  if (!canAudio) return null;
  try {
    return new Audio(src);
  } catch {
    return null;
  }
}

const _sfx = {
  beam:      makeAudio('/assets/sounds/weapon-beam.wav'),
  tracer:    makeAudio('/assets/sounds/weapon-tracer.wav'),
  broadside: makeAudio('/assets/sounds/weapon-broadside.wav'),
  ion:       makeAudio('/assets/sounds/weapon-ion.wav'),
  flak:      makeAudio('/assets/sounds/weapon-flak.wav'),
  pdc:       makeAudio('/assets/sounds/weapon-pdc.wav'),
  torpedo:   makeAudio('/assets/sounds/weapon-torpedo.wav'),
  explosion: makeAudio('/assets/sounds/impact-explosion.wav'),
  shield:    makeAudio('/assets/sounds/impact-shield.wav'),
} as const;

function play(el: HTMLAudioElement | null, volume: number): void {
  if (!el) return;
  el.volume = Math.max(0, Math.min(1, volume));
  el.currentTime = 0;
  el.play().catch(() => { /* swallow autoplay policy errors */ });
}

/**
 * Select the weapon-fire audio element for a given fire event.
 * Returns null for pure-visual events (explosion, torpedo spawn).
 */
export function selectFireSfx(
  event: WeaponFireEvent,
): HTMLAudioElement | null {
  const tags = event.weaponTags;

  // Pure visual events — no "fire" sound, only impact
  if (tags.includes('explosion')) return null;
  // Torpedo travel has its own fire sound
  if (tags.includes('torpedo-travel')) return _sfx.torpedo;

  if (tags.includes('shieldBreaker'))  return _sfx.ion;
  if (tags.includes('broadside'))      return _sfx.broadside;
  if (tags.includes('armorPiercing'))  return _sfx.tracer;
  if (tags.includes('areaOfEffect'))   return _sfx.flak;
  if (tags.includes('pointDefense'))   return _sfx.pdc;

  // Default: plasma / standard beam
  return _sfx.beam;
}

/**
 * Select the impact audio element for a given fire event.
 * Returns null for misses, torpedo travel, or if no outcome is set.
 */
export function selectImpactSfx(
  event: WeaponFireEvent,
): HTMLAudioElement | null {
  const tags = event.weaponTags;

  // Explosions always play the explosion sound (no delay)
  if (tags.includes('explosion')) return _sfx.explosion;

  // Torpedo travel has no impact sound at the travel stage
  if (tags.includes('torpedo-travel')) return null;

  if (event.outcome === 'hull-hit')   return _sfx.explosion;
  if (event.outcome === 'shield-hit') return _sfx.shield;

  return null; // miss or unset
}

/**
 * Play the appropriate weapon fire and (delayed) impact sounds for a
 * `WeaponFireEvent`.  Call this from HexMap at animation-spawn time.
 *
 * Volume is read from `useSettingsStore.sfxVolume` at call time so it
 * always reflects the player's current slider setting.
 */
export function playCombatSfx(event: WeaponFireEvent): void {
  const vol = useSettingsStore.getState().sfxVolume;

  // 1. Immediate weapon-fire sound
  const fireSfx = selectFireSfx(event);
  play(fireSfx, vol);

  // 2. Delayed impact sound (timed to match visual flash at ~65% of anim)
  const impactSfx = selectImpactSfx(event);
  if (impactSfx) {
    // Explosions are the "fire" event themselves — play immediately
    const delay = event.weaponTags.includes('explosion') ? 0 : FIRE_IMPACT_DELAY_MS;
    if (delay === 0) {
      play(impactSfx, vol);
    } else {
      setTimeout(() => {
        const currentVol = useSettingsStore.getState().sfxVolume;
        play(impactSfx, currentVol);
      }, delay);
    }
  }
}
