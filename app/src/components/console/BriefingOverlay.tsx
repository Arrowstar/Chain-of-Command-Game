import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import CombatScenarioProgressTracker from '../combat/CombatScenarioProgressTracker';
import EnemyTacticPanel from './EnemyTacticPanel';

export default function BriefingOverlay() {
  const round = useGameStore(s => s.round);
  const activeRoE = useGameStore(s => s.activeRoE);
  const roeOverridden = useGameStore(s => s.roeOverridden);
  const overrideRoE = useGameStore(s => s.overrideRoE);
  const advancePhase = useGameStore(s => s.advancePhase);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 10, 20, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      padding: 'var(--space-xl)',
    }}>
      <div className="panel panel--glow" style={{ width: '800px', maxWidth: '90vw', padding: 'var(--space-xl)' }}>
        <h1 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          ROUND {round} - INTELLIGENCE BRIEFING
        </h1>

        <div className="label" style={{ color: 'var(--color-holo-green)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          ALL COMMAND TOKENS REPLENISHED FOR ACTIVE OFFICERS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          {/* Rules of Engagement */}
          <div className="panel panel--raised">
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
                <div style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                  <strong>{activeRoE.rule}</strong>
                </div>

                <button
                  className="btn btn--danger"
                  style={{ width: '100%', fontSize: '0.8rem', padding: 'var(--space-sm)' }}
                  onClick={overrideRoE}
                >
                  INSUBORDINATION: OVERRIDE RoE (-3 Fleet Favor)
                </button>
              </>
            ) : (
              <div>No RoE generated for this scenario.</div>
            )}
          </div>

          <EnemyTacticPanel showGhostMakerAction />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <CombatScenarioProgressTracker variant="briefing" />
        </div>

        <button
          className="btn btn--execute"
          style={{ width: '100%', padding: 'var(--space-md)' }}
          onClick={advancePhase}
        >
          PROCEED TO COMMAND PHASE
        </button>
      </div>
    </div>
  );
}
