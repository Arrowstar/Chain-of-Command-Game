/**
 * useCombatSfx.test.ts
 *
 * Tests for the combat sound-effect utility.
 *
 * Strategy: since Audio playback is not available in the test environment
 * (jsdom provides a stub), we test the *selector* functions directly:
 *   - selectFireSfx  → which audio element (or null) is chosen for the fire sound
 *   - selectImpactSfx → which audio element (or null) is chosen for the impact sound
 *
 * We also smoke-test playCombatSfx to ensure it does not throw even when
 * the underlying Audio stubs cannot actually play audio.
 *
 * NEW TEST FILE — no changes to existing tests required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Audio so the module can be imported in Node / jsdom ──────
// vitest hoists imports, so the module evaluates before setup code.
// We mock HTMLMediaElement.prototype.play directly so the jsdom Audio 
// instances created by the module return a Promise (avoiding .catch errors).
const mockPlay = vi.fn(() => Promise.resolve());
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = mockPlay;
}

// ── Mock useSettingsStore ─────────────────────────────────────────
vi.mock('../store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ sfxVolume: 0.5 }),
  },
}));

// Now import the module under test
import { selectFireSfx, selectImpactSfx, playCombatSfx } from './useCombatSfx';
import type { WeaponFireEvent } from '../types/game';

// ── Helpers ───────────────────────────────────────────────────────
function makeEvent(
  tags: string[],
  outcome?: WeaponFireEvent['outcome'],
): WeaponFireEvent {
  return {
    id: 'test-event',
    attackerPos: { q: 0, r: 0 },
    targetPos: { q: 1, r: 0 },
    weaponTags: tags as WeaponFireEvent['weaponTags'],
    isEnemy: false,
    outcome,
  };
}

// ─────────────────────────────────────────────────────────────────
// selectFireSfx
// ─────────────────────────────────────────────────────────────────
describe('selectFireSfx', () => {
  it('returns null for explosion events (no fire sound, only impact)', () => {
    expect(selectFireSfx(makeEvent(['explosion']))).toBeNull();
  });

  it('returns torpedo audio for torpedo-travel events', () => {
    const el = selectFireSfx(makeEvent(['torpedo-travel']));
    expect(el).not.toBeNull();
    expect((el as HTMLAudioElement).src).toContain('weapon-torpedo');
  });

  it('returns ion audio for shieldBreaker weapons', () => {
    const el = selectFireSfx(makeEvent(['shieldBreaker']));
    expect((el as HTMLAudioElement).src).toContain('weapon-ion');
  });

  it('returns broadside audio for broadside weapons', () => {
    const el = selectFireSfx(makeEvent(['broadside']));
    expect((el as HTMLAudioElement).src).toContain('weapon-broadside');
  });

  it('returns tracer audio for armorPiercing weapons', () => {
    const el = selectFireSfx(makeEvent(['armorPiercing']));
    expect((el as HTMLAudioElement).src).toContain('weapon-tracer');
  });

  it('returns flak audio for areaOfEffect weapons', () => {
    const el = selectFireSfx(makeEvent(['areaOfEffect']));
    expect((el as HTMLAudioElement).src).toContain('weapon-flak');
  });

  it('returns PDC audio for pointDefense weapons', () => {
    const el = selectFireSfx(makeEvent(['pointDefense']));
    expect((el as HTMLAudioElement).src).toContain('weapon-pdc');
  });

  it('returns beam audio for standard / generic weapons (empty tags)', () => {
    const el = selectFireSfx(makeEvent([]));
    expect((el as HTMLAudioElement).src).toContain('weapon-beam');
  });

  it('returns beam audio when tags do not match any special weapon', () => {
    const el = selectFireSfx(makeEvent(['standard']));
    expect((el as HTMLAudioElement).src).toContain('weapon-beam');
  });
});

// ─────────────────────────────────────────────────────────────────
// selectImpactSfx
// ─────────────────────────────────────────────────────────────────
describe('selectImpactSfx', () => {
  it('returns explosion audio for explosion events regardless of outcome', () => {
    const el = selectImpactSfx(makeEvent(['explosion']));
    expect((el as HTMLAudioElement).src).toContain('impact-explosion');
  });

  it('returns null for torpedo-travel events (no impact at travel stage)', () => {
    expect(selectImpactSfx(makeEvent(['torpedo-travel']))).toBeNull();
  });

  it('returns explosion audio when outcome is hull-hit', () => {
    const el = selectImpactSfx(makeEvent([], 'hull-hit'));
    expect((el as HTMLAudioElement).src).toContain('impact-explosion');
  });

  it('returns shield audio when outcome is shield-hit', () => {
    const el = selectImpactSfx(makeEvent([], 'shield-hit'));
    expect((el as HTMLAudioElement).src).toContain('impact-shield');
  });

  it('returns null when outcome is miss', () => {
    expect(selectImpactSfx(makeEvent([], 'miss'))).toBeNull();
  });

  it('returns null when outcome is undefined (e.g. no game data)', () => {
    expect(selectImpactSfx(makeEvent([]))).toBeNull();
  });

  it('hull-hit overrides any weapon tag for impact sound', () => {
    // Even a shieldBreaker / ion weapon can overflow to hull — play explosion
    const el = selectImpactSfx(makeEvent(['shieldBreaker'], 'hull-hit'));
    expect((el as HTMLAudioElement).src).toContain('impact-explosion');
  });

  it('shield-hit on armorPiercing weapon plays shield sound (edge case: piercing absorbed)', () => {
    const el = selectImpactSfx(makeEvent(['armorPiercing'], 'shield-hit'));
    expect((el as HTMLAudioElement).src).toContain('impact-shield');
  });
});

// ─────────────────────────────────────────────────────────────────
// playCombatSfx — smoke tests (verifies it does not throw)
// ─────────────────────────────────────────────────────────────────
describe('playCombatSfx', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPlay.mockClear();
  });

  it('does not throw for a hull-hit beam event', () => {
    expect(() => playCombatSfx(makeEvent([], 'hull-hit'))).not.toThrow();
  });

  it('does not throw for a shield-hit event', () => {
    expect(() => playCombatSfx(makeEvent([], 'shield-hit'))).not.toThrow();
  });

  it('does not throw for a miss event', () => {
    expect(() => playCombatSfx(makeEvent([], 'miss'))).not.toThrow();
  });

  it('does not throw for an explosion event', () => {
    expect(() => playCombatSfx(makeEvent(['explosion']))).not.toThrow();
  });

  it('does not throw for a torpedo-travel event', () => {
    expect(() => playCombatSfx(makeEvent(['torpedo-travel']))).not.toThrow();
  });

  it('calls play() on the fire sfx element for a non-explosion event', () => {
    mockPlay.mockClear();
    playCombatSfx(makeEvent(['broadside'], 'hull-hit'));
    // play() should be called at least once immediately (the fire sound)
    expect(mockPlay).toHaveBeenCalled();
  });

  it('calls play() for explosion events immediately (no fire, just impact)', () => {
    mockPlay.mockClear();
    playCombatSfx(makeEvent(['explosion']));
    // Explosion plays immediately with no setTimeout
    expect(mockPlay).toHaveBeenCalled();
  });

  it('schedules a delayed impact play() via setTimeout for hull-hit events', () => {
    mockPlay.mockClear();
    playCombatSfx(makeEvent(['standard'], 'hull-hit'));
    const callsBeforeTimer = mockPlay.mock.calls.length; // only fire sound
    vi.runAllTimers();
    expect(mockPlay.mock.calls.length).toBeGreaterThan(callsBeforeTimer);
  });

  it('schedules a delayed play() for shield-hit events', () => {
    mockPlay.mockClear();
    playCombatSfx(makeEvent([], 'shield-hit'));
    const callsBeforeTimer = mockPlay.mock.calls.length;
    vi.runAllTimers();
    expect(mockPlay.mock.calls.length).toBeGreaterThan(callsBeforeTimer);
  });

  it('does NOT schedule an impact play() for miss events', () => {
    mockPlay.mockClear();
    playCombatSfx(makeEvent([], 'miss'));
    const callsAfterFire = mockPlay.mock.calls.length;
    vi.runAllTimers();
    // No additional calls from a delayed impact
    expect(mockPlay.mock.calls.length).toBe(callsAfterFire);
  });
});

// ─────────────────────────────────────────────────────────────────
// WeaponFireEvent.outcome — type-level verification
// (These simply confirm the type is defined as expected at compile time.)
// ─────────────────────────────────────────────────────────────────
describe('WeaponFireEvent.outcome field', () => {
  it('accepts hull-hit outcome', () => {
    const e = makeEvent([], 'hull-hit');
    expect(e.outcome).toBe('hull-hit');
  });

  it('accepts shield-hit outcome', () => {
    const e = makeEvent([], 'shield-hit');
    expect(e.outcome).toBe('shield-hit');
  });

  it('accepts miss outcome', () => {
    const e = makeEvent([], 'miss');
    expect(e.outcome).toBe('miss');
  });

  it('accepts undefined outcome (backward-compatible for explosion/travel events)', () => {
    const e = makeEvent(['explosion']);
    expect(e.outcome).toBeUndefined();
  });
});
