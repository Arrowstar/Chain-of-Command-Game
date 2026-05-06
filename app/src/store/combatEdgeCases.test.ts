import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';
import type { PlayerState, ShipState, EnemyShipState, FighterToken } from '../types/game';
import { getWeaponById } from '../data/weapons';

describe('Combat Engine Edge Cases (Faction & Serialization)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.setState({ log: [] });
  });

  describe('State Hydration (Save Game Backwards Compatibility)', () => {
    it('automatically stamps missing kind and faction properties on entities during initialization', () => {
      // Mock legacy ship data (missing kind and faction)
      const legacyPlayerShip: any = { id: 'p1',
        name: 'Legacy Player',
        chassisId: 'manticore',
        position: { q: 0, r: 0 },
        facing: 0,
        currentHull: 10,
        maxHull: 10,
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 },
      };

      const legacyEnemyShip: any = { kind: 'ship', faction: 'hegemony', id: 'e1', name: 'Legacy Enemy',
        adversaryId: 'hegemony-enforcer',
        position: { q: 1, r: 0 },
        facing: 3,
        currentHull: 10,
        maxHull: 10,
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 },
      };

      useGameStore.getState().initializeGame({
        scenarioId: 'test-scenario',
        players: [], maxRounds: null,
        playerShips: [legacyPlayerShip],
        enemyShips: [legacyEnemyShip],
        terrain: [],
      });

      const state = useGameStore.getState();
      const p = state.playerShips[0];
      const e = state.enemyShips[0];

      // Verification that the store initialization patched these
      expect(p.kind).toBe('ship');
      expect(p.faction).toBe('player');
      expect(e.kind).toBe('ship');
      expect(e.faction).toBe('hegemony');
    });
  });

  describe('Point Defense (PDC) Discrimination', () => {
    it('Player PDC fires on Hegemony fighters but ignores Allied fighters', () => {
      // Setup a player ship with PDC
      const playerShip: ShipState = { kind: 'ship', faction: 'player',  
        id: 'ps1', name: 'PDC Cruiser', chassisId: 'manticore', ownerId: 'p1',
        position: { q: 0, r: 0 }, facing: 0, currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 }, maxShieldsPerSector: 2,
        equippedWeapons: ['pdc'], equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd4', baseEvasion: 5, evasionModifiers: 0,
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [], pdcDisabled: false,
      };

      const hegemonyFighter: FighterToken = {
        kind: 'fighter', faction: 'hegemony', id: 'hf1', name: 'Hegemony Fighter', classId: 'strike-fighter', sourceShipId: 'e1',
        position: { q: 2, r: 0 }, facing: 3, currentHull: 1, maxHull: 1, speed: 4, baseEvasion: 2, volleyPool: ['d4'], weaponRangeMax: 1,
        behavior: 'attack', isDestroyed: false, hasDrifted: false, hasActed: false, assignedTargetId: 'ps1',
      };

      const alliedFighter: FighterToken = {
        kind: 'fighter', faction: 'allied', id: 'af1', name: 'Allied Fighter', classId: 'strike-fighter', sourceShipId: 'ps1',
        position: { q: -10, r: 0 }, facing: 0, currentHull: 1, maxHull: 1, speed: 4, baseEvasion: 2, volleyPool: ['d4'], weaponRangeMax: 1,
        behavior: 'escort', isDestroyed: false, hasDrifted: false, hasActed: false, assignedTargetId: 'e1',
      };

      useGameStore.setState({
        playerShips: [playerShip],
        enemyShips: [],
        fighterTokens: [hegemonyFighter, alliedFighter],
        terrainMap: new Map(),
      });

      // Resolve step for Allied fighters (they move, but shouldn't trigger PDC)
      useGameStore.getState().resolveFighterStep('allied');
      
      let logs = useGameStore.getState().log;
      let pdcLogs = logs.filter(l => l.message.includes('engaged'));
      expect(pdcLogs.length).toBe(0); // No PDC fired against allied fighter

      // Resolve step for Hegemony fighters (should trigger PDC as they move through adjacent hex)
      useGameStore.getState().resolveFighterStep('hegemony');

      logs = useGameStore.getState().log;
      pdcLogs = logs.filter(l => l.message.includes('engaged'));
      expect(pdcLogs.length).toBeGreaterThan(0); // PDC should fire!
    });
  });

  describe('Area of Effect (AoE) Friendly Fire', () => {
    it('AoE weapons evaluate targets in the hex regardless of faction (Friendly Fire allowed)', () => {
      const player: PlayerState = {
        id: 'p1', name: 'Player 1', shipId: 'ps1', assignedActions: [], commandTokens: 10, maxCommandTokens: 10,
        officers: [{ officerId: 'vance', station: 'tactical', currentStress: 0, actionsPerformedThisRound: 0, usedMethodicalThisRound: false, traumas: [], currentTier: 'veteran', isLocked: false, lockDuration: 0, hasFumbledThisRound: false }]
      };

      const attackerShip: ShipState = { kind: 'ship', faction: 'player',  
        id: 'ps1', name: 'Attacker', chassisId: 'manticore', ownerId: 'p1',
        position: { q: 0, r: 0 }, facing: 0, currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 }, maxShieldsPerSector: 2,
        equippedWeapons: ['flak-artillery'], // AoE weapon
        equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd4', baseEvasion: 1, evasionModifiers: 0,
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
      };

      const friendlyShip: ShipState = { kind: 'ship', faction: 'player',  
        id: 'ps2', name: 'Friendly', chassisId: 'manticore', ownerId: 'p1',
        position: { q: 2, r: -2 }, facing: 0, currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 0, aft: 0, forePort: 0, aftPort: 0, foreStarboard: 0, aftStarboard: 0 }, maxShieldsPerSector: 2,
        equippedWeapons: [], equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd4', baseEvasion: 1, evasionModifiers: 0,
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
      };

      const enemyShip: EnemyShipState = { kind: 'ship', faction: 'hegemony',  
        id: 'e1', name: 'Enemy', adversaryId: 'hegemony-enforcer',
        position: { q: 2, r: -2 }, facing: 3, currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 0, aft: 0, forePort: 0, aftPort: 0, foreStarboard: 0, aftStarboard: 0 }, maxShieldsPerSector: 2,
        criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [], baseEvasion: 1, armorDie: 'd4'
      };

      useGameStore.setState({
        players: [player],
        playerShips: [attackerShip, friendlyShip],
        enemyShips: [enemyShip],
        terrainMap: new Map(),
        tacticalOverrideShipIds: ['ps1'], // Bypass arc check so Flak Artillery can fire anywhere
      });

      // Assign and fire Flak Artillery at the hex (2,-2)
      useGameStore.getState().assignToken('p1', { id: 'act1', station: 'tactical', actionId: 'fire-primary', weaponSlotIndex: 0, ctCost: 0, stressCost: 0 });
      
      vi.spyOn(Math, 'random').mockReturnValue(0.01); // Lowest roll: TN 1 hits still land, but armor rolls 1!
      useGameStore.getState().resolveAction('p1', 'ps1', 'act1', { targetHex: { q: 2, r: -2 }, weaponIndex: 0, weaponId: 'flak-artillery' });
      vi.restoreAllMocks();

      const state = useGameStore.getState();
      
      const updatedFriendly = state.playerShips.find(s => s.id === 'ps2');
      const updatedEnemy = state.enemyShips.find(s => s.id === 'e1');

      // Both should take damage because AoE hits everything in the hex/radius
      expect(updatedFriendly?.currentHull).toBeLessThan(10);
      expect(updatedEnemy?.currentHull).toBeLessThan(10);
    });
  });

  describe('Allied AI Treason Prevention', () => {
    it('Allied AI never targets Player ships even if they are the closest unit', () => {
      const playerShip: ShipState = { kind: 'ship', faction: 'player',  
        id: 'ps1', name: 'Player', chassisId: 'manticore', ownerId: 'p1',
        position: { q: 0, r: 0 }, facing: 0, currentSpeed: 0, currentHull: 10, maxHull: 10,
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 }, maxShieldsPerSector: 2,
        equippedWeapons: [], equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd4', baseEvasion: 5, evasionModifiers: 0,
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: []
      };

      const alliedAIShip: EnemyShipState = {  
        kind: 'ship', faction: 'allied', id: 'a1', name: 'Allied AI', adversaryId: 'allied-escort',
        position: { q: 1, r: 0 }, facing: 3, currentSpeed: 0, currentHull: 10, maxHull: 10, // Adjacent to player
        shields: { fore: 2, aft: 2, forePort: 2, aftPort: 2, foreStarboard: 2, aftStarboard: 2 }, maxShieldsPerSector: 2,
        criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [], baseEvasion: 5, armorDie: 'd4'
      };

      useGameStore.setState({
        playerShips: [playerShip],
        enemyShips: [alliedAIShip],
        terrainMap: new Map(),
        executionStep: 'smallEnemy', // Ensure it can act if it matches size
      });

      // Run AI execution (allied AI turn)
      useGameStore.getState().resolveEnemyTurn();

      // Check log to verify it didn't attack the player
      const logs = useGameStore.getState().log;
      const attackLogs = logs.filter(l => l.type === 'combat' && l.message.includes('Allied AI'));
      
      expect(attackLogs.length).toBe(0); // Should not have attacked the player
      
      // Target lock checks
      const updatedAlliedAI = useGameStore.getState().enemyShips.find(s => s.id === 'a1');
      expect(updatedAlliedAI?.targetLocks.length).toBe(0); // No locks against player
    });
  });
});
