import { beforeEach, describe, expect, it } from 'vitest';
import { NodeType } from '../engine/mapGenerator';
import { useCampaignStore } from './useCampaignStore';
import type { PlayerState, ShipState } from '../types/game';

function makeShip(id: string): ShipState {
  return {
    id,
    name: id,
    chassisId: 'vanguard',
    ownerId: 'p1',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 0,
    currentHull: 3,
    maxHull: 3,
    shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    maxShieldsPerSector: 0,
    equippedWeapons: [],
    equippedSubsystems: [],
    criticalDamage: [],
    scars: [],
    armorDie: 'd6',
    baseEvasion: 5,
    evasionModifiers: 0,
    isDestroyed: false,
    hasDroppedBelow50: false,
    hasDrifted: false,
    targetLocks: [],
  };
}

function makePlayer(shipId: string): PlayerState {
  return {
    id: 'p1',
    name: 'Player 1',
    shipId,
    commandTokens: 0,
    maxCommandTokens: 5,
    assignedActions: [],
    officers: [],
  };
}

describe('useCampaignStore event resolution', () => {
  beforeEach(() => {
    useCampaignStore.setState({
      campaign: {
        currentSector: 1,
        currentNodeId: 'node-event',
        sectorMapSeed: 1,
        visitedNodeIds: [],
        revealedNodeIds: [],
        requisitionPoints: 0,
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
      },
      sectorMap: {
        nodes: [{ id: 'node-event', type: NodeType.Event, layer: 1, x: 0, y: 0, eventId: 'event-21' }],
        paths: [],
      } as any,
      persistedPlayers: [makePlayer('s1')],
      persistedShips: [makeShip('s1')],
      officerDataMap: {},
      campaignLog: [],
    });
  });

  it('keeps combat-transform events in node resolution and stores modifiers for immediate combat', () => {
    const resolution = useCampaignStore.getState().resolveEvent('ambush');
    const state = useCampaignStore.getState();

    expect(resolution?.transformsToCombat).toBe(true);
    expect(state.campaign?.campaignPhase).toBe('nodeResolution');
    expect(state.campaign?.nextCombatModifiers?.enemyShieldsZeroRound1).toBe(true);
    expect(state.campaign?.nextCombatModifiers?.playerActsFirst).toBe(true);
  });

  it('marks ships destroyed when event hull damage reduces them to zero', () => {
    useCampaignStore.setState(state => ({
      campaign: state.campaign
        ? { ...state.campaign, currentNodeId: 'node-damage' }
        : null,
      sectorMap: {
        nodes: [{ id: 'node-damage', type: NodeType.Event, layer: 1, x: 0, y: 0, eventId: 'event-14' }],
        paths: [],
      } as any,
      persistedShips: [{ ...makeShip('s1'), currentHull: 3, maxHull: 3 }],
    }));

    useCampaignStore.getState().resolveEvent('hack-mainframe', 1);
    const ship = useCampaignStore.getState().persistedShips[0];

    expect(ship.currentHull).toBe(0);
    expect(ship.isDestroyed).toBe(true);
  });

  it('converts only the chosen amount of positive Fleet Favor into RP on the campaign map', () => {
    useCampaignStore.setState(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            campaignPhase: 'sectorMap',
            requisitionPoints: 5,
            fleetFavor: 4,
          }
        : null,
    }));

    const result = useCampaignStore.getState().convertFleetFavorToRP(3);
    const campaign = useCampaignStore.getState().campaign;

    expect(result?.ffSpent).toBe(3);
    expect(result?.rpGained).toBe(30);
    expect(campaign?.requisitionPoints).toBe(35);
    expect(campaign?.fleetFavor).toBe(1);
  });

  it('advances to Sector 2 and resets the map when completeBossNode is called in Sector 1', () => {
    const oldSeed = 123;
    useCampaignStore.setState(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            currentSector: 1,
            currentNodeId: 'boss-node',
            sectorMapSeed: oldSeed,
            campaignPhase: 'postCombat',
          }
        : null,
    }));

    useCampaignStore.getState().completeBossNode();
    const state = useCampaignStore.getState();

    expect(state.campaign?.currentSector).toBe(2);
    expect(state.campaign?.currentNodeId).toBe('start-0');
    expect(state.campaign?.campaignPhase).toBe('sectorMap');
    expect(state.campaign?.sectorMapSeed).not.toBe(oldSeed);
    expect(state.sectorMap).toBeDefined();
    expect(state.sectorMap?.nodes[0].id).toBe('start-0');
  });

  it('triggers campaign victory when completeBossNode is called in Sector 3', () => {
    useCampaignStore.setState(state => ({
      campaign: state.campaign
        ? {
            ...state.campaign,
            currentSector: 3,
            currentNodeId: 'boss-node',
            campaignPhase: 'postCombat',
          }
        : null,
    }));

    useCampaignStore.getState().completeBossNode();
    const state = useCampaignStore.getState();

    expect(state.campaign?.isGameOver).toBe(true);
    expect(state.campaign?.victory).toBe(true);
    expect(state.campaign?.campaignPhase).toBe('gameOver');
  });

  it('correctly identifies a Boss node for transition logic', () => {
    useCampaignStore.setState(state => ({
      campaign: state.campaign ? { ...state.campaign, currentNodeId: 'boss-node' } : null,
      sectorMap: {
        nodes: [{ id: 'boss-node', type: NodeType.Boss, layer: 15, x: 0, y: 0 }],
        paths: [],
      } as any,
    }));

    const state = useCampaignStore.getState();
    const currentNode = state.sectorMap?.nodes.find(n => n.id === state.campaign?.currentNodeId);
    expect(currentNode?.type).toBe(NodeType.Boss);
  });
});
