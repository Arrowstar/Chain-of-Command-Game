import { describe, it, expect } from 'vitest';
import type { ExperimentalTech } from '../types/campaignTypes';
import { ShipSize } from '../types/game';
import {
  applyPlasmaAccelerators, canRerollVoidGlass, getKineticSiphonShieldRestore,
  canUseTachyonMatrix, applyInertialDampeners, applyHardLightPlating,
  applyRecycledCoolant, applyAutoDocOverride, getAdmiralBlackBoxFF,
  getSalvagerDronesRP, shouldRevealEliteAndEventNodes,
  getStimInjectorBonus, canUseAstroCaf, getNeuralLinkCT,
} from './techEffects';

// ── Fixtures ──────────────────────────────────────────────────────

const makeTech = (id: string, overrides?: Partial<ExperimentalTech>): ExperimentalTech => ({
  id,
  name: 'Test Tech',
  category: 'tactical',
  effect: 'Does something cool',
  flavorText: 'Very cool indeed',
  imagePath: '',
  isConsumable: false,
  isConsumed: false,
  rarity: 'common',
  ...overrides,
});

const EMPTY: ExperimentalTech[] = [];

// ══════════════════════════════════════════════════════════════════
// 1. Tactical Tech
// ══════════════════════════════════════════════════════════════════

describe('applyPlasmaAccelerators', () => {
  const tech = [makeTech('plasma-accelerators')];

  it('increases range max by 1 for non-ordnance weapons', () => {
    expect(applyPlasmaAccelerators(4, false, tech)).toBe(5);
  });

  it('does NOT increase range for ordnance (torpedo) weapons', () => {
    expect(applyPlasmaAccelerators(4, true, tech)).toBe(4);
  });

  it('preserves Infinity range for board-wide weapons', () => {
    expect(applyPlasmaAccelerators(Infinity, false, tech)).toBe(Infinity);
  });

  it('has no effect without the tech', () => {
    expect(applyPlasmaAccelerators(4, false, EMPTY)).toBe(4);
  });

  it('has no effect if tech is consumed', () => {
    expect(applyPlasmaAccelerators(4, false, [makeTech('plasma-accelerators', { isConsumed: true })])).toBe(4);
  });
});

describe('canRerollVoidGlass', () => {
  const tech = [makeTech('void-glass-lenses')];

  it('allows reroll when tactical die rolled exactly 1', () => {
    expect(canRerollVoidGlass(1, tech)).toBe(true);
  });

  it('does NOT allow reroll for results other than 1', () => {
    expect(canRerollVoidGlass(2, tech)).toBe(false);
    expect(canRerollVoidGlass(6, tech)).toBe(false);
  });

  it('has no effect without the tech', () => {
    expect(canRerollVoidGlass(1, EMPTY)).toBe(false);
  });
});

describe('getKineticSiphonShieldRestore', () => {
  const tech = [makeTech('kinetic-siphon')];

  it('restores 1 shield per sector when killing a medium ship', () => {
    expect(getKineticSiphonShieldRestore('medium', tech)).toBe(1);
  });

  it('restores 1 shield per sector when killing a large ship', () => {
    expect(getKineticSiphonShieldRestore('large', tech)).toBe(1);
  });

  it('does NOT trigger on small craft kills', () => {
    expect(getKineticSiphonShieldRestore('small', tech)).toBe(0);
    expect(getKineticSiphonShieldRestore(ShipSize.Fighter, tech)).toBe(0);
  });

  it('has no effect without the tech', () => {
    expect(getKineticSiphonShieldRestore('medium', EMPTY)).toBe(0);
  });
});

