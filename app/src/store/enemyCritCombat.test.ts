import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';

// Mocking everything simply
vi.mock('../engine/combat', () => ({
  resolveAttack: vi.fn(),
  assembleVolleyPool: vi.fn(() => []),
}));

vi.mock('../engine/hexGrid', () => ({
  checkLineOfSight: vi.fn(() => ({ clear: true })),
  hexDistance: vi.fn(() => 2),
  hexKey: vi.fn((c) => `${c.q},${c.r}`),
  isInFiringArc: vi.fn(() => true),
  determineStruckShieldSector: vi.fn(() => 'fore'),
}));

vi.mock('../data/weapons', () => ({
  getWeaponById: vi.fn(() => ({ id: 'test-weapon', name: 'Test Weapon', tags: [] })),
}));

vi.mock('../engine/torpedoMovement', () => ({
  moveTorpedo: vi.fn(),
  resolveTorpedoAttack: vi.fn(),
}));

vi.mock('./useUIStore', () => ({
  useUIStore: {
    getState: vi.fn(() => ({
      queueModal: vi.fn(),
      incrementUnread: vi.fn(),
      showModal: vi.fn(),
    })),
  },
}));

import { resolveAttack } from '../engine/combat';
import { resolveTorpedoAttack, moveTorpedo } from '../engine/torpedoMovement';

describe('Enemy Critical Damage Wiring', () => {
  beforeEach(() => {
    useGameStore.setState({
      playerShips: [{ id: 'p1', chassisId: 'vanguard', position: { q: 0, r: 0 }, facing: 0, currentHull: 10, maxHull: 10, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, equippedWeapons: ['w1'], equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd6', baseEvasion: 5, ownerId: 'player', isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false } as any],
      enemyShips: [{ id: 'e1', name: 'Enemy Ship', position: { q: 2, r: 0 }, facing: 3, currentHull: 10, maxHull: 10, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, adversaryId: 'a1', criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, baseEvasion: 5, armorDie: 'd6' } as any],
      players: [{ id: 'player1', shipId: 'p1', commandTokens: 10, officers: [{ station: 'tactical', currentTier: 'rookie', officerId: 'officer-vane' }], assignedActions: [] } as any],
      log: [],
      enemyCritDeck: [{ id: 'enemy-generator-offline', name: 'Generator Offline', effect: '...', isRepaired: false }],
    });
  });

  it('should apply critical damage to an enemy when resolveAction triggers it', async () => {
    (resolveAttack as any).mockReturnValue({
      shieldHits: 0,
      struckSector: 'fore',
      shieldRemaining: 5,
      overflowHits: 3,
      armorRoll: 0,
      hullDamage: 3,
      criticalTriggered: true,
      volleyResult: { totalHits: 3, totalCrits: 1, dice: [] },
      tnBreakdown: { total: 10 },
    });

    const action = {
      id: 'a1',
      station: 'tactical' as any,
      actionId: 'fire-primary',
      weaponSlotIndex: 0,
      targetShipId: 'e1',
      ctCost: 2,
      stressCost: 1,
      resolved: false,
    };
    
    const player = { ...useGameStore.getState().players[0], assignedActions: [action] };
    useGameStore.setState({ 
      players: [player],
      phase: 'execution' 
    });
    
    const state = useGameStore.getState();
    await state.resolveAction('player1', 'p1', 'a1', { targetShipId: 'e1' });

    const updatedEnemy = useGameStore.getState().enemyShips.find(s => s.id === 'e1');
    expect(useGameStore.getState().log.some(l => l.message.includes('CRITICAL HIT!'))).toBe(true);
    expect(updatedEnemy?.criticalDamage.length).toBe(1);
    expect(updatedEnemy?.criticalDamage[0].id).toBe('enemy-generator-offline');
  });

  it('should apply critical damage to an enemy when a torpedo impacts it', async () => {
    useGameStore.setState({
      torpedoTokens: [{
        id: 't1',
        name: 'Seeker Torpedo',
        allegiance: 'allied',
        sourceShipId: 'p1',
        targetShipId: 'e1',
        position: { q: 1, r: 0 },
        facing: 0,
        currentHull: 1,
        maxHull: 1,
        speed: 4,
        baseEvasion: 5,
        isDestroyed: false,
        hasMoved: false
      } as any],
      phase: 'execution'
    });

    (resolveTorpedoAttack as any).mockReturnValue({
      hit: true,
      rolls: [15],
      hullDamage: 3,
      targetNumber: 5
    });

    (moveTorpedo as any).mockReturnValue({
      newPosition: { q: 2, r: 0 },
      reachedTarget: true,
      isDestroyed: false,
      traversedHexes: [{ q: 2, r: 0 }]
    });

    const state = useGameStore.getState();
    state.resolveTorpedoStep('allied');

    const updatedEnemy = useGameStore.getState().enemyShips.find(s => s.id === 'e1');
    expect(updatedEnemy?.criticalDamage.length).toBe(1);
    expect(updatedEnemy?.criticalDamage[0].id).toBe('enemy-generator-offline');
  });
});
