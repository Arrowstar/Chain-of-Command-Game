import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { ROE_DECK } from '../data/roeDeck';
import type { PlayerState } from '../types/game';

describe('Rules of Engagement Effects', () => {
  beforeEach(() => {
    useGameStore.setState({
      round: 1,
      phase: 'setup',
      players: [
        {
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 5,
          maxCommandTokens: 5,
          assignedActions: [],
          officers: [
            { officerId: 'vance', station: 'sensors', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            { officerId: 'slick-jones', station: 'helm', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 }
          ]
        } as PlayerState
      ],
      playerShips: [
        {
          id: 's1', name: 'Ship 1', chassisId: 'c1', ownerId: 'p1',
          position: { q: 0, r: 0 }, facing: 0 as any, currentSpeed: 2, currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 }, maxShieldsPerSector: 2,
          equippedWeapons: [], equippedSubsystems: [], criticalDamage: [], scars: [],
          armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
        }
      ],
      enemyShips: [],
      terrainMap: new Map(),
      tacticDeck: [],
      fumbleDeck: [],
      playerCritDeck: [],
      enemyCritDeck: [],
      activeRoE: null,
      roeOverridden: false,
      log: [],
      fleetFavor: 2,
    });
  });

  it('Power Grid Rationing modifies CT generation', () => {
    // Inject Power Grid Rationing
    const roe = ROE_DECK.find(c => c.id === 'power-grid-rationing')!;
    useGameStore.setState({ activeRoE: roe });

    useGameStore.getState().executeBriefingPhase();
    const p1 = useGameStore.getState().players[0];
    
    // Base 5, -1 from RoE = 4
    expect(p1.commandTokens).toBe(4);
    expect(p1.maxCommandTokens).toBe(5); // Baseline remains 5
  });

  it('Overclocked Reactors grants +1 CT generation', () => {
    const roe = ROE_DECK.find(c => c.id === 'overclocked-reactors')!;
    useGameStore.setState({ activeRoE: roe });

    useGameStore.getState().executeBriefingPhase();
    const p1 = useGameStore.getState().players[0];
    
    // Base 5, +1 from RoE = 6
    expect(p1.commandTokens).toBe(6);
  });

  it('overrideRoE costs 3 Fleet Favor and clears active RoE mechanical effects', () => {
    const roe = ROE_DECK.find(c => c.id === 'power-grid-rationing')!;
    useGameStore.setState({ phase: 'briefing', activeRoE: roe });

    useGameStore.getState().overrideRoE();
    const state = useGameStore.getState();

    expect(state.roeOverridden).toBe(true);
    expect(state.activeRoE).toBeNull();
    expect(state.fleetFavor).toBe(-1); // 2 - 3
  });

  it('Strict Radio Silence applies stress via reportRadioSilenceViolation', () => {
    const roe = ROE_DECK.find(c => c.id === 'strict-radio-silence')!;
    useGameStore.setState({ activeRoE: roe });

    useGameStore.getState().reportRadioSilenceViolation('p1');
    const player = useGameStore.getState().players[0];
    
    // Sensors officer is idx 0
    expect(player.officers[0].currentStress).toBe(1);
  });

  it('Zero-Tolerance for Cowardice applies stress on stationary', () => {
    const roe = ROE_DECK.find(c => c.id === 'zero-tolerance-cowardice')!;
    useGameStore.setState({ activeRoE: roe });

    // Set ship speed to 0, positionAtStartOfRound, and give Helm 2 actions to prevent partial recovery
    useGameStore.setState(s => {
      const ships = [...s.playerShips];
      ships[0] = { ...ships[0], currentSpeed: 0, positionAtStartOfRound: { q: 0, r: 0 } };
      const players = [...s.players];
      players[0].officers[1].actionsPerformedThisRound = 2;
      return { playerShips: ships, players };
    });

    useGameStore.getState().executeCleanupPhase();
    const player = useGameStore.getState().players[0];
    const pShip = useGameStore.getState().playerShips[0];
    expect(player.officers[1].currentStress).toBe(2);
  });

  it('Data Siphon counts a ship ending on the relay hex as siphoning it', () => {
    useGameStore.setState(s => ({
      ...s,
      objectiveType: 'Data Siphon',
      phase: 'cleanup',
      enemyShips: [],
      objectiveMarkers: [
        { name: 'Comm Relay Alpha', position: { q: 0, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 },
        { name: 'Comm Relay Beta', position: { q: 4, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 },
        { name: 'Comm Relay Gamma', position: { q: 8, r: 0 }, hull: 10, maxHull: 10, shieldsPerSector: 2 },
      ],
      dataSiphonedRelayNames: [],
      playerShips: s.playerShips.map((ship, index) =>
        index === 0 ? { ...ship, position: { q: 0, r: 0 } } : ship,
      ),
    }));

    useGameStore.getState().executeCleanupPhase();
    const state = useGameStore.getState();

    expect(state.dataSiphonedRelayNames).toContain('Comm Relay Alpha');
    expect(state.objectiveMarkers.find(marker => marker.name === 'Comm Relay Alpha')?.isCollected).toBe(true);
  });
});
