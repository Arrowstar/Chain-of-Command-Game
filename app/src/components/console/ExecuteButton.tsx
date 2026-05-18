import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useTutorialStore } from '../../store/useTutorialStore';

export default function ExecuteButton() {
  const phase = useGameStore(s => s.phase);
  const advancePhase = useGameStore(s => s.advancePhase);
  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const [showConfirm, setShowConfirm] = useState(false);

  const tutorialActive = useTutorialStore(s => s.isActive);
  const isFreePlay = useTutorialStore(s => s.isFreePlay);
  const currentStep = useTutorialStore(s => s.currentStep);
  const steps = useTutorialStore(s => s.steps);

  const isCommandPhase = phase === 'command';
  const currentStepObj = steps[currentStep];
  const canExecute = isCommandPhase && (!tutorialActive || isFreePlay || currentStepObj?.waitForCondition === 'PHASE_EXECUTION');
  
  const playersWithUnspent = players.filter(p => p.commandTokens > 0);

  const handleExecuteClick = () => {
    if (playersWithUnspent.length > 0) {
      setShowConfirm(true);
    } else {
      advancePhase();
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    advancePhase();
  };

  return (
    <>
      <button 
        className={`btn btn--execute ${!canExecute ? 'disabled' : ''}`}
        onClick={handleExecuteClick}
        disabled={!canExecute}
        data-testid="execute-button"
        style={{
          opacity: canExecute ? 1 : 0.4,
          cursor: canExecute ? 'pointer' : 'not-allowed',
          width: '100%',
          marginTop: 'var(--space-md)'
        }}
      >
        EXECUTE ORDERS
      </button>

      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="panel" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', minWidth: '320px' }}>
            <h3 style={{ color: 'var(--color-alert-amber)', margin: 0 }}>Unspent Command Tokens</h3>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              The following commanders still have unspent command tokens:
            </p>
            <ul style={{ color: 'var(--color-text-bright)', paddingLeft: '20px', margin: 0 }}>
              {playersWithUnspent.map(p => {
                const ship = playerShips.find(s => s.id === p.shipId);
                return (
                  <li key={p.id}>
                    {p.name} ({ship?.name ?? 'Unknown Ship'}): <span style={{ color: 'var(--color-holo-cyan)' }}>{p.commandTokens} CT</span>
                  </li>
                );
              })}
            </ul>
            <p style={{ color: 'var(--color-text-dim)', margin: 0, fontSize: '0.9rem' }}>
              Are you sure you want to proceed to the execution phase?
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              <button className="btn btn--execute" onClick={handleConfirm}>Proceed Anyway</button>
              <button className="btn" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
