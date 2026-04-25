import { Graphics } from '@pixi/react';
import { useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';
import { computeDriftPath, hexToPixel } from '../../engine/hexGrid';

export default function MovementPreview() {
  const selectedShipId = useUIStore((s) => s.selectedShipId);
  const playerShips = useGameStore((s) => s.playerShips);

  const ship = playerShips.find(s => s.id === selectedShipId);

  const drawPreview = useCallback((g: any) => {
    g.clear();

    if (!ship || ship.currentSpeed === 0) return;

    const path = computeDriftPath(ship.position, ship.facing, ship.currentSpeed);
    
    // Draw hollow dashed/holographic path for drift projection
    g.lineStyle({ width: 2, color: 0x4FD1C5, alpha: 0.4 }); // Cyan dim

    const startPx = hexToPixel(ship.position);
    g.moveTo(startPx.x, startPx.y);

    for (const hex of path) {
      const px = hexToPixel(hex);
      g.lineTo(px.x, px.y);
    }

    // Ghost token at final destination
    if (path.length > 0) {
      const finalHex = path[path.length - 1];
      const finalPx = hexToPixel(finalHex);
      
      const rotationDeg = (ship.facing * 60) + 30;
      const rotationRad = (Math.PI / 180) * rotationDeg;

      // Manually draw ghost token
      g.lineStyle({ width: 1, color: 0x4FD1C5, alpha: 0.6 });
      g.beginFill(0x319795, 0.2);
      
      // Need to push translation/rotation to draw ghost triangle
      const noseX = finalPx.x + Math.cos(rotationRad) * 20 - Math.sin(rotationRad) * 0;
      const noseY = finalPx.y + Math.sin(rotationRad) * 20 + Math.cos(rotationRad) * 0;
      
      const brX = finalPx.x + Math.cos(rotationRad) * -15 - Math.sin(rotationRad) * 15;
      const brY = finalPx.y + Math.sin(rotationRad) * -15 + Math.cos(rotationRad) * 15;

      const inX = finalPx.x + Math.cos(rotationRad) * -10 - Math.sin(rotationRad) * 0;
      const inY = finalPx.y + Math.sin(rotationRad) * -10 + Math.cos(rotationRad) * 0;

      const blX = finalPx.x + Math.cos(rotationRad) * -15 - Math.sin(rotationRad) * -15;
      const blY = finalPx.y + Math.sin(rotationRad) * -15 + Math.cos(rotationRad) * -15;

      g.moveTo(noseX, noseY);
      g.lineTo(brX, brY);
      g.lineTo(inX, inY);
      g.lineTo(blX, blY);
      g.closePath();
      g.endFill();
    }

  }, [ship]);

  return <Graphics draw={drawPreview} />;
}
