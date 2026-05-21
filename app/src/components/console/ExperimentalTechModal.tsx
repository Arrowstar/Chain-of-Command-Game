import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { ExperimentalTech } from '../../types/campaignTypes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  tactical: 'var(--color-hostile-red)',
  engineering: 'var(--color-holo-cyan)',
  command: 'var(--color-alert-amber)',
  crew: 'var(--color-holo-green)',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'var(--color-text-secondary)',
  uncommon: 'var(--color-holo-green)',
  rare: 'var(--color-crit-gold)',
};

export default function ExperimentalTechModal({ isOpen, onClose }: Props) {
  const experimentalTech = useGameStore(s => s.experimentalTech) || [];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 8, 16, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="tech-hub-modal"
    >
      <div
        className="panel panel--glow"
        style={{
          width: '640px',
          maxWidth: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-bg-panel)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 0 24px rgba(0, 204, 255, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            background: 'rgba(0, 204, 255, 0.03)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                color: 'var(--color-holo-cyan)',
                fontSize: '1rem',
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              ⚓ Experimental Tech Modules
            </h2>
            <div
              style={{
                color: 'var(--color-text-dim)',
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                marginTop: '2px',
              }}
            >
              {experimentalTech.length} Active System {experimentalTech.length === 1 ? 'Modifier' : 'Modifiers'}
            </div>
          </div>
          <button
            className="btn"
            style={{
              padding: '4px 12px',
              fontSize: '0.7rem',
              borderColor: 'var(--color-border)',
            }}
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>

        {/* Scrollable Tech List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
          {experimentalTech.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--color-text-dim)',
                fontStyle: 'italic',
                fontSize: '0.8rem',
              }}
            >
              No Experimental Tech modules active.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {experimentalTech.map(tech => {
                const categoryColor = CATEGORY_COLORS[tech.category] || 'var(--color-holo-cyan)';
                const rarityColor = RARITY_COLORS[tech.rarity] || 'var(--color-text-secondary)';
                
                return (
                  <div
                    key={tech.id}
                    className="panel panel--raised"
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      borderLeft: `3px solid ${categoryColor}`,
                      background: 'rgba(255, 255, 255, 0.01)',
                      alignItems: 'center',
                    }}
                    data-testid={`tech-card-${tech.id}`}
                  >
                    {/* Tech Icon */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        flexShrink: 0,
                        border: `1px solid ${categoryColor}`,
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(120, 130, 150, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        boxShadow: `0 0 8px ${categoryColor}15`,
                      }}
                    >
                      {tech.imagePath ? (
                        <img
                          src={tech.imagePath}
                          alt={tech.name}
                          draggable={false}
                          style={{
                            width: '80%',
                            height: '80%',
                            objectFit: 'contain',
                            opacity: tech.isConsumable && tech.isConsumed ? 0.35 : 1,
                            filter: tech.isConsumable && tech.isConsumed ? 'grayscale(100%)' : 'none',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: '0.45rem',
                            fontFamily: 'var(--font-mono)',
                            color: categoryColor,
                            textAlign: 'center',
                            lineHeight: 1.1,
                          }}
                        >
                          {tech.name.split(' ').map(w => w[0]).join('')}
                        </span>
                      )}
                    </div>

                    {/* Tech Details */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--color-text-bright)',
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {tech.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.58rem',
                            fontFamily: 'var(--font-mono)',
                            color: rarityColor,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            border: `1px solid ${rarityColor}40`,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'rgba(255, 255, 255, 0.02)',
                          }}
                        >
                          {tech.rarity}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.35,
                        }}
                      >
                        {tech.effect}
                      </div>

                      {tech.flavorText && (
                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: 'var(--color-text-dim)',
                            fontStyle: 'italic',
                            lineHeight: 1.3,
                            marginTop: '2px',
                          }}
                        >
                          {tech.flavorText}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: '0.58rem',
                          color: categoryColor,
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginTop: '2px',
                        }}
                      >
                        [{tech.category}] {tech.isConsumable ? '· CONSUMABLE' : ''} {tech.isConsumed ? '(USED)' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
