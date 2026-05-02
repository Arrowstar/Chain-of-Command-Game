import { describe, expect, it } from 'vitest';
import {
  applyPlasmaAccelerators,
  canRerollVoidGlass,
  getKineticSiphonShieldRestore,
  applyInertialDampeners,
  applyHardLightPlating,
  applyRecycledCoolant,
  getNeuralLinkCT,
} from './techEffects';
import type { ExperimentalTech } from '../types/campaignTypes';

describe('Experimental Tech Effects', () => {
  const makeTech = (id: string, overrides: Partial<ExperimentalTech> = {}): ExperimentalTech => ({
    id,
    name: 'Test Tech',
    category: 'tactical',
    effect: '',
    flavorText: '',
    isConsumable: false,
    isConsumed: false,
    rarity: 'common',
    imagePath: '',
    ...overrides,
  });

  describe('Plasma Accelerators', () => {
    it('increases rangeMax of non-ordnance weapons by 1', () => {
      const tech = [makeTech('plasma-accelerators')];
      expect(applyPlasmaAccelerators(5, false, tech)).toBe(6);
      expect(applyPlasmaAccelerators(5, true, tech)).toBe(5); // Ordnance (torpedoes) unaffected
    });

    it('returns original range if tech not owned', () => {
        expect(applyPlasmaAccelerators(5, false, [])).toBe(5);
    });
  });

  describe('Void-Glass Lenses', () => {
    it('permits reroll if die result is exactly 1', () => {
      const tech = [makeTech('void-glass-lenses')];
      expect(canRerollVoidGlass(1, tech)).toBe(true);
      expect(canRerollVoidGlass(2, tech)).toBe(false);
    });
  });

  describe('Kinetic Siphon', () => {
    it('restores 1 shield point when a capital ship is killed', () => {
      const tech = [makeTech('kinetic-siphon')];
      expect(getKineticSiphonShieldRestore('medium', tech)).toBe(1);
      expect(getKineticSiphonShieldRestore('large', tech)).toBe(1);
      expect(getKineticSiphonShieldRestore('small', tech)).toBe(0);
    });
  });

  describe('Inertial Dampeners', () => {
    it('negates first collision damage instance', () => {
      const tech = [makeTech('inertial-dampeners')];
      const shipsAlreadyNegated = new Set<string>();
      
      const res = applyInertialDampeners(4, 's1', shipsAlreadyNegated, tech);
      expect(res.finalDamage).toBe(0);
      expect(res.negated).toBe(true);
    });

    it('does not negate subsequent collision damage', () => {
        const tech = [makeTech('inertial-dampeners')];
        const shipsAlreadyNegated = new Set(['s1']);
        
        const res = applyInertialDampeners(4, 's1', shipsAlreadyNegated, tech);
        expect(res.finalDamage).toBe(4);
        expect(res.negated).toBe(false);
    });
  });

  describe('Hard-Light Plating', () => {
    it('reduces the first point of hull damage by 1', () => {
      const tech = [makeTech('hard-light-plating')];
      const res = applyHardLightPlating(3, 's1', new Set(), tech);
      expect(res.finalDamage).toBe(2);
      expect(res.triggered).toBe(true);
    });
  });

  describe('Neural Link Uplink', () => {
    it('grants 1 CT when stress cost is 3 or more', () => {
      const tech = [makeTech('neural-link-uplink')];
      expect(getNeuralLinkCT(3, tech)).toBe(1);
      expect(getNeuralLinkCT(2, tech)).toBe(0);
    });
  });
});
