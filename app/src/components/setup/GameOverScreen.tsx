import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { motion } from 'framer-motion';

interface GameOverScreenProps {
  onReturn?: () => void;
}

export default function GameOverScreen({ onReturn }: GameOverScreenProps) {
  const victory = useGameStore(s => s.victory);
  const round = useGameStore(s => s.round);
  const fleetFavor = useGameStore(s => s.fleetFavor);
  const startingFleetFavor = useGameStore(s => s.startingFleetFavor);
  const gameOverReason = useGameStore(s => s.gameOverReason);
  const log = useGameStore(s => s.log);
  
  const earnedFF = fleetFavor - startingFleetFavor;

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--color-bg-deep)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 'var(--space-lg)'
    }}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="panel panel--glow"
        style={{
          padding: 'var(--space-lg)',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: victory
            ? '0 0 80px rgba(49, 151, 149, 0.5)'
            : '0 0 80px rgba(229, 62, 62, 0.5)'
        }}
        data-testid="game-over-screen"
      >
        <h1 style={{
          fontSize: '3rem',
          color: victory ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)',
          textShadow: victory ? 'var(--glow-cyan)' : '0 0 20px var(--color-hostile-red)',
          marginBottom: 'var(--space-sm)'
        }}>
          {victory ? 'SECTOR SECURED' : (gameOverReason.includes('retreated') ? 'MISSION ABANDONED' : 'SHIP DESTROYED')}
        </h1>

        <div className="label" style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
          {victory
            ? 'The enemy fleet has been neutralized. Your crew performed admirably.'
            : (gameOverReason.includes('retreated') 
                ? 'The fleet has retreated to safety. The objective remains unfulfilled.' 
                : 'The enemy has overwhelmed your ship. All hands lost.')}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
            <div className="label">Rounds Survived</div>
            <div className="mono" style={{ fontSize: '2rem', color: 'var(--color-holo-cyan)' }}>{round}</div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
            <div className="label">Fleet Favor</div>
            <div className="mono" style={{
              fontSize: '2rem',
              color: earnedFF >= 0 ? 'var(--color-holo-green)' : 'var(--color-hostile-red)'
            }}>
              {earnedFF >= 0 ? '+' : ''}{earnedFF}
            </div>
          </div>
        </div>

        {/* Last few log entries */}
        <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', textAlign: 'left', maxHeight: '150px', overflowY: 'auto', marginBottom: 'var(--space-lg)' }}>
          {log.slice(-5).reverse().map(entry => (
            <div key={entry.id} className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
              [{entry.type.toUpperCase()}] {entry.message}
            </div>
          ))}
        </div>

        <button
          className="btn"
          style={{ width: '100%', fontSize: '1.1rem' }}
          onClick={() => {
            const { campaign, onCombatEnd } = useCampaignStore.getState();
            if (campaign) {
              const { players, playerShips } = useGameStore.getState();
              onCombatEnd({ players, ships: playerShips, earnedFF });
              useGameStore.getState().resetGame();
            } else {
              useGameStore.getState().resetGame();
            }
            if (onReturn) onReturn();
          }}
          data-testid="return-to-menu-btn"
        >
          {useCampaignStore.getState().campaign ? 'RETURN TO COMMAND (CAMPAIGN)' : 'RETURN TO COMMAND'}
        </button>
      </motion.div>
    </div>
  );
}
