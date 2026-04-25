import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { useUIStore } from './useUIStore';

// Mocking everything needed for combat
vi.mock('../engine/combat', () => ({
  resolveAttack: vi.fn(),
  assembleVolleyPool: vi.fn(() => []),
  regenerateShields: vi.fn(),
}));

vi.mock('../engine/hexGrid', () => ({
  checkLineOfSight: vi.fn(() => ({ clear: true })),
  hexDistance: vi.fn(() => 2),
  hexKey: vi.fn((c) => `${c.q},${c.r}`),
  isInFiringArc: vi.fn(() => true),
  determineStruckShieldSector: vi.fn(() => 'fore'),
  hexNeighbors: vi.fn(() => []),
  hexEquals: vi.fn((a, b) => a.q === b.q && a.r === b.r),
}));

vi.mock('../data/weapons', () => ({
  getWeaponById: vi.fn((id) => ({ 
    id, 
    name: 'Test Heavy Laser', 
    tags: [], 
    damage: 3,
    rangeMin: 1,
    rangeMax: 10
  })),
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

describe('Overall Combat Verification (Enemy Criticals)', () => {
  beforeEach(() => {
    useGameStore.setState({
      playerShips: [{ id: 'p1', chassisId: 'vanguard', position: { q: 0, r: 0 }, facing: 0, currentHull: 10, maxHull: 10, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, equippedWeapons: ['heavy-laser'], equippedSubsystems: [], criticalDamage: [], scars: [], armorDie: 'd6', baseEvasion: 5, ownerId: 'player', isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false } as any],
      enemyShips: [
        { id: 'e1', name: 'Enemy 1', position: { q: 2, r: 0 }, facing: 3, currentHull: 10, maxHull: 10, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, adversaryId: 'a1', criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, baseEvasion: 5, armorDie: 'd6' } as any,
        { id: 'e2', name: 'Enemy 2', position: { q: 3, r: 0 }, facing: 3, currentHull: 10, maxHull: 10, shields: { fore: 5, foreStarboard: 5, aftStarboard: 5, aft: 5, aftPort: 5, forePort: 5 }, adversaryId: 'a1', criticalDamage: [], isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, baseEvasion: 5, armorDie: 'd6' } as any
      ],
      players: [{ id: 'player1', shipId: 'p1', commandTokens: 10, officers: [{ station: 'tactical', currentTier: 'rookie', officerId: 'officer-vane' }], assignedActions: [] } as any],
      log: [],
      enemyCritDeck: [
        { id: 'enemy-generator-offline', name: 'Generator Offline', effect: '...', isRepaired: false },
        { id: 'enemy-weapon-damaged', name: 'Weapon Damaged', effect: '...', isRepaired: false }
      ],
      phase: 'execution'
    });
  });

  it('should handle sequential critical hits on different enemies', async () => {
    const state = useGameStore.getState();
    const uiState = (useUIStore.getState as any)();
    
    // Attack Enemy 1
    (resolveAttack as any).mockReturnValueOnce({
      shieldHits: 0, struckSector: 'fore', shieldRemaining: 5, overflowHits: 3, armorRoll: 0, hullDamage: 3, criticalTriggered: true, volleyResult: { totalHits: 3, totalCrits: 1, dice: [] }, tnBreakdown: { total: 10 }
    });
    
    const action1 = { id: 'a1', station: 'tactical' as any, actionId: 'fire-primary', weaponSlotIndex: 0, targetShipId: 'e1', ctCost: 2, stressCost: 1, resolved: false };
    const player = { ...useGameStore.getState().players[0], assignedActions: [action1] };
    useGameStore.setState({ players: [player] });
    
    await state.resolveAction('player1', 'p1', 'a1', { targetShipId: 'e1' });
    
    // Attack Enemy 2
    (resolveAttack as any).mockReturnValueOnce({
      shieldHits: 0, struckSector: 'fore', shieldRemaining: 5, overflowHits: 3, armorRoll: 0, hullDamage: 3, criticalTriggered: true, volleyResult: { totalHits: 3, totalCrits: 1, dice: [] }, tnBreakdown: { total: 10 }
    });
    
    const action2 = { id: 'a2', station: 'tactical' as any, actionId: 'fire-primary', weaponSlotIndex: 0, targetShipId: 'e2', ctCost: 2, stressCost: 1, resolved: false };
    const playerUpdated = { ...useGameStore.getState().players[0], assignedActions: [action1, action2] };
    useGameStore.setState({ players: [playerUpdated] });
    
    await state.resolveAction('player1', 'p1', 'a2', { targetShipId: 'e2' });

    const enemy1 = useGameStore.getState().enemyShips.find(s => s.id === 'e1');
    const enemy2 = useGameStore.getState().enemyShips.find(s => s.id === 'e2');

    expect(enemy1?.criticalDamage.length).toBe(1);
    expect(enemy2?.criticalDamage.length).toBe(1);
    expect(enemy1?.criticalDamage[0].id).not.toBe(enemy2?.criticalDamage[0].id); // Different cards drawn
    expect(useGameStore.getState().enemyCritDeck.length).toBe(0); // Both cards drawn
  });
});
