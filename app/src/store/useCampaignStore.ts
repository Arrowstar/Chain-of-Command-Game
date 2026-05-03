import { create } from 'zustand';
import type {
  CampaignState,
  CampaignPhase,
  ExperimentalTech,
  CombatModifiers,
  MarketInventory,
  PostCombatResult,
  FleetFavorConversionResult,
  EventResolution,
  CampaignLogEntry,
  CampaignLogType,
  StoryBeatId,
} from '../types/campaignTypes';
import type { OfficerData, ShipState, PlayerState } from '../types/game';
import { generateSectorMap, NodeType, type SectorMap } from '../engine/mapGenerator';
import {
  executePostCombatLoop,
  convertFleetFavorToRP as convertFleetFavorToRPEngine,
  resolveEventOption,
  applyEventResolution,
  buildEventRequirementContext,
  getEventOptionAvailability,
  purchaseHullPatch, scrapItem, purchasePsychEval, purchaseDeepRepair, purchaseOfficerTraining,
  advanceToNextSector, checkTotalWipe, getShipReplacementConfig,
  generateMarketInventory,
  purchaseChassisUpgrade, purchaseMarketItemFn, swapStashItem,
  applyShipReplacement,
} from '../engine/campaignEngine';
import { getChassisById } from '../data/shipChassis';
import { getTechById, drawRandomTech } from '../data/experimentalTech';
import {
  applyAutoDocOverride,
  getSalvagerDronesRP,
  getStimInjectorBonus,
  shouldRevealEliteAndEventNodes,
} from '../engine/techEffects';
import { NodeType as NT } from '../engine/mapGenerator';
import { fireToast } from '../components/campaign/ToastContainer';
import { getEventById } from '../data/eventNodes';
import { getWeaponById } from '../data/weapons';
import { getSubsystemById } from '../data/subsystems';
import { useGameStore } from './useGameStore';

// ══════════════════════════════════════════════════════════════════
// Campaign Store (Zustand)
// Manages all state OUTSIDE of individual combat scenarios.
// ══════════════════════════════════════════════════════════════════

interface CampaignStore {
  // ── State ──────────────────────────────────────────────────────
  campaign: CampaignState | null;
  campaignLog: CampaignLogEntry[];
  /** Snapshot of player/ship state to persist between nodes */
  persistedPlayers: PlayerState[];
  persistedShips: ShipState[];
  officerDataMap: Record<string, OfficerData>;

  // Derived sector map (generated from campaign.sectorMapSeed)
  sectorMap: SectorMap | null;

  // ── Campaign Lifecycle ─────────────────────────────────────────
  startNewCampaign: (params: {
    fleetAdmiralPlayerId: string;
    players: PlayerState[];
    ships: ShipState[];
    officerDataMap: Record<string, OfficerData>;
    difficulty: import('../types/campaignTypes').CampaignDifficulty;
    dpBudget: number;
  }) => void;

  /** Called when a combat scenario ends. Persists updated player/ship state. */
  onCombatEnd: (params: {
    players: PlayerState[];
    ships: ShipState[];
    earnedFF: number;
    victory: boolean;
    reason: string;
  }) => void;

  /** Called when a player's ship is destroyed during combat. */
  handleShipDestruction: (destroyedShipId: string) => void;

  // ── Sector Map Navigation ──────────────────────────────────────
  /** Select the next node to travel to (must be in current node's paths) */
  selectNode: (nodeId: string) => void;

  // ── Event Resolution ───────────────────────────────────────────
  /** Resolve the current event node with a chosen option + optional dice roll */
  resolveEvent: (optionId: string, diceRoll?: number) => EventResolution | null;

  // ── Post-Combat (At-Ease) ──────────────────────────────────────
  executePostCombat: () => PostCombatResult | null;
  convertFleetFavorToRP: (amount: number) => FleetFavorConversionResult | null;
  finishPostCombat: () => void;

  // ── Drydock (Haven) ────────────────────────────────────────────
  enterDrydock: () => void;
  completeDrydock: () => void;
  purchaseHullPatch: (shipId: string) => void;
  scrapItem: (shipId: string, slotIndex: number, isWeapon: boolean) => void;
  purchasePsychEval: (officerId: string, shipId: string) => void;
  purchaseDeepRepair: (shipId: string, scarId: string) => void;
  purchaseOfficerTraining: (officerId: string, shipId: string) => void;
  purchaseMarketItem: (itemId: string, shipId: string, isWeapon: boolean, slotIndex: number) => void;
  purchaseMarketTech: (techId: string) => void;
  purchaseChassisUpgrade: (shipId: string, newChassisId: string) => void;
  swapStashItem: (shipId: string, slotIndex: number, itemId: string, isWeapon: boolean, action: 'equip' | 'stash') => void;
  scrapStashedItem: (itemId: string, isWeapon: boolean) => void;

  // ── Tech Management ────────────────────────────────────────────
  acquireTech: (techId: string) => void;
  consumeTech: (techId: string) => void;

  // ── Sector Boss ────────────────────────────────────────────────
  completeBossNode: () => void;

  // ── Story Beats ────────────────────────────────────────────────
  /** Dismiss the currently-displayed story screen and advance to the next phase */
  dismissStory: () => void;

  // ── Save/Load ──────────────────────────────────────────────────
  loadCampaignState: (stateToLoad: Partial<CampaignStore>) => void;

  // ── Campaign Log ───────────────────────────────────────────────
  pushCampaignLog: (params: {
    type: CampaignLogType;
    message: string;
    outcome: string;
    details?: Record<string, unknown>;
  }) => void;

  // ── Selectors ─────────────────────────────────────────────────
  getOwnedTechIds: () => string[];
  hasTech: (id: string) => boolean;
}

// ─── Initial campaign state factory ──────────────────────────────

function makeCampaignState(params: {
  fleetAdmiralPlayerId: string;
  difficulty: import('../types/campaignTypes').CampaignDifficulty;
  dpBudget: number;
}): CampaignState {
  return {
    currentSector: 1,
    currentNodeId: 'start-0',
    sectorMapSeed: Math.random(),
    visitedNodeIds: ['start-0'],
    revealedNodeIds: ['start-0'],
    requisitionPoints: 0,
    fleetFavor: 0,
    experimentalTech: [],
    campaignPhase: 'story',
    pendingStoryId: 'sector-1',
    fleetAdmiralPlayerId: params.fleetAdmiralPlayerId,
    nextCombatModifiers: null,
    canSkipNode: false,
    drydockMarket: null,
    stashedWeapons: [],
    stashedSubsystems: [],
    pendingEconomicBuffs: {
      nextStoreDiscountPercent: 0,
      freeRepairAtNextStation: false,
      freeRepairConsumed: false,
    },
    isGameOver: false,
    victory: null,
    difficulty: params.difficulty,
    dpBudget: params.dpBudget,
  };
}

const MAX_CAMPAIGN_LOG_ENTRIES = 400;

const CAMPAIGN_NODE_LABELS: Record<NodeType, string> = {
  [NodeType.Start]: 'Fleet Departure',
  [NodeType.Combat]: 'Hostile Patrol',
  [NodeType.Elite]: 'Elite Squadron',
  [NodeType.Event]: 'Anomalous Signal',
  [NodeType.Haven]: 'Hidden Drydock',
  [NodeType.Boss]: 'Hegemony Command',
};

