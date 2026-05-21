import { describe, expect, it } from 'vitest';
import { generateEliteRewards, applyEliteReward } from '../campaignEngine';
import type { EliteRewardOption } from '../../types/campaignTypes';
import type { PlayerState } from '../../types/game';

describe('Elite Rewards Generation and Application', () => {
  it('generates 3 unique reward options for Elite nodes', () => {
    const rewards = generateEliteRewards([]);
    expect(rewards.length).toBe(3);
    const types = new Set(rewards.map(r => r.type));
    // Usually it should pick 3 distinct types unless the pool gets weird, but our pool has many types
    expect(types.size).toBe(3);
  });

  it('generates 3 unique reward options for Boss nodes', () => {
    const rewards = generateEliteRewards([], true);
    expect(rewards.length).toBe(3);
    const types = new Set(rewards.map(r => r.type));
    expect(types.size).toBe(3);
  });

  it('increases the probability of rare rewards (e.g. officerUp) for Boss nodes', () => {
    let eliteRareCount = 0;
    let bossRareCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const eliteRewards = generateEliteRewards([], false, i);
      if (eliteRewards.some(r => r.type === 'officerUp')) {
        eliteRareCount++;
      }

      const bossRewards = generateEliteRewards([], true, i + 1000);
      if (bossRewards.some(r => r.type === 'officerUp')) {
        bossRareCount++;
      }
    }

    // Boss node injects extra 'officerUp' tickets into the pool, so it should appear more frequently
    // in a large sample size.
    expect(bossRareCount).toBeGreaterThan(eliteRareCount);
    
    // We can also test an uncommon reward like deep repair (value: 2)
    let eliteDeepRepairCount = 0;
    let bossDeepRepairCount = 0;
    for (let i = 0; i < iterations; i++) {
      const eliteRewards = generateEliteRewards([], false, i);
      if (eliteRewards.some(r => r.type === 'repair' && r.value === 2)) {
        eliteDeepRepairCount++;
      }

      const bossRewards = generateEliteRewards([], true, i + 1000);
      if (bossRewards.some(r => r.type === 'repair' && r.value === 2)) {
        bossDeepRepairCount++;
      }
    }
    
    expect(bossDeepRepairCount).toBeGreaterThan(eliteDeepRepairCount);
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
