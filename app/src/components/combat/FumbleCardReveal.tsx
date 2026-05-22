import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FumbleCard } from '../../types/game';

interface FumbleCardRevealProps {
  card: FumbleCard | null;
  onAcknowledge: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'BRIDGE WIDE',
  helm: 'HELM STATION',
  tactical: 'TACTICAL STATION',
  engineering: 'ENGINEERING STATION',
  sensors: 'SENSORS STATION',
};

const CATEGORY_COLORS: Record<string, string> = {
  general: 'var(--color-hostile-red)',
  helm: 'var(--color-holo-cyan)',
  tactical: 'var(--color-hostile-red)',
  engineering: 'var(--color-alert-amber)',
  sensors: 'var(--color-holo-green)',
};

export default function FumbleCardReveal({ card, onAcknowledge }: FumbleCardRevealProps) {
  if (!card) return null;

  const categoryColor = CATEGORY_COLORS[card.category] || 'var(--color-alert-amber)';

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
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="panel panel--alert"
          style={{
            width: 'min(380px, 92vw)',
            maxHeight: 'min(600px, 90vh)',
            background: 'var(--color-bg-panel)',
            padding: 0,
            overflow: 'hidden',
            boxShadow: `0 0 80px ${categoryColor}`,
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
              borderBottom: `2px solid ${categoryColor}`,
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
                <span className="label" style={{ color: `color-mix(in srgb, ${categoryColor} 30%, transparent)` }}>
                  ART PLACEHOLDER
                </span>
              </div>
            )}

            {/* Station badge overlay */}
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
                border: `1px solid ${categoryColor}`,
                color: categoryColor,
                letterSpacing: '0.12em',
              }}
            >
              {CATEGORY_LABELS[card.category]}
            </div>
          </div>

          {/* Card body — scrollable if card is too tall for viewport */}
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
              <div className="label" style={{ color: categoryColor, marginBottom: '4px' }}>FUMBLE</div>
              <h3 style={{
                color: 'var(--color-text-bright)',
                fontSize: 'clamp(0.95rem, 4vw, 1.2rem)',
              }}>
                {card.name}
              </h3>
            </div>

            {/* Flavor text */}
            <div
              className="mono"
              style={{
                fontSize: 'clamp(0.65rem, 2.5vw, 0.72rem)',
                color: 'var(--color-text-dim)',
                fontStyle: 'italic',
                textAlign: 'center',
                lineHeight: 1.45,
                padding: 'var(--space-sm)',
                borderLeft: `2px solid ${categoryColor}`,
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0,
              }}
            >
              &ldquo;{card.flavorText}&rdquo;
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
              className="btn"
              style={{
                width: '100%',
                marginTop: 'auto',
                borderColor: categoryColor,
                color: categoryColor,
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
