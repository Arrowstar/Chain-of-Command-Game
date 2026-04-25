import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rollVolley } from './diceRoller';

describe('diceRoller Spoofed Fire Control', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rollVolley applies +2 bonus and converts to crit if max reached (exploding)', () => {
    // Mock random to return a 4 on d6
    let count = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
        count++;
        if (count === 1) return 0.5; // floor(0.5 * 6) + 1 = 4
        return 0.16; // floor(0.16 * 6) + 1 = 1 (not a hit, not a crit)
    });

    // TN 4, so 4 is a hit.
    // +2 bonus makes it 6, which is a crit on d6.
    // If it's a crit, it should explode.
    const result = rollVolley([{ type: 'd6', source: 'weapon' }], 4, 0, false, true);
    
    expect(result.dice[0].isCritical).toBe(true);
    expect(result.dice[0].rolls).toEqual([6, 1]); // 4+2=6, then explode 1
    expect(result.totalHits).toBe(1); // 6 is a hit (>=4), 1 is not.
    expect(result.totalCriticalHits).toBe(1);
    expect(result.totalStandardHits).toBe(0);
  });

  it('rollVolley applies +2 bonus but remains standard hit if max not reached', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.16); // returns 1 (not a hit at TN 3)
    
    // Test a hit that doesn't reach max
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random').mockReturnValue(0.33); // floor(0.33 * 6) + 1 = 2
    
    // TN 2, so 2 is a hit.
    // +2 bonus makes it 4. 4 < 6, so still standard hit.
    const result = rollVolley([{ type: 'd6', source: 'weapon' }], 2, 0, false, true);
    
    expect(result.dice[0].isCritical).toBe(false);
    expect(result.dice[0].rolls).toEqual([4]); 
    expect(result.totalHits).toBe(1);
    expect(result.totalStandardHits).toBe(1);
  });

  it('rollVolley does not apply bonus to misses', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.16); // returns 1
    
    // TN 4, so 1 is a miss.
    // Even with +2 (which would be 3), it's still a miss.
    const result = rollVolley([{ type: 'd6', source: 'weapon' }], 4, 0, false, true);
    
    expect(result.totalHits).toBe(0);
    expect(result.dice[0].rolls).toEqual([1]); // Bonus not applied to the roll array for misses
  });
});
