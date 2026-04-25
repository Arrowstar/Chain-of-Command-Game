import type { FumbleCard } from '../types/game';

export const FUMBLE_DECK: FumbleCard[] = [
  // ─── General Fumbles ───────────────────────────────
  {
    id: 'freeze',
    name: "I Can't Think!",
    category: 'general',
    flavorText: 'Too many screens... too many alarms! Just give me a second!',
    effect: 'The Officer freezes. The intended action is canceled. Return the Command Token to the Captain\'s pool. This Officer\'s station is Locked for the remainder of the round.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: true,
      stationLocked: true,
      lockDuration: 1, // rest of round
    },
  },
  {
    id: 'insubordination',
    name: 'Shut Up and Let Me Work!',
    category: 'general',
    flavorText: "With all due respect, Captain, I know my station better than you do!",
    effect: 'The action is executed exactly as planned with no penalty. Fleet loses -1 Fleet Favor (FF) due to open insubordination.',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      fleetFavorChange: -1,
    },
  },
  {
    id: 'burnout',
    name: 'Nerve Collapse',
    category: 'general',
    flavorText: 'A sharp crack echoes across the bridge as the officer slams their fist through the console monitor.',
    effect: "The intended action is canceled and the CT is wasted. Until this Officer's stress is reduced to 0, their Skill Die is stepped down by one tier.",
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      skillDieStepDown: true,
    },
  },
  {
    id: 'bickering',
    name: 'Bickering / Blame Game',
    category: 'general',
    flavorText: "This is your fault! If you had rotated the ship, my shields wouldn't be failing!",
    effect: 'The intended action succeeds. However, the panicked shouting stresses out the rest of the crew. Add +1 Stress to every other Bridge Officer on your dashboard.',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      stressToOthers: 1,
    },
  },

  // ─── Helm Fumbles ──────────────────────────────────
  {
    id: 'overcompensated-burn',
    name: 'Overcompensated Burn',
    category: 'helm',
    flavorText: 'The pilot slams the thrusters in a panic...',
    effect: 'The intended action is canceled and the CT is wasted. Roll a D6 to determine a random hex-face. The ship immediately moves 1 Hex in that direction. Resolve collision damage if applicable.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      randomDrift: true,
    },
  },
  {
    id: 'dampener-failure',
    name: 'Inertial Dampener Failure',
    category: 'helm',
    flavorText: 'The violent maneuver throws the crew across the deck...',
    effect: "The movement action succeeds, but Base Evasion is reduced by 2 for the round. The Captain loses 1 unspent Command Token.",
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      evasionChange: -2,
      ctLost: 1,
    },
  },
  {
    id: 'navigational-lockout',
    name: 'Navigational Lockout',
    category: 'helm',
    flavorText: 'The nav-computer freezes due to rapid, contradictory inputs from a stressed officer.',
    effect: 'The ship\'s current action is canceled. Furthermore, the ship cannot "Rotate" or move for the remainder of this round AND the next round. The ship drifts predictably, granting enemies a -1 TN to hit it.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      navLockout: true,
      navLockoutDuration: 2,
      enemyTnReduction: 1,
    },
  },

  // ─── Tactical Fumbles ──────────────────────────────
  {
    id: 'panic-fire',
    name: 'Panic Fire',
    category: 'tactical',
    flavorText: 'Trigger-happy response to overwhelming threat alerts...',
    effect: 'The intended target is ignored. The Tactical Officer fires at the closest valid target in the arc — including Allied ships.',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      panicFire: true,
    },
  },
  {
    id: 'misfire',
    name: 'Misfire / Power Surge',
    category: 'tactical',
    flavorText: 'The weapon system overloads...',
    effect: 'The weapon does not fire. CT is wasted. The weapon system takes 1 internal damage and cannot be fired next round unless Engineering repairs it.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      weaponDamaged: true,
    },
  },
  {
    id: 'tunnel-vision',
    name: 'Tunnel Vision',
    category: 'tactical',
    flavorText: 'Tactical reroutes all processor power to targeting...',
    effect: 'The attack goes through against the intended target. However, Point Defense Cannons (PDCs) are disabled for the rest of the round.',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      pdcDisabled: true,
    },
  },
  {
    id: 'ordnance-jam',
    name: 'Ordnance Jam',
    category: 'tactical',
    flavorText: 'In a rush to load heavy weapons, the torpedo/missile auto-loaders jam.',
    effect: 'The intended action fails. Any currently primed ordnance is rendered inert, and Tactical cannot use the "Load Ordinance" action in the following round.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      ordnanceJammed: true,
    },
  },

  // ─── Engineering Fumbles ───────────────────────────
  {
    id: 'catastrophic-reroute',
    name: 'Catastrophic Reroute',
    category: 'engineering',
    flavorText: 'Engineering pulls power from the wrong grid...',
    effect: 'The intended action succeeds, but the AI chooses one fully charged Shield Sector and reduces it to 0.',
    mechanicalEffect: {
      actionCanceled: false,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      shieldSectorStripped: true,
    },
  },
  {
    id: 'coolant-vent',
    name: 'Coolant Vent',
    category: 'engineering',
    flavorText: 'Toxic coolant floods the lower decks...',
    effect: 'The action fails and CT is wasted. Ship takes 1 unblockable Hull damage. Engineering station is Locked for this round and next round.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: true,
      lockDuration: 2,
      hullDamage: 1,
    },
  },
  {
    id: 'false-diagnostics',
    name: 'False Diagnostics',
    category: 'engineering',
    flavorText: 'The stressed officer reads the wrong screen...',
    effect: 'The intended action is canceled and the CT is wasted. For the rest of the round, whenever this ship takes Hull damage, the Armor Die is NOT rolled.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      armorDisabled: true,
    },
  },

  // ─── Sensors Fumbles ───────────────────────────────
  {
    id: 'ghost-contacts',
    name: 'Ghost Contacts',
    category: 'sensors',
    flavorText: 'Faulty telemetry fed to the fleet...',
    effect: 'The intended action is canceled and the CT is wasted. The closest Enemy Capital Ship gains +3 to their Evasion (TN) against ALL Allied attacks for this round.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      enemyEvasionBoost: 3,
    },
  },
  {
    id: 'comms-blackout',
    name: 'Comms Blackout',
    category: 'sensors',
    flavorText: "The officer accidentally severs the ship's connection to High Command...",
    effect: 'The intended action is canceled and the CT is wasted. This ship\'s player cannot participate in spending or receiving benefits from Fleet Favor for the rest of the round.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      commsBlackout: true,
    },
  },
  {
    id: 'targeting-feedback-loop',
    name: 'Targeting Feedback Loop',
    category: 'sensors',
    flavorText: 'The sensor array gets stuck in a feedback loop, broadcasting aggressive radar noise.',
    effect: 'The intended action is canceled and the CT is wasted. This ship instantly becomes the highest priority target for all AI enemies on the board.',
    mechanicalEffect: {
      actionCanceled: true,
      ctRefunded: false,
      stationLocked: false,
      lockDuration: 0,
      priorityTarget: true,
    },
  },
];

export function createShuffledFumbleDeck(): FumbleCard[] {
  return [...FUMBLE_DECK].sort(() => Math.random() - 0.5);
}

/**
 * Draw a fumble card. Optionally filtered by station for station-specific fumbles.
 * General fumbles can appear regardless of station.
 */
export function drawFumbleCard(
  deck: FumbleCard[],
  station?: string,
): { card: FumbleCard; remainingDeck: FumbleCard[] } {
  if (deck.length === 0) {
    const shuffled = createShuffledFumbleDeck();
    return drawFumbleCard(shuffled, station);
  }

  // Find first card that is General OR matches the specific station
  const cardIdx = deck.findIndex(c => 
    c.category === 'general' || (station && c.category === station)
  );

  if (cardIdx === -1) {
    // If no match in current deck (unlikely but possible if deck was filtered/small), reshuffle
    const shuffled = createShuffledFumbleDeck();
    return drawFumbleCard(shuffled, station);
  }

  const card = deck[cardIdx];
  const remainingDeck = [...deck];
  remainingDeck.splice(cardIdx, 1);
  
  return { card, remainingDeck };
}
