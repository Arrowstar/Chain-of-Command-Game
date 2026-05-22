import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CriticalDamageCard } from '../../types/game';

interface CriticalCardRevealProps {
  card: CriticalDamageCard | null;
  onAcknowledge: () => void;
  shipName?: string;
}

export default function CriticalCardReveal({ card, onAcknowledge, shipName }: CriticalCardRevealProps) {
  if (!card) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'env(safe-area-inset-top, 8px) env(safe-area-inset-right, 8px) env(safe-area-inset-bottom, 8px) env(safe-area-inset-left, 8px)',
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
            width: 'min(380px, 92vw)',
            maxHeight: 'min(600px, 90vh)',
            background: 'var(--color-bg-panel)',
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 0 100px var(--color-hostile-red)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Art area */}
          <div
            style={{
              width: '100%',
              height: 'min(200px, 25vh)',
              minHeight: '100px',
              background: 'var(--color-bg-deep)',
              position: 'relative',
              overflow: 'hidden',
              borderBottom: '2px solid var(--color-hostile-red)',
              flexShrink: 0,
            }}
          >
            {card.imagePath ? (
              <img
                src={card.imagePath}
                alt={card.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `repeating-linear-gradient(45deg, var(--color-bg-surface) 0px, var(--color-bg-surface) 10px, var(--color-bg-panel) 10px, var(--color-bg-panel) 20px)`,
                }}
              >
                <span className="label" style={{ color: 'color-mix(in srgb, var(--color-hostile-red) 30%, transparent)' }}>
                  ART PLACEHOLDER
                </span>
              </div>
            )}

            {/* Critical badge overlay */}
            <div
              className="mono"
              style={{
                position: 'absolute',
                top: 'var(--space-sm)',
                right: 'var(--space-sm)',
                fontSize: 'clamp(0.5rem, 2.5vw, 0.55rem)',
                padding: '3px 8px',
                borderRadius: '3px',
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid var(--color-hostile-red)',
                color: 'var(--color-hostile-red)',
                letterSpacing: '0.12em',
              }}
            >
              CRITICAL
            </div>
          </div>

          {/* Card body — scrollable */}
          <div
            style={{
              padding: 'var(--space-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              overflowY: 'auto',
              flex: '1 1 auto',
            }}
          >
            {/* Title */}
            <div style={{ textAlign: 'center' }}>
              <div className="label" style={{ color: 'var(--color-hostile-red)', marginBottom: '4px' }}>CRITICAL DAMAGE</div>
              {shipName && (
                <div className="mono" style={{
                  fontSize: 'clamp(0.6rem, 2.5vw, 0.68rem)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                  letterSpacing: '0.08em',
                }}>
                  TARGET: {shipName.toUpperCase()}
                </div>
              )}
              <h3 style={{
                color: 'var(--color-text-bright)',
                fontSize: 'clamp(0.95rem, 4vw, 1.2rem)',
              }}>
                {card.name}
              </h3>
            </div>

            {/* Effect */}
            <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', flexShrink: 0 }}>
              <span className="label" style={{ color: 'var(--color-alert-amber)' }}>Effect</span>
              <div className="mono" style={{
                fontSize: 'clamp(0.7rem, 2.5vw, 0.78rem)',
                marginTop: '4px',
                color: 'var(--color-text-primary)',
              }}>
                {card.effect}
              </div>
            </div>

            {/* Acknowledge */}
            <button
              className="btn btn--danger"
              style={{
                width: '100%',
                marginTop: 'auto',
                flexShrink: 0,
                minHeight: '44px',
              }}
              onClick={onAcknowledge}
            >
              ACKNOWLEDGE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
