import { describe, it, expect } from 'vitest';
import { applyStress, canOfficerAct, calculateStressRecovery } from './stress';
import type { OfficerState, OfficerData, FumbleCard } from '../types/game';

describe('stress system', () => {
  const dummyData: OfficerData = {
    id: 'o1', name: 'O1', station: 'helm', traitName: '', traitEffect: '',
    stressLimit: 5, defaultTier: 'veteran', avatar: '', traitTier: 1, dpCost: 0
  };
  const dummyState: OfficerState = {
    officerId: 'o1', station: 'helm', currentStress: 0,
    currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0
  };

  it('applyStress increases stress safely', () => {
    const res = applyStress(dummyState, dummyData, 2);
    expect(res.newStress).toBe(2);
  });

  it('applyStress allows stress to exceed limit without triggering fumble', () => {
    const res = applyStress({ ...dummyState, currentStress: 4 }, dummyData, 2);
    expect(res.newStress).toBe(6);
  });

  it('canOfficerAct prevents acting if locked', () => {
    const res = canOfficerAct({ ...dummyState, isLocked: true }, dummyData);
    expect(res.canAct).toBe(false);
  });

  it('calculateStressRecovery computes correctly', () => {
    expect(calculateStressRecovery({ ...dummyState, actionsPerformedThisRound: 0 }, false)).toBe(-2);
    expect(calculateStressRecovery({ ...dummyState, actionsPerformedThisRound: 1 }, true)).toBe(-1);
    expect(calculateStressRecovery({ ...dummyState, actionsPerformedThisRound: 1 }, false)).toBe(-1);
    expect(calculateStressRecovery({ ...dummyState, actionsPerformedThisRound: 2 }, true)).toBe(0);
  });
});
