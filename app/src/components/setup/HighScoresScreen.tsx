import React, { useEffect, useState } from 'react';
import { HighScoreManager } from '../../utils/HighScoreManager';
import type { HighScoreRecord } from '../../types/campaignTypes';

// ── Helpers ────────────────────────────────────────────────────────

const GRADE_COLORS: Record<HighScoreRecord['grade'], string> = {
  S: '#fbbf24',
  A: 'var(--color-holo-green)',
  B: 'var(--color-holo-cyan)',
  C: 'var(--color-alert-amber)',
  D: '#f97316',
  F: 'var(--color-hostile-red)',
};

const DIFF_LABELS: Record<string, string> = {
  easy:   'EASY',
  normal: 'NORMAL',
  hard:   'HARD',
};

const DIFF_COLORS: Record<string, string> = {
  easy:   'var(--color-holo-green)',
  normal: 'var(--color-alert-amber)',
  hard:   'var(--color-hostile-red)',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export default function HighScoresScreen({ onClose }: Props) {
  const [scores, setScores] = useState<HighScoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    void HighScoreManager.getHighScores().then(s => {
      setScores(s);
      setLoading(false);
    });
  }, []);

  const handleClear = async () => {
    await HighScoreManager.clearHighScores();
    setScores([]);
    setConfirmClear(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="panel panel--glow"
        style={{
          width: '820px', maxWidth: '100%', maxHeight: '92vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--color-bg-panel)',
          borderRadius: '8px', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(0,204,255,0.04)',
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-holo-cyan)', fontSize: '1.25rem', fontFamily: 'var(--font-mono)', textShadow: 'var(--glow-cyan)' }}>
              ★ FLEET COMMENDATION RECORDS
            </h2>
            <div style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem', marginTop: '2px' }}>
              {scores.length} completed run{scores.length !== 1 ? 's' : ''} on file
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {scores.length > 0 && (
              confirmClear ? (
                <>
                  <span style={{ color: 'var(--color-hostile-red)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                    Confirm clear?
                  </span>
                  <button className="btn" style={{ padding: '4px 12px', fontSize: '0.75rem', borderColor: 'var(--color-hostile-red)', color: 'var(--color-hostile-red)' }} onClick={() => void handleClear()}>
                    YES
                  </button>
                  <button className="btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => setConfirmClear(false)}>
                    CANCEL
                  </button>
                </>
              ) : (
                <button className="btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => setConfirmClear(true)}>
                  CLEAR ALL
                </button>
              )
            )}
            <button className="btn btn--secondary" style={{ padding: '6px 16px' }} onClick={onClose}>
              CLOSE
            </button>
          </div>
        </div>

        {/* Column headers */}
        {scores.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 70px 80px 80px 60px',
            gap: '8px',
            padding: '6px 16px',
            borderBottom: '1px solid var(--color-border)',
            background: 'rgba(0,0,0,0.3)',
            flexShrink: 0,
          }}>
            {['#', 'RUN', 'DIFF', 'SECTORS', 'SCORE', 'GRADE'].map(col => (
              <div key={col} className="label" style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>
                {col}
              </div>
            ))}
          </div>
        )}

        {/* Score list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '2px' }}>
                RETRIEVING RECORDS...
              </div>
            </div>
          ) : scores.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚓</div>
              <div style={{ color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                No records on file. Complete a campaign to earn your first commendation.
              </div>
            </div>
          ) : (
            scores.map((record, idx) => {
              const isExpanded = expandedId === record.id;
              const gradeColor = GRADE_COLORS[record.grade];
              return (
                <div key={record.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 70px 80px 80px 60px',
                      gap: '8px',
                      padding: '10px 16px',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(0,204,255,0.05)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      transition: 'background 150ms',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    {/* Rank */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: idx < 3 ? '#fbbf24' : 'var(--color-text-dim)', textAlign: 'center' }}>
                      {idx + 1}
                    </div>

                    {/* Run info */}
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: record.victory ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)' }}>
                        {record.victory ? '✓ VICTORY' : '✗ DEFEAT'}
                        <span style={{ color: 'var(--color-text-dim)', marginLeft: '8px', fontSize: '0.75rem' }}>
                          {record.runLabel}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', marginTop: '2px' }}>
                        {formatDate(record.completedAt)} · ×{record.difficultyMultiplier} multiplier
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: DIFF_COLORS[record.difficulty] }}>
                      {DIFF_LABELS[record.difficulty]}
                    </div>

                    {/* Sectors */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-text-primary)', textAlign: 'center' }}>
                      {record.sectorsCleared} / 3
                    </div>

                    {/* Score */}
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-alert-amber)', textAlign: 'right' }}>
                      {record.finalScore.toLocaleString()}
                    </div>

                    {/* Grade */}
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 'bold',
                      color: gradeColor, textAlign: 'center',
                      textShadow: `0 0 12px ${gradeColor}88`,
                    }}>
                      {record.grade}
                    </div>
                  </div>

                  {/* Expanded fleet detail */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 16px', background: 'rgba(0,0,0,0.3)' }}>
                      <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <span className="label" style={{ color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>FLEET COMPOSITION AT RUN END</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {record.shipSnapshots.map(ship => (
                          <div key={ship.shipId} className="panel" style={{
                            padding: '10px 14px', flex: '1 1 220px', minWidth: '180px',
                            border: '1px solid rgba(0,204,255,0.2)',
                          }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--color-holo-cyan)', marginBottom: '6px' }}>
                              {ship.shipName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>
                              Chassis: <span style={{ color: 'var(--color-text-secondary)' }}>{ship.chassisId}</span>
                            </div>
                            {ship.officers.length > 0 && (
                              <div style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                                <div style={{ color: 'var(--color-text-dim)', marginBottom: '2px' }}>Officers:</div>
                                {ship.officers.map(o => (
                                  <div key={o.officerId} style={{ color: 'var(--color-text-secondary)', paddingLeft: '8px' }}>
                                    {o.station.toUpperCase()} — {o.tier.toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            )}
                            {ship.equippedWeapons.filter(Boolean).length > 0 && (
                              <div style={{ fontSize: '0.7rem' }}>
                                <span style={{ color: 'var(--color-text-dim)' }}>Weapons: </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                  {ship.equippedWeapons.filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
