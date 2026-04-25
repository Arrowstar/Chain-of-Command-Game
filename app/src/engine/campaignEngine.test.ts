import { describe, it, expect } from 'vitest';
import {
  executePostCombatLoop, resolveEventOption, convertFleetFavorToRP,
  applyEventResolution, buildEventRequirementContext, getEventOptionAvailability,
  purchaseHullPatch, scrapItem, purchasePsychEval, purchaseDeepRepair,
  purchaseOfficerTraining, generateMarketInventory,
  advanceToNextSector, checkTotalWipe, applyShipReplacement,
} from './campaignEngine';
import type { PlayerState, ShipState, OfficerData, OfficerState } from '../types/game';
import type { ScarEffect, TraumaEffect } from '../types/game';
import { WEAPONS } from '../data/weapons';

// ── Fixtures ─────────────────────────────────────────────────────

function makeOfficer(id: string, station: OfficerState['station'], stress: number, maxStress = 4): OfficerState {
  return {
    officerId: id,
    station,
    currentStress: stress,
    currentTier: 'veteran',
    isLocked: false,
    lockDuration: 0,
    traumas: [],
    hasFumbledThisRound: false,
    actionsPerformedThisRound: 0,
  };
}

function makeOfficerData(id: string, stressLimit: number | null = 4): OfficerData {
  return {
    id,
    name: id,
    station: 'helm',
    traitName: 'Test',
    traitEffect: '',
    stressLimit,
    defaultTier: 'veteran',
    avatar: '',
    traitTier: 1,
    dpCost: 0,
  };
}

function makeShip(id: string, crits: { id: string; isRepaired: boolean }[] = []): ShipState {
  return {
    id,
    name: id,
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0,
    currentSpeed: 0,
    currentHull: 10,
    maxHull: 12,
    shields: { fore: 4, foreStarboard: 4, aftStarboard: 4, aft: 4, aftPort: 4, forePort: 4 },
    maxShieldsPerSector: 4,
    equippedWeapons: ['plasma-battery', null],
    equippedSubsystems: ['ecm', null],
    criticalDamage: crits as any,
    scars: [],
    armorDie: 'd4',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
  };
}

function makePlayer(id: string, shipId: string, officers: OfficerState[]): PlayerState {
  return {
    id,
    name: id,
    shipId,
    officers,
    commandTokens: 5,
    maxCommandTokens: 5,
    assignedActions: [],
  };
}

// ══════════════════════════════════════════════════════════════════
// Post-Combat Loop
// ══════════════════════════════════════════════════════════════════

describe('convertFleetFavorToRP', () => {
  it('converts a chosen positive amount at 1:10 rate', () => {
    const result = convertFleetFavorToRP(5, 3);
    expect(result.rpGained).toBe(30);
    expect(result.ffSpent).toBe(3);
    expect(result.remainingFleetFavor).toBe(2);
  });

  it('caps conversion to available positive FF', () => {
    const result = convertFleetFavorToRP(2, 9);
    expect(result.rpGained).toBe(20);
    expect(result.ffSpent).toBe(2);
    expect(result.remainingFleetFavor).toBe(0);
  });

  it('converts 0 FF to 0 RP', () => {
    const result = convertFleetFavorToRP(0, 3);
    expect(result.rpGained).toBe(0);
    expect(result.ffSpent).toBe(0);
  });

  it('negative FF produces 0 RP (not negative RP)', () => {
    const result = convertFleetFavorToRP(-3, 2);
    expect(result.rpGained).toBe(0);
    expect(result.ffSpent).toBe(0);
    expect(result.remainingFleetFavor).toBe(-3);
  });
});

