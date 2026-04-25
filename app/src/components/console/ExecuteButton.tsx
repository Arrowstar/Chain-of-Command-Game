import React from 'react';
import { useGameStore } from '../../store/useGameStore';

export default function ExecuteButton() {
  const phase = useGameStore(s => s.phase);
  const advancePhase = useGameStore(s => s.advancePhase);

  const isCommandPhase = phase === 'command';

  return (
    <button 
      className={`btn btn--execute ${!isCommandPhase ? 'disabled' : ''}`}
      onClick={advancePhase}
      disabled={!isCommandPhase}
      data-testid="execute-button"
      style={{
        opacity: isCommandPhase ? 1 : 0.4,
        cursor: isCommandPhase ? 'pointer' : 'not-allowed',
        width: '100%',
        marginTop: 'var(--space-md)'
      }}
    >
      EXECUTE ORDERS
    </button>
  );
}
