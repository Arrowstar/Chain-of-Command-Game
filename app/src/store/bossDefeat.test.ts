import { beforeEach, describe, expect, it } from 'vitest';
import { NodeType } from '../engine/mapGenerator';
import { useCampaignStore } from './useCampaignStore';
import { useGameStore } from './useGameStore';

describe('Boss or Bust Campaign Logic', () => {
  beforeEach(() => {
    // Reset stores
    useGameStore.getState().resetGame();
    useCampaignStore.setState({
      campaign: {
        currentSector: 1,
        currentNodeId: 'node-boss',
        sectorMapSeed: 1,
        visitedNodeIds: [],
        revealedNodeIds: [],
        requisitionPoints: 100,
        fleetFavor: 0,
        experimentalTech: [],
        campaignPhase: 'nodeResolution',
        fleetAdmiralPlayerId: 'p1',
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
        difficulty: 'normal',
        dpBudget: 100,
        pendingStoryId: null,
      },
      sectorMap: {
        nodes: [
          { id: 'node-boss', type: NodeType.Boss, layer: 15, x: 0, y: 0 },
          { id: 'node-normal', type: NodeType.Combat, layer: 5, x: 0, y: 0 }
        ],
        paths: [],
      } as any,
      persistedPlayers: [],
      persistedShips: [],
      officerDataMap: {},
      campaignLog: [],
    });
  });

  it('triggers campaign failure immediately when a Boss mission is lost, even with positive FF', () => {
    useCampaignStore.getState().onCombatEnd({
      players: [],
      ships: [],
      earnedFF: 0, // No FF penalty, but we still lost
      victory: false,
      reason: 'Mission Failed'
    });

    const campaign = useCampaignStore.getState().campaign;
    expect(campaign?.isGameOver).toBe(true);
    expect(campaign?.victory).toBe(false);
    expect(campaign?.campaignPhase).toBe('postCombat'); // Still go through postCombat for review
    expect(campaign?.lastCombatReason).toContain('SECTOR COMMAND FAILURE');

    // Proceed to final game over screen
    useCampaignStore.getState().finishPostCombat();
    expect(useCampaignStore.getState().campaign?.campaignPhase).toBe('gameOver');
  });

  it('allows progression when a Boss mission is won', () => {
    useCampaignStore.getState().onCombatEnd({
      players: [],
      ships: [],
      earnedFF: 1,
      victory: true,
      reason: 'Objective Secured'
    });

    const campaign = useCampaignStore.getState().campaign;
    expect(campaign?.isGameOver).toBe(false);
    expect(campaign?.victory).toBe(true); // Marked as won
    expect(campaign?.campaignPhase).toBe('postCombat');

    // Proceed to next sector
    useCampaignStore.getState().completeBossNode();
    expect(useCampaignStore.getState().campaign?.currentSector).toBe(2);
    expect(useCampaignStore.getState().campaign?.campaignPhase).toBe('story');
  });

  it('does NOT trigger campaign failure when a normal mission is lost if FF is still safe', () => {
    useCampaignStore.setState(state => ({
      campaign: state.campaign ? { ...state.campaign, currentNodeId: 'node-normal' } : null
    }));

    useCampaignStore.getState().onCombatEnd({
      players: [],
      ships: [],
      earnedFF: -1,
      victory: false,
      reason: 'Tactical Retreat'
    });

    const campaign = useCampaignStore.getState().campaign;
    expect(campaign?.isGameOver).toBe(false);
    expect(campaign?.victory).toBe(null); // Not a campaign loss yet
    expect(campaign?.campaignPhase).toBe('postCombat');

    useCampaignStore.getState().finishPostCombat();
    expect(useCampaignStore.getState().campaign?.campaignPhase).toBe('sectorMap');
  });
});