describe('executePostCombatLoop — Trauma Assessment', () => {
  it('officer AT max stress gains a Trauma and resets', () => {
    const officer = makeOfficer('helm-1', 'helm', 4, 4); // stress 4/4 = maxed
    const player = makePlayer('p1', 'ship-1', [officer]);
    const ship = makeShip('ship-1');
    const officerData = makeOfficerData('helm-1', 4);

    const result = executePostCombatLoop({
      players: [player],
      officerDataMap: { 'helm-1': officerData },
      playerShips: [ship],
    });

    expect(result.traumasGained).toHaveLength(1);
    expect(result.traumasGained[0].officerId).toBe('helm-1');
    expect(result.officerStressResets).toContain('helm-1');
  });

  it('officer below max stress resets but gains no Trauma', () => {
    const officer = makeOfficer('helm-2', 'helm', 2, 4); // stress 2/4
    const player = makePlayer('p1', 'ship-1', [officer]);
    const ship = makeShip('ship-1');
    const officerData = makeOfficerData('helm-2', 4);

    const result = executePostCombatLoop({
      players: [player],
      officerDataMap: { 'helm-2': officerData },
      playerShips: [ship],
    });

    expect(result.traumasGained).toHaveLength(0);
    expect(result.officerStressResets).toContain('helm-2');
  });

  it('stress-immune officer (stressLimit=null) is skipped', () => {
    const officer = makeOfficer('sparky', 'engineering', 0);
    const player = makePlayer('p1', 'ship-1', [officer]);
    const ship = makeShip('ship-1');
    const officerData = makeOfficerData('sparky', null);

    const result = executePostCombatLoop({
      players: [player],
      officerDataMap: { sparky: officerData },
      playerShips: [ship],
    });

    expect(result.traumasGained).toHaveLength(0);
    expect(result.officerStressResets).not.toContain('sparky');
  });

  it('multiple officers maxed → each gets individual Trauma', () => {
    const o1 = makeOfficer('helm-1', 'helm', 4);
    const o2 = makeOfficer('tactical-1', 'tactical', 5);
    const player = makePlayer('p1', 'ship-1', [o1, o2]);
    const ship = makeShip('ship-1');
    const dataMap = {
      'helm-1': makeOfficerData('helm-1', 4),
      'tactical-1': makeOfficerData('tactical-1', 5),
    };

    const result = executePostCombatLoop({ players: [player], officerDataMap: dataMap, playerShips: [ship],
    });

    expect(result.traumasGained).toHaveLength(2);
  });
});