describe('canUseTachyonMatrix', () => {
  const tech = [makeTech('tachyon-targeting-matrix')];

  it('permits conversion if not yet used this scenario', () => {
    expect(canUseTachyonMatrix(false, tech)).toBe(true);
  });

  it('does NOT permit second use in same scenario', () => {
    expect(canUseTachyonMatrix(true, tech)).toBe(false);
  });

  it('has no effect without the tech', () => {
    expect(canUseTachyonMatrix(false, EMPTY)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Engineering / Defensive Tech
// ══════════════════════════════════════════════════════════════════

describe('applyInertialDampeners', () => {
  const tech = [makeTech('inertial-dampeners')];

  it('negates first collision for a ship', () => {
    const negated = new Set<string>();
    const result = applyInertialDampeners(3, 'ship-1', negated, tech);
    expect(result.finalDamage).toBe(0);
    expect(result.negated).toBe(true);
  });

  it('does NOT negate second collision for same ship', () => {
    const negated = new Set(['ship-1']);
    const result = applyInertialDampeners(3, 'ship-1', negated, tech);
    expect(result.finalDamage).toBe(3);
    expect(result.negated).toBe(false);
  });

  it('negates for different ship independently', () => {
    const negated = new Set(['ship-1']);
    const result = applyInertialDampeners(2, 'ship-2', negated, tech);
    expect(result.negated).toBe(true);
  });

  it('has no effect without the tech', () => {
    const result = applyInertialDampeners(3, 'ship-1', new Set(), EMPTY);
    expect(result.finalDamage).toBe(3);
    expect(result.negated).toBe(false);
  });
});

describe('applyHardLightPlating', () => {
  const tech = [makeTech('hard-light-plating')];

  it('reduces first hull damage by 1 for a ship', () => {
    const triggered = new Set<string>();
    const result = applyHardLightPlating(4, 'ship-1', triggered, tech);
    expect(result.finalDamage).toBe(3);
    expect(result.triggered).toBe(true);
  });

  it('does NOT trigger a second time for same ship', () => {
    const triggered = new Set(['ship-1']);
    const result = applyHardLightPlating(4, 'ship-1', triggered, tech);
    expect(result.finalDamage).toBe(4);
    expect(result.triggered).toBe(false);
  });

  it('reduces 1-point damage to 0 (floor at 0)', () => {
    const result = applyHardLightPlating(1, 'ship-1', new Set(), tech);
    expect(result.finalDamage).toBe(0);
    expect(result.triggered).toBe(true);
  });

  it('has no effect without the tech', () => {
    const result = applyHardLightPlating(4, 'ship-1', new Set(), EMPTY);
    expect(result.finalDamage).toBe(4);
  });
});

describe('applyRecycledCoolant', () => {
  const tech = [makeTech('recycled-coolant')];

  it('reduces fatigue penalty by 1 when not yet used', () => {
    const result = applyRecycledCoolant(1, false, tech);
    expect(result.finalPenalty).toBe(0);
    expect(result.consumed).toBe(true);
  });

  it('does NOT reduce when already used this round', () => {
    const result = applyRecycledCoolant(1, true, tech);
    expect(result.finalPenalty).toBe(1);
    expect(result.consumed).toBe(false);
  });

  it('has no effect when fatigue penalty is 0', () => {
    const result = applyRecycledCoolant(0, false, tech);
    expect(result.finalPenalty).toBe(0);
    expect(result.consumed).toBe(false);
  });

  it('has no effect without the tech', () => {
    const result = applyRecycledCoolant(1, false, EMPTY);
    expect(result.finalPenalty).toBe(1);
  });
});

describe('applyAutoDocOverride', () => {
  const tech = [makeTech('auto-doc-override')];

  it('negates trauma and signals consumption', () => {
    const result = applyAutoDocOverride(tech);
    expect(result.negated).toBe(true);
    expect(result.shouldConsume).toBe(true);
  });

  it('has no effect without the tech', () => {
    const result = applyAutoDocOverride(EMPTY);
    expect(result.negated).toBe(false);
    expect(result.shouldConsume).toBe(false);
  });

  it('has no effect when already consumed', () => {
    const result = applyAutoDocOverride([makeTech('auto-doc-override', { isConsumed: true })]);
    expect(result.negated).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. Command & Logistics
// ══════════════════════════════════════════════════════════════════

describe('getAdmiralBlackBoxFF', () => {
  it('returns +1 FF at combat start when owned', () => {
    expect(getAdmiralBlackBoxFF([makeTech('admirals-black-box')])).toBe(1);
  });

  it('returns 0 without the tech', () => {
    expect(getAdmiralBlackBoxFF(EMPTY)).toBe(0);
  });
});

describe('getSalvagerDronesRP', () => {
  const tech = [makeTech('salvager-drones')];

  it('grants +5 RP for small craft kill', () => {
    expect(getSalvagerDronesRP('small', tech)).toBe(5);
    expect(getSalvagerDronesRP(ShipSize.Fighter, tech)).toBe(5);
  });

  it('grants 0 RP for medium ship kill', () => {
    expect(getSalvagerDronesRP('medium', tech)).toBe(0);
  });

  it('grants 0 RP for large ship kill', () => {
    expect(getSalvagerDronesRP('large', tech)).toBe(0);
  });

  it('has no effect without the tech', () => {
    expect(getSalvagerDronesRP('small', EMPTY)).toBe(0);
  });
});

describe('shouldRevealEliteAndEventNodes', () => {
  it('returns true with Hegemony Encryption Key', () => {
    expect(shouldRevealEliteAndEventNodes([makeTech('hegemony-encryption-key')])).toBe(true);
  });

  it('returns false without the tech', () => {
    expect(shouldRevealEliteAndEventNodes(EMPTY)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. Crew & Psychology
// ══════════════════════════════════════════════════════════════════

describe('getStimInjectorBonus', () => {
  it('returns +1 max stress with the tech', () => {
    expect(getStimInjectorBonus([makeTech('combat-stim-injectors')])).toBe(1);
  });

  it('returns 0 without the tech', () => {
    expect(getStimInjectorBonus(EMPTY)).toBe(0);
  });
});

describe('canUseAstroCaf', () => {
  const tech = [makeTech('astro-caf-synthesizer')];

  it('available when ship took no hull damage', () => {
    expect(canUseAstroCaf(false, tech)).toBe(true);
  });

  it('NOT available when ship took hull damage', () => {
    expect(canUseAstroCaf(true, tech)).toBe(false);
  });

  it('has no effect without the tech', () => {
    expect(canUseAstroCaf(false, EMPTY)).toBe(false);
  });
});

describe('getNeuralLinkCT', () => {
  const tech = [makeTech('neural-link-uplink')];

  it('grants +1 CT for action costing 3+ stress', () => {
    expect(getNeuralLinkCT(3, tech)).toBe(1);
    expect(getNeuralLinkCT(5, tech)).toBe(1);
  });

  it('grants 0 CT for action costing less than 3 stress', () => {
    expect(getNeuralLinkCT(2, tech)).toBe(0);
    expect(getNeuralLinkCT(0, tech)).toBe(0);
  });

  it('has no effect without the tech', () => {
    expect(getNeuralLinkCT(3, EMPTY)).toBe(0);
  });
});
