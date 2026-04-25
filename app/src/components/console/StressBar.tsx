import React from 'react';

export interface StressBarProps {
  currentStress: number;
  maxStress: number | null;
  officerName: string;
}

export default function StressBar({ currentStress, maxStress, officerName }: StressBarProps) {
  if (maxStress === null) {
    return (
      <div className="stress-bar" title={`${officerName}: Immune to Stress`}>
        <div className="label">Stress: Immune</div>
      </div>
    );
  }

  const percentage = Math.min(100, Math.max(0, (currentStress / maxStress) * 100));
  const isDanger = percentage >= 80;
  const isMax = currentStress >= maxStress;

  return (
    <div className="stress-bar" data-testid={`stress-bar-${officerName}`} title={`${currentStress} / ${maxStress} Stress`}>
      <div className="flex-between" style={{ marginBottom: '4px' }}>
        <span className="label" style={{ color: isMax ? 'var(--color-hostile-red)' : isDanger ? 'var(--color-alert-amber)' : 'var(--color-text-secondary)' }}>
          Stress {isMax && '(MAX)'}
        </span>
        <span className="mono" style={{ fontSize: '0.8rem', color: isMax ? 'var(--color-hostile-red)' : 'var(--color-text-dim)' }}>
          {currentStress} / {maxStress}
        </span>
      </div>
      <div 
        style={{ 
          width: '100%', 
          height: '6px', 
          background: 'var(--color-bg-deep)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}
      >
        <div 
          data-testid="stress-fill"
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: isMax ? 'var(--color-hostile-red)' : isDanger ? 'var(--color-alert-amber)' : 'var(--color-stress-orange)',
            transition: 'width 0.3s ease, background-color 0.3s ease',
            boxShadow: isMax ? 'var(--glow-red)' : isDanger ? 'var(--glow-amber)' : 'none'
          }}
        />
      </div>
    </div>
  );
}
