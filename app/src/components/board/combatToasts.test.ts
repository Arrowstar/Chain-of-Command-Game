import { fireCombatToast, type CombatToast } from './CombatToastContainer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CombatToast System', () => {
  let mockToast: any;

  beforeEach(() => {
    mockToast = vi.fn();
    window.__combatToast = mockToast;
  });

  afterEach(() => {
    delete window.__combatToast;
  });

  it('should call window.__combatToast when mounted', () => {
    const toastData: Omit<CombatToast, 'id'> = {
      type: 'critical',
      message: '★ CRITICAL HIT!',
    };

    fireCombatToast(toastData);

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(toastData);
  });

  it('should not crash if window.__combatToast is undefined', () => {
    delete window.__combatToast;
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const toastData: Omit<CombatToast, 'id'> = {
      type: 'warning',
      message: 'Test warning',
    };

    expect(() => fireCombatToast(toastData)).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith('CombatToastContainer not mounted, ignoring toast:', toastData);

    consoleSpy.mockRestore();
  });
});
