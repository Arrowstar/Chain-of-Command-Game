import { Graphics } from '@pixi/react';
import { useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';
import { checkLineOfSight, hexLineDraw, hexToPixel, hexKey } from '../../engine/hexGrid';

export default function LineOfSight() {
  const selectedShipId = useUIStore((s) => s.selectedShipId);
  const hoveredShipId = useUIStore((s) => s.hoveredShipId);
  const playerShips = useGameStore((s) => s.playerShips);
  const enemyShips = useGameStore((s) => s.enemyShips);
  const terrainMap = useGameStore((s) => s.terrainMap);

  const drawLoS = useCallback((g: any) => {
    g.clear();

    if (!selectedShipId || !hoveredShipId || selectedShipId === hoveredShipId) return;

    let sourceShip = playerShips.find(s => s.id === selectedShipId) || enemyShips.find(s => s.id === selectedShipId);
    let targetShip = playerShips.find(s => s.id === hoveredShipId) || enemyShips.find(s => s.id === hoveredShipId);

    if (!sourceShip || !targetShip) return;

    // We only preview LoS proactively in HUD, normally Phase 3 logic handles resolution.
    // This is purely for player visualization.
    const { clear, blockedBy } = checkLineOfSight(sourceShip.position, targetShip.position, terrainMap);

    const startPx = hexToPixel(sourceShip.position);
    const endPx = hexToPixel(targetShip.position);

    if (clear) {
      g.lineStyle({ width: 2, color: 0x319795, alpha: 0.8, alignment: 0.5 }); // Cyan
      g.moveTo(startPx.x, startPx.y);
      g.lineTo(endPx.x, endPx.y);

      // Dash or crosshairs
      g.beginFill(0x319795);
      g.drawCircle(endPx.x, endPx.y, 5);
      g.endFill();
    } else {
      g.lineStyle({ width: 2, color: 0xE53E3E, alpha: 0.8, alignment: 0.5 }); // Red
      
      const blockedPx = blockedBy ? hexToPixel(blockedBy) : endPx;

      g.moveTo(startPx.x, startPx.y);
      g.lineTo(blockedPx.x, blockedPx.y);

      // X mark at block
      g.moveTo(blockedPx.x - 10, blockedPx.y - 10);
      g.lineTo(blockedPx.x + 10, blockedPx.y + 10);
      g.moveTo(blockedPx.x + 10, blockedPx.y - 10);
      g.lineTo(blockedPx.x - 10, blockedPx.y + 10);
    }

  }, [selectedShipId, hoveredShipId, playerShips, enemyShips, terrainMap]);

  return <Graphics draw={drawLoS} />;
}
