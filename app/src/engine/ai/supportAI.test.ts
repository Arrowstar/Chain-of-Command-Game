import { describe, expect, it } from 'vitest';
import { planAIMovement } from './behaviors';
import { HexFacing, type HexCoord } from '../../types/game';
import { hexDistance } from '../hexGrid';

describe('Support AI (Anchored)', () => {
  const targetPos: HexCoord = { q: 10, r: 0 }; // Player is far to the right
  const aiPos: HexCoord = { q: 0, r: 0 };
  const aiFacing = HexFacing.Fore;
  const speed = 3;
  const occupied = new Set<string>();
  const terrain = new Map();

  it('retreats when no allies are present', () => {
    const plan = planAIMovement(
      aiPos, aiFacing, speed, targetPos, 'support', 4,
      occupied, terrain, 0, false, []
    );
    
    // Should move away from player (maximize distance)
    expect(hexDistance(plan.targetHex, targetPos)).toBeGreaterThan(hexDistance(aiPos, targetPos));
  });

  it('moves toward a distant brawler ally', () => {
    const guardianPos: HexCoord = { q: 0, r: 5 }; // Ally is elsewhere
    const plan = planAIMovement(
      aiPos, aiFacing, speed, targetPos, 'support', 4,
      occupied, terrain, 0, false, 
      [{ pos: guardianPos, tag: 'aggressive' }]
    );
    
    // Should move closer to the guardian
    expect(hexDistance(plan.targetHex, guardianPos)).toBeLessThan(hexDistance(aiPos, guardianPos));
  });

  it('maintains the pocket (2-3 hexes) relative to a nearby guardian', () => {
    // Guardian is at (5,0). Player is at (15,0).
    // Support starts at (0,0). 
    // Moving toward guardian gets it into the 2-3 hex range.
    const guardianPos: HexCoord = { q: 5, r: 0 };
    const playerPos: HexCoord = { q: 15, r: 0 };

    const plan = planAIMovement(
      aiPos, aiFacing, speed, playerPos, 'support', 4,
      occupied, terrain, 0, false, 
      [{ pos: guardianPos, tag: 'aggressive' }]
    );
    
    const finalDistToGuardian = hexDistance(plan.targetHex, guardianPos);
    // Speed is 3, so from 0,0 it can reach 3,0.
    // 5,0 - 3,0 = 2 hexes distance. Perfect.
    expect(finalDistToGuardian).toBeGreaterThanOrEqual(2);
    expect(finalDistToGuardian).toBeLessThanOrEqual(3);
  });

  it('ignores other support/artillery ships when looking for a guardian', () => {
    const otherSupportPos: HexCoord = { q: 1, r: 0 };
    const distantGuardianPos: HexCoord = { q: 0, r: 8 };

    const plan = planAIMovement(
      aiPos, aiFacing, speed, targetPos, 'support', 4,
      occupied, terrain, 0, false, 
      [
        { pos: otherSupportPos, tag: 'support' },
        { pos: distantGuardianPos, tag: 'aggressive' }
      ]
    );
    
    // Should ignore the nearby support ship and move toward the distant brawler
    expect(hexDistance(plan.targetHex, distantGuardianPos)).toBeLessThan(hexDistance(aiPos, distantGuardianPos));
  });
});
