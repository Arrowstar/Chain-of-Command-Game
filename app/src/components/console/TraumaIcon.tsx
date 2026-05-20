import React from 'react';
import type { TraumaEffect } from '../../types/game';
import { TRAUMA_POOL } from '../../data/traumaTraits';
import { SmartTooltip } from '../TouchTooltipPortal';

interface TraumaIconProps {
  trauma: TraumaEffect;
  size?: number; // The target width of the icon in pixels
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a specific trauma icon by slicing it out of the master spritesheet.
 * 
 * The spritesheet (trauma_traits.png) is a 5x4 grid.
 * We use CSS background positioning and sizing to display exactly the cell we need.
 */
export default function TraumaIcon({ trauma, size = 64, className = '', style = {} }: TraumaIconProps) {
  // Look up the authoritative trauma data from the pool, as saved game states
  // may not have the newly added 'spritePos' property attached.
  const authoritativeTrauma = TRAUMA_POOL.find(t => t.id === trauma.id) || trauma;
  
  if (!authoritativeTrauma.spritePos) return null;

  // Aspect ratio calculated from the raw image size: 2048x1117 (5 cols x 4 rows)
  // Each cell is approx 409.6 x 279.25, giving an aspect ratio of ~0.6817 (height / width)
  const ASPECT_RATIO = 279.25 / 409.6;
  
  const width = size;
  const height = size * ASPECT_RATIO;

  // With a 5x4 grid, background-size is 500% width and 400% height.
  // Using percentage-based positioning automatically snaps to the right cell:
  // cols: 0%, 25%, 50%, 75%, 100%
  // rows: 0%, 33.33%, 66.66%, 100%
  const bgPosX = (authoritativeTrauma.spritePos.col / 4) * 100;
  const bgPosY = (authoritativeTrauma.spritePos.row / 3) * 100;

  return (
    <SmartTooltip content={trauma.name} as="div">
      <div
        className={className}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundImage: "url('/images/trauma/trauma_traits.png')",
          backgroundSize: '500% 400%',
          backgroundPosition: `${bgPosX}% ${bgPosY}%`,
          backgroundRepeat: 'no-repeat',
          display: 'inline-block',
          flexShrink: 0,
          ...style
        }}
      />
    </SmartTooltip>
  );
}
