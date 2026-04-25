import type { EventNode } from '../types/campaignTypes';

// ══════════════════════════════════════════════════════════════════
// Event Nodes — All 25 Distress Signals & Anomalies
// ══════════════════════════════════════════════════════════════════

export const EVENT_NODES: EventNode[] = [
  {
    id: 'event-01',
    title: 'The Derelict Transport',
    narrative: 'Your sensors pick up a Hegemony civilian transport drifting near a shattered asteroid. Its life support is failing. They are hailing you on open comms, begging for emergency power and repairs.',
    options: [
      {
        id: 'strip',
        label: '"Strip it for parts."',
        flavorText: 'The Hegemony would do the same to us.',
        effects: [
          { type: 'rp', value: 30, target: 'fleet' },
          { type: 'ff', value: -2, target: 'fleet' },
          { type: 'stress', value: 1, target: 'all' },
        ],
      },
      {
        id: 'divert',
        label: '"Divert emergency power to their systems."',
        flavorText: 'We are not the monsters they say we are.',
        effects: [
          { type: 'rp', value: -10, target: 'fleet' },
          { type: 'ff', value: 2, target: 'fleet' },
          { type: 'stressRecover', value: 1, target: 'all' },
        ],
      },
      {
        id: 'leave',
        label: '"Leave them to their fate."',
        flavorText: "We can't afford the delay.",
        effects: [{ type: 'nothing' }],
      },
      {
        id: 'send-sparky',
        label: '"Send Sparky over. Drones do not need life support."',
        flavorText: 'The AI drone can patch their relays without risking a rescue detail.',
        requirements: [
          { type: 'officerPresent', officerId: 'sparky', description: 'Requires Sparky.' },
        ],
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'rp', value: 35, target: 'fleet' },
          { type: 'ff', value: 1, target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-02',
    title: 'The Defector',
    narrative: 'A single, heavily damaged Hegemony interceptor drops out of warp right in front of your fleet. The pilot immediately powers down their weapons and transmits a defection code, claiming to have high-level tactical data.',
    options: [
      {
        id: 'bring-aboard',
        label: '"Bring them aboard. We need that intel."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 3,
        badEffects: [
          { type: 'ff', value: -2, target: 'fleet' },
          { type: 'subsystemSlotReduction', target: 'random' },
        ],
        goodEffects: [
          { type: 'skipNode', target: 'fleet' },
          { type: 'rp', value: 15, target: 'fleet' },
        ],
      },
      {
        id: 'space-them',
        label: '"It\'s a trap. Space them."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -1, target: 'fleet' },
          { type: 'trauma', target: 'tactical' },
        ],
      },
      {
        id: 'verify-codes',
        label: '"Have our sensor chief verify the defection codes first."',
        flavorText: 'A disciplined signal audit turns a gamble into a controlled intake.',
        requirements: [
          { type: 'officerPresent', officerId: 'vance', description: 'Requires Vance or Xel.' },
          { type: 'officerPresent', officerId: 'xel', description: 'Requires Vance or Xel.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'skipNode', target: 'fleet' },
          { type: 'rp', value: 10, target: 'fleet' },
          { type: 'grantSubsystem', subsystemId: 'black-market-targeting-suite', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-03',
    title: 'The Nebula Storm',
    narrative: 'The fastest route to the next sector jump-point goes directly through a violently unstable Ion Nebula. Rerouting around it will cost precious fuel and give the Hegemony time to close the gap.',
    options: [
      {
        id: 'punch-through',
        label: '"Punch through. Brace for turbulence!"',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 3,
        goodEffects: [],
        badEffects: [{ type: 'hull', value: 2, target: 'all' }],
      },
      {
        id: 'reroute',
        label: '"Reroute. It\'s too dangerous."',
        flavorText: '',
        effects: [
          { type: 'rp', value: -15, target: 'fleet' },
          { type: 'stress', value: 2, target: 'helm' },
        ],
      },
    ],
  },

  {
    id: 'event-04',
    title: 'Lower Decks Mutiny',
    narrative: 'Rations are low, shifts are running 20 hours long, and the crew is cracking under the pressure of being hunted. A delegation from the engineering decks has barricaded themselves in the mess hall, demanding shore leave and double rations.',
    options: [
      {
        id: 'crack-down',
        label: '"Crack down. We are at war."',
        flavorText: 'Send security teams to break the barricade.',
        effects: [
          { type: 'ff', value: -3, target: 'fleet' },
          { type: 'trauma', target: 'engineering' },
        ],
      },
      {
        id: 'concede',
        label: '"Concede to their demands."',
        flavorText: 'Open the reserves. We need them functional.',
        effects: [
          { type: 'rp', value: -25, target: 'fleet' },
          { type: 'stressRecover', value: 999, target: 'all' }, // 999 = clear to 0
        ],
      },
    ],
  },

  {
    id: 'event-05',
    title: 'The Black Market Broker',
    narrative: 'You pick up a scrambled transmission from a hollowed-out asteroid. It\'s a black market arms dealer willing to trade highly illegal, experimental Hegemony hardware—if you have the right currency.',
    options: [
      {
        id: 'trade-reputation',
        label: '"Trade our reputation."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -4, target: 'fleet' },
          { type: 'tech', value: 1, target: 'fleet' },
        ],
      },
      {
        id: 'trade-hull',
        label: '"Trade our structural integrity."',
        flavorText: '',
        effects: [
          { type: 'maxHullReduction', value: 3, target: 'random' },
          { type: 'rp', value: 40, target: 'fleet' },
        ],
      },
      {
        id: 'refuse',
        label: '"We don\'t deal with scum."',
        flavorText: '',
        effects: [{ type: 'nothing' }],
      },
      {
        id: 'covert-exchange',
        label: '"Use our covert specialists to negotiate a cleaner exchange."',
        flavorText: 'Ghosted transponders and dead drops keep the deal deniable.',
        requirements: [
          { type: 'officerPresent', officerId: 'dvesh', description: 'Requires D\'Vesh or Xel.' },
          { type: 'officerPresent', officerId: 'xel', description: 'Requires D\'Vesh or Xel.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'ff', value: -1, target: 'fleet' },
          { type: 'grantWeapon', weaponId: 'experimental-plasma-lance', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-06',
    title: 'The Distress Beacon',
    narrative: 'An automated Hegemony distress beacon is blaring across all frequencies from a nearby debris field. It could be a trap, or it could be a goldmine of salvage.',
    options: [
      {
        id: 'investigate',
        label: '"Investigate the debris."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 4,
        badEffects: [
          { type: 'transformToCombat', target: 'fleet', combatModifiers: { threatBudgetBonus: 5 } },
        ],
        goodEffects: [
          { type: 'rp', value: 35, target: 'fleet' },
          { type: 'hullPatch', target: 'all' },
        ],
      },
      {
        id: 'ignore',
        label: '"Ignore it. Maintain radio silence."',
        flavorText: '',
        effects: [{ type: 'ff', value: -1, target: 'fleet' }],
      },
      {
        id: 'spectral-sweep',
        label: '"Run a full spectral sweep before we close."',
        flavorText: 'A trained sensor officer can isolate the safe debris channel and the hidden cache.',
        requirements: [
          { type: 'officerPresent', officerId: 'vance', description: 'Requires Vance.' },
        ],
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'rp', value: 20, target: 'fleet' },
          { type: 'grantWeapon', weaponId: 'phase-disruptor-array', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-07',
    title: 'The Zealous Inquisitor',
    narrative: 'A Hegemony Inquisitor transmission hijacks your comms. They offer full pardons for the rest of the crew if the War Council simply surrenders their highest-ranking officer.',
    options: [
      {
        id: 'never-surrender',
        label: '"Never surrender."',
        flavorText: '',
        effects: [
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { flagshipBonus: { evasion: 1, hull: 5 } },
          },
        ],
      },
      {
        id: 'fire-captain',
        label: '"Fire the Captain."',
        flavorText: 'You fake a mutiny to appease them.',
        effects: [
          { type: 'maxCTReduction', value: 1, target: 'fleet' },
          { type: 'ff', value: 3, target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-08',
    title: 'The Viral Payload',
    narrative: 'Your sensors isolate a dormant data packet echoing through a local comms buoy. It\'s a highly sophisticated Hegemony cyber-weapon left over from a previous skirmish.',
    options: [
      {
        id: 'download',
        label: '"Download and adapt it."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 3,
        badEffects: [{ type: 'trauma', target: 'tactical' }],
        goodEffects: [{ type: 'tech', value: 1, target: 'fleet' }],
      },
      {
        id: 'purge',
        label: '"Purge it from the buoy."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -2, target: 'fleet' },
          { type: 'stressRecover', value: 999, target: 'sensors' },
        ],
      },
    ],
  },

  {
    id: 'event-09',
    title: 'Civilian Flotilla',
    narrative: 'A massive convoy of civilian mining ships is fleeing the warzone. They are slow, under-supplied, and begging for a military escort to the next jump gate.',
    options: [
      {
        id: 'escort',
        label: '"Escort them to safety."',
        flavorText: '',
        effects: [
          { type: 'rp', value: -20, target: 'fleet' },
          { type: 'ff', value: 4, target: 'fleet' },
        ],
      },
      {
        id: 'requisition',
        label: '"Requisition their fuel."',
        flavorText: '',
        effects: [
          { type: 'rp', value: 25, target: 'fleet' },
          { type: 'ff', value: -4, target: 'fleet' },
          { type: 'stress', value: 2, target: 'all' },
        ],
      },
    ],
  },

  {
    id: 'event-10',
    title: 'The Minefield',
    narrative: 'You drop out of hyperspace directly into an unmapped, dense proximity minefield. Navigating out will require either excruciating precision or brute force.',
    options: [
      {
        id: 'thread-needle',
        label: '"Thread the needle."',
        flavorText: '',
        effects: [{ type: 'stress', value: 3, target: 'helm' }],
      },
      {
        id: 'blast-path',
        label: '"Blast a path through."',
        flavorText: '',
        effects: [
          { type: 'hull', value: 1, target: 'all' },
          { type: 'rp', value: 10, target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-11',
    title: 'The Mad Hermit',
    narrative: 'You intercept a garbled, rambling transmission from a hollowed-out comet. An old, disgraced Hegemony engineer lives there, claiming to have perfected a revolutionary reactor design.',
    options: [
      {
        id: 'buy-schematics',
        label: '"Buy the schematics."',
        flavorText: '',
        effects: [
          { type: 'rp', value: -30, target: 'fleet' },
          { type: 'tech', value: 1, target: 'fleet' },
        ],
      },
      {
        id: 'draft-service',
        label: '"Draft them into service."',
        flavorText: '',
        effects: [
          { type: 'officerUpgrade', target: 'engineering' },
          { type: 'ff', value: -2, target: 'fleet' },
        ],
      },
      {
        id: 'talk-shop',
        label: '"Send O\'Bannon to talk shop."',
        flavorText: 'Two obsessive engineers can solve in an hour what procurement never could.',
        requirements: [
          { type: 'officerPresent', officerId: 'obannon', description: 'Requires O\'Bannon.' },
        ],
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'officerUpgrade', target: 'engineering' },
          { type: 'grantSubsystem', subsystemId: 'hermit-reactor-baffles', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-12',
    title: 'Micro-Meteoroid Storm',
    narrative: 'A silent, deadly wave of high-velocity micro-meteoroids is sweeping toward the fleet. There isn\'t time to jump away.',
    options: [
      {
        id: 'overcharge-deflectors',
        label: '"Overcharge the deflectors!"',
        flavorText: '',
        effects: [
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { playerCTZeroRound1: true },
          },
        ],
      },
      {
        id: 'lock-down',
        label: '"Lock down and brace for impact."',
        flavorText: '',
        effects: [{ type: 'hull', value: 2, target: 'all' }],
      },
    ],
  },

  {
    id: 'event-13',
    title: 'The Propaganda Broadcast',
    narrative: 'Hegemony psychological warfare divisions are blanketing all frequencies with demoralizing propaganda about your inevitable execution.',
    options: [
      {
        id: 'jam-signal',
        label: '"Jam the signal."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -1, target: 'fleet' },
          { type: 'stress', value: 1, target: 'sensors' },
        ],
      },
      {
        id: 'let-listen',
        label: '"Let them listen. We know the truth."',
        flavorText: '',
        effects: [{ type: 'stress', value: 1, target: 'all' }],
      },
      {
        id: 'defiant-response',
        label: '"Broadcast a defiant response."',
        flavorText: '',
        effects: [
          { type: 'ff', value: 2, target: 'fleet' },
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { propagandaExposedBonus: 4 },
          },
        ],
      },
    ],
  },

  {
    id: 'event-14',
    title: 'Automated Defense Platform',
    narrative: 'You drift into the sensor range of an ancient, automated orbital defense battery. It hasn\'t recognized your defector IFF codes yet, but its targeting lasers are warming up.',
    options: [
      {
        id: 'hack-mainframe',
        label: '"Hack the mainframe."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 4,
        badEffects: [{ type: 'hull', value: 3, target: 'all' }],
        goodEffects: [{ type: 'rp', value: 40, target: 'fleet' }],
      },
      {
        id: 'full-reverse',
        label: '"Full reverse! Get out of its range."',
        flavorText: '',
        effects: [{ type: 'stress', value: 2, target: 'helm' }],
      },
      {
        id: 'xel-backdoor',
        label: '"Let Xel backdoor the platform."',
        flavorText: 'A patient intruder can blind the battery long enough to strip its beam emitters.',
        requirements: [
          { type: 'officerPresent', officerId: 'xel', description: 'Requires Xel.' },
        ],
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'rp', value: 20, target: 'fleet' },
          { type: 'grantWeapon', weaponId: 'defense-platform-laser', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-15',
    title: 'The Stowaway',
    narrative: 'Security teams have found a Hegemony loyalist hiding in the cargo bay of one of your ships. They claim to have been left behind by mistake, but they could be a saboteur.',
    options: [
      {
        id: 'interrogate',
        label: '"Interrogate them for fleet movements."',
        flavorText: '',
        effects: [
          { type: 'ff', value: 2, target: 'fleet' },
          { type: 'trauma', target: 'tactical' },
        ],
      },
      {
        id: 'airlock',
        label: '"Throw them out the airlock."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -2, target: 'fleet' },
          { type: 'stress', value: 1, target: 'all' },
        ],
      },
      {
        id: 'recruit',
        label: '"Recruit them."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 4,
        badEffects: [{ type: 'rp', value: -20, target: 'fleet' }],
        goodEffects: [{ type: 'clearScar', target: 'random' }],
      },
      {
        id: 'proper-debrief',
        label: '"Have a trained specialist conduct a proper debrief."',
        flavorText: 'A measured interview breaks the story open without panic or brutality.',
        requirements: [
          { type: 'officerPresent', officerId: 'aris', description: 'Requires Aris or Singh.' },
          { type: 'officerPresent', officerId: 'chatter-singh', description: 'Requires Aris or Singh.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'ff', value: 1, target: 'fleet' },
          { type: 'grantSubsystem', subsystemId: 'remote-disarm-drone-rig', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-16',
    title: 'Failing Reactor',
    narrative: 'One of your allied civilian supply vessels experiences a catastrophic reactor failure. It is going to detonate in minutes, taking crucial fleet supplies with it.',
    options: [
      {
        id: 'stabilize',
        label: '"Send engineering teams to stabilize it."',
        flavorText: '',
        effects: [
          { type: 'stress', value: 3, target: 'engineering' },
          { type: 'rp', value: 25, target: 'fleet' },
          { type: 'ff', value: 1, target: 'fleet' },
        ],
      },
      {
        id: 'tow-blow',
        label: '"Tow it away and let it blow."',
        flavorText: '',
        effects: [
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { playerMaxSpeedReduction: 1 },
          },
        ],
      },
      {
        id: 'abandon-jump',
        label: '"Abandon them and jump."',
        flavorText: '',
        effects: [{ type: 'ff', value: -3, target: 'fleet' }],
      },
      {
        id: 'chief-engineer-response',
        label: '"Send the chief engineer and drone teams."',
        flavorText: 'Specialist crews can stabilize the core fast enough to save the cargo and learn from the incident.',
        requirements: [
          { type: 'officerPresent', officerId: 'obannon', description: 'Requires O\'Bannon or Sparky.' },
          { type: 'officerPresent', officerId: 'sparky', description: 'Requires O\'Bannon or Sparky.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'rp', value: 35, target: 'fleet' },
          { type: 'ff', value: 2, target: 'fleet' },
          { type: 'freeRepairAtNextStation', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-17',
    title: 'Hyperspace Anomaly',
    narrative: 'Your navigators detect a tear in local spacetime. Plunging through it might cut weeks off your journey, but the gravitational sheer could tear the fleet apart.',
    options: [
      {
        id: 'dive-breach',
        label: '"Dive into the breach."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 3,
        badEffects: [
          { type: 'hull', value: 2, target: 'all' },
          { type: 'scar', target: 'all' },
        ],
        goodEffects: [
          { type: 'skipNode', target: 'fleet' },
          { type: 'tech', value: 1, target: 'fleet' },
        ],
      },
      {
        id: 'safe-route',
        label: '"Take the safe route."',
        flavorText: '',
        effects: [{ type: 'rp', value: -10, target: 'fleet' }],
      },
    ],
  },

  {
    id: 'event-18',
    title: 'Uncharted Planet',
    narrative: 'You pass an undocumented rogue planet. Scanners indicate massive deposits of refined promethium near the surface, but the atmosphere is highly toxic.',
    options: [
      {
        id: 'hazardous-mining',
        label: '"Send a hazardous mining detail."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 4,
        badEffects: [{ type: 'trauma', target: 'all' }],
        goodEffects: [{ type: 'rp', value: 50, target: 'fleet' }],
      },
      {
        id: 'log-coordinates',
        label: '"Log the coordinates and move on."',
        flavorText: '',
        effects: [{ type: 'ff', value: 1, target: 'fleet' }],
      },
    ],
  },

  {
    id: 'event-19',
    title: "The Smuggler's Cache",
    narrative: 'You find a shipping container magnetically locked to an asteroid. It has Hegemony black-site markings, but it\'s wired with a complex volumetric explosive trigger.',
    options: [
      {
        id: 'disarm',
        label: '"Attempt to disarm it."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 3,
        badEffects: [{ type: 'hull', value: 4, target: 'random' }],
        goodEffects: [
          { type: 'rp', value: 20, target: 'fleet' },
          { type: 'tech', value: 1, target: 'fleet' },
        ],
      },
      {
        id: 'shoot-lock',
        label: '"Shoot the lock from a distance."',
        flavorText: '',
        effects: [{ type: 'rp', value: 10, target: 'fleet' }],
      },
      {
        id: 'remote-disarm',
        label: '"Use a remote drone rig to disarm it."',
        flavorText: 'This is exactly the sort of work a machine hand or combat hacker was made for.',
        requirements: [
          { type: 'officerPresent', officerId: 'sparky', description: 'Requires Sparky or Xel.' },
          { type: 'officerPresent', officerId: 'xel', description: 'Requires Sparky or Xel.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'rp', value: 15, target: 'fleet' },
          { type: 'grantWeapon', weaponId: 'illegal-rail-accelerator', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-20',
    title: 'Mutated Contagion',
    narrative: 'A strange respiratory illness is spreading rapidly through the lower decks. The Chief Medical Officer requests permission to quarantine three entire decks.',
    options: [
      {
        id: 'quarantine',
        label: '"Enact the quarantine."',
        flavorText: '',
        effects: [
          { type: 'rp', value: -15, target: 'fleet' },
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { playerCTRound1Modifier: -1 },
          },
        ],
      },
      {
        id: 'vent-sectors',
        label: '"Vent the infected sectors into space."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -4, target: 'fleet' },
          { type: 'stress', value: 2, target: 'all' },
        ],
      },
    ],
  },

  {
    id: 'event-21',
    title: 'Blind Spot',
    narrative: 'Due to a massive electromagnetic shadow from a nearby gas giant, your fleet practically bumps into a Hegemony patrol. Neither side has raised shields yet.',
    options: [
      {
        id: 'ambush',
        label: '"Ambush them!"',
        flavorText: '',
        effects: [
          {
            type: 'transformToCombat',
            target: 'fleet',
            combatModifiers: { enemyShieldsZeroRound1: true, playerActsFirst: true },
          },
        ],
      },
      {
        id: 'reverse',
        label: '"Quietly reverse course."',
        flavorText: '',
        effects: [{ type: 'rp', value: -15, target: 'fleet' }],
      },
      {
        id: 'ram-formation',
        label: '"Ram them before they power up!"',
        flavorText: '',
        effects: [
          { type: 'hull', value: 2, target: 'all' },
          { type: 'rp', value: 30, target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-22',
    title: 'The Broken AI',
    narrative: 'You salvage an intact Hegemony tactical AI core from a floating piece of debris. It is damaged and begging to be plugged into your mainframe.',
    options: [
      {
        id: 'integrate-ai',
        label: '"Integrate the AI."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 4,
        badEffects: [{ type: 'destroyWeapon', target: 'random' }],
        goodEffects: [{ type: 'tech', value: 1, target: 'fleet' }],
      },
      {
        id: 'wipe-sell',
        label: '"Wipe it and sell the hardware."',
        flavorText: '',
        effects: [{ type: 'rp', value: 20, target: 'fleet' }],
      },
      {
        id: 'drone-interface',
        label: '"Let Sparky interface drone-to-core."',
        flavorText: 'A synthetic mind can sandbox the unstable logic before it eats your fire-control network.',
        requirements: [
          { type: 'officerPresent', officerId: 'sparky', description: 'Requires Sparky.' },
        ],
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'ff', value: 1, target: 'fleet' },
          { type: 'grantSubsystem', subsystemId: 'salvaged-ai-coprocessor', target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-23',
    title: 'Solar Flare',
    narrative: 'The local star is entering a period of violent coronal mass ejections. A massive solar flare is expanding directly toward your jump trajectory.',
    options: [
      {
        id: 'ride-wave',
        label: '"Ride the wave."',
        flavorText: '',
        effects: [
          { type: 'hull', value: 1, target: 'all' },
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { playerStartSpeed3: true },
          },
        ],
      },
      {
        id: 'planetary-shadow',
        label: '"Hide in the planetary shadow."',
        flavorText: '',
        effects: [
          { type: 'ff', value: -2, target: 'fleet' },
          { type: 'stress', value: 1, target: 'helm' },
        ],
      },
    ],
  },

  {
    id: 'event-24',
    title: 'Ancient Alien Ruin',
    narrative: 'Scanners pick up a non-human, perfectly geometric structure floating in the void. It predates the Hegemony by millennia and is emitting a low-frequency hum.',
    options: [
      {
        id: 'exploration-team',
        label: '"Send an exploration team."',
        flavorText: '',
        requiresRoll: true,
        rollThreshold: 5,
        badEffects: [{ type: 'stress', value: 999, target: 'all' }], // 999 = max out
        goodEffects: [{ type: 'tech', value: 2, target: 'fleet' }],
      },
      {
        id: 'destroy-it',
        label: '"Destroy it."',
        flavorText: '',
        effects: [{ type: 'ff', value: 1, target: 'fleet' }],
      },
      {
        id: 'specialist-expedition',
        label: '"Send a hardened specialist team."',
        flavorText: 'The right expert can study the ruin without letting it study you back.',
        requirements: [
          { type: 'officerPresent', officerId: 'aris', description: 'Requires Aris, Xel, or Sparky.' },
          { type: 'officerPresent', officerId: 'xel', description: 'Requires Aris, Xel, or Sparky.' },
          { type: 'officerPresent', officerId: 'sparky', description: 'Requires Aris, Xel, or Sparky.' },
        ],
        requirementMode: 'any',
        visibility: 'hiddenWhenUnmet',
        effects: [
          { type: 'grantSubsystem', subsystemId: 'alien-phase-vanes', target: 'fleet' },
          { type: 'nextStoreDiscount', value: 50, target: 'fleet' },
        ],
      },
    ],
  },

  {
    id: 'event-25',
    title: 'The Negotiator',
    narrative: 'A Hegemony diplomat contacts you on a secure channel. They don\'t care about the war; they just want to meet their quotas. They offer to log your fleet as \'destroyed\' in exchange for a massive bribe.',
    options: [
      {
        id: 'pay-bribe',
        label: '"Pay the bribe."',
        flavorText: '',
        effects: [
          { type: 'rp', value: -50, target: 'fleet' },
          { type: 'ff', value: 5, target: 'fleet' },
        ],
      },
      {
        id: 'reject-offer',
        label: '"Reject the offer."',
        flavorText: '',
        effects: [
          {
            type: 'nextCombatModifier',
            target: 'fleet',
            combatModifiers: { threatBudgetBonus: 7, highPriorityBounty: true },
          },
        ],
      },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════

export function getAllEvents(): EventNode[] {
  return EVENT_NODES;
}

export function getEventById(id: string): EventNode | undefined {
  return EVENT_NODES.find(e => e.id === id);
}

export function drawRandomEvent(excludeIds: string[] = []): EventNode | null {
  const pool = EVENT_NODES.filter(e => !excludeIds.includes(e.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
