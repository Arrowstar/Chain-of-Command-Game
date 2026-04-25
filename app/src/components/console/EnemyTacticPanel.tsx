import React from 'react';
import { useGameStore } from '../../store/useGameStore';

interface EnemyTacticPanelProps {
  showGhostMakerAction?: boolean;
}

export default function EnemyTacticPanel({ showGhostMakerAction = false }: EnemyTacticPanelProps) {
  const currentTactic = useGameStore(s => s.currentTactic);

  const ghostMakerButton = showGhostMakerAction ? (() => {
    const state = useGameStore.getState();
    const playerWithGhostMaker = state.players.find(p => p.officers.some(o => o.officerId === 'dvesh'));
    if (!playerWithGhostMaker || playerWithGhostMaker.commandTokens < 1) return null;

    return (
      <button
        className="btn btn--danger"
        style={{ marginTop: 'var(--space-sm)', width: '100%', fontSize: '0.8rem' }}
        onClick={() => useGameStore.getState().invokeGhostMaker(playerWithGhostMaker.id)}
      >
        ACTIVATE GHOST MAKER (-1 CT, +3 Stress to D&apos;Vesh)
      </button>
    );
  })() : null;

  return (
    <div className="panel panel--danger" style={{ padding: 'var(--space-md)' }}>
      <div className="label" style={{ color: 'var(--color-hostile-red)', marginBottom: 'var(--space-sm)' }}>
        CURRENT ENEMY TACTIC
      </div>
      {currentTactic ? (
        <>
          <h3 style={{ color: 'var(--color-hostile-red)', marginBottom: 'var(--space-xs)' }}>{currentTactic.name}</h3>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            {currentTactic.effect}
          </div>
          {ghostMakerButton}
        </>
      ) : (
        <div style={{ color: 'var(--color-text-dim)', lineHeight: 1.5 }}>
          No tactic is currently active.
        </div>
      )}
    </div>
  );
}
