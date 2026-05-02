import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';
import { ShipSize } from '../types/game';

// Mock UI store to prevent side effects
vi.mock('./useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      queueModal: vi.fn(),
      showModal: vi.fn(),
      queueFireAnimation: vi.fn(),
      resetUI: vi.fn(),
      incrementUnread: vi.fn(),
      cancelAllFireAnimations: vi.fn(),
    }),
  },
}));

describe('Massive Store Edge Cases', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('Objective Completion Logic', () => {
    it('Salvage Run: should trigger victory when 3 crates are collected and a ship warps out', () => {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'salvage-test',
        maxRounds: 8,
        objectiveType: 'Salvage Run',
        players: [{ 
            id: 'p1', name: 'Player 1', officers: [
                { officerId: 'vance', station: 'tactical', currentStress: 0, currentTier: 'veteran', traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0, usedMethodicalThisRound: false, isLocked: false, lockDuration: 0 },
                { officerId: 'tlari', station: 'helm', currentStress: 0, currentTier: 'veteran', traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0, usedMethodicalThisRound: false, isLocked: false, lockDuration: 0 }
            ], 
            commandTokens: 10, maxCommandTokens: 10, assignedActions: [], shipId: 's1' 
        }],

        playerShips: [{
          id: 's1', name: 'Test Ship', chassisId: 'vanguard', position: { q: 0, r: 0 }, facing: 0,
          currentHull: 10, maxHull: 10, currentSpeed: 0, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
          maxShieldsPerSector: 5, armorDie: 'd6', baseEvasion: 4, isDestroyed: false, criticalDamage: [],
          equippedWeapons: [], equippedSubsystems: [], evasionModifiers: 0,
          scars: [], ownerId: 'p1', hasDrifted: false, hasDroppedBelow50: false, firedWeaponIndicesThisRound: [], targetLocks: []
        }],
        enemyShips: [],
        objectiveMarkers: [
          { name: 'Supply Crate 1', position: { q: 0, r: 0 }, hull: 1, maxHull: 1, shieldsPerSector: 0, isDestroyed: false, isCollected: false },
          { name: 'Supply Crate 2', position: { q: 0, r: 0 }, hull: 1, maxHull: 1, shieldsPerSector: 0, isDestroyed: false, isCollected: false },
          { name: 'Supply Crate 3', position: { q: 0, r: 0 }, hull: 1, maxHull: 1, shieldsPerSector: 0, isDestroyed: false, isCollected: false },
        ],
        terrain: [],
      });

      // Assign and Resolve 3 times
      for (let i = 0; i < 3; i++) {
        const actionId = `pickup-${i}`;
        store.assignToken('p1', { id: actionId, station: 'tactical', actionId: 'pickup-supply-crate', ctCost: 0, stressCost: 0 });
        store.resolveAction('p1', 's1', actionId);
      }

      expect(useGameStore.getState().salvageCratesCollected).toBe(3);
      expect(useGameStore.getState().gameOver).toBe(false);

      // Jump to warp
      store.assignToken('p1', { id: 'warp', station: 'helm', actionId: 'jump-to-warp', ctCost: 0, stressCost: 0 });
      store.resolveAction('p1', 's1', 'warp');

      expect(useGameStore.getState().gameOver).toBe(true);
      expect(useGameStore.getState().victory).toBe(true);
      expect(useGameStore.getState().gameOverReason).toContain('salvaged and fleet jumped to safety');
    });

    it('Breakout: should trigger victory when 50% of surviving ships escape', () => {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'breakout-test',
        maxRounds: 8,
        objectiveType: 'Breakout',
        players: [
          { id: 'p1', name: 'P1', officers: [{ officerId: 'vance', station: 'helm', currentStress: 0, currentTier: 'veteran', traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0, usedMethodicalThisRound: false, isLocked: false, lockDuration: 0 }], commandTokens: 10, maxCommandTokens: 10, assignedActions: [], shipId: 's1' },
          { id: 'p2', name: 'P2', officers: [], commandTokens: 10, maxCommandTokens: 10, assignedActions: [], shipId: 's2' },
        ],
        playerShips: [
          { id: 's1', name: 'Ship 1', chassisId: 'vanguard', position: { q: 12, r: 0 }, facing: 0, currentHull: 10, maxHull: 10, currentSpeed: 0, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, maxShieldsPerSector: 5, armorDie: 'd6', baseEvasion: 4, isDestroyed: false, criticalDamage: [], equippedWeapons: [], equippedSubsystems: [], evasionModifiers: 0, scars: [], ownerId: 'p1', hasDrifted: false, hasDroppedBelow50: false, firedWeaponIndicesThisRound: [], targetLocks: [] },
          { id: 's2', name: 'Ship 2', chassisId: 'vanguard', position: { q: 0, r: 0 }, facing: 0, currentHull: 10, maxHull: 10, currentSpeed: 0, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, maxShieldsPerSector: 5, armorDie: 'd6', baseEvasion: 4, isDestroyed: false, criticalDamage: [], equippedWeapons: [], equippedSubsystems: [], evasionModifiers: 0, scars: [], ownerId: 'p2', hasDrifted: false, hasDroppedBelow50: false, firedWeaponIndicesThisRound: [], targetLocks: [] },
        ],
        enemyShips: [],
        terrain: [],
      });

      // s1 is at {q:12, r:0}. (q - r) = 12. Breakout zone.
      store.assignToken('p1', { id: 'warp', station: 'helm', actionId: 'jump-to-warp', ctCost: 0, stressCost: 0 });
      store.resolveAction('p1', 's1', 'warp');

      expect(useGameStore.getState().successfulEscapes).toBe(1);
      expect(useGameStore.getState().gameOver).toBe(true);
      expect(useGameStore.getState().victory).toBe(true);
    });
  });

  describe('Damage & Critical Edge Cases', () => {
    it('Overkill: should spawn debris when a ship is destroyed', () => {
        const store = useGameStore.getState();
        store.initializeGame({
          scenarioId: 'debris-test',
          maxRounds: null,
          players: [{ id: 'p1', name: 'P1', officers: [], commandTokens: 10, maxCommandTokens: 10, assignedActions: [], shipId: 's1' }],
          playerShips: [{ id: 's1', name: 'Ship', chassisId: 'vanguard', position: { q: 0, r: 0 }, facing: 0, currentHull: 10, maxHull: 10, currentSpeed: 0, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, maxShieldsPerSector: 5, armorDie: 'd6', baseEvasion: 4, isDestroyed: false, criticalDamage: [], equippedWeapons: [], equippedSubsystems: [], evasionModifiers: 0, scars: [], ownerId: 'p1', hasDrifted: false, hasDroppedBelow50: false, firedWeaponIndicesThisRound: [], targetLocks: [] }],
          enemyShips: [],
          terrain: [],
        });

        useGameStore.getState().updatePlayerShip('s1', { currentHull: 0, isDestroyed: true });
        
        expect(useGameStore.getState().terrainMap.get('0,0')).toBe('debrisField');
    });
  });

  describe('State Machine & Phase Resets', () => {
    it('should reset recycledCoolantUsedThisRound when advancing to Briefing', () => {
        const store = useGameStore.getState();
        store.initializeGame({
          scenarioId: 'reset-test',
          maxRounds: null,
          players: [{ id: 'p1', name: 'P1', officers: [], commandTokens: 10, maxCommandTokens: 10, assignedActions: [], shipId: 's1' }],
          playerShips: [],
          enemyShips: [],
          terrain: [],
        });

        useGameStore.setState({ phase: 'cleanup', recycledCoolantUsedThisRound: true });
        
        useGameStore.getState().advancePhase(); // cleanup -> briefing
        
        expect(useGameStore.getState().phase).toBe('briefing');
        expect(useGameStore.getState().recycledCoolantUsedThisRound).toBe(false);
    });
  });

  describe('Fleet Assets & RoE Interaction', () => {
    it('Tactical Override: should bypass forward-arc RoE restriction', () => {
        const store = useGameStore.getState();
        store.initializeGame({
          scenarioId: 'roe-bypass-test',
          maxRounds: 8,
          players: [{ 
            id: 'p1', 
            name: 'P1', 
            officers: [{ 
                officerId: 'vance', 
                station: 'tactical', 
                currentStress: 0, 
                currentTier: 'veteran', 
                traumas: [], 
                hasFumbledThisRound: false, 
                actionsPerformedThisRound: 0, 
                usedMethodicalThisRound: false, 
                usedSurgicalStrikeThisRound: false, 
                isLocked: false, 
                lockDuration: 0 
            }], 
            commandTokens: 10, 
            maxCommandTokens: 10,
            assignedActions: [], 
            shipId: 's1' 
          }],
          playerShips: [{ 
            id: 's1', 
            name: 'Ship', 
            chassisId: 'vanguard', 
            position: { q: 0, r: 0 }, 
            facing: 0, 
            currentHull: 10, 
            maxHull: 10, 
            currentSpeed: 0, 
            shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, 
            maxShieldsPerSector: 5, 
            armorDie: 'd6', 
            baseEvasion: 4, 
            isDestroyed: false, 
            criticalDamage: [], 
            equippedWeapons: ['plasma-battery'], 
            equippedSubsystems: [], 
            evasionModifiers: 0, 
            scars: [], 
            ownerId: 'p1', 
            hasDrifted: false, 
            hasDroppedBelow50: false, 
            firedWeaponIndicesThisRound: [], 
            targetLocks: [] 
          }],
          enemyShips: [{ id: 'e1', name: 'Enemy', adversaryId: 'hunter-killer', position: { q: -1, r: 1 }, facing: 0, currentSpeed: 0, currentHull: 6, maxHull: 6, shields: { fore: 3, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 }, maxShieldsPerSector: 3, armorDie: 'd4', isDestroyed: false, criticalDamage: [], hasDrifted: false, targetLocks: [], hasDroppedBelow50: false, baseEvasion: 3 }],
          terrain: [],
        });

        // Set RoE: forwardArcOnly. 
        useGameStore.setState({
            activeRoE: { id: 'forward-only', name: 'Forward Only', flavorText: '', mechanicalEffect: { forwardArcOnly: true } } as any,
            tacticalOverrideShipIds: ['s1']
        });

        // Try to fire.
        store.assignToken('p1', { 
            id: 'fire', 
            station: 'tactical', 
            actionId: 'fire-primary', 
            ctCost: 0, 
            stressCost: 0, 
        });
        store.resolveAction('p1', 's1', 'fire', { targetShipId: 'e1', weaponIndex: 0 });

        expect(useGameStore.getState().tacticalOverrideShipIds).not.toContain('s1');
    });
  });
});
