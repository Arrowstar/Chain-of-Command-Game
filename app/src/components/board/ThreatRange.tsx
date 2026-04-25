import { Graphics } from '@pixi/react';
import { useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { hexCorners, hexToPixel, hexDistance } from '../../engine/hexGrid';

export default function ThreatRange() {
  const enemyShips = useGameStore((s) => s.enemyShips);

  // This will outline hexes that are within range of enemy ships.
  const drawThreat = useCallback((g: any) => {
    g.clear();

    if (enemyShips.length === 0) return;

    // For performance, we'll draw a simplified red polygon or circle around enemies,
    // or color individual hex borders. Since we don't have the full grid array easily accessible here 
    // without regenerating it, let's draw hex borders manually for hexes within range 3 of any enemy.
    
    g.lineStyle({ width: 2, color: 0xE53E3E, alpha: 0.15 });
    g.beginFill(0xE53E3E, 0.05);

    // Naive visualization: Range 3 from each enemy 
    const range = 3;
    
    for (const ship of enemyShips) {
      if (ship.isDestroyed) continue;

      const center =  ship.position;
      
      // Draw all hexes within distance
      for (let q = center.q - range; q <= center.q + range; q++) {
        for (let r = center.r - range; r <= center.r + range; r++) {
          const hex = { q, r };
          if (hexDistance(center, hex) <= range) {
            const px = hexToPixel(hex);
            const corners = hexCorners(px);
            
            g.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
              g.lineTo(corners[i].x, corners[i].y);
            }
            g.lineTo(corners[0].x, corners[0].y);
          }
        }
      }
    }
    
    g.endFill();

  }, [enemyShips]);

  return <Graphics draw={drawThreat} />;
}
