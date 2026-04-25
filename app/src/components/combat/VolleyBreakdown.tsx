import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DiceVisual from './DiceVisual';
import type { VolleyResult } from '../../types/game';
import type { DamageResult } from '../../engine/combat';

export interface VolleyResultItem {
  damageResult: DamageResult;
  defenderId: string;
  defenderName: string;
  outOfArc: boolean;
  outOfRange?: boolean;
}

interface VolleyBreakdownProps {
  results?: VolleyResultItem[];
  // Legacy support just in case
  damageResult?: DamageResult | null;
  outOfArc?: boolean;
  defenderId?: string;
  
  weaponName?: string;
  attackerId?: string;
  onClose: () => void;
}

export default function VolleyBreakdown({ results, damageResult, outOfArc, weaponName, attackerId, defenderId, onClose }: VolleyBreakdownProps) {
  const [showDamage, setShowDamage] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Normalize single/legacy props into results array
  const items: VolleyResultItem[] = results || (damageResult ? [{
    damageResult,
    defenderId: defenderId || 'Unknown',
    defenderName: defenderId || 'Unknown',
    outOfArc: outOfArc || false,
    outOfRange: damageResult.outOfRange || false,
  }] : []);

  useEffect(() => {
    if (items.length > 0) {
      setShowDamage(false);
      const timer = setTimeout(() => setShowDamage(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [items]);

  if (items.length === 0) return null;

  const currentItem = items[activeTabIndex];
  const volley = currentItem.damageResult.volleyResult;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="volley-breakdown-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="panel panel--glow"
        style={{
          width: '500px',
          background: 'var(--color-bg-panel)',
          zIndex: 1000,
          padding: 'var(--space-md)',
          boxShadow: '0 0 50px rgba(0,0,0,0.8)'
        }}
      >
        <h2 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
          Volley Resolution{weaponName ? ` — ${weaponName}` : ''}
        </h2>

        {items.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px', borderBottom: '1px solid var(--color-border)' }}>
            {items.map((item, idx) => (
              <button
                key={`tab-${idx}`}
                onClick={() => { setActiveTabIndex(idx); setShowDamage(true); }}
                style={{
                  background: activeTabIndex === idx ? 'var(--color-holo-cyan)' : 'transparent',
                  color: activeTabIndex === idx ? '#000' : 'var(--color-text-primary)',
                  border: '1px solid var(--color-holo-cyan)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.defenderName}
              </button>
            ))}
          </div>
        )}

        {currentItem.outOfArc && (
          <div style={{ 
            padding: 'var(--space-sm)', 
            background: 'rgba(229,62,62,0.15)', 
            border: '1px solid var(--color-hostile-red)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-md)',
            textAlign: 'center'
          }}>
            <div className="mono" style={{ color: 'var(--color-hostile-red)', fontSize: '0.9rem' }}>
              ⚠ TARGET OUT OF FIRING ARC
            </div>
            <div className="label" style={{ marginTop: '4px' }}>
              {attackerId} fired {weaponName} but {currentItem.defenderName} was outside the weapon's arc.
              <br />No damage applied.
            </div>
          </div>
        )}

        {currentItem.outOfRange && !currentItem.outOfArc && (
          <div style={{ 
            padding: 'var(--space-sm)', 
            background: 'rgba(229,62,62,0.15)', 
            border: '1px solid var(--color-hostile-red)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 'var(--space-md)',
            textAlign: 'center'
          }}>
            <div className="mono" style={{ color: 'var(--color-hostile-red)', fontSize: '0.9rem' }}>
              ⚠ TARGET OUT OF EFFECTIVE RANGE
            </div>
            <div className="label" style={{ marginTop: '4px' }}>
              {attackerId} fired {weaponName} but {currentItem.defenderName} was outside the weapon's effective range.
              <br />No damage applied.
            </div>
          </div>
        )}
        
        {!currentItem.outOfArc && !currentItem.outOfRange && (
          <>
            <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'var(--color-bg-deep)' }}>
              <div className="flex-between" style={{ marginBottom: '6px' }}>
                <div className="label">Target Number ({currentItem.defenderName})</div>
                <div className="mono" style={{ fontSize: '1.5rem', color: 'var(--color-alert-amber)' }}>{volley.targetNumber}</div>
              </div>
              {(() => {
                const b = currentItem.damageResult.tnBreakdown;
                if (!b) return null;
                const rows: { label: string; value: number }[] = [
                  { label: 'Base Evasion', value: b.baseEvasion },
                  { label: `Range Modifier`, value: b.rangeModifier },
                  { label: 'Terrain', value: b.terrainModifier },
                  { label: 'Evasive Maneuvers', value: b.evasiveManeuvers },
                  { label: 'Target Lock', value: b.targetLockModifier },
                  { label: 'Small Craft Tracking', value: b.trackingBonus },
                  { label: 'Other', value: b.otherModifiers },
                ].filter(r => r.value !== 0);
                if (rows.length === 0) return null;
                return (
                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {rows.map(row => (
                      <div key={row.label} className="flex-between" style={{ fontSize: '0.72rem' }}>
                        <span className="label" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                        <span className="mono" style={{ color: row.value > 0 ? 'var(--color-alert-amber)' : 'var(--color-holo-green)' }}>
                          {row.value > 0 ? `+${row.value}` : row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              {volley.dice.map((dieResult: any, i: number) => {
                const label = dieResult.source ? dieResult.source.toUpperCase() : 'BASIC';
                return (
                <div key={`die-group-${activeTabIndex}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '4px' }}>
                  <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {dieResult.rolls.map((rollValue: number, rollIdx: number) => (
                    <React.Fragment key={`roll-${activeTabIndex}-${i}-${rollIdx}`}>
                      {rollIdx > 0 && (
                        <span className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '1rem', lineHeight: 1 }}>+</span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        {rollIdx > 0 && (
                          <span className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.5rem' }}>EXPLODED</span>
                        )}
                        <DiceVisual
                          dieType={dieResult.dieType}
                          finalResult={rollValue}
                          isExploded={rollIdx < dieResult.rolls.length - 1}
                          isHit={rollValue >= volley.targetNumber}
                        />
                      </div>
                    </React.Fragment>
                  ))}
                  </div>
                </div>
              )})}
            </div>

            {showDamage && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}
              >
                <div className="label" style={{ fontSize: '1.2rem', marginBottom: 'var(--space-xs)' }}>
                  Total Hits: <span style={{ color: 'var(--color-hostile-red)' }}>{volley.totalHits}</span>
                </div>
                {volley.totalHits > 0 && (
                  <div className="mono" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-sm)', letterSpacing: '1px' }}>
                    {currentItem.damageResult.hullDamage === 0 && currentItem.damageResult.shieldHits > 0 && (
                      <span style={{ color: 'var(--color-holo-cyan)' }}>IMPACT ABSORBED BY SHIELDS</span>
                    )}
                    {currentItem.damageResult.hullDamage > 0 && currentItem.damageResult.shieldHits > 0 && (
                      <span style={{ color: 'var(--color-alert-amber)' }}>SHIELDS PIERCED</span>
                    )}
                    {currentItem.damageResult.hullDamage > 0 && currentItem.damageResult.shieldHits === 0 && (
                      <span style={{ color: 'var(--color-hostile-red)' }}>DIRECT HULL IMPACT</span>
                    )}
                  </div>
                )}
                {volley.totalHits > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                    <div className="panel panel--raised" style={{ padding: 'var(--space-xs)' }}>
                      <span className="label">Shield Damage</span>
                      <div className="mono" style={{ color: 'var(--color-holo-cyan)' }}>{currentItem.damageResult.shieldHits ?? 0}</div>
                    </div>
                    <div className="panel panel--raised" style={{ padding: 'var(--space-xs)' }}>
                      <span className="label">Hull Damage</span>
                      {currentItem.damageResult.overflowHits > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {currentItem.damageResult.overflowHits} (Overflow)
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <span className="mono" style={{ color: 'var(--color-text-primary)' }}>-</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <DiceVisual dieType={currentItem.damageResult.armorDie} finalResult={currentItem.damageResult.armorRoll} isHit={false} />
                              <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>ARMOR</span>
                            </div>
                            <span className="mono" style={{ color: 'var(--color-text-primary)' }}>=</span>
                            <div className="mono" style={{ color: 'var(--color-hostile-red)', fontSize: '1.2rem' }}>{currentItem.damageResult.hullDamage}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mono" style={{ color: 'var(--color-hostile-red)' }}>{currentItem.damageResult.hullDamage ?? 0}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mono" style={{ color: 'var(--color-holo-cyan)' }}>ATTACK MISSED / MITIGATED</div>
                )}
              </motion.div>
            )}
          </>
        )}
        
        {(!currentItem.outOfArc && !currentItem.outOfRange ? showDamage : true) && (
          <button className="btn" style={{ marginTop: 'var(--space-md)', width: '100%' }} onClick={onClose}>
            Acknowledge {items.length > 1 ? `(${activeTabIndex + 1}/${items.length})` : ''}
          </button>
        )}

      </motion.div>
    </AnimatePresence>
  );
}
