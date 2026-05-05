import { describe, it, vi } from 'vitest';
import { rollVolley } from './src/utils/diceRoller';

describe('Real Roll', () => {
  it('checks', () => {
    let callCount = 0;
    const rolls = [
      2/6, // d6 -> 3
      0/6, // d6 -> 1
      0/4, // d4 -> 1
      2/4, // d4 -> 3
      3/4, // d4 -> 4 (max, explodes)
      2/4  // d4 -> 3
    ];
    vi.spyOn(Math, 'random').mockImplementation(() => {
      return rolls[callCount++];
    });
    
    const result = rollVolley(
      [
        { type: 'd6', source: 'weapon' },
        { type: 'd6', source: 'weapon' },
        { type: 'd4', source: 'weapon' },
        { type: 'd4', source: 'weapon' },
        { type: 'd4', source: 'officer' }
      ],
      2
    );
    
    console.log('Result total hits:', result.totalHits);
    console.log('Total critical hits:', result.totalCriticalHits);
    console.log('Total standard hits:', result.totalStandardHits);
    
    vi.restoreAllMocks();
  });
});
