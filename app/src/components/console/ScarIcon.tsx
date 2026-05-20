import React from 'react';
import type { ScarEffect } from '../../types/game';
import { SCAR_TEMPLATES } from '../../data/scarTemplates';

interface ScarIconProps {
  scar: ScarEffect;
  size?: number; // target width in pixels (icon cells are square)
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a specific ship scar icon by slicing it out of the master spritesheet.
 *
 * The spritesheet (ship_scars.png) is a 4-column × 3-row transparent PNG.
 * We use CSS background-position to display exactly the cell we need.
 *
 * Grid layout:
 *   Row 0: Scorched Thrusters | Coolant Leak | Bridge Hit | Shield Generator
 *   Row 1: Targeting Array    | Sensor Mast  | Weapon Mount | Structural Spine
 *   Row 2: Power Bus Leak     | Command Spine | [empty] | [empty]
 */
export default function ScarIcon({ scar, size = 48, className = '', style = {} }: ScarIconProps) {
  // Always look up from the authoritative template — saved game states may not
  // carry the spritePos field if the asset was added after the save was made.
  const template = SCAR_TEMPLATES[scar.fromCriticalId];

  if (!template?.spritePos) return null;

  // 4-column × 3-row grid
  // background-size: 400% width, 300% height snaps perfectly to each cell.
  // Percentage positions:
  //   cols: 0%, 33.33%, 66.66%, 100%
  //   rows: 0%, 50%, 100%
  const bgPosX = (template.spritePos.col / 3) * 100;
  const bgPosY = (template.spritePos.row / 2) * 100;

  return (
    <div
      className={className}
      title={`${template.name}: ${template.effect}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: "url('/images/scars/ship_scars.png')",
        backgroundSize: '400% 300%',
        backgroundPosition: `${bgPosX}% ${bgPosY}%`,
        backgroundRepeat: 'no-repeat',
        display: 'inline-block',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
