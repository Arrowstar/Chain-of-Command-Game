import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import CommandToken from './CommandToken';
import { getScarImpactLegendText, getScarStatusMeta, getScarTooltip } from './scarStatus';
import { getCurrentCtDisplayState } from '../../engine/commandTokens';

export default function CaptainHand() {
  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const round = useGameStore(s => s.round);
  const activeRoE = useGameStore(s => s.activeRoE);
  const combatModifiers = useGameStore(s => s.combatModifiers);
  const player = players[0];

  if (!player) return null;
  const ship = playerShips.find(entry => entry.id === player.shipId);

  const ctDisplay = getCurrentCtDisplayState({
    player,
    round,
    activeRoE,
    combatModifiers,
    shipScars: ship?.scars ?? [],
  });

  const allTokenIds = Array.from({ length: ctDisplay.maxVisualSlots }, (_, i) => `ct-${player.id}-${i}`);
  const spentCount = ctDisplay.maxVisualSlots - player.commandTokens;
  const ctSummaryTooltip = [
    `Base CT: ${ctDisplay.baseCt}`,
    `Round-start CT: ${ctDisplay.roundStartCt}`,
    `Live pool this round: ${ctDisplay.totalTokensThisRound}`,
    ...ctDisplay.modifiers.map(modifier => `${modifier.label}: ${modifier.description}`),
  ].join('\n');

  return (
    <div className="panel panel--glow" style={{ padding: 'var(--space-md)' }}>
      <div className="label" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-holo-cyan)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Command Token Pool</span>
        <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          {player.commandTokens}/{ctDisplay.maxVisualSlots}
        </span>
      </div>
      <div
        className="mono"
        title={ctSummaryTooltip}
        style={{
          marginBottom: 'var(--space-sm)',
          fontSize: '0.68rem',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span>Base {ctDisplay.baseCt} CT</span>
        <span>Round Start {ctDisplay.roundStartCt}</span>
        <span>Live Pool {ctDisplay.totalTokensThisRound}</span>
      </div>
      {ctDisplay.modifiers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-sm)' }}>
          {ctDisplay.modifiers.map(modifier => (
            <span
              key={modifier.id}
              className="mono"
              title={modifier.description}
              style={{
                fontSize: '0.66rem',
                color: modifier.amount >= 0 ? 'var(--color-holo-cyan)' : 'var(--color-alert-amber)',
                border: `1px solid ${modifier.amount >= 0 ? 'rgba(0, 204, 255, 0.35)' : 'rgba(255, 170, 0, 0.3)'}`,
                background: modifier.amount >= 0 ? 'rgba(0, 204, 255, 0.08)' : 'rgba(255, 170, 0, 0.08)',
                borderRadius: '999px',
                padding: '3px 8px',
                cursor: 'help',
              }}
            >
              {modifier.label}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-sm)',
          minHeight: '40px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {allTokenIds.map((id, idx) => {
          // Spent tokens are the earliest-indexed ones (left side)
          const isSpent = idx < spentCount;
          return (
            <CommandToken key={id} id={id} isAssigned={isSpent} />
          );
        })}
        {player.maxCommandTokens === 0 && (
          <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
            POOL DEPLETED
          </span>
        )}
      </div>
      {ship && ship.scars.length > 0 && (
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ color: 'var(--color-alert-amber)' }}>
              Persistent Damage
            </span>
            <span
              className="mono"
              title={getScarImpactLegendText()}
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-alert-amber)',
                border: '1px solid rgba(255, 170, 0, 0.3)',
                background: 'rgba(255, 170, 0, 0.08)',
                borderRadius: '999px',
                padding: '2px 7px',
                cursor: 'help',
                lineHeight: 1,
              }}
            >
              ?
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ship.scars.map(scar => {
              const meta = getScarStatusMeta(scar.fromCriticalId);
              return (
                <span
                  key={scar.id}
                  title={getScarTooltip(scar)}
                  className="mono"
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--color-alert-amber)',
                    border: '1px solid rgba(255, 170, 0, 0.3)',
                    background: 'rgba(255, 170, 0, 0.08)',
                    borderRadius: '999px',
                    padding: '3px 8px',
                    cursor: 'help',
                  }}
                >
                  {meta.shortImpact}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
