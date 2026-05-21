import { describe, expect, it } from 'vitest';
import { generateEliteRewards, applyEliteReward } from '../campaignEngine';
import type { EliteRewardOption } from '../../types/campaignTypes';
import type { PlayerState } from '../../types/game';

describe('Elite Rewards Generation and Application', () => {
  it('generates 3 unique reward options', () => {
    const rewards = generateEliteRewards([]);
    expect(rewards.length).toBe(3);
    const types = new Set(rewards.map(r => r.type));
    // Usually it should pick 3 distinct types unless the pool gets weird, but our pool has many types
    expect(types.size).toBe(3);
  });

  it('applies rp reward correctly', () => {
    const reward: EliteRewardOption = {
      id: 'test',
      icon: '💰',
      label: 'RP',
      description: '+15 RP',
      type: 'rp',
      value: 15,
    };

    const result = applyEliteReward(reward, 10, 5, [], {} as any, []);
    expect(result.requisitionPoints).toBe(25);
    expect(result.fleetFavor).toBe(5);
  });

  it('applies repair voucher correctly', () => {
    const reward: EliteRewardOption = {
      id: 'test',
      icon: '🔧',
      label: 'Repair',
      description: 'Free Hull Patch',
      type: 'repair',
      value: 1, // Hull Patch
    };

    const result = applyEliteReward(reward, 10, 5, [], {
      nextStoreDiscountPercent: 0,
      freeRepairAtNextStation: false,
      freeRepairConsumed: false,
    }, []);

    expect(result.pendingEconomicBuffs.freeRepairAtNextStation).toBe(true);
    expect(result.pendingEconomicBuffs.freeRepairConsumed).toBe(false);
  });

  it('applies officer upgrade correctly', () => {
    const reward: EliteRewardOption = {
      id: 'test',
      icon: '🎖️',
      label: 'Promotion',
      description: 'Upgrade an Officer',
      type: 'officerUp',
    };

    const players: PlayerState[] = [
      {
        id: 'p1',
        name: 'Player 1',
        shipId: 's1',
        commandTokens: 0,
        maxCommandTokens: 5,
        assignedActions: [],
        officers: [
          { officerId: 'o1', station: 'helm', currentTier: 'rookie', currentStress: 0, traumas: [], isLocked: false, lockDuration: 0, hasFumbledThisRound: false, hasNerveCollapse: false, actionsPerformedThisRound: 0 }
        ],
      }
    ];

    const result = applyEliteReward(reward, 10, 5, [], {} as any, players);
    expect(result.players[0].officers[0].currentTier).toBe('veteran');
  });
});
