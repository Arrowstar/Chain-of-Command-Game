/**
 * animationsAndOrdnance.test.ts
 *
 * Regression tests for the four bug fixes:
 *
 * 1. Ordnance Cycling UI — after loading ordnance, ship.ordnanceLoadedIndicesThisRound
 *    includes that index, which ExecutionPanel reads to disable/grey out the button.
 *
 * 2. Tachyon Targeting Matrix — volley breakdown results include a logEntryId string
 *    so the VolleyBreakdown modal can show the "Retroactive Tachyon Strike" button.
 *
 * 3. Ship Destruction Animation — explosion WeaponFireEvent is queued when hull hits 0.
 *
 * 4. Torpedo Travel & Explosion Animations — torpedo movement queues travel events,
 *    and debris/PDC destruction queues explosion events.
 *
 * 5. WeaponFireAnimations (pure, no Pixi runtime) — animation factory routing for the
 *    new 'torpedo-travel' and 'explosion' tags.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useGameStore } from './useGameStore';

// ─── Stable spy objects ──────────────────────────────────────────────────────
// IMPORTANT: we create these OUTSIDE vi.mock so the same references are
// shared by the mock factory and our expect() calls.
const mockQueueModal = vi.fn();
const mockQueueFireAnimation = vi.fn();

vi.mock('./useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      queueModal:            mockQueueModal,
      showModal:             vi.fn(),
      queueFireAnimation:    mockQueueFireAnimation,
      resetUI:               vi.fn(),
      incrementUnread:       vi.fn(),
      cancelAllFireAnimations: vi.fn(),
    }),
  },
}));

// ─── Factories ───────────────────────────────────────────────────────────────
function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Player 1',
    officers: [{
      officerId: 'vance',
      station: 'tactical' as const,
      currentStress: 0,
      currentTier: 'veteran' as const,
      traumas: [],
      hasFumbledThisRound: false,
      actionsPerformedThisRound: 0,
      isLocked: false,
      lockDuration: 0,
    }],
    commandTokens: 10,
    maxCommandTokens: 10,
    assignedActions: [],
    shipId: 's1',
    ...overrides,
  };
}

function makePlayerShip(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'ship' as const,
    faction: 'player' as const,
    id: 's1',
    name: 'Test Ship',
    chassisId: 'vanguard',
    position: { q: 0, r: 0 },
    facing: 0 as any,
    currentSpeed: 0,
    maxHull: 10,
    currentHull: 10,
    shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 },
    maxShieldsPerSector: 5,
    armorDie: 'd4' as const,
    baseEvasion: 0,
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
    targetLocks: [],
    ...overrides,
  } as any;
}

function makeEnemyShip(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'ship' as const,
    faction: 'hegemony' as const,
    id: 'e1',
    name: 'Enemy',
    adversaryId: 'hunter-killer',
    position: { q: 1, r: 0 },
    facing: 3 as any,
    currentSpeed: 0,
    currentHull: 6,
    maxHull: 6,
    shields: { fore: 0, foreStarboard: 0, aftStarboard: 0, aft: 0, aftPort: 0, forePort: 0 },
    maxShieldsPerSector: 3,
    armorDie: 'd4' as const,
    isDestroyed: false,
    criticalDamage: [],
    hasDrifted: false,
    targetLocks: [],
    hasDroppedBelow50: false,
    baseEvasion: 0,
    ...overrides,
  } as any;
}

// ─── Suite ───────────────────────────────────────────────────────────────────
describe('Animations and Ordnance Cycle Logic', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
    vi.clearAllMocks();
    useGameStore.setState({ currentTactic: null });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ORDNANCE CYCLING UI
  //    The ExecutionPanel reads `ship.ordnanceLoadedIndicesThisRound` to decide
  //    whether to show "⟳ CYCLING" and disable the button.
  //    We verify the store writes this property correctly after load-ordnance.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bug 1 – Ordnance Cycling: isCycling flag on ship', () => {
    beforeEach(() => {
      useGameStore.setState({
        round: 1,
        phase: 'execution',
        executionStep: 'mediumAllied',
        players: [{
          id: 'p1',
          name: 'Player 1',
          shipId: 's1',
          commandTokens: 5,
          maxCommandTokens: 5,
          assignedActions: [
            { id: 'a-reload', station: 'tactical', actionId: 'load-ordinance', ctCost: 1, stressCost: 0 },
          ],
          officers: [
            { officerId: 'vance',       station: 'sensors',     currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            { officerId: 'slick-jones', station: 'helm',        currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            { officerId: 'kane',        station: 'tactical',    currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
            { officerId: 'holloway',    station: 'engineering', currentStress: 0, currentTier: 'veteran', isLocked: false, lockDuration: 0, traumas: [], hasFumbledThisRound: false, actionsPerformedThisRound: 0 },
          ],
        }] as any,
        playerShips: [{
          kind: 'ship', faction: 'player', id: 's1', name: 'Ship 1', chassisId: 'vanguard', ownerId: 'p1',
          position: { q: 0, r: 0 }, facing: 0, currentSpeed: 0, currentHull: 10, maxHull: 10,
          shields: { fore: 2, foreStarboard: 2, aftStarboard: 2, aft: 2, aftPort: 2, forePort: 2 },
          maxShieldsPerSector: 2,
          equippedWeapons: ['heavy-railgun', 'plasma-battery'],
          equippedSubsystems: [],
          criticalDamage: [], scars: [],
          armorDie: 'd6', baseEvasion: 5, evasionModifiers: 0, isDestroyed: false,
          hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
          ordnanceLoadedStatus: { 0: false }, // railgun starts unloaded (needs reload)
          ordnanceLoadedIndicesThisRound: [],
          firedWeaponIndicesThisRound: [],
        }] as any,
        enemyShips: [],
        terrainMap: new Map(),
        log: [],
      });
    });

    it('sets ordnanceLoadedIndicesThisRound on the ship after reloading', () => {
      const store = useGameStore.getState();
      const beforeShip = store.playerShips[0];
      expect(beforeShip.ordnanceLoadedIndicesThisRound ?? []).not.toContain(0);

      store.resolveAction('p1', 's1', 'a-reload', { weaponIndex: 0 });

      const afterShip = useGameStore.getState().playerShips[0];
      // Weapon index 0 should now appear in the loaded-this-round list
      expect(afterShip.ordnanceLoadedIndicesThisRound).toContain(0);
      // This is the property ExecutionPanel uses to compute isCycling
    });

    it('isCycling logic: weapon loaded this round without Auto-Loader should block fire in the store', () => {
      const store = useGameStore.getState();
      // Load the ordnance first
      store.resolveAction('p1', 's1', 'a-reload', { weaponIndex: 0 });

      // Now try to fire it — without Auto-Loader, this should be blocked
      useGameStore.setState(s => ({
        players: s.players.map(p => ({
          ...p,
          assignedActions: [{ id: 'a-fire', station: 'tactical', actionId: 'fire-primary', ctCost: 1, stressCost: 1 }],
        })),
        enemyShips: [makeEnemyShip() as any],
      }));

      const logsBefore = useGameStore.getState().log.length;
      store.resolveAction('p1', 's1', 'a-fire', { targetShipId: 'e1', weaponIndex: 0 });
      const logsAfter = useGameStore.getState().log;

      // Should log a "must cycle" message — not add it to firedWeaponIndicesThisRound
      const cycleLog = logsAfter.find(l => l.message.includes('must cycle') || l.message.includes('Auto-Loader'));
      expect(cycleLog).toBeDefined();

      const ship = useGameStore.getState().playerShips[0];
      expect(ship.firedWeaponIndicesThisRound ?? []).not.toContain(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TACHYON TARGETING MATRIX — logEntryId in volley modal
  //    Every DamageResult in the volley breakdown should carry a logEntryId so
  //    VolleyBreakdown can render the "Retroactive Tachyon Strike" button.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bug 2 – Tachyon Targeting Matrix: logEntryId in volley results', () => {
    it('queueModal receives results with a non-empty logEntryId string', () => {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'ttm-test',
        maxRounds: 8,
        players: [makePlayer()],
        playerShips: [makePlayerShip()],
        enemyShips: [makeEnemyShip()],
        objectiveMarkers: [],
        terrain: [],
      });
      useGameStore.setState({ currentTactic: null });

      store.assignToken('p1', { id: 'fire', station: 'tactical', actionId: 'fire-primary', ctCost: 0, stressCost: 0 });
      store.resolveAction('p1', 's1', 'fire', { targetShipId: 'e1', weaponIndex: 0 });

      expect(mockQueueModal).toHaveBeenCalledWith('volley', expect.objectContaining({
        results: expect.arrayContaining([
          expect.objectContaining({ logEntryId: expect.any(String) })
        ])
      }));

      // Ensure it's a non-empty string (an actual log entry ID was captured)
      const call = mockQueueModal.mock.calls.find(c => c[0] === 'volley');
      expect(call).toBeDefined();
      const results = call![1].results as any[];
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].logEntryId.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SHIP DESTRUCTION ANIMATION
  //    We test the explosion queue via the collision/movement path (deterministic)
  //    AND verify the state correctly marks ships destroyed.
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bug 3 – Ship Destruction Animation', () => {
    it('queueFireAnimation is called with explosion tag when a ship drifts into an asteroid and dies', () => {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'explosion-test',
        maxRounds: 8,
        players: [makePlayer()],
        // 1 hull left, speed 2, facing 0 (moves east)
        playerShips: [makePlayerShip({ currentHull: 1, currentSpeed: 2, hasDrifted: false }) as any],
        enemyShips: [],
        objectiveMarkers: [],
        terrain: [],
      });
      useGameStore.setState({ currentTactic: null });

      // Place an asteroid 1 hex ahead in the drift direction
      // (hex {q:1, r:-1} is directly in front of {q:0, r:0} when facing=0)
      useGameStore.getState().terrainMap.set('1,-1', 'asteroids');

      // Force the asteroid entry roll to always fail (low value = fail)
      const origRandom = Math.random;
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.001); // D6 roll = 1, threshold = 1+  => fail = terrain damage

      store.resolveDrift('s1', true);

      vi.spyOn(Math, 'random').mockRestore();
      // @ts-ignore
      Math.random = origRandom;

      // Ship had 1 hull; asteroid terrain damage (3) > hull => isDestroyed = true, explosion queued
      expect(mockQueueFireAnimation).toHaveBeenCalledWith(expect.objectContaining({
        weaponTags: ['explosion'],
      }));
    });

    it('enemy ship state is marked isDestroyed and hull=0 after updateEnemyShip', () => {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'state-check',
        maxRounds: 8,
        players: [makePlayer()],
        playerShips: [makePlayerShip()],
        enemyShips: [makeEnemyShip({ currentHull: 1 })],
        objectiveMarkers: [],
        terrain: [],
      });
      useGameStore.setState({ currentTactic: null });

      store.updateEnemyShip('e1', { currentHull: 0, isDestroyed: true });

      const ship = useGameStore.getState().enemyShips.find(e => e.id === 'e1');
      expect(ship?.isDestroyed).toBe(true);
      expect(ship?.currentHull).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TORPEDO TRAVEL & EXPLOSION ANIMATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bug 4 – Torpedo Animations', () => {
    function setupTorpedoGame() {
      const store = useGameStore.getState();
      store.initializeGame({
        scenarioId: 'torpedo-test',
        maxRounds: 8,
        players: [makePlayer({ officers: [] }) as any],
        playerShips: [makePlayerShip({ equippedWeapons: [] }) as any],
        enemyShips: [makeEnemyShip({ position: { q: 0, r: -8 } }) as any],
        objectiveMarkers: [],
        terrain: [],
      });
      useGameStore.setState({ currentTactic: null });
      return store;
    }

    it('queues a torpedo-travel animation when torpedo moves', () => {
      const store = setupTorpedoGame();

      store.spawnTorpedo({
        kind: 'torpedo',
        id: 'torp-1',
        name: 'Seeker',
        faction: 'allied',
        sourceShipId: 's1',
        targetShipId: 'e1',
        position: { q: 0, r: -1 },
        facing: 5 as any,
        currentHull: 1,
        maxHull: 1,
        speed: 2,
        baseEvasion: 5,
        isDestroyed: false,
        hasMoved: false,
      });

      store.resolveTorpedoStep('allied');

      const travelCalls = mockQueueFireAnimation.mock.calls.filter(
        c => Array.isArray(c[0]?.weaponTags) && c[0].weaponTags.includes('torpedo-travel')
      );
      expect(travelCalls.length).toBeGreaterThan(0);
    });

    it('queues a torpedo-travel AND explosion when torpedo hits a debris field', () => {
      const store = setupTorpedoGame();

      store.spawnTorpedo({
        kind: 'torpedo',
        id: 'torp-2',
        name: 'Seeker',
        faction: 'allied',
        sourceShipId: 's1',
        targetShipId: 'e1',
        position: { q: 0, r: -1 },
        facing: 5 as any,
        currentHull: 1,
        maxHull: 1,
        speed: 4,
        baseEvasion: 5,
        isDestroyed: false,
        hasMoved: false,
      });

      // Place debris field in the torpedo's path
      useGameStore.getState().terrainMap.set('0,-3', 'debrisField');

      store.resolveTorpedoStep('allied');

      const travelCall = mockQueueFireAnimation.mock.calls.find(
        c => c[0]?.weaponTags?.includes('torpedo-travel')
      );
      const explosionCall = mockQueueFireAnimation.mock.calls.find(
        c => c[0]?.weaponTags?.includes('explosion')
      );

      expect(travelCall).toBeDefined();
      expect(explosionCall).toBeDefined();

      const torp = useGameStore.getState().torpedoTokens.find(t => t.id === 'torp-2');
      expect(torp?.isDestroyed).toBe(true);
    });

    it('does NOT queue a torpedo-travel animation when torpedo has already moved', () => {
      const store = setupTorpedoGame();

      store.spawnTorpedo({
        kind: 'torpedo',
        id: 'torp-3',
        name: 'Seeker',
        faction: 'allied',
        sourceShipId: 's1',
        targetShipId: 'e1',
        position: { q: 0, r: -1 },
        facing: 0,
        currentHull: 1,
        maxHull: 1,
        speed: 2,
        baseEvasion: 5,
        isDestroyed: false,
        hasMoved: true, // already acted this round
      });

      store.resolveTorpedoStep('allied');

      const travelCall = mockQueueFireAnimation.mock.calls.find(
        c => c[0]?.weaponTags?.includes('torpedo-travel')
      );
      expect(travelCall).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ANIMATION FACTORY — pure unit tests, no PixiJS runtime needed
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Bug 3 & 4 – WeaponFireAnimations factory routing', () => {
    it("returns duration=0 noop for bare 'torpedo' tag (token spawned, no flight yet)", async () => {
      const { createWeaponFireAnimation } = await import('../engine/weaponFireAnimations');
      const anim = createWeaponFireAnimation(
        { id: 'x', attackerPos: { q: 0, r: 0 }, targetPos: { q: 1, r: 0 }, weaponTags: ['torpedo'] as any, isEnemy: false },
        { x: 0, y: 0 }, { x: 100, y: 0 }
      );
      expect(anim.duration).toBe(0);
    });

    it("returns duration > 0 for 'torpedo-travel' tag", async () => {
      const { createWeaponFireAnimation } = await import('../engine/weaponFireAnimations');
      const anim = createWeaponFireAnimation(
        { id: 'x', attackerPos: { q: 0, r: 0 }, targetPos: { q: 1, r: 0 }, weaponTags: ['torpedo', 'torpedo-travel'] as any, isEnemy: false },
        { x: 0, y: 0 }, { x: 100, y: 0 }
      );
      expect(anim.duration).toBeGreaterThan(0);
    });

    it("returns duration > 0 for 'explosion' tag", async () => {
      const { createWeaponFireAnimation } = await import('../engine/weaponFireAnimations');
      const anim = createWeaponFireAnimation(
        { id: 'x', attackerPos: { q: 0, r: 0 }, targetPos: { q: 0, r: 0 }, weaponTags: ['explosion'] as any, isEnemy: false },
        { x: 0, y: 0 }, { x: 0, y: 0 }
      );
      expect(anim.duration).toBeGreaterThan(0);
    });

    it("explosion animation update draws without throwing", async () => {
      const { createWeaponFireAnimation } = await import('../engine/weaponFireAnimations');
      const anim = createWeaponFireAnimation(
        { id: 'x', attackerPos: { q: 0, r: 0 }, targetPos: { q: 0, r: 0 }, weaponTags: ['explosion'] as any, isEnemy: false },
        { x: 50, y: 50 }, { x: 50, y: 50 }
      );
      // Calling update with a mock PIXI.Graphics-like object should not throw
      const mockGfx = {
        clear: vi.fn(), beginFill: vi.fn(), endFill: vi.fn(),
        drawCircle: vi.fn(), lineStyle: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      };
      expect(() => anim.update(mockGfx as any, 0.5)).not.toThrow();
      expect(() => anim.update(mockGfx as any, 1.0)).not.toThrow();
    });

    it("torpedo-travel animation update draws without throwing", async () => {
      const { createWeaponFireAnimation } = await import('../engine/weaponFireAnimations');
      const anim = createWeaponFireAnimation(
        { id: 'x', attackerPos: { q: 0, r: 0 }, targetPos: { q: 1, r: 0 }, weaponTags: ['torpedo', 'torpedo-travel'] as any, isEnemy: false },
        { x: 0, y: 0 }, { x: 200, y: 0 }
      );
      const mockGfx = {
        clear: vi.fn(), beginFill: vi.fn(), endFill: vi.fn(),
        drawCircle: vi.fn(), lineStyle: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
      };
      expect(() => anim.update(mockGfx as any, 0.25)).not.toThrow();
      expect(() => anim.update(mockGfx as any, 0.75)).not.toThrow();
    });
  });
});
