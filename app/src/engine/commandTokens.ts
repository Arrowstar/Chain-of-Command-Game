import type { CombatModifiers } from '../types/campaignTypes';
import type { PlayerState, RoECard, ScarEffect } from '../types/game';

export interface CommandTokenModifier {
  id: string;
  label: string;
  amount: number;
  description: string;
}

function hasScar(scars: ScarEffect[], scarId: string): boolean {
  return scars.some(scar => scar.fromCriticalId === scarId);
}

export function getRoundStartCtState(params: {
  player: PlayerState;
  round: number;
  activeRoE: RoECard | null;
  combatModifiers: CombatModifiers | null;
  shipScars: ScarEffect[];
}): {
  baseCt: number;
  roundStartCt: number;
  modifiers: CommandTokenModifier[];
} {
  const { player, round, activeRoE, combatModifiers, shipScars } = params;
  const baseCt = player.maxCommandTokens;
  const modifiers: CommandTokenModifier[] = [];

  const roeCtMod = (activeRoE?.mechanicalEffect.ctGenerationMod ?? 0)
    + (activeRoE?.mechanicalEffect.bonusCTPerRound ?? 0);
  if (roeCtMod !== 0) {
    modifiers.push({
      id: 'roe',
      label: `RoE ${roeCtMod > 0 ? '+' : ''}${roeCtMod}`,
      amount: roeCtMod,
      description: `Rules of Engagement: ${activeRoE?.name ?? 'Unknown doctrine'}`,
    });
  }

  if (round === 1) {
    const roundOneCtModifier = combatModifiers?.playerCTRound1Modifier ?? 0;
    if (roundOneCtModifier !== 0) {
      modifiers.push({
        id: 'round-one',
        label: `R1 ${roundOneCtModifier > 0 ? '+' : ''}${roundOneCtModifier}`,
        amount: roundOneCtModifier,
        description: 'Scenario modifier applied to player CT generation in Round 1.',
      });
    }

    if (combatModifiers?.playerCTZeroRound1) {
      modifiers.push({
        id: 'round-one-zero',
        label: 'R1 ZERO',
        amount: -baseCt,
        description: 'Scenario modifier: player ships start Round 1 with 0 CT.',
      });
    }
  }

  if (hasScar(shipScars, 'bridge-hit')) {
    modifiers.push({
      id: 'bridge-hit',
      label: 'Bridge -1',
      amount: -1,
      description: 'Damaged Bridge: CT generation reduced by 1 each round until repaired.',
    });
  }

  const briefingBonus = player.briefingCommandTokenBonus ?? 0;
  if (briefingBonus !== 0) {
    modifiers.push({
      id: 'briefing-bonus',
      label: `Reroute +${briefingBonus}`,
      amount: briefingBonus,
      description: 'One-time CT bonus applied this Briefing phase from Reroute Power resolved last round.',
    });
  }

  const roundStartCt = Math.max(0, baseCt + modifiers.reduce((sum, modifier) => sum + modifier.amount, 0));
  return { baseCt, roundStartCt, modifiers };
}

export function getCurrentCtDisplayState(params: {
  player: PlayerState;
  round: number;
  activeRoE: RoECard | null;
  combatModifiers: CombatModifiers | null;
  shipScars: ScarEffect[];
}): {
  baseCt: number;
  roundStartCt: number;
  totalTokensThisRound: number;
  maxVisualSlots: number;
  modifiers: CommandTokenModifier[];
} {
  const { player, round, activeRoE, combatModifiers, shipScars } = params;
  const baseState = getRoundStartCtState({
    player,
    round,
    activeRoE,
    combatModifiers,
    shipScars,
  });

  const totalTokensThisRound = player.commandTokens + player.assignedActions.reduce((sum, action) => sum + action.ctCost, 0);
  const liveBonusCt = totalTokensThisRound - baseState.roundStartCt;
  const modifiers = [...baseState.modifiers];

  if (liveBonusCt > 0) {
    modifiers.push({
      id: 'live-bonus',
      label: `Live +${liveBonusCt}`,
      amount: liveBonusCt,
      description: 'Bonus CT gained during this round from actions, assets, or tech.',
    });
  }

  return {
    baseCt: baseState.baseCt,
    roundStartCt: baseState.roundStartCt,
    totalTokensThisRound,
    maxVisualSlots: Math.max(player.maxCommandTokens, totalTokensThisRound),
    modifiers,
  };
}
