import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorMapView from './SectorMapView';
import { useCampaignStore } from '../../store/useCampaignStore';
import { generateSectorMap } from '../../engine/mapGenerator';
import type { PlayerState, ShipState } from '../../types/game';
import { getOfficerById } from '../../data/officers';

// Mock innerWidth to ensure deterministic SVG coordinates in test
vi.stubGlobal('innerWidth', 1000);

describe('SectorMapView', () => {
  it('renders the SVG map based on generated logic', () => {
    // Seed the campaign store with a generated map and campaign state
    // so the component doesn't early-return null
    const sectorMap = generateSectorMap(42, 15);

    const players: PlayerState[] = [{
      id: 'p1',
      name: 'Commander Hale',
      shipId: 'ship-1',
      officers: [
        { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
        { officerId: 'vane', station: 'tactical', currentStress: 4, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
        { officerId: 'obannon', station: 'engineering', currentStress: 1, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [{ id: 'shaken', name: 'Shaken', effect: 'A lingering trauma.' }], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
        { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
      ],
      commandTokens: 0,
      maxCommandTokens: 3,
      assignedActions: [],
    }];

    const ships: ShipState[] = [{
      id: 'ship-1',
      name: 'ISS Resolute',
      chassisId: 'vanguard',
      ownerId: 'p1',
      position: { q: 0, r: 0 },
      facing: 0,
      currentSpeed: 0,
      currentHull: 4,
      maxHull: 6,
      shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
      maxShieldsPerSector: 2,
      equippedWeapons: ['plasma-battery', 'heavy-railgun'],
      equippedSubsystems: ['ecm', 'auto-loader'],
      criticalDamage: [{ id: 'crit-1', name: 'Engine Fire', effect: 'Bad', isRepaired: false }],
      scars: [{ id: 'scar-1', name: 'Scorched Thrusters', effect: 'Max speed reduced by 1.', fromCriticalId: 'thrusters-offline' }],
      armorDie: 'd6',
      baseEvasion: 8,
      evasionModifiers: 0,
      isDestroyed: false,
      hasDroppedBelow50: false,
      hasDrifted: false,
      targetLocks: [],
    }];

    useCampaignStore.setState({
      sectorMap,
      campaign: {
        currentSector: 1,
        currentNodeId: 'start-0',
        visitedNodeIds: ['start-0'],
        revealedNodeIds: ['start-0'],
        sectorMapSeed: 42,
        campaignPhase: 'sectorMap',
        fleetFavor: 0,
        requisitionPoints: 0,
        experimentalTech: [],
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
        dpBudget: 120,
      } as any,
      persistedPlayers: players,
      persistedShips: ships,
      officerDataMap: {},
    });

    const { container } = render(<SectorMapView />);
    
    // Basic structural checks
    expect(screen.getByText('SECTOR MAP')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-status-rail')).toBeInTheDocument();
    expect(screen.getByText('Commander Hale')).toBeInTheDocument();
    expect(screen.getByText('ISS Resolute')).toBeInTheDocument();
    expect(screen.getByText('1 Scar')).toBeInTheDocument();
    expect(screen.getByText('1 Crit')).toBeInTheDocument();
    expect(screen.getByText('1 Trauma')).toBeInTheDocument();
    expect(screen.getByText('Lt. "Slick" Jones')).toBeInTheDocument();
    expect(screen.getAllByText('VETERAN').length).toBeGreaterThan(0);
    expect(screen.getByText('HOT')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.queryByText('IMM')).not.toBeInTheDocument();
    expect(screen.getByText('1 Trauma')).toHaveAttribute('title', expect.stringContaining('Officer trauma:'));
    expect(screen.getByText('2 Crew Risk')).toHaveAttribute('title', expect.stringContaining('Crew at risk:'));
    expect(screen.getByTestId('fleet-loadout-ship-1')).toBeInTheDocument();
    expect(screen.getByTestId('fleet-loadout-image-ship-1')).toBeInTheDocument();
    expect(screen.getByText('W1')).toHaveAttribute('title', expect.stringContaining('Mark IV Plasma Battery'));
    expect(screen.getByText('S1')).toHaveAttribute('title', expect.stringContaining('Electronic Countermeasures'));

    // There should be node circles rendered
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(0);
    
    // Expect start node to be in the DOM (data-testid is `node-{id}`)
    expect(container.querySelector('[data-testid="node-start-0"]')).not.toBeNull();

    // Expect boss node to be present
    const bossNode = container.querySelector('[data-testid^="node-boss-"]');
    expect(bossNode).not.toBeNull();
    
    const lines = container.querySelectorAll('line');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('shows IMM only for stress-immune officers', () => {
    const sectorMap = generateSectorMap(99, 15);

    useCampaignStore.setState({
      sectorMap,
      campaign: {
        currentSector: 1,
        currentNodeId: 'start-0',
        visitedNodeIds: ['start-0'],
        revealedNodeIds: ['start-0'],
        sectorMapSeed: 99,
        campaignPhase: 'sectorMap',
        fleetFavor: 0,
        requisitionPoints: 0,
        experimentalTech: [],
        fleetAdmiralPlayerId: 'p2',
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
        dpBudget: 120,
      } as any,
      persistedPlayers: [{
        id: 'p2',
        name: 'Drone Tender',
        shipId: 'ship-2',
        officers: [
          { officerId: 'slick-jones', station: 'helm', currentStress: 2, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'vane', station: 'tactical', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'sparky', station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
        ],
        commandTokens: 0,
        maxCommandTokens: 3,
        assignedActions: [],
      }],
      persistedShips: [{
        id: 'ship-2',
        name: 'ISS Bastion',
        chassisId: 'vanguard',
        ownerId: 'p2',
        position: { q: 0, r: 0 },
        facing: 0,
        currentSpeed: 0,
        currentHull: 6,
        maxHull: 6,
        shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
        maxShieldsPerSector: 2,
        equippedWeapons: [],
        equippedSubsystems: [],
        criticalDamage: [],
        scars: [],
        armorDie: 'd6',
        baseEvasion: 8,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
      }],
      officerDataMap: {
        sparky: getOfficerById('sparky')!,
      },
    });

    render(<SectorMapView />);

    expect(screen.getByText('Sparky')).toBeInTheDocument();
    expect(screen.queryByText(/AI Drone/i)).not.toBeInTheDocument();
    expect(screen.getByText('IMM')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getAllByText('VETERAN').length).toBeGreaterThan(0);
  });

  it('centers the current node vertically when returning to the sector map', () => {
    const sectorMap = generateSectorMap(42, 15);
    const currentNode = sectorMap.nodes.find(node => node.layer === 7)!;
    const scrollToMock = vi.fn();
    const clientHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
    const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    const scrollToDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');

    try {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        get() {
          return this instanceof HTMLElement && this.classList.contains('sector-map-scroll') ? 600 : 0;
        },
      });
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get() {
          return this instanceof HTMLElement && this.classList.contains('sector-map-scroll') ? 2080 : 0;
        },
      });
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
        configurable: true,
        value: scrollToMock,
      });

      useCampaignStore.setState({
        sectorMap,
        campaign: {
          currentSector: 1,
          currentNodeId: currentNode.id,
          visitedNodeIds: ['start-0', currentNode.id],
          revealedNodeIds: ['start-0', currentNode.id],
          sectorMapSeed: 42,
          campaignPhase: 'sectorMap',
          fleetFavor: 0,
          requisitionPoints: 0,
          experimentalTech: [],
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
          dpBudget: 120,
        } as any,
        persistedPlayers: [],
        persistedShips: [],
        officerDataMap: {},
      });

      render(<SectorMapView />);

      expect(scrollToMock).toHaveBeenCalledWith({ top: 740, behavior: 'smooth' });
    } finally {
      if (clientHeightDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'clientHeight', clientHeightDescriptor);
      }
      if (scrollHeightDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeightDescriptor);
      }
      if (scrollToDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor);
      }
    }
  });
});
