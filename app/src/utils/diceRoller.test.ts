import { describe, it, expect, vi } from 'vitest';
import { rollDie, rollDieExploding, countHits, rollVolley, rollSkillProc, rollOfficerSkillProc, stepUpDie, stepDownDie } from './diceRoller';

describe('diceRoller', () => {
  it('rollDie returns a number between 1 and max', () => {
    const val = rollDie('d6');
    expect(val).toBeGreaterThanOrEqual(1);
    expect(val).toBeLessThanOrEqual(6);
  });

  it('rollDieExploding registers a hit if above TN', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // For a d6, 0.5 * 6 = 3. floor(3) + 1 = 4.
    const result = rollDieExploding('d6', 4);
    expect(result.rolls).toEqual([4]);
    expect(result.isHit).toBe(true);
    expect(result.isCritical).toBe(false);
    vi.restoreAllMocks();
  });

  it('rollDieExploding explodes on max value', () => {
    // Mock random to return max (0.99) then a 2 (0.1)
    let count = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      count++;
      if (count === 1) return 0.99; // returns 6
      return 0.16; // returns 1
    });

    const result = rollDieExploding('d6', 4);
    expect(result.rolls).toEqual([6, 1]);
    expect(result.isHit).toBe(true);
    expect(result.isCritical).toBe(true);
    expect(result.total).toBe(7);
    vi.restoreAllMocks();
  });

  it('countHits counts all rolls that meet TN', () => {
    const result = {
      dieType: 'd6' as const,
      rolls: [6, 6, 2],
      total: 14,
      isHit: true,
      isCritical: true,
    };
    const hits = countHits(result, 5);
    expect(hits).toBe(2);
  });

  it('rollSkillProc applies the rookie gate to criticals', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // d4 => 4
    const result = rollSkillProc('d4', 4);
    expect(result.roll).toBe(4);
    expect(result.isSuccess).toBe(true);
    expect(result.isCritical).toBe(false);
    vi.restoreAllMocks();
  });

  it('rollOfficerSkillProc allows veteran officers to crit on max', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // d6 => 6
    const result = rollOfficerSkillProc('veteran', 4);
    expect(result.dieType).toBe('d6');
    expect(result.roll).toBe(6);
    expect(result.isSuccess).toBe(true);
    expect(result.isCritical).toBe(true);
    vi.restoreAllMocks();
  });

  it('rollVolley rerolls a tactical die that opens on exactly 1', () => {
    const rolls = [0.0, 0.5];
    vi.spyOn(Math, 'random').mockImplementation(() => rolls.shift() ?? 0.5);

    const result = rollVolley([{ type: 'd6', source: 'officer' }], 4, 0, true);

    expect(result.dice[0].rolls[0]).toBe(4);
    expect(result.totalHits).toBe(1);
    vi.restoreAllMocks();
  });

  it('stepUpDie steps up correctly', () => {
    expect(stepUpDie('d6')).toBe('d8');
    expect(stepUpDie('d20')).toBe('d20');
  });

  it('stepDownDie steps down correctly', () => {
    expect(stepDownDie('d6')).toBe('d4');
    expect(stepDownDie('d4')).toBe('d4');
  });

  describe('rollVolley inhibitorActive mechanics', () => {
    it('does not affect results when inhibitorActive is false', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const result = rollVolley([{ type: 'd6', source: 'weapon' }], 2, 0, false, false, false);
      expect(result.totalHits).toBeGreaterThan(0);
      vi.restoreAllMocks();
    });

    it('re-rolls the highest die when inhibitorActive is true — misses after re-roll', () => {
      let callIdx = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // 1st call: die rolls max (d6 => 6, crit); 2nd call: inhibitor re-roll => miss (d6 => 1)
        return callIdx++ === 0 ? 0.99 : 0.0;
      });
      const result = rollVolley([{ type: 'd6', source: 'weapon' }], 4, 0, false, false, true);
      // After re-roll, value is 1 which is below TN 4 => miss
      expect(result.totalHits).toBe(0);
      vi.restoreAllMocks();
    });

    it('inhibitorActive with multi-die pool re-rolls only the best die', () => {
      let callIdx = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // die1: 0.99 => d6=6 (crit hit), die2: 0.5 => d6=4 (standard hit), inhibitor re-rolls die1: 0.0 => d6=1 (miss)
        return [0.99, 0.5, 0.0][callIdx++] ?? 0.5;
      });
      const result = rollVolley(
        [{ type: 'd6', source: 'weapon' }, { type: 'd6', source: 'weapon' }],
        4, 0, false, false, true
      );
      // die1 re-rolled to miss, die2 still hits at 4 => 1 standard hit
      expect(result.totalHits).toBe(1);
      expect(result.totalCrits).toBe(0);
      vi.restoreAllMocks();
    });
  });
});