function makeCampaignLogEntry(
  campaign: CampaignState,
  params: {
    type: CampaignLogType;
    message: string;
    outcome: string;
    details?: Record<string, unknown>;
  }
): CampaignLogEntry {
  return {
    id: `campaign-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sector: campaign.currentSector,
    phase: campaign.campaignPhase,
    timestamp: Date.now(),
    type: params.type,
    message: params.message,
    outcome: params.outcome,
    details: params.details,
  };
}

function appendCampaignLog(log: CampaignLogEntry[], entry: CampaignLogEntry): CampaignLogEntry[] {
  const next = [...log, entry];
  return next.length > MAX_CAMPAIGN_LOG_ENTRIES
    ? next.slice(next.length - MAX_CAMPAIGN_LOG_ENTRIES)
    : next;
}

function getNodeLabel(nodeType: NodeType): string {
  return CAMPAIGN_NODE_LABELS[nodeType] ?? 'Unknown Node';
}

function summarizeEventResolution(resolution: EventResolution): string {
  const parts: string[] = [];
  if (typeof resolution.roll === 'number') {
    parts.push(`Rolled ${resolution.roll}${resolution.rolledGood === true ? ' and succeeded' : resolution.rolledGood === false ? ' and failed' : ''}.`);
  }
  if (resolution.techAwarded?.length) {
    parts.push(`Acquired ${resolution.techAwarded.length} experimental tech item${resolution.techAwarded.length === 1 ? '' : 's'}.`);
  }
  if (resolution.grantedWeapons?.length) {
    parts.push(`Recovered ${resolution.grantedWeapons.length} exclusive weapon${resolution.grantedWeapons.length === 1 ? '' : 's'}.`);
  }
  if (resolution.grantedSubsystems?.length) {
    parts.push(`Recovered ${resolution.grantedSubsystems.length} exclusive subsystem${resolution.grantedSubsystems.length === 1 ? '' : 's'}.`);
  }
  if (resolution.effectsApplied.some(effect => effect.type === 'nextStoreDiscount')) {
    parts.push('Secured a haven discount for the next friendly station.');
  }
  if (resolution.effectsApplied.some(effect => effect.type === 'freeRepairAtNextStation')) {
    parts.push('Banked a free repair for the next haven.');
  }
  if (resolution.transformsToCombat) {
    parts.push('Encounter escalated into combat.');
  }
  parts.push(resolution.narrativeResult);
  return parts.join(' ');
}

function summarizePostCombatResult(result: PostCombatResult): string {
  const fragments: string[] = [];
  if (result.traumasGained.length > 0) {
    fragments.push(`${result.traumasGained.length} officer trauma case${result.traumasGained.length === 1 ? '' : 's'} recorded.`);
  }
  if (result.scarsGained.length > 0) {
    fragments.push(`${result.scarsGained.length} ship scar${result.scarsGained.length === 1 ? '' : 's'} confirmed.`);
  }
  if (result.traumasGained.length === 0 && result.scarsGained.length === 0) {
    fragments.push('No new lasting trauma or scars.');
  }
  return fragments.join(' ');
}

function getMarketTechCost(techId: string): number {
  const tech = getTechById(techId);
  return tech?.rarity === 'rare' ? 45 : 30;
}

// ══════════════════════════════════════════════════════════════════
// Store Implementation
// ══════════════════════════════════════════════════════════════════

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  campaign: null,
  campaignLog: [],
  persistedPlayers: [],
  persistedShips: [],
  officerDataMap: {},
  sectorMap: null,

  pushCampaignLog: ({ type, message, outcome, details }) => {
    set(state => {
      if (!state.campaign) return state;
      return {
        campaignLog: appendCampaignLog(
          state.campaignLog,
          makeCampaignLogEntry(state.campaign, { type, message, outcome, details })
        ),
      };
    });
  },

  // ── Start Campaign ─────────────────────────────────────────────
  startNewCampaign: ({ fleetAdmiralPlayerId, players, ships, officerDataMap, difficulty, dpBudget }) => {
    const campaign = makeCampaignState({ fleetAdmiralPlayerId, difficulty, dpBudget });
    const sectorMap = generateSectorMap(campaign.sectorMapSeed, 15);

    // If fleet owns Hegemony Encryption Key, reveal all elite/event nodes
    const revealedNodeIds = [...campaign.revealedNodeIds];
    if (shouldRevealEliteAndEventNodes(campaign.experimentalTech)) {
      sectorMap.nodes.forEach(n => {
        if (n.type === NT.Elite || n.type === NT.Event) revealedNodeIds.push(n.id);
      });
    }

    set({
      campaign: { ...campaign, revealedNodeIds },
      campaignLog: [
        makeCampaignLogEntry(campaign, {
          type: 'system',
          message: 'Campaign initialized',
          outcome: `Sector 1 charted on ${difficulty.toUpperCase()} difficulty. Fleet departed with ${ships.length} ship${ships.length === 1 ? '' : 's'} and a ${dpBudget} DP budget.`,
          details: {
            difficulty,
            dpBudget,
            shipCount: ships.length,
            fleetAdmiralPlayerId,
          },
        }),
      ],
      persistedPlayers: players,
      persistedShips: ships,
      officerDataMap,
      sectorMap,
    });
  },

  // ── Load Campaign ──────────────────────────────────────────────
  loadCampaignState: (stateToLoad) => {
    set({
      campaign: stateToLoad.campaign || null,
      campaignLog: stateToLoad.campaignLog || [],
      persistedPlayers: stateToLoad.persistedPlayers || [],
      persistedShips: stateToLoad.persistedShips || [],
      officerDataMap: stateToLoad.officerDataMap || {},
      sectorMap: stateToLoad.sectorMap || null,
    });
  },


  // ── Combat End Callback ────────────────────────────────────────
  onCombatEnd: ({ players, ships, earnedFF, victory, reason }) => {
    const { smallShipsDestroyedThisMission } = useGameStore.getState();
    const { campaign, sectorMap } = get();
    const currentNode = sectorMap?.nodes.find(node => node.id === campaign?.currentNodeId);
    const isBossNode = currentNode?.type === NodeType.Boss;
    const isBossDefeat = isBossNode && !victory;

    set(state => {
      if (!state.campaign) return state;
      const newFF = state.campaign.fleetFavor + earnedFF;
      const isFFGameOver = newFF <= -5;
      const isTotalWipe = checkTotalWipe(ships);
      
      // Mandatory defeat if boss is lost
      const forceGameOver = isBossDefeat || isFFGameOver || isTotalWipe;

      const bonusRp = state.campaign.experimentalTech.reduce(
        (sum, tech) => sum + (tech.isConsumed ? 0 : getSalvagerDronesRP('small', [tech]) * smallShipsDestroyedThisMission),
        0,
      );

      return {
        persistedPlayers: players,
        persistedShips: ships,
        campaign: {
          ...state.campaign,
          requisitionPoints: state.campaign.requisitionPoints + bonusRp,
          fleetFavor: newFF,
          // Transition to gameOver immediately if it's a boss defeat or FF wipe,
          // but we still go through postCombat first so they see the result.
          campaignPhase: forceGameOver ? 'postCombat' : 'postCombat', // Actually both go to postCombat first
          isGameOver: state.campaign.isGameOver || forceGameOver,
          victory: forceGameOver ? false : (victory ? true : null), // null means "not won yet"
          lastCombatVictory: victory,
          lastCombatReason: isBossDefeat ? `SECTOR COMMAND FAILURE: ${reason}` : reason,
        },
      };
    });

    if (get().campaign && (get().campaign!.fleetFavor <= -5 || isBossDefeat)) {
      useGameStore.setState({
        gameOver: true,
        victory: false,
        gameOverReason: isBossDefeat 
          ? 'Sector Command was not secured. The jump gate remains blockaded. Campaign failed.' 
          : 'Fleet Favor dropped to -5. High Command has terminated your commission.',
        phase: 'gameOver'
      });
    }
    const destroyedShipCount = ships.filter(ship => ship.isDestroyed).length;
    const salvageBonusRp = campaign
      ? campaign.experimentalTech.reduce(
          (sum, tech) => sum + (tech.isConsumed ? 0 : getSalvagerDronesRP('small', [tech]) * smallShipsDestroyedThisMission),
          0,
        )
      : 0;
    get().pushCampaignLog({
      type: 'combat',
      message: `Combat resolved at ${currentNode ? getNodeLabel(currentNode.type) : 'engagement zone'}`,
      outcome: `Battle complete. ${earnedFF >= 0 ? `+${earnedFF}` : earnedFF} Fleet Favor recorded${salvageBonusRp > 0 ? `; Salvager Drones recovered +${salvageBonusRp} RP` : ''}${destroyedShipCount > 0 ? `; ${destroyedShipCount} ship${destroyedShipCount === 1 ? '' : 's'} lost pending post-combat review` : ''}.`,
      details: {
        nodeId: currentNode?.id,
        earnedFF,
        salvageBonusRp,
        destroyedShipCount,
      },
    });
  },

  // ── Execute Post-Combat Loop ───────────────────────────────────
  executePostCombat: () => {
    const { campaign, persistedPlayers, persistedShips, officerDataMap } = get();
    if (!campaign) return null;
    const stimBonus = getStimInjectorBonus(campaign.experimentalTech);
    const adjustedOfficerDataMap = stimBonus === 0
      ? officerDataMap
      : Object.fromEntries(
          Object.entries(officerDataMap).map(([officerId, officerData]) => [
            officerId,
            officerData.stressLimit === null
              ? officerData
              : { ...officerData, stressLimit: officerData.stressLimit + stimBonus },
          ]),
        );

    const result = executePostCombatLoop({
      players: persistedPlayers,
      officerDataMap: adjustedOfficerDataMap,
      playerShips: persistedShips,
    });
    const autoDocResult = applyAutoDocOverride(campaign.experimentalTech);
    const preventedTrauma = autoDocResult.negated ? result.traumasGained[0] : undefined;
    const finalResult = autoDocResult.negated
      ? { ...result, traumasGained: result.traumasGained.slice(1) }
      : result;

    // Apply mutations to persisted state
    let updatedShips = persistedShips.map(ship => {
      const newScars = finalResult.scarsGained
        .filter(s => s.shipId === ship.id)
        .map(s => ({
          id: s.scarId,
          name: s.scarName,
          effect: s.scarEffect,
          fromCriticalId: s.fromCritId,
        }));

      // Clear active (non-repaired) crits — they become scars
      const updatedCrits = ship.criticalDamage.filter(c => c.isRepaired);

      return {
        ...ship,
        criticalDamage: updatedCrits,
        scars: [...ship.scars, ...newScars],
      };
    });

    let updatedPlayers = persistedPlayers.map(player => {
      const traumasForPlayer = finalResult.traumasGained.filter(t => {
        const ship = updatedShips.find(s => s.id === player.shipId);
        return ship && t.shipId === ship.id;
      });

      const updatedOfficers = player.officers.map(officer => {
        const wasReset = finalResult.officerStressResets.includes(officer.officerId);
        const traumaForOfficer = traumasForPlayer.find(t => t.officerId === officer.officerId);
        return {
          ...officer,
          currentStress: wasReset ? 0 : officer.currentStress,
          traumas: traumaForOfficer
            ? [...officer.traumas, { id: traumaForOfficer.traumaId, name: traumaForOfficer.traumaName, effect: traumaForOfficer.traumaEffect }]
            : officer.traumas,
        };
      });

      return { ...player, officers: updatedOfficers };
    });

    // ── Apply Destroyed Ship Replacement ────────────────────────────
    updatedShips = updatedShips.map(ship => {
      if (ship.isDestroyed) {
        const playerIdx = updatedPlayers.findIndex(p => p.shipId === ship.id);
        if (playerIdx !== -1) {
          const { rebuiltShip, rebuiltPlayer } = applyShipReplacement(ship, updatedPlayers[playerIdx]);
          updatedPlayers[playerIdx] = rebuiltPlayer;
          return rebuiltShip;
        }
      }
      return ship;
    });

    set(state => ({
      persistedPlayers: updatedPlayers,
      persistedShips: updatedShips,
      campaign: state.campaign
        ? {
            ...state.campaign,
            experimentalTech: autoDocResult.shouldConsume
              ? state.campaign.experimentalTech.map(tech =>
                  tech.id === 'auto-doc-override' ? { ...tech, isConsumed: true } : tech
                )
              : state.campaign.experimentalTech,
          }
        : null,
    }));
    if (finalResult.traumasGained.length > 0) {
      fireToast({ type: 'warning', message: `${finalResult.traumasGained.length} officer(s) gained Trauma` });
    }
    if (preventedTrauma) {
      fireToast({ type: 'tech', message: `Auto-Doc Override prevented trauma for ${preventedTrauma.officerId}` });
    }

    get().pushCampaignLog({
      type: 'resource',
      message: 'Executed post-combat review',
      outcome: `${summarizePostCombatResult(finalResult)}${preventedTrauma ? ' Auto-Doc Override prevented one trauma case.' : ''}`,
      details: {
        traumasGained: finalResult.traumasGained.length,
        scarsGained: finalResult.scarsGained.length,
        scarsApplied: finalResult.scarsGained.map(s => ({ name: s.scarName, fromCriticalId: s.fromCritId })),
        autoDocPrevented: preventedTrauma?.officerId ?? null,
      },
    });

    return {
      ...finalResult,
      victory: campaign.lastCombatVictory ?? false,
      reason: campaign.lastCombatReason ?? 'Combat terminated.',
    };
  },

  convertFleetFavorToRP: (amount) => {
    const { campaign } = get();
    if (!campaign) return null;
    if (!['sectorMap', 'postCombat'].includes(campaign.campaignPhase)) return null;

    const conversion = convertFleetFavorToRPEngine(campaign.fleetFavor, amount);
    if (conversion.ffSpent <= 0) return null;

    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            requisitionPoints: state.campaign.requisitionPoints + conversion.rpGained,
            fleetFavor: conversion.remainingFleetFavor,
          }
        : null,
    }));

    fireToast({ type: 'rp-gain', message: `Converted ${conversion.ffSpent} FF into +${conversion.rpGained} RP` });
    get().pushCampaignLog({
      type: 'resource',
      message: 'Converted Fleet Favor',
      outcome: `${conversion.ffSpent} FF converted into +${conversion.rpGained} RP.`,
      details: {
        ffConverted: conversion.ffSpent,
        rpGained: conversion.rpGained,
        remainingFleetFavor: conversion.remainingFleetFavor,
      },
    });

    return conversion;
  },

  finishPostCombat: () => {
    const { campaign } = get();
    if (!campaign) return;

    if (campaign.isGameOver) {
      set(state => ({
        campaign: state.campaign ? { ...state.campaign, campaignPhase: 'gameOver' } : null
      }));
      get().pushCampaignLog({
        type: 'system',
        message: 'Campaign Terminated',
        outcome: campaign.victory ? 'War Council successful.' : 'Fleet assets depleted or mission objectives failed.',
      });
      return;
    }

    set(state => ({
      campaign: state.campaign ? { ...state.campaign, campaignPhase: 'sectorMap' } : null
    }));
    get().pushCampaignLog({
      type: 'system',
      message: 'Returned to sector map',
      outcome: 'After-action review closed. Fleet ready for next navigation order.',
    });
  },

  // ── Node Selection ─────────────────────────────────────────────
  selectNode: (nodeId) => {
    const { campaign, sectorMap } = get();
    if (!campaign || !sectorMap) return;

    const currentNode = sectorMap.nodes.find(n => n.id === campaign.currentNodeId);
    if (!currentNode) return;

    const children = currentNode.paths;
    const grandchildren = children.flatMap(childId => {
      const child = sectorMap.nodes.find(n => n.id === childId);
      return child?.paths ?? [];
    });

    const isChild = children.includes(nodeId);
    const isGrandchild = grandchildren.includes(nodeId);

    // Enforce forward-only movement, allowing 2-step jump if canSkipNode is true
    if (!isChild && (!campaign.canSkipNode || !isGrandchild)) {
      console.warn(`[Campaign] Node ${nodeId} is not a valid path from ${campaign.currentNodeId}`);
      return;
    }

    const targetNode = sectorMap.nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const usedSkip = isGrandchild && !isChild;

    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            currentNodeId: nodeId,
            visitedNodeIds: [...state.campaign.visitedNodeIds, nodeId],
            canSkipNode: usedSkip ? false : state.campaign.canSkipNode,
            campaignPhase: 'nodeResolution',
          }
        : null,
    }));

    get().pushCampaignLog({
      type: 'navigation',
      message: `Plotted jump to ${getNodeLabel(targetNode.type)}`,
      outcome: `${usedSkip ? 'Executed skip jump and bypassed an intermediate node. ' : ''}Fleet arrived at layer ${targetNode.layer} and is awaiting node resolution.`,
      details: {
        fromNodeId: currentNode.id,
        toNodeId: targetNode.id,
        nodeType: targetNode.type,
        usedSkip,
      },
    });
  },

  // ── Event Resolution ───────────────────────────────────────────
  resolveEvent: (optionId, diceRoll) => {
    const { campaign, sectorMap } = get();
    if (!campaign || !sectorMap) return null;

    const currentNode = sectorMap.nodes.find(n => n.id === campaign.currentNodeId);
    if (!currentNode || currentNode.type !== NodeType.Event) return null;

    // Use the event ID pre-assigned to the node during map generation
    const eventId = currentNode.eventId!;
    const event = getEventById(eventId);
    const selectedOption = event?.options.find(option => option.id === optionId);
    const ownedTechIds = campaign.experimentalTech.map(t => t.id);
    if (!selectedOption) return null;

    const requirementContext = buildEventRequirementContext({
      players: get().persistedPlayers,
      ownedTechIds,
      requisitionPoints: campaign.requisitionPoints,
      fleetFavor: campaign.fleetFavor,
    });
    const availability = getEventOptionAvailability(selectedOption, requirementContext);
    if (!availability.visible || !availability.enabled) {
      console.warn(`[Campaign] Event option ${optionId} is not currently available.`);
      return null;
    }

    const resolution = resolveEventOption(
      eventId,
      optionId,
      diceRoll,
      ownedTechIds,
      availability.autoSuccess
    );

    let applied: any = null;
    set(state => {
      if (!state.campaign) return state;
      let revealedNodes = [...state.campaign.revealedNodeIds];
      applied = applyEventResolution({
        resolution,
        requisitionPoints: state.campaign.requisitionPoints,
        fleetFavor: state.campaign.fleetFavor,
        experimentalTech: state.campaign.experimentalTech,
        nextCombatModifiers: state.campaign.nextCombatModifiers,
        canSkipNode: state.campaign.canSkipNode,
        persistedPlayers: state.persistedPlayers,
        persistedShips: state.persistedShips,
        stashedWeapons: state.campaign.stashedWeapons,
        stashedSubsystems: state.campaign.stashedSubsystems,
        pendingEconomicBuffs: state.campaign.pendingEconomicBuffs,
      });

      if (shouldRevealEliteAndEventNodes(applied.experimentalTech)) {
        sectorMap.nodes.forEach(node => {
          if (node.type === NT.Elite || node.type === NT.Event) {
            revealedNodes.push(node.id);
          }
        });
      }

      return {
        persistedPlayers: applied.persistedPlayers,
        persistedShips: applied.persistedShips,
        campaign: {
          ...state.campaign,
          requisitionPoints: applied.requisitionPoints,
          fleetFavor: applied.fleetFavor,
          experimentalTech: applied.experimentalTech,
          nextCombatModifiers: applied.nextCombatModifiers,
          canSkipNode: applied.canSkipNode,
          revealedNodeIds: Array.from(new Set(revealedNodes)),
          stashedWeapons: applied.stashedWeapons,
          stashedSubsystems: applied.stashedSubsystems,
          pendingEconomicBuffs: applied.pendingEconomicBuffs,
          campaignPhase: applied.fleetFavor <= -5 ? 'gameOver' : (resolution.transformsToCombat ? 'nodeResolution' : 'sectorMap'),
          isGameOver: state.campaign.isGameOver || applied.fleetFavor <= -5,
          victory: (state.campaign.isGameOver || applied.fleetFavor <= -5) ? state.campaign.victory : null,
        },
      };
    });

    if (applied && applied.fleetFavor <= -5) {
      useGameStore.setState({
        gameOver: true,
        victory: false,
        gameOverReason: 'Fleet Favor dropped to -5. The High Command has relieved you of duty and terminated the expedition.',
        phase: 'gameOver'
      });
    }

    // Fire toasts for removed scars
    if (applied && applied.clearedScars) {
      applied.clearedScars.forEach((s: any) => {
        fireToast({ type: 'tech', message: `Scar Removed: ${s.scarName} on ${s.shipName}` });
        get().pushCampaignLog({
          type: 'system',
          message: `Scar Removed: ${s.scarName}`,
          outcome: `Fleet engineering successfully mitigated the persistent effects of the ${s.scarName} on the ${s.shipName}.`,
        });
      });
    }

    // Fire toasts for resource changes
    const prevRP = get().campaign?.requisitionPoints ?? 0;
    const prevFF = get().campaign?.fleetFavor ?? 0;
    for (const effect of resolution.effectsApplied) {
      if (effect.type === 'rp' && (effect.value ?? 0) !== 0) {
        const v = effect.value ?? 0;
        fireToast({ type: v > 0 ? 'rp-gain' : 'rp-loss', message: `${v > 0 ? '+' : ''}${v} Requisition Points` });
      }
      if (effect.type === 'ff' && (effect.value ?? 0) !== 0) {
        const v = effect.value ?? 0;
        fireToast({ type: v > 0 ? 'ff-gain' : 'ff-loss', message: `${v > 0 ? '+' : ''}${v} Fleet Favor` });
      }
      if (effect.type === 'trauma') {
        fireToast({ type: 'warning', message: `Officer gained Trauma!` });
      }
      if (effect.type === 'scar') {
        fireToast({ type: 'warning', message: `Ship gained a Scar!` });
      }
      if (effect.type === 'destroyWeapon') {
        fireToast({ type: 'warning', message: `Weapon Destroyed!` });
      }
      if (effect.type === 'grantWeapon' && effect.weaponId) {
        const weapon = getWeaponById(effect.weaponId);
        fireToast({ type: 'tech', message: `Recovered Weapon: ${weapon?.name ?? effect.weaponId}` });
      }
      if (effect.type === 'grantSubsystem' && effect.subsystemId) {
        const subsystem = getSubsystemById(effect.subsystemId);
        fireToast({ type: 'tech', message: `Recovered Subsystem: ${subsystem?.name ?? effect.subsystemId}` });
      }
      if (effect.type === 'nextStoreDiscount' && (effect.value ?? 0) > 0) {
        fireToast({ type: 'tech', message: `Next Haven Discount: ${effect.value}%` });
      }
      if (effect.type === 'freeRepairAtNextStation') {
        fireToast({ type: 'tech', message: 'Free repair queued for next haven' });
      }
      if (effect.type === 'officerUpgrade') {
        fireToast({ type: 'rp-gain', message: `Officer Promoted!` });
      }
      if (effect.type === 'subsystemSlotReduction' || effect.type === 'maxHullReduction' || effect.type === 'maxCTReduction') {
        fireToast({ type: 'warning', message: `Permanent Stat Reduction!` });
      }
    }
    for (const techId of resolution.techAwarded ?? []) {
      const t = getTechById(techId);
      if (t) fireToast({ type: 'tech', message: `Acquired: ${t.name}` });
    }

    get().pushCampaignLog({
      type: 'event',
      message: `Resolved event: ${event?.title ?? eventId}${selectedOption ? ` - ${selectedOption.label}` : ''}`,
      outcome: summarizeEventResolution(resolution),
      details: {
        eventId,
        optionId,
        roll: resolution.roll,
        rolledGood: resolution.rolledGood,
        effectsApplied: resolution.effectsApplied,
        techAwarded: resolution.techAwarded ?? [],
        grantedWeapons: resolution.grantedWeapons ?? [],
        grantedSubsystems: resolution.grantedSubsystems ?? [],
      },
    });

    return resolution;
  },

  // ── Drydock ────────────────────────────────────────────────────
  enterDrydock: () => {
    const { campaign } = get();
    const techOffer = campaign ? drawRandomTech(campaign.experimentalTech.map(tech => tech.id))?.id ?? null : null;
    const market = {
      ...generateMarketInventory(),
      techOffer,
    };
    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            campaignPhase: 'drydock',
            drydockMarket: market,
            pendingEconomicBuffs: {
              ...state.campaign.pendingEconomicBuffs,
              freeRepairConsumed: false,
            },
          }
        : null,
    }));
    get().pushCampaignLog({
      type: 'system',
      message: 'Entered hidden drydock',
      outcome: `War Council opened with ${market.weapons.length} weapon listings and ${market.subsystems.length} subsystem listings available${market.techOffer ? ', plus one experimental tech lead' : ''}.`,
      details: {
        weaponOffers: market.weapons.length,
        subsystemOffers: market.subsystems.length,
        techOffer: market.techOffer,
      },
    });
  },

  completeDrydock: () => {
    const { campaign } = get();
    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            campaignPhase: 'sectorMap',
            drydockMarket: null,
            pendingEconomicBuffs: {
              nextStoreDiscountPercent: 0,
              freeRepairAtNextStation: false,
              freeRepairConsumed: false,
            },
          }
        : null,
    }));
    if (campaign) {
      get().pushCampaignLog({
        type: 'system',
        message: 'Concluded War Council',
        outcome: `Drydock operations complete. Fleet departed with ${campaign.requisitionPoints} RP remaining before final ledger updates.`,
        details: {
          remainingRP: campaign.requisitionPoints,
          stashedWeapons: campaign.stashedWeapons.length,
          stashedSubsystems: campaign.stashedSubsystems.length,
        },
      });
    }
  },

  purchaseHullPatch: (shipId) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;

    const hasSmugglerManifest = get().hasTech('smugglers-manifest');
    const freeRepair = campaign.pendingEconomicBuffs.freeRepairAtNextStation && !campaign.pendingEconomicBuffs.freeRepairConsumed;
    const result = purchaseHullPatch({
      shipId, currentHull: ship.currentHull, maxHull: ship.maxHull,
      currentRP: freeRepair ? Number.MAX_SAFE_INTEGER : campaign.requisitionPoints, hasSmugglerManifest,
    });

    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }
    const rpDelta = freeRepair ? 0 : result.rpDelta;

    set(state => ({
      campaign: state.campaign ? {
        ...state.campaign,
        requisitionPoints: state.campaign.requisitionPoints + rpDelta,
        pendingEconomicBuffs: freeRepair
          ? { ...state.campaign.pendingEconomicBuffs, freeRepairConsumed: true }
          : state.campaign.pendingEconomicBuffs,
      } : null,
      persistedShips: state.persistedShips.map(s =>
        s.id === shipId ? { ...s, currentHull: Math.min(s.maxHull, s.currentHull + 1) } : s
      ),
    }));
    fireToast({ type: freeRepair ? 'tech' : 'rp-loss', message: freeRepair ? 'Free Hull Patch Used' : `Hull Patch: ${rpDelta} RP` });
    get().pushCampaignLog({
      type: 'repair',
      message: `Ordered hull patch for ${ship.name}`,
      outcome: freeRepair
        ? `Restored 1 hull point using the free repair benefit. Integrity now ${Math.min(ship.maxHull, ship.currentHull + 1)}/${ship.maxHull}.`
        : `Restored 1 hull point for ${-rpDelta} RP. Integrity now ${Math.min(ship.maxHull, ship.currentHull + 1)}/${ship.maxHull}.`,
      details: {
        shipId,
        rpDelta,
        hullBefore: ship.currentHull,
        hullAfter: Math.min(ship.maxHull, ship.currentHull + 1),
        freeRepair,
      },
    });
  },

  scrapItem: (shipId, slotIndex, isWeapon) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;
    const itemId = isWeapon ? ship.equippedWeapons[slotIndex] : ship.equippedSubsystems[slotIndex];
    const result = scrapItem({ shipId, slotIndex, isWeapon, currentRP: campaign.requisitionPoints });

    set(state => ({
      campaign: state.campaign ? { ...state.campaign, requisitionPoints: state.campaign.requisitionPoints + result.rpDelta } : null,
      persistedShips: state.persistedShips.map(s => {
        if (s.id !== shipId) return s;
        if (isWeapon) {
          const weapons = [...s.equippedWeapons];
          weapons[slotIndex] = null;
          return { ...s, equippedWeapons: weapons };
        } else {
          const subs = [...s.equippedSubsystems];
          subs[slotIndex] = null;
          return { ...s, equippedSubsystems: subs };
        }
      }),
    }));
    get().pushCampaignLog({
      type: 'market',
      message: `Scrapped ${isWeapon ? 'weapon' : 'subsystem'} from ${ship.name}`,
      outcome: `Recovered ${result.rpDelta} RP from slot ${slotIndex + 1}${itemId ? ` after removing ${itemId}` : ''}.`,
      details: {
        shipId,
        slotIndex,
        isWeapon,
        itemId,
        rpDelta: result.rpDelta,
      },
    });
  },

  purchasePsychEval: (officerId, shipId) => {
    const { campaign, persistedPlayers } = get();
    if (!campaign) return;
    const player = persistedPlayers.find(p => p.shipId === shipId);
    const officer = player?.officers.find(o => o.officerId === officerId);
    if (!officer) return;

    const freeRepair = campaign.pendingEconomicBuffs.freeRepairAtNextStation && !campaign.pendingEconomicBuffs.freeRepairConsumed;
    const result = purchasePsychEval({
      officerId,
      shipId,
      traumas: officer.traumas,
      currentRP: freeRepair ? Number.MAX_SAFE_INTEGER : campaign.requisitionPoints,
    });
    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }
    const rpDelta = freeRepair ? 0 : result.rpDelta;

    const removedTraumaId = result.mutations[0]?.itemId;
    set(state => ({
      campaign: state.campaign ? {
        ...state.campaign,
        requisitionPoints: state.campaign.requisitionPoints + rpDelta,
        pendingEconomicBuffs: freeRepair
          ? { ...state.campaign.pendingEconomicBuffs, freeRepairConsumed: true }
          : state.campaign.pendingEconomicBuffs,
      } : null,
      persistedPlayers: state.persistedPlayers.map(p => ({
        ...p,
        officers: p.officers.map(o =>
          o.officerId === officerId
            ? { ...o, traumas: o.traumas.filter(t => t.id !== removedTraumaId) }
            : o
        ),
      })),
    }));
    fireToast({ type: freeRepair ? 'tech' : 'rp-loss', message: freeRepair ? 'Free Repair Used: Psych Eval' : `Psych Eval: ${rpDelta} RP` });
    get().pushCampaignLog({
      type: 'officer',
      message: `Authorized psych evaluation for ${officer.station.toUpperCase()} officer`,
      outcome: freeRepair
        ? `Removed trauma case ${removedTraumaId ?? 'unknown'} using the free repair benefit aboard ship ${shipId}.`
        : `Removed trauma case ${removedTraumaId ?? 'unknown'} for ${-rpDelta} RP aboard ship ${shipId}.`,
      details: {
        officerId,
        shipId,
        traumaRemoved: removedTraumaId,
        rpDelta,
        freeRepair,
      },
    });
  },

  purchaseDeepRepair: (shipId, scarId) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;
    const scar = ship.scars.find(entry => entry.id === scarId);

    const freeRepair = campaign.pendingEconomicBuffs.freeRepairAtNextStation && !campaign.pendingEconomicBuffs.freeRepairConsumed;
    const result = purchaseDeepRepair({
      shipId,
      scars: ship.scars,
      scarId,
      currentRP: freeRepair ? Number.MAX_SAFE_INTEGER : campaign.requisitionPoints,
    });
    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }
    const rpDelta = freeRepair ? 0 : result.rpDelta;

    set(state => ({
      campaign: state.campaign ? {
        ...state.campaign,
        requisitionPoints: state.campaign.requisitionPoints + rpDelta,
        pendingEconomicBuffs: freeRepair
          ? { ...state.campaign.pendingEconomicBuffs, freeRepairConsumed: true }
          : state.campaign.pendingEconomicBuffs,
      } : null,
      persistedShips: state.persistedShips.map(s =>
        s.id === shipId ? { ...s, scars: s.scars.filter(sc => sc.id !== scarId) } : s
      ),
    }));
    get().pushCampaignLog({
      type: 'repair',
      message: `Ordered deep repair for ${ship.name}`,
      outcome: freeRepair
        ? `Removed scar ${scar?.name ?? scarId} using the free repair benefit.`
        : `Removed scar ${scar?.name ?? scarId} for ${-rpDelta} RP.`,
      details: {
        shipId,
        scarId,
        scarName: scar?.name,
        scarFromCriticalId: scar?.fromCriticalId,
        rpDelta,
        freeRepair,
      },
    });
  },

  purchaseOfficerTraining: (officerId, shipId) => {
    const { campaign, persistedPlayers } = get();
    if (!campaign) return;
    const player = persistedPlayers.find(p => p.shipId === shipId);
    const officer = player?.officers.find(o => o.officerId === officerId);
    if (!officer) return;

    const result = purchaseOfficerTraining({ officerId, shipId, currentTier: officer.currentTier, currentRP: campaign.requisitionPoints });
    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }

    const mutation = result.mutations[0];
    set(state => ({
      campaign: state.campaign ? { ...state.campaign, requisitionPoints: state.campaign.requisitionPoints + result.rpDelta } : null,
      persistedPlayers: state.persistedPlayers.map(p => ({
        ...p,
        officers: p.officers.map(o =>
          o.officerId === officerId && mutation.toTier
            ? { ...o, currentTier: mutation.toTier }
            : o
        ),
      })),
    }));
    fireToast({ type: 'rp-loss', message: `Officer Training: ${result.rpDelta} RP` });
    get().pushCampaignLog({
      type: 'officer',
      message: `Funded officer training for ${officer.station.toUpperCase()} officer`,
      outcome: `Advanced from ${officer.currentTier.toUpperCase()} to ${(mutation.toTier ?? officer.currentTier).toUpperCase()} for ${-result.rpDelta} RP.`,
      details: {
        officerId,
        shipId,
        fromTier: officer.currentTier,
        toTier: mutation.toTier,
        rpDelta: result.rpDelta,
      },
    });
  },

  purchaseMarketItem: (itemId, shipId, isWeapon, slotIndex) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;
    const itemName = isWeapon ? (getWeaponById(itemId)?.name ?? itemId) : (getSubsystemById(itemId)?.name ?? itemId);
    const discountPercent = campaign.pendingEconomicBuffs.nextStoreDiscountPercent;

    const result = purchaseMarketItemFn({
      itemId,
      itemType: isWeapon ? 'weapon' : 'subsystem',
      shipId,
      slotIndex,
      currentRP: campaign.requisitionPoints,
    });

    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }
    const discountedDelta = discountPercent > 0
      ? -Math.max(0, Math.floor((-result.rpDelta) * (100 - discountPercent) / 100))
      : result.rpDelta;

    set(state => ({
      campaign: state.campaign ? { ...state.campaign, requisitionPoints: state.campaign.requisitionPoints + discountedDelta } : null,
      persistedShips: state.persistedShips.map(s => {
        if (s.id !== shipId) return s;
        if (isWeapon) {
          const weapons = [...s.equippedWeapons];
          weapons[slotIndex] = itemId;
          return { ...s, equippedWeapons: weapons };
        } else {
          const subs = [...s.equippedSubsystems];
          subs[slotIndex] = itemId;
          return { ...s, equippedSubsystems: subs };
        }
      }),
    }));
    fireToast({ type: 'rp-loss', message: `Purchased: ${itemId} (${discountedDelta} RP)` });
    get().pushCampaignLog({
      type: 'market',
      message: `Purchased ${itemName}`,
      outcome: `Installed on ${ship.name} slot ${slotIndex + 1} for ${-discountedDelta} RP${discountPercent > 0 ? ` after a ${discountPercent}% haven discount` : ''}.`,
      details: {
        itemId,
        itemName,
        shipId,
        slotIndex,
        isWeapon,
        rpDelta: discountedDelta,
        discountPercent,
      },
    });
  },

  purchaseMarketTech: (techId) => {
    const { campaign } = get();
    if (!campaign || !campaign.drydockMarket?.techOffer) return;
    if (campaign.drydockMarket.techOffer !== techId) return;
    if (campaign.experimentalTech.some(tech => tech.id === techId && !tech.isConsumed)) return;

    const tech = getTechById(techId);
    if (!tech) return;

    const discountPercent = campaign.pendingEconomicBuffs.nextStoreDiscountPercent;
    const rpCost = discountPercent > 0
      ? Math.max(0, Math.floor(getMarketTechCost(techId) * (100 - discountPercent) / 100))
      : getMarketTechCost(techId);
    if (campaign.requisitionPoints < rpCost) {
      console.warn('[Drydock]', `Not enough RP for ${tech.name}`);
      return;
    }

    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            requisitionPoints: state.campaign.requisitionPoints - rpCost,
            experimentalTech: [...state.campaign.experimentalTech, tech],
            drydockMarket: state.campaign.drydockMarket
              ? { ...state.campaign.drydockMarket, techOffer: null }
              : null,
            revealedNodeIds: shouldRevealEliteAndEventNodes([...state.campaign.experimentalTech, tech]) && state.sectorMap
              ? Array.from(new Set([
                  ...state.campaign.revealedNodeIds,
                  ...state.sectorMap.nodes
                    .filter(node => node.type === NT.Elite || node.type === NT.Event)
                    .map(node => node.id),
                ]))
              : state.campaign.revealedNodeIds,
          }
        : null,
    }));

    fireToast({ type: 'tech', message: `Purchased: ${tech.name}` });
    get().pushCampaignLog({
      type: 'market',
      message: `Purchased experimental tech ${tech.name}`,
      outcome: `Recovered and secured for ${rpCost} RP${discountPercent > 0 ? ` after a ${discountPercent}% haven discount` : ''}.`,
      details: {
        techId,
        techName: tech.name,
        rpCost,
        discountPercent,
      },
    });
  },

  purchaseChassisUpgrade: (shipId, newChassisId) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;
    const previousChassisId = ship.chassisId;

    const result = purchaseChassisUpgrade({
      shipId,
      currentChassisId: ship.chassisId,
      newChassisId,
      equippedWeapons: ship.equippedWeapons,
      equippedSubsystems: ship.equippedSubsystems,
      currentRP: campaign.requisitionPoints,
      currentStashedWeapons: campaign.stashedWeapons,
      currentStashedSubsystems: campaign.stashedSubsystems,
    });

    if (!result.success) { console.warn('[Drydock]', result.failureReason); return; }

    const newChassis = getChassisById(newChassisId)!;

    // Rebuild ship state from new chassis, preserving position, facing, officers
    const keptWeapons = ship.equippedWeapons
      .slice(0, newChassis.weaponSlots)
      .concat(Array(Math.max(0, newChassis.weaponSlots - ship.equippedWeapons.length)).fill(null));
    const keptSubs = ship.equippedSubsystems
      .slice(0, newChassis.internalSlots)
      .concat(Array(Math.max(0, newChassis.internalSlots - ship.equippedSubsystems.length)).fill(null));

    const shieldVal = newChassis.shieldsPerSector;

    set(state => ({
      campaign: state.campaign ? {
        ...state.campaign,
        requisitionPoints: state.campaign.requisitionPoints + result.rpDelta,
        stashedWeapons: result.newStashedWeapons,
        stashedSubsystems: result.newStashedSubsystems,
      } : null,
      persistedShips: state.persistedShips.map(s => {
        if (s.id !== shipId) return s;
        return {
          ...s,
          chassisId: newChassisId,
          name: newChassis.className,
          maxHull: newChassis.baseHull,
          currentHull: newChassis.baseHull,
          maxShieldsPerSector: shieldVal,
          shields: { fore: shieldVal, foreStarboard: shieldVal, aftStarboard: shieldVal, aft: shieldVal, aftPort: shieldVal, forePort: shieldVal },
          armorDie: newChassis.armorDie,
          baseEvasion: newChassis.baseEvasion,
          currentSpeed: 1,
          equippedWeapons: keptWeapons,
          equippedSubsystems: keptSubs,
          criticalDamage: [],
          scars: s.scars,
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
        };
      }),
    }));

    const excessCount = result.newStashedWeapons.length - campaign.stashedWeapons.length +
      result.newStashedSubsystems.length - campaign.stashedSubsystems.length;
    fireToast({ type: 'rp-loss', message: `Chassis upgraded to ${newChassis.name}! (${result.rpDelta} RP)${ excessCount > 0 ? ` · ${excessCount} item(s) moved to stash` : '' }` });
    get().pushCampaignLog({
      type: 'market',
      message: `Commissioned chassis upgrade for ${ship.name}`,
      outcome: `Rebuilt from ${previousChassisId} to ${newChassisId} for ${-result.rpDelta} RP${excessCount > 0 ? ` and moved ${excessCount} item(s) into fleet storage` : ''}.`,
      details: {
        shipId,
        previousChassisId,
        newChassisId,
        rpDelta: result.rpDelta,
        excessCount,
      },
    });
  },

  swapStashItem: (shipId, slotIndex, itemId, isWeapon, action) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const ship = persistedShips.find(s => s.id === shipId);
    if (!ship) return;
    const itemName = isWeapon ? (getWeaponById(itemId)?.name ?? itemId) : (getSubsystemById(itemId)?.name ?? itemId);

    set(state => {
      if (!state.campaign) return state;

      let newStashedWeapons = [...state.campaign.stashedWeapons];
      let newStashedSubsystems = [...state.campaign.stashedSubsystems];

      const updatedShips = state.persistedShips.map(s => {
        if (s.id !== shipId) return s;
        if (action === 'equip') {
          // Move from stash → slot
          if (isWeapon) {
            newStashedWeapons = newStashedWeapons.filter((id, i) => !(id === itemId && i === newStashedWeapons.indexOf(itemId)));
            const weapons = [...s.equippedWeapons];
            // Stash whatever was previously in that slot
            if (weapons[slotIndex]) newStashedWeapons.push(weapons[slotIndex]!);
            weapons[slotIndex] = itemId;
            return { ...s, equippedWeapons: weapons };
          } else {
            newStashedSubsystems = newStashedSubsystems.filter((id, i) => !(id === itemId && i === newStashedSubsystems.indexOf(itemId)));
            const subs = [...s.equippedSubsystems];
            if (subs[slotIndex]) newStashedSubsystems.push(subs[slotIndex]!);
            subs[slotIndex] = itemId;
            return { ...s, equippedSubsystems: subs };
          }
        } else {
          // Move from slot → stash
          if (isWeapon) {
            newStashedWeapons.push(itemId);
            const weapons = [...s.equippedWeapons];
            weapons[slotIndex] = null;
            return { ...s, equippedWeapons: weapons };
          } else {
            newStashedSubsystems.push(itemId);
            const subs = [...s.equippedSubsystems];
            subs[slotIndex] = null;
            return { ...s, equippedSubsystems: subs };
          }
        }
      });

      return {
        persistedShips: updatedShips,
        campaign: { ...state.campaign, stashedWeapons: newStashedWeapons, stashedSubsystems: newStashedSubsystems },
      };
    });
    get().pushCampaignLog({
      type: 'market',
      message: `${action === 'equip' ? 'Equipped' : 'Stashed'} ${itemName}`,
      outcome: action === 'equip'
        ? `${ship.name} mounted the item in slot ${slotIndex + 1} from fleet storage.`
        : `${ship.name} moved the item from slot ${slotIndex + 1} into fleet storage.`,
      details: {
        shipId,
        slotIndex,
        itemId,
        itemName,
        isWeapon,
        action,
      },
    });
  },

  scrapStashedItem: (itemId, isWeapon) => {
    const { campaign } = get();
    if (!campaign) return;
    const itemName = isWeapon ? (getWeaponById(itemId)?.name ?? itemId) : (getSubsystemById(itemId)?.name ?? itemId);

    set(state => {
      if (!state.campaign) return state;
      
      const SCRAP_VALUE = 15; // Standard scrap value
      let newStashedWeapons = [...state.campaign.stashedWeapons];
      let newStashedSubsystems = [...state.campaign.stashedSubsystems];

      if (isWeapon) {
        const idx = newStashedWeapons.indexOf(itemId);
        if (idx !== -1) newStashedWeapons.splice(idx, 1);
      } else {
        const idx = newStashedSubsystems.indexOf(itemId);
        if (idx !== -1) newStashedSubsystems.splice(idx, 1);
      }

      return {
        campaign: {
          ...state.campaign,
          stashedWeapons: newStashedWeapons,
          stashedSubsystems: newStashedSubsystems,
          requisitionPoints: state.campaign.requisitionPoints + SCRAP_VALUE,
        },
      };
    });
    fireToast({ type: 'rp-gain', message: `Scrapped stashed item: +15 RP` });
    get().pushCampaignLog({
      type: 'market',
      message: `Scrapped stored ${isWeapon ? 'weapon' : 'subsystem'} ${itemName}`,
      outcome: 'Recovered +15 RP into the fleet budget.',
      details: {
        itemId,
        itemName,
        isWeapon,
        rpDelta: 15,
      },
    });
  },

  // ── Tech ───────────────────────────────────────────────────────
  acquireTech: (techId) => {
    const tech = getTechById(techId);
    if (!tech) return;
    set(state => {
      if (!state.campaign) return state;
      if (state.campaign.experimentalTech.some(t => t.id === techId)) return state; // no duplicates
      return { campaign: { ...state.campaign, experimentalTech: [...state.campaign.experimentalTech, tech] } };
    });
  },

  consumeTech: (techId) => {
    set(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            experimentalTech: state.campaign.experimentalTech.map(t =>
              t.id === techId ? { ...t, isConsumed: true } : t
            ),
          }
        : null,
    }));
  },

  // ── Boss / Sector Transition ───────────────────────────────────
  completeBossNode: () => {
    const { campaign } = get();
    if (!campaign) return;

    const transition = advanceToNextSector(campaign.currentSector);

    if (transition.campaignVictory) {
      set(state => ({
        campaign: state.campaign
          ? { ...state.campaign, campaignPhase: 'story', pendingStoryId: 'victory' }
          : null,
      }));
      get().pushCampaignLog({
        type: 'combat',
        message: `Secured Sector ${campaign.currentSector}`,
        outcome: 'Final command ship destroyed. Campaign victory declared.',
        details: {
          sector: campaign.currentSector,
          campaignVictory: true,
        },
      });
      return;
    }

    const newMap = generateSectorMap(transition.newMapSeed, 15);
    const revealedNodeIds = shouldRevealEliteAndEventNodes(campaign.experimentalTech)
      ? ['start-0', ...newMap.nodes.filter(node => node.type === NT.Elite || node.type === NT.Event).map(node => node.id)]
      : ['start-0'];
    set(state => ({
      sectorMap: newMap,
      campaign: state.campaign
        ? {
            ...state.campaign,
            currentSector: transition.newSector,
            currentNodeId: 'start-0',
            visitedNodeIds: ['start-0'],
            revealedNodeIds,
            sectorMapSeed: transition.newMapSeed,
            requisitionPoints: state.campaign.requisitionPoints + transition.rpBonus,
            nextCombatModifiers: null,
            canSkipNode: false,
            drydockMarket: null,
            pendingEconomicBuffs: {
              nextStoreDiscountPercent: 0,
              freeRepairAtNextStation: false,
              freeRepairConsumed: false,
            },
            campaignPhase: 'story',
            pendingStoryId: `sector-${transition.newSector}` as StoryBeatId,
          }
        : null,
    }));
    fireToast({ type: 'rp-gain', message: `Sector Cleared! +${transition.rpBonus} RP` });
    get().pushCampaignLog({
      type: 'resource',
      message: `Secured Sector ${campaign.currentSector}`,
      outcome: `Advanced to Sector ${transition.newSector} with +${transition.rpBonus} RP and a fresh navigation grid.`,
      details: {
        previousSector: campaign.currentSector,
        newSector: transition.newSector,
        rpBonus: transition.rpBonus,
      },
    });
  },

  // ── Story Dismissal ────────────────────────────────────────────
  dismissStory: () => {
    const { campaign } = get();
    if (!campaign || campaign.campaignPhase !== 'story') return;

    if (campaign.pendingStoryId === 'victory') {
      set(state => ({
        campaign: state.campaign
          ? { ...state.campaign, isGameOver: true, victory: true, campaignPhase: 'gameOver', pendingStoryId: null }
          : null,
      }));
      get().pushCampaignLog({
        type: 'system',
        message: 'Campaign concluded',
        outcome: 'Victory confirmed. Commander acknowledged final transmission.',
      });
    } else {
      set(state => ({
        campaign: state.campaign
          ? { ...state.campaign, campaignPhase: 'sectorMap', pendingStoryId: null }
          : null,
      }));
      get().pushCampaignLog({
        type: 'system',
        message: `Briefing acknowledged`,
        outcome: `Commander acknowledged sector briefing. Navigation grid is now active.`,
      });
    }
  },

  // ── Ship Destruction ───────────────────────────────────────────
  handleShipDestruction: (destroyedShipId) => {
    const { campaign, persistedShips } = get();
    if (!campaign) return;
    const destroyedShip = persistedShips.find(ship => ship.id === destroyedShipId);

    // Check total wipe
    const remaining = persistedShips.filter(s => s.id !== destroyedShipId);
    if (checkTotalWipe(remaining.length === 0 ? persistedShips : remaining.map(s => ({ ...s, isDestroyed: s.id === destroyedShipId ? true : s.isDestroyed })))) {
      set(state => ({
        campaign: state.campaign
          ? { ...state.campaign, isGameOver: true, victory: false, campaignPhase: 'gameOver' }
          : null,
      }));
      get().pushCampaignLog({
        type: 'combat',
        message: `Lost ${destroyedShip?.name ?? destroyedShipId} in combat`,
        outcome: 'Fleet annihilated. Campaign failure declared.',
        details: {
          destroyedShipId,
          totalWipe: true,
        },
      });
      return;
    }

    // Note: The actual replacement of the ship with a starter Vanguard happens during `executePostCombat`.
    // The combat engine sets `isDestroyed: true`, which triggers the replacement logic when transitioning back to the campaign map.
    console.warn(`[Campaign] Ship ${destroyedShipId} destroyed. Replacement will be issued during Post-Combat phase.`);
    get().pushCampaignLog({
      type: 'combat',
      message: `Lost ${destroyedShip?.name ?? destroyedShipId} in combat`,
      outcome: 'Fleet survived the engagement. Replacement hull will be issued during post-combat recovery.',
      details: {
        destroyedShipId,
        totalWipe: false,
      },
    });
  },

  // ── Selectors ─────────────────────────────────────────────────
  getOwnedTechIds: () => {
    const { campaign } = get();
    return campaign?.experimentalTech.filter(t => !t.isConsumed).map(t => t.id) ?? [];
  },

  hasTech: (id) => {
    const { campaign } = get();
    return campaign?.experimentalTech.some(t => t.id === id && !t.isConsumed) ?? false;
  },
}));

