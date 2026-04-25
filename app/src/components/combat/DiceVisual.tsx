import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface DiceVisualProps {
  dieType: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
  finalResult: number;
  isExploded?: boolean;
  isHit?: boolean;
  onAnimationComplete?: () => void;
}

export default function DiceVisual({ dieType, finalResult, isExploded, isHit, onAnimationComplete }: DiceVisualProps) {
  const [displayValue, setDisplayValue] = useState<number | string>('?');
  const [isRolling, setIsRolling] = useState(true);

  // Parse max side
  const safeDieType = dieType || 'd6';
  const max = parseInt(safeDieType.substring(1), 10) || 6;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRolling) {
      interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * max) + 1);
      }, 50);

      // Stop after ~600ms
      setTimeout(() => {
        clearInterval(interval);
        setIsRolling(false);
        setDisplayValue(finalResult);
        if (onAnimationComplete) onAnimationComplete();
      }, 600);
    }
    return () => clearInterval(interval);
  }, [finalResult, max, isRolling, onAnimationComplete]);

  // Color mapping per die type
  const colorMap = {
    'd4': 'var(--color-text-dim)',
    'd6': '#319795', // Cyan
    'd8': '#DD6B20', // Orange
    'd10': '#D6BCFA', // Purple
    'd12': '#3182CE', // Blue
    'd20': '#E53E3E'  // Red
  };

  const bg = colorMap[safeDieType as keyof typeof colorMap] || '#319795';

  return (
    <motion.div
      data-testid={`dice-visual-${safeDieType}`}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '50px',
        height: '50px',
        background: bg,
        color: '#fff',
        borderRadius: 'var(--radius-sm)',
        boxShadow: isHit
          ? `0 0 12px rgba(72,230,130,0.8)`
          : isExploded
          ? `0 0 15px ${bg}`
          : 'none',
        border: isHit
          ? '2px solid #48E682'
          : isExploded
          ? '2px solid white'
          : '1px solid rgba(0,0,0,0.5)',
        opacity: isHit === false ? 0.5 : 1,
        position: 'relative'
      }}
    >
      <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{displayValue}</span>
      <span style={{ fontSize: '0.6rem', opacity: 0.8, marginTop: '-4px' }}>{safeDieType}</span>
      {isExploded && (
        <motion.span 
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{ position: 'absolute', top: -10, right: -10, fontSize: '0.8rem', background: 'white', color: 'black', borderRadius: '50%', padding: '2px 4px' }}
        >
          💥
        </motion.span>
      )}
    </motion.div>
  );
}
