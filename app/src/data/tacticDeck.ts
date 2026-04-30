import type { EnemyShipState, TacticCard, TacticMechanicalEffect } from '../types/game';
import { getAdversaryById } from './adversaries';

export const TACTIC_DECK: TacticCard[] = [
  {
    id: 'pincer-movement',
    name: 'Pincer Movement',
    effect: 'All AI ships gain +1 Hex movement. Targeting priority shifts to prioritize Player Ships on the flanks or rear of the player formation.',
    mechanicalEffect: {
      extraMovement: 1,
      targetingOverride: 'flank',
    },
  },
  {
    id: 'overwhelming-firepower',
    name: 'Overwhelming Firepower',
    effect: 'All AI weapons gain +1 Skill Die (add 1x D6 to all enemy Volley Pools).',
    mechanicalEffect: {
      extraDice: ['d6'],
    },
  },
  {
    id: 'shields-to-maximum',
    name: 'Shields to Maximum',
    effect: 'Restore 2 Shield points to all enemy sectors. Player Volley dice rolls of 8 or higher are required to cause Critical Hits this round.',
    mechanicalEffect: {
      shieldRestore: 2,
      critThresholdOverride: 8,
    },
  },
  {
    id: 'target-the-bridge',
    name: 'Target the Bridge',
    effect: 'All AI ships prioritize the Player Ship with the highest remaining Hull, ignoring standard proximity targeting rules.',
    mechanicalEffect: {
      targetingOverride: 'highestHull',
    },
  },
  {
    id: 'electronic-jamming',
    name: 'Electronic Jamming',
    effect: 'Player ships cannot use "Sensors" actions this round.',
    mechanicalEffect: {
      disablePlayerStation: 'sensors',
    } as TacticMechanicalEffect,
  },
  {
    id: 'wolfpack-advance',
    name: 'Wolfpack Advance',
    effect: 'AI small craft gain +2 Hex movement. Targeting priority shifts to isolated Player Ships with no adjacent allies.',
    mechanicalEffect: {
      smallCraftExtraMovement: 2,
      targetingOverride: 'isolated',
    },
  },
  {
    id: 'kill-confirmation',
    name: 'Kill Confirmation',
    effect: 'All AI ships prioritize the Player Ship with the lowest remaining Hull, ignoring standard proximity targeting rules.',
    mechanicalEffect: {
      targetingOverride: 'lowestHull',
    },
  },
  {
    id: 'fortress-rotation',
    name: 'Fortress Rotation',
    effect: 'Restore 2 Shield points to all enemy sectors. AI ships prioritize targets already in their forward firing posture this round.',
    mechanicalEffect: {
      shieldRestore: 2,
      targetingOverride: 'frontArc',
    },
  },
  {
    id: 'suppressive-barrage',
    name: 'Suppressive Barrage',
    effect: 'All AI weapons gain +1 Skill Die, and enemy Critical Hits inflict +1 Stress to all officers aboard the target ship this round.',
    mechanicalEffect: {
      extraDice: ['d6'],
      criticalStressBonus: 1,
    },
  },
  {
    id: 'command-net-intrusion',
    name: 'Command Net Intrusion',
    effect: 'Player ships cannot use "Tactical" actions this round.',
    mechanicalEffect: {
      disablePlayerStation: 'tactical',
    },
  },
  {
    id: 'engine-scramble',
    name: 'Engine Scramble',
    effect: 'Player ships cannot use "Helm" actions this round.',
    mechanicalEffect: {
      disablePlayerStation: 'helm',
    },
  },
  {
    id: 'power-grid-sabotage',
    name: 'Power Grid Sabotage',
    effect: 'Player ships cannot use "Engineering" actions this round.',
    mechanicalEffect: {
      disablePlayerStation: 'engineering',
    },
  },
  {
    id: 'bait-the-frontline',
    name: 'Bait the Frontline',
    effect: 'All AI ships prioritize the closest Player Ship. AI ships gain +1 Hex movement when closing on a target that is already damaged.',
    mechanicalEffect: {
      targetingOverride: 'closest',
      extraMovementVsDamagedTargets: 1,
    },
  },
  {
    id: 'reserve-squadron-launch',
    name: 'Reserve Squadron Launch',
    effect: 'Launch 2 Hegemony Strike Fighter tokens adjacent to an enemy Carrier. They activate normally this round.',
    mechanicalEffect: {
      reserveSquadronLaunch: true,
    },
  },
  {
    id: 'minefield-calibration',
    name: 'Minefield Calibration',
    effect: 'Place 3 calibrated mine markers in empty hexes within 4 hexes of enemy capital ships. The first ship to move through each takes 1 unblockable Hull damage.',
    mechanicalEffect: {
      minefieldCount: 3,
      minefieldRadius: 4,
      mineDamage: 1,
    },
  },
  {
    id: 'feign-retreat',
    name: 'Feign Retreat',
    effect: 'AI artillery and support ships fall back under coordinated cover. They gain +1 Skill Die when firing from Range 4 or greater this round.',
    mechanicalEffect: {
      longRangeExtraDice: ['d6'],
      longRangeMin: 4,
    },
  },
  {
    id: 'priority-override',
    name: 'Priority Override',
    effect: 'All AI ships prioritize the Player Ship with the highest total officer Stress, ignoring standard proximity targeting rules.',
    mechanicalEffect: {
      targetingOverride: 'highestStress',
    },
  },
  {
    id: 'flank-collapse',
    name: 'Flank Collapse',
    effect: 'AI ships gain +1 Hex movement. Attacks striking flank or rear shield sectors gain +1 Skill Die.',
    mechanicalEffect: {
      extraMovement: 1,
      flankRearExtraDice: ['d6'],
    },
  },
  {
    id: 'shield-harmonics',
    name: 'Shield Harmonics',
    effect: 'Restore 1 Shield point to all enemy sectors. Player Volley dice rolls of 9 or higher are required to cause Critical Hits this round.',
    mechanicalEffect: {
      shieldRestore: 1,
      critThresholdOverride: 9,
    },
  },
];

function hasEnemyCarrier(enemyShips: EnemyShipState[]): boolean {
  return enemyShips.some(ship => {
    if (ship.isDestroyed || ship.isAllied) return false;
    return getAdversaryById(ship.adversaryId)?.id === 'carrier';
  });
}

export function filterAvailableTactics(enemyShips: EnemyShipState[]): TacticCard[] {
  return TACTIC_DECK.filter(card => {
    if (card.mechanicalEffect.reserveSquadronLaunch) {
      return hasEnemyCarrier(enemyShips);
    }
    return true;
  });
}

export function drawTacticCard(
  deck: TacticCard[],
  enemyShips: EnemyShipState[] = [],
): { card: TacticCard; remainingDeck: TacticCard[] } {
  const availableDeck = filterAvailableTactics(enemyShips);
  if (deck.length === 0) {
    const shuffled = [...availableDeck].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    return { card, remainingDeck: shuffled.slice(1) };
  }

  const nextDeck = deck.filter(card => availableDeck.some(available => available.id === card.id));
  if (nextDeck.length === 0) {
    const shuffled = [...availableDeck].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    return { card, remainingDeck: shuffled.slice(1) };
  }

  const card = nextDeck[0];
  return { card, remainingDeck: nextDeck.slice(1) };
}

export function createShuffledTacticDeck(enemyShips: EnemyShipState[] = []): TacticCard[] {
  return [...filterAvailableTactics(enemyShips)].sort(() => Math.random() - 0.5);
}
