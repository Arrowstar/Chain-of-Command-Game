import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriticalDamageCard } from '../../types/game';

interface CriticalCardRevealProps {
  card: CriticalDamageCard | null;
  onAcknowledge: () => void;
}

export default function CriticalCardReveal({ card, onAcknowledge }: CriticalCardRevealProps) {
  if (!card) return null;

  return (
    <AnimatePresence>
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <motion.div
          data-testid="critical-card-modal"
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="panel panel--danger"
          style={{
            width: '350px',
            background: 'var(--color-bg-panel)',
            padding: 'var(--space-md)',
            boxShadow: '0 0 100px var(--color-hostile-red)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)'
          }}
        >
          <div style={{ textAlign: 'center', color: 'var(--color-hostile-red)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>CRITICAL DAMAGE</h2>
            <div className="label">TARGET COMPROMISED</div>
          </div>

          <div>
            <h3 style={{ color: 'white', marginBottom: '8px' }}>{card.name}</h3>
            <div className="panel panel--raised" style={{ padding: 'var(--space-sm)' }}>
              <span className="label" style={{ color: 'var(--color-alert-amber)' }}>Effect</span>
              <div className="mono" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                {card.effect}
              </div>
            </div>
          </div>

          <button className="btn btn--danger" style={{ width: '100%', marginTop: 'auto' }} onClick={onAcknowledge}>
            ACKNOWLEDGE
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
