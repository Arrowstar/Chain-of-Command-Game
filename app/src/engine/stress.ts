import type { OfficerState, OfficerData, FumbleCard, TraumaEffect } from '../types/game';
import { drawFumbleCard, createShuffledFumbleDeck } from '../data/fumbleDeck';

// ═══════════════════════════════════════════════════════════════════
// Stress System — Tracking, Fumble Triggers, Recovery
// ═══════════════════════════════════════════════════════════════════

export function getMaxStress(officer: OfficerState, officerData: OfficerData): number | null {
  if (officerData.stressLimit === null) return null;
  const hasPessimist = officer.traumas.some(t => t.id === 'pessimist');
  return officerData.stressLimit - (hasPessimist ? 1 : 0);
}

export interface StressCheckResult {
  newStress: number;
}

export function applyStress(
  officer: OfficerState,
  officerData: OfficerData,
  stressAmount: number,
): StressCheckResult {
  if (officerData.stressLimit === null) {
    return { newStress: 0 };
  }

  const newStress = officer.currentStress + stressAmount;
  return { newStress };
}

export function canOfficerAct(
  officer: OfficerState,
  officerData: OfficerData,
): { canAct: boolean; reason: string } {
  if (officer.isLocked) {
    return { canAct: false, reason: 'Station is locked due to a fumble effect.' };
  }
  const maxStress = getMaxStress(officer, officerData);
  if (officerData.traitName === 'By The Book' && maxStress !== null && officer.currentStress >= maxStress) {
    return { canAct: false, reason: `${officerData.name} is at max stress (By The Book).` };
  }
  return { canAct: true, reason: '' };
}

export function calculateStressRecovery(officer: OfficerState, isInSafeSpace: boolean): number {
  if (officer.actionsPerformedThisRound === 0) return -2;
  if (officer.actionsPerformedThisRound === 1) return -1;
  return 0;
}

export function recoverStress(currentStress: number, recovery: number): number {
  return Math.max(0, currentStress + recovery);
}

export function resetOfficerRoundState(officer: OfficerState): OfficerState {
  return {
    ...officer,
    hasFumbledThisRound: false,
    actionsPerformedThisRound: 0,
    lockDuration: Math.max(0, officer.lockDuration - 1),
    isLocked: officer.lockDuration > 1,
    usedMethodicalThisRound: false,
    usedSurgicalStrikeThisRound: false,
  };
}
