import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getOfficerById } from '../../data/officers';
import { useUIStore } from '../../store/useUIStore';

const AstroCafNotification: React.FC = () => {
  const { players, playerShips, pendingAstroCafPlayers, resolveAstroCaf } = useGameStore();

  if (pendingAstroCafPlayers.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '24px',
        zIndex: 200,
        background: 'rgba(12, 18, 28, 0.95)',
        border: '1px solid var(--color-holo-cyan)',
        padding: '16px',
        borderRadius: '8px',
        width: '320px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5), 0 0 8px rgba(0, 204, 255, 0.2)',
        pointerEvents: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--color-holo-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>☕</span> Astro-Caf Synthesizer
      </h3>
      <p style={{ fontSize: '0.8rem', color: '#a0a0a0', margin: '0 0 16px 0', lineHeight: 1.4 }}>
        Commanders may order a coffee on the bridge to relieve stress from one officer.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {pendingAstroCafPlayers.map(playerId => {
          const player = players.find(p => p.id === playerId);
          if (!player) return null;
          const ship = playerShips.find(s => s.id === player.shipId);
          
          return (
            <div key={playerId} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ui-text)', marginBottom: '8px' }}>
                {player.name} ({ship?.name})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {player.officers.filter(o => o.currentStress > 0).map(officer => {
                  const data = getOfficerById(officer.officerId);
                  return (
                    <button
                      key={officer.officerId}
                      className="btn"
                      style={{
                        padding: '6px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => resolveAstroCaf(playerId, officer.officerId)}
                    >
                      <span>{data?.name || officer.station}</span>
                      <span style={{ color: 'var(--color-alert-amber)' }}>{officer.currentStress} Stress</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AstroCafNotification;