describe('executePostCombatLoop — Damage Consolidation', () => {
  it('active (unrepaired) crits become Ship Scars', () => {
    const ship = makeShip('ship-1', [
      { id: 'thrusters-offline', isRepaired: false },
      { id: 'coolant-leak', isRepaired: false },
      { id: 'sensor-mast-damaged', isRepaired: false },
    ]);

    const result = executePostCombatLoop({ players: [], officerDataMap: {}, playerShips: [ship],
    });

    expect(result.scarsGained).toHaveLength(3);
    expect(result.scarsGained.map(s => s.fromCritId)).toContain('thrusters-offline');
    expect(result.scarsGained.map(s => s.fromCritId)).toContain('coolant-leak');
    expect(result.scarsGained.map(s => s.fromCritId)).toContain('sensor-mast-damaged');
  });

  it('repaired crits do NOT become scars', () => {
    const ship = makeShip('ship-1', [
      { id: 'thrusters-offline', isRepaired: true },
    ]);

    const result = executePostCombatLoop({ players: [], officerDataMap: {}, playerShips: [ship],
    });

    expect(result.scarsGained).toHaveLength(0);
  });

  it('ship with no crits produces no scars', () => {
    const ship = makeShip('ship-1', []);
    const result = executePostCombatLoop({ players: [], officerDataMap: {}, playerShips: [ship],
    });
    expect(result.scarsGained).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════
// Event Resolution
// ══════════════════════════════════════════════════════════════════

describe('resolveEventOption', () => {
  it('Event 01 Option "strip": +30 RP, -2 FF, stress all', () => {
    const res = resolveEventOption('event-01', 'strip');
    expect(res.effectsApplied.find(e => e.type === 'rp')?.value).toBe(30);
    expect(res.effectsApplied.find(e => e.type === 'ff')?.value).toBe(-2);
    expect(res.effectsApplied.find(e => e.type === 'stress')).toBeDefined();
    expect(res.transformsToCombat).toBe(false);
  });

  it('Event 01 Option "divert": -10 RP, +2 FF, stress recover all', () => {
    const res = resolveEventOption('event-01', 'divert');
    expect(res.effectsApplied.find(e => e.type === 'rp')?.value).toBe(-10);
    expect(res.effectsApplied.find(e => e.type === 'ff')?.value).toBe(2);
    expect(res.effectsApplied.find(e => e.type === 'stressRecover')).toBeDefined();
  });

  it('Event 01 Option "leave": nothing', () => {
    const res = resolveEventOption('event-01', 'leave');
    expect(res.effectsApplied).toHaveLength(1);
    expect(res.effectsApplied[0].type).toBe('nothing');
  });

  it('Event 02: roll 1 triggers bad effects (EMP saboteur)', () => {
    const res = resolveEventOption('event-02', 'bring-aboard', 1);
    expect(res.roll).toBe(1);
    expect(res.rolledGood).toBe(false);
    expect(res.effectsApplied.find(e => e.type === 'ff')?.value).toBe(-2);
    expect(res.effectsApplied.find(e => e.type === 'subsystemSlotReduction')).toBeDefined();
  });

  it('Event 02: roll 4 triggers good effects (genuine intel)', () => {
    const res = resolveEventOption('event-02', 'bring-aboard', 4);
    expect(res.rolledGood).toBe(true);
    expect(res.effectsApplied.find(e => e.type === 'skipNode')).toBeDefined();
    expect(res.effectsApplied.find(e => e.type === 'rp')?.value).toBe(15);
  });

  it('Event 05 "trade-reputation": -4 FF and no exclusive item', () => {
    const res = resolveEventOption('event-05', 'trade-reputation', undefined, []);
    expect(res.effectsApplied.find(e => e.type === 'ff')?.value).toBe(-4);
    expect(res.grantedWeapons ?? []).toHaveLength(0);
    expect(res.grantedSubsystems ?? []).toHaveLength(0);
  });

  it('Event 06: roll 2 transforms to Combat with +5 threat', () => {
    const res = resolveEventOption('event-06', 'investigate', 2);
    expect(res.rolledGood).toBe(false);
    expect(res.transformsToCombat).toBe(true);
    expect(res.combatModifiers?.threatBudgetBonus).toBe(5);
  });

  it('Event 06: roll 5 gives +35 RP and hull patches', () => {
    const res = resolveEventOption('event-06', 'investigate', 5);
    expect(res.rolledGood).toBe(true);
    expect(res.effectsApplied.find(e => e.type === 'rp')?.value).toBe(35);
    expect(res.effectsApplied.find(e => e.type === 'hullPatch')).toBeDefined();
    expect(res.transformsToCombat).toBe(false);
  });

  it('Event 21 "ambush": transforms to combat, enemies have 0 shields round 1, player acts first', () => {
    const res = resolveEventOption('event-21', 'ambush');
    expect(res.transformsToCombat).toBe(true);
    expect(res.combatModifiers?.enemyShieldsZeroRound1).toBe(true);
    expect(res.combatModifiers?.playerActsFirst).toBe(true);
  });

  it('Event 17 good outcome: skip node + gain tech', () => {
    const res = resolveEventOption('event-17', 'dive-breach', 5);
    expect(res.rolledGood).toBe(true);
    expect(res.effectsApplied.find(e => e.type === 'skipNode')).toBeDefined();
    expect(res.techAwarded!.length).toBeGreaterThan(0);
  });

  it('Event 24 good outcome: awards 2 tech', () => {
    const res = resolveEventOption('event-24', 'exploration-team', 6);
    expect(res.rolledGood).toBe(true);
    expect(res.techAwarded!.length).toBe(2);
  });

  it('supports granting a specific weapon from a gated option', () => {
    const res = resolveEventOption('event-05', 'covert-exchange');
    expect(res.grantedWeapons).toEqual(['experimental-plasma-lance']);
    expect(res.grantedSubsystems).toEqual([]);
  });

  it('can auto-resolve a gated option success branch without rolling', () => {
    const res = resolveEventOption('event-02', 'verify-codes', undefined, [], true);
    expect(res.rolledGood).toBeUndefined();
    expect(res.effectsApplied.find(e => e.type === 'grantSubsystem')?.subsystemId).toBe('black-market-targeting-suite');
  });

  it('throws for unknown event ID', () => {
    expect(() => resolveEventOption('event-99', 'any')).toThrow();
  });

  it('throws for unknown option ID', () => {
    expect(() => resolveEventOption('event-01', 'nonexistent')).toThrow();
  });
});

describe('event requirements framework', () => {
  it('marks officer-gated options as available when the officer is present', () => {
    const context = buildEventRequirementContext({
      players: [makePlayer('p1', 'ship-1', [makeOfficer('sparky', 'engineering', 0)])],
      ownedTechIds: [],
      requisitionPoints: 20,
    });

    const availability = getEventOptionAvailability({
      id: 'send-sparky',
      label: 'Send Sparky over.',
      flavorText: '',
      requiresRoll: true,
      autoSuccessWhenMet: true,
      requirements: [{ type: 'officerPresent', officerId: 'sparky' }],
      goodEffects: [{ type: 'rp', value: 20, target: 'fleet' }],
      badEffects: [{ type: 'nothing' }],
    }, context);

    expect(availability.visible).toBe(true);
    expect(availability.enabled).toBe(true);
    expect(availability.requirementsMet).toBe(true);
    expect(availability.autoSuccess).toBe(true);
  });

  it('can hide options when requirements are not met', () => {
    const context = buildEventRequirementContext({
      players: [makePlayer('p1', 'ship-1', [makeOfficer('helm-1', 'helm', 0)])],
      ownedTechIds: [],
      requisitionPoints: 5,
    });

    const availability = getEventOptionAvailability({
      id: 'secret-option',
      label: 'Secret option',
      flavorText: '',
      requirements: [{ type: 'officerPresent', officerId: 'sparky' }],
      visibility: 'hiddenWhenUnmet',
      effects: [{ type: 'nothing' }],
    }, context);

    expect(availability.visible).toBe(false);
    expect(availability.requirementsMet).toBe(false);
    expect(availability.unmetRequirementText.length).toBe(1);
  });
});

describe('applyEventResolution', () => {
  it('adds granted weapons and subsystems to the fleet stash', () => {
    const result = applyEventResolution({
      resolution: {
        eventId: 'test-event',
        optionId: 'loot',
        effectsApplied: [
          { type: 'grantWeapon', weaponId: 'experimental-plasma-lance' },
          { type: 'grantSubsystem', subsystemId: 'salvaged-ai-coprocessor' },
        ],
        transformsToCombat: false,
        narrativeResult: 'Recovered contraband.',
      },
      requisitionPoints: 10,
      experimentalTech: [],
      nextCombatModifiers: null,
      canSkipNode: false,
      persistedPlayers: [makePlayer('p1', 'ship-1', [makeOfficer('o1', 'helm', 0)])],
      persistedShips: [makeShip('ship-1')],
      stashedWeapons: [],
      stashedSubsystems: [],
      pendingEconomicBuffs: {
        nextStoreDiscountPercent: 0,
        freeRepairAtNextStation: false,
        freeRepairConsumed: false,
      },
    });

    expect(result.stashedWeapons).toContain('experimental-plasma-lance');
    expect(result.stashedSubsystems).toContain('salvaged-ai-coprocessor');
    expect(result.grantedWeapons).toEqual(['experimental-plasma-lance']);
    expect(result.grantedSubsystems).toEqual(['salvaged-ai-coprocessor']);
  });

  it('adds pending economic buffs from event outcomes', () => {
    const result = applyEventResolution({
      resolution: {
        eventId: 'test-buff',
        optionId: 'route',
        effectsApplied: [
          { type: 'nextStoreDiscount', value: 50, target: 'fleet' },
          { type: 'freeRepairAtNextStation', target: 'fleet' },
        ],
        transformsToCombat: false,
        narrativeResult: 'Set up the next haven visit.',
      },
      requisitionPoints: 10,
      experimentalTech: [],
      nextCombatModifiers: null,
      canSkipNode: false,
      persistedPlayers: [makePlayer('p1', 'ship-1', [makeOfficer('o1', 'helm', 0)])],
      persistedShips: [makeShip('ship-1')],
      stashedWeapons: [],
      stashedSubsystems: [],
      pendingEconomicBuffs: {
        nextStoreDiscountPercent: 0,
        freeRepairAtNextStation: false,
        freeRepairConsumed: false,
      },
    });

    expect(result.pendingEconomicBuffs.nextStoreDiscountPercent).toBe(50);
    expect(result.pendingEconomicBuffs.freeRepairAtNextStation).toBe(true);
    expect(result.pendingEconomicBuffs.freeRepairConsumed).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// Drydock Services
// ══════════════════════════════════════════════════════════════════

describe('purchaseHullPatch', () => {
  it('costs 5 RP and restores 1 hull', () => {
    const result = purchaseHullPatch({ shipId: 's1', currentHull: 8, maxHull: 12, currentRP: 10, hasSmugglerManifest: false });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-5);
    expect(result.mutations[0].type).toBe('hullRestore');
  });

  it('costs 3 RP with Smuggler\'s Manifest', () => {
    const result = purchaseHullPatch({ shipId: 's1', currentHull: 8, maxHull: 12, currentRP: 5, hasSmugglerManifest: true });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-3);
  });

  it('fails if not enough RP', () => {
    const result = purchaseHullPatch({ shipId: 's1', currentHull: 8, maxHull: 12, currentRP: 3, hasSmugglerManifest: false });
    expect(result.success).toBe(false);
  });

  it('fails if ship is already at max hull', () => {
    const result = purchaseHullPatch({ shipId: 's1', currentHull: 12, maxHull: 12, currentRP: 50, hasSmugglerManifest: false });
    expect(result.success).toBe(false);
  });
});

describe('scrapItem', () => {
  it('gains 15 RP for a scrapped subsystem', () => {
    const result = scrapItem({ shipId: 's1', slotIndex: 0, isWeapon: false, currentRP: 0 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(15);
    expect(result.mutations[0].type).toBe('subsystemScrapped');
  });

  it('gains 15 RP for a scrapped weapon', () => {
    const result = scrapItem({ shipId: 's1', slotIndex: 0, isWeapon: true, currentRP: 0 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(15);
    expect(result.mutations[0].type).toBe('weaponScrapped');
  });
});

describe('purchasePsychEval', () => {
  const trauma: TraumaEffect = { id: 'paranoid', name: 'Paranoid', effect: 'test' };

  it('costs 20 RP and removes a Trauma', () => {
    const result = purchasePsychEval({ officerId: 'o1', shipId: 's1', traumas: [trauma], currentRP: 30 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-20);
    expect(result.mutations[0].type).toBe('traumaRemoved');
  });

  it('fails with insufficient RP', () => {
    const result = purchasePsychEval({ officerId: 'o1', shipId: 's1', traumas: [trauma], currentRP: 10 });
    expect(result.success).toBe(false);
  });

  it('fails if officer has no traumas', () => {
    const result = purchasePsychEval({ officerId: 'o1', shipId: 's1', traumas: [], currentRP: 30 });
    expect(result.success).toBe(false);
  });
});

describe('purchaseDeepRepair', () => {
  const scar: ScarEffect = { id: 'scar-1', name: 'Scorched Relays', effect: 'test', fromCriticalId: 'thrusters-offline' };

  it('costs 30 RP and removes a Scar', () => {
    const result = purchaseDeepRepair({ shipId: 's1', scars: [scar], scarId: 'scar-1', currentRP: 40 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-30);
    expect(result.mutations[0].type).toBe('scarRemoved');
  });

  it('fails with insufficient RP', () => {
    const result = purchaseDeepRepair({ shipId: 's1', scars: [scar], scarId: 'scar-1', currentRP: 10 });
    expect(result.success).toBe(false);
  });

  it('fails if ship does not have that Scar', () => {
    const result = purchaseDeepRepair({ shipId: 's1', scars: [], scarId: 'scar-1', currentRP: 40 });
    expect(result.success).toBe(false);
  });
});

describe('purchaseOfficerTraining', () => {
  it('Rookie to Veteran costs 15 RP', () => {
    const result = purchaseOfficerTraining({ officerId: 'o1', shipId: 's1', currentTier: 'rookie', currentRP: 20 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-15);
    expect(result.mutations[0].toTier).toBe('veteran');
  });

  it('Veteran to Elite costs 30 RP', () => {
    const result = purchaseOfficerTraining({ officerId: 'o1', shipId: 's1', currentTier: 'veteran', currentRP: 35 });
    expect(result.success).toBe(true);
    expect(result.rpDelta).toBe(-30);
    expect(result.mutations[0].toTier).toBe('elite');
  });

  it('Elite cannot be upgraded at drydock (Legendary is narrative only)', () => {
    const result = purchaseOfficerTraining({ officerId: 'o1', shipId: 's1', currentTier: 'elite', currentRP: 100 });
    expect(result.success).toBe(false);
  });

  it('fails with insufficient RP', () => {
    const result = purchaseOfficerTraining({ officerId: 'o1', shipId: 's1', currentTier: 'rookie', currentRP: 5 });
    expect(result.success).toBe(false);
  });
});

describe('generateMarketInventory', () => {
  it('draws 3 weapons and 3 subsystems', () => {
    const market = generateMarketInventory();
    expect(market.weapons).toHaveLength(3);
    expect(market.subsystems).toHaveLength(3);
  });

  it('weapons are valid weapon IDs', () => {
    const weaponIds = WEAPONS.map((w: any) => w.id);
    const market = generateMarketInventory();
    for (const id of market.weapons) {
      expect(weaponIds).toContain(id);
    }
  });

  it('never includes event-exclusive items in the standard market', () => {
    const market = generateMarketInventory();
    expect(market.weapons).not.toContain('experimental-plasma-lance');
    expect(market.weapons).not.toContain('illegal-rail-accelerator');
    expect(market.subsystems).not.toContain('salvaged-ai-coprocessor');
    expect(market.subsystems).not.toContain('alien-phase-vanes');
  });
});

// ══════════════════════════════════════════════════════════════════
// Campaign Progression
// ══════════════════════════════════════════════════════════════════

describe('advanceToNextSector', () => {
  it('sector 1 → 2 is not a campaign victory', () => {
    const t = advanceToNextSector(1);
    expect(t.newSector).toBe(2);
    expect(t.campaignVictory).toBe(false);
    expect(t.rpBonus).toBe(150);
    expect(t.shieldRestored).toBe(true);
  });

  it('sector 2 → 3 is not a campaign victory', () => {
    const t = advanceToNextSector(2);
    expect(t.newSector).toBe(3);
    expect(t.campaignVictory).toBe(false);
  });

  it('completing sector 3 triggers campaign victory', () => {
    const t = advanceToNextSector(3);
    expect(t.campaignVictory).toBe(true);
  });
});

describe('checkTotalWipe', () => {
  it('all ships destroyed → total wipe', () => {
    const ships = [makeShip('s1'), makeShip('s2')].map(s => ({ ...s, isDestroyed: true }));
    expect(checkTotalWipe(ships)).toBe(true);
  });

  it('one ship surviving → not a wipe', () => {
    const ships = [
      { ...makeShip('s1'), isDestroyed: true },
      { ...makeShip('s2'), isDestroyed: false },
    ];
    expect(checkTotalWipe(ships)).toBe(false);
  });

  it('empty fleet → wipe (edge case)', () => {
    expect(checkTotalWipe([])).toBe(false); // no ships = not a wipe
  });
});

describe('applyShipReplacement', () => {
  it('rebuilds a destroyed ship with a Vanguard and rookie officers', () => {
    const oldShip = { ...makeShip('s1'), isDestroyed: true, currentHull: 0, currentSpeed: 4, criticalDamage: [{id: 'test'}] };
    const oldOfficer = makeOfficer('o1', 'helm', 3);
    const oldPlayer = makePlayer('p1', 's1', [oldOfficer]);

    const { rebuiltShip, rebuiltPlayer } = applyShipReplacement(oldShip as any, oldPlayer);

    expect(rebuiltShip.chassisId).toBe('vanguard');
    expect(rebuiltShip.isDestroyed).toBe(false);
    expect(rebuiltShip.currentHull).toBeGreaterThan(0);
    expect(rebuiltShip.equippedWeapons[0]).toBe('plasma-battery');
    expect(rebuiltShip.criticalDamage.length).toBe(0);

    expect(rebuiltPlayer.officers[0].currentTier).toBe('rookie');
    expect(rebuiltPlayer.officers[0].currentStress).toBe(0);
  });
});

