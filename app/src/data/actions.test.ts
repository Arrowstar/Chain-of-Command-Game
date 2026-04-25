import { describe, it, expect } from 'vitest';
import { STANDARD_ACTIONS } from './actions';

describe('Actions Data', () => {
  it('Load Ordnance action should have hideIfNoOrdnance: true', () => {
    const loadOrdnance = STANDARD_ACTIONS.find(a => a.id === 'load-ordinance');
    expect(loadOrdnance).toBeDefined();
    expect(loadOrdnance?.hideIfNoOrdnance).toBe(true);
  });
});
