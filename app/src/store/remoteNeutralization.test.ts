import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { getSubsystemById } from '../data/subsystems';
import * as diceRoller from '../utils/diceRoller';

// Mock the dice roller to control success/failure
vi.mock('../utils/diceRoller', async (importOriginal) => {
  const actual = await importOriginal<typeof diceRoller>();
  return {
    ...actual,
    rollOfficerSkillProc: vi.fn(),
  };
});

describe('Remote Neutralization (remote-disarm-drone-rig) Resolution', () => {
  const PLAYER_ID = 'player-1';
  const SHIP_ID = 'ship-1';
  const ACTION_ID = 'action-1';

  beforeEach(() => {
    // Reset store to a clean state
    const store = useGameStore.getState();
    
    // Setup player and ship
    const player = {
      id: PLAYER_ID,
      name: 'Player 1',
      shipId: SHIP_ID,
      officers: [
        { officerId: 'o1', station: 'helm', currentStress: 0, currentTier: 'veteran' },
        { officerId: 'o2', station: 'tactical', currentStress: 0, currentTier: 'veteran' },
        { officerId: 'o3', station: 'engineering', currentStress: 0, currentTier: 'elite' },
        { officerId: 'o4', station: 'sensors', currentStress: 0, currentTier: 'veteran' },
      ],
      commandTokens: 5,
      maxCommandTokens: 5,
      assignedActions: [
        {
          id: ACTION_ID,
          station: 'engineering',
          actionId: 'remote-disarm-drone-rig',
          targetShipId: 'target-1',
          ctCost: 1,
          stressCost: 0,
          resolved: false,
        }
      ],
    };

    const ship = {
      id: SHIP_ID,
      name: 'Test Ship',
      chassisId: 'vanguard',
      ownerId: PLAYER_ID,
      position: { q: 0, r: 0 },
      facing: 0,
      currentSpeed: 2,
      currentHull: 10,
      maxHull: 10,
      shields: { fore: 3, foreStarboard: 3, aftStarboard: 3, aft: 3, aftPort: 3, forePort: 3 },
      maxShieldsPerSector: 3,
      equippedWeapons: [],
      equippedSubsystems: ['remote-disarm-drone-rig'],
      criticalDamage: [],
      scars: [],
      armorDie: 'd6',
      baseEvasion: 5,
      evasionModifiers: 0,
      isDestroyed: false,
    };

    // @ts-ignore - setting private/internal state for test
    useGameStore.setState({
      players: [player as any],
      playerShips: [ship as any],
      enemyShips: [],
      tacticHazards: [],
      torpedoTokens: [],
      fighterTokens: [],
      log: [],
    });

    vi.clearAllMocks();
  });

  it('should remove a Mine on a successful Engineering roll', () => {
    const hazard = { id: 'target-1', name: 'Mine', position: { q: 2, r: 0 }, damage: 3, expiresAfterRound: 99 };
    useGameStore.setState({ tacticHazards: [hazard] });

    // Mock success (roll 5 on d8)
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      dieType: 'd8',
      roll: 5,
      successThreshold: 4,
      isSuccess: true,
      isCritical: false,
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    expect(useGameStore.getState().tacticHazards.length).toBe(0);
    expect(useGameStore.getState().log.some(l => l.message.includes('neutralized hostile Mine'))).toBe(true);
  });

  it('should remove a Torpedo on a successful Engineering roll', () => {
    const torpedo = { id: 'target-1', name: 'Torpedo', allegiance: 'enemy', position: { q: 2, r: 0 }, isDestroyed: false } as any;
    useGameStore.setState({ torpedoTokens: [torpedo] });

    // Mock success
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      isSuccess: true,
      isCritical: false,
      roll: 4,
      dieType: 'd8',
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    expect(useGameStore.getState().torpedoTokens.length).toBe(0);
    expect(useGameStore.getState().log.some(l => l.message.includes('neutralized hostile Torpedo'))).toBe(true);
  });

  it('should mark a Fighter as destroyed on a successful Engineering roll', () => {
    const fighter = { id: 'target-1', name: 'Fighter', allegiance: 'enemy', position: { q: 2, r: 0 }, isDestroyed: false, currentHull: 1 } as any;
    useGameStore.setState({ fighterTokens: [fighter] });

    // Mock success
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      isSuccess: true,
      isCritical: false,
      roll: 4,
      dieType: 'd8',
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    const updatedFighter = useGameStore.getState().fighterTokens.find(f => f.id === 'target-1');
    expect(updatedFighter?.isDestroyed).toBe(true);
    expect(updatedFighter?.currentHull).toBe(0);
    expect(useGameStore.getState().log.some(l => l.message.includes('neutralized hostile Fighter'))).toBe(true);
  });

  it('should NOT remove the target on a failed Engineering roll', () => {
    const hazard = { id: 'target-1', name: 'Mine', position: { q: 2, r: 0 }, damage: 3, expiresAfterRound: 99 };
    useGameStore.setState({ tacticHazards: [hazard] });

    // Mock failure (roll 2 on d8)
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      dieType: 'd8',
      roll: 2,
      successThreshold: 4,
      isSuccess: false,
      isCritical: false,
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    expect(useGameStore.getState().tacticHazards.length).toBe(1);
    expect(useGameStore.getState().log.some(l => l.message.includes('Target acquisition failed'))).toBe(true);
  });

  it('should refund stress on a critical success', () => {
    const hazard = { id: 'target-1', name: 'Mine', position: { q: 2, r: 0 }, damage: 3, expiresAfterRound: 99 };
    useGameStore.setState({ tacticHazards: [hazard] });

    // Give officer some stress and set action stress cost to 1
    const players = useGameStore.getState().players;
    players[0].officers[2].currentStress = 2;
    players[0].assignedActions[0].stressCost = 1;
    useGameStore.setState({ players });

    // Mock critical success (roll 8 on d8)
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      dieType: 'd8',
      roll: 8,
      successThreshold: 4,
      isSuccess: true,
      isCritical: true,
      maxFace: 8,
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    const officer = useGameStore.getState().players[0].officers[2];
    expect(officer.currentStress).toBe(1); // 2 - 1 = 1
    expect(useGameStore.getState().tacticHazards.length).toBe(0);
  });

  it('should NOT remove an allied Fighter', () => {
    const fighter = { id: 'target-1', name: 'Allied Fighter', allegiance: 'allied', position: { q: 2, r: 0 }, isDestroyed: false, currentHull: 1 } as any;
    useGameStore.setState({ fighterTokens: [fighter] });

    // Mock success
    (diceRoller.rollOfficerSkillProc as any).mockReturnValue({
      isSuccess: true,
      isCritical: false,
      roll: 4,
      dieType: 'd8',
    });

    useGameStore.getState().resolveAction(PLAYER_ID, SHIP_ID, ACTION_ID);

    const updatedFighter = useGameStore.getState().fighterTokens.find(f => f.id === 'target-1');
    expect(updatedFighter?.isDestroyed).toBe(false);
    expect(updatedFighter?.currentHull).toBe(1);
  });
});
