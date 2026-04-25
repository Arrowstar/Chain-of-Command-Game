import { describe, it, expect } from 'vitest';
import { getSubsystemById } from '../subsystems';

describe('Subsystem Data', () => {
  it('should have alien-phase-vanes with correct metadata', () => {
    const sub = getSubsystemById('alien-phase-vanes');
    expect(sub).toBeDefined();
    expect(sub?.name).toBe('Alien Phase Vanes');
    expect(sub?.actionName).toBe('Phase Slip');
    expect(sub?.requiresHexTarget).toBe(true);
    expect(sub?.ctCost).toBe(1);
    expect(sub?.stressCost).toBe(1);
  });
});
