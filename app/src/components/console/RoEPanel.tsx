import React from 'react';
import { useGameStore } from '../../store/useGameStore';

interface RoEPanelProps {
  showOverrideAction?: boolean;
}

export default function RoEPanel({ showOverrideAction = false }: RoEPanelProps) {
  const activeRoE = useGameStore(s => s.activeRoE);
  const roeOverridden = useGameStore(s => s.roeOverridden);
  const overrideRoE = useGameStore(s => s.overrideRoE);

  return (
    <div className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
      <div className="label" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
         {roeOverridden ? 'OVERRIDDEN' : 'ACTIVE RULES OF ENGAGEMENT'}
      </div>
      {roeOverridden ? (
        <div style={{ color: 'var(--color-alert-amber)', fontStyle: 'italic', padding: 'var(--space-md) 0' }}>
           "The War Council has rejected High Command's directives. We are operating on our own parameters now."
        </div>
      ) : activeRoE ? (
        <>
          <div style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            DOCTRINE: {activeRoE.doctrine.replace(/([A-Z])/g, ' $1').trim()}
          </div>
          <h3 style={{ color: 'var(--color-text-bright)', marginBottom: 'var(--space-xs)' }}>{activeRoE.name}</h3>
          <div style={{ fontStyle: 'italic', fontSize: '0.85rem', marginBottom: 'var(--space-sm)', color: 'var(--color-text-dim)' }}>
            "{activeRoE.flavorText}"
          </div>
          <div style={{ fontSize: '0.9rem', marginBottom: showOverrideAction ? 'var(--space-md)' : 0 }}>
            <strong>{activeRoE.rule}</strong>
          </div>

          {showOverrideAction && (
            <button
              className="btn btn--danger"
              style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-sm)' }}
              onClick={overrideRoE}
            >
              INSUBORDINATION: OVERRIDE RoE (-3 Fleet Favor)
            </button>
          )}
        </>
      ) : (
        <div style={{ color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
          No RoE generated for this scenario.
        </div>
      )}
    </div>
  );
}
