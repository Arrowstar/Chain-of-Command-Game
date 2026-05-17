import React, { useMemo, useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { ScoreLedgerEntry, ScoreSource } from '../../types/campaignTypes';

// ── Helpers ────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<ScoreSource, string> = {
  combat:    'COMBAT',
  attrition: 'ATTRITION',
  event:     'EVENT',
  economy:   'ECONOMY',
  sector:    'SECTOR',
  victory:   'VICTORY',
};

const SOURCE_COLORS: Record<ScoreSource, string> = {
  combat:    'var(--color-holo-cyan)',
  attrition: 'var(--color-hostile-red)',
  event:     '#a78bfa', // violet
  economy:   'var(--color-alert-amber)',
  sector:    'var(--color-holo-green)',
  victory:   '#fbbf24', // gold
};

function formatAmount(n: number): string {
  return n >= 0 ? `+${n.toLocaleString()}` : `${n.toLocaleString()}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export default function ScoreLedgerModal({ onClose }: Props) {
  const campaign = useCampaignStore(s => s.campaign);
  const [filterSource, setFilterSource] = useState<ScoreSource | 'all'>('all');

  const ledger: ScoreLedgerEntry[] = campaign?.scoreLedger ?? [];
  const currentScore = campaign?.currentScore ?? 0;

  const filtered = useMemo(
    () => filterSource === 'all' ? ledger : ledger.filter(e => e.source === filterSource),
    [ledger, filterSource],
  );

  // Sources present in this run (for filter buttons)
  const presentSources = useMemo(() => {
    const s = new Set(ledger.map(e => e.source));
    return Array.from(s) as ScoreSource[];
  }, [ledger]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel panel--glow"
        style={{
          width: '720px', maxWidth: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--color-bg-panel)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-holo-cyan)', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
              ⚓ FLEET COMMENDATION LEDGER
            </h2>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
              Full audit trail of all score adjustments
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label" style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>CURRENT SCORE</div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 'bold',
              color: currentScore >= 0 ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)',
              textShadow: currentScore >= 0 ? 'var(--glow-cyan)' : '0 0 10px var(--color-hostile-red)',
            }}>
              {currentScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          padding: '8px 16px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0,
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button
            className={`btn${filterSource === 'all' ? ' btn--primary' : ''}`}
            style={{ padding: '3px 10px', fontSize: '0.65rem' }}
            onClick={() => setFilterSource('all')}
          >
            ALL ({ledger.length})
          </button>
          {presentSources.map(src => (
            <button
              key={src}
              className={`btn${filterSource === src ? ' btn--primary' : ''}`}
              style={{
                padding: '3px 10px', fontSize: '0.65rem',
                borderColor: filterSource === src ? SOURCE_COLORS[src] : undefined,
                color: filterSource === src ? SOURCE_COLORS[src] : undefined,
              }}
              onClick={() => setFilterSource(filterSource === src ? 'all' : src)}
            >
              {SOURCE_LABELS[src]} ({ledger.filter(e => e.source === src).length})
            </button>
          ))}
        </div>

        {/* Ledger list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px', textAlign: 'center',
              color: 'var(--color-text-dim)', fontStyle: 'italic',
            }}>
              No score entries yet.
            </div>
          ) : (
            // Render newest first
            [...filtered].reverse().map((entry, idx) => {
              const isPositive = entry.amount >= 0;
              const color = isPositive ? 'var(--color-holo-green)' : 'var(--color-hostile-red)';
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto 90px',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    transition: 'background 120ms',
                  }}
                >
                  {/* Source badge */}
                  <div style={{
                    fontSize: '0.55rem',
                    fontFamily: 'var(--font-mono)',
                    color: SOURCE_COLORS[entry.source],
                    border: `1px solid ${SOURCE_COLORS[entry.source]}44`,
                    borderRadius: '4px',
                    padding: '2px 4px',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    §{entry.sector}<br />
                    {SOURCE_LABELS[entry.source].slice(0, 4)}
                  </div>

                  {/* Reason */}
                  <div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                      {entry.reason}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                      {formatDate(entry.timestamp)}
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 'bold',
                    color, textAlign: 'right',
                    textShadow: isPositive ? '0 0 8px rgba(0,255,128,0.4)' : '0 0 8px rgba(220,50,50,0.4)',
                  }}>
                    {formatAmount(entry.amount)}
                  </div>

                  {/* Running total */}
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                    color: 'var(--color-text-dim)', textAlign: 'right',
                  }}>
                    = {entry.runningTotal.toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
          background: 'rgba(0,0,0,0.2)',
        }}>
          <button className="btn" style={{ padding: '6px 20px' }} onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
