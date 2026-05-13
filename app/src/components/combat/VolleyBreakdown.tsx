import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DiceVisual from './DiceVisual';
import type { VolleyResult } from '../../types/game';
import type { DamageResult } from '../../engine/combat';
import { useGameStore } from '../../store/useGameStore';
import { useViewport } from '../../utils/useViewport';
import TouchTooltipPortal from '../TouchTooltipPortal';

export interface VolleyResultItem {
  damageResult: DamageResult;
  defenderId: string;
  defenderName: string;
  outOfArc: boolean;
  outOfRange?: boolean;
  logEntryId?: string;
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


function BreakdownRow({
  id,
  activeTooltip,
  setActiveTooltip,
  isCoarsePointer,
  tooltipText,
  label,
  valueNode,
  containerStyle
}: {
  id: string;
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
  isCoarsePointer: boolean;
  tooltipText: string;
  label: React.ReactNode;
  valueNode: React.ReactNode;
  containerStyle?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isSelected = activeTooltip === id;

  return (
    <div
      ref={ref}
      className="flex-between"
      style={{ fontSize: '0.75rem', position: 'relative', ...containerStyle }}
      title={isCoarsePointer ? undefined : tooltipText}
      onClick={(e) => {
        if (isCoarsePointer) {
          e.stopPropagation();
          setActiveTooltip(isSelected ? null : id);
        }
      }}
    >
      {label}
      {valueNode}
      {isCoarsePointer && (
        <TouchTooltipPortal show={isSelected} anchorRef={ref}>
          {tooltipText}
        </TouchTooltipPortal>
      )}
    </div>
  );
}

export default function VolleyBreakdown({ results, damageResult, outOfArc, weaponName, attackerId, defenderId, onClose }: VolleyBreakdownProps) {
  const [showDamage, setShowDamage] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const { playerShips, enemyShips, stations, fighterTokens, getShipName } = useGameStore();
  const { isCoarsePointer } = useViewport();
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getAllegianceColor = (id: string) => {
    if (playerShips.some(s => s.id === id)) return 'var(--color-holo-cyan)';
    if (fighterTokens.some(f => f.id === id && f.faction === 'allied')) return 'var(--color-holo-cyan)';
    if (enemyShips.some(s => s.id === id)) return 'var(--color-hostile-red)';
    if (stations.some(s => s.id === id)) return 'var(--color-hostile-red)';
    if (fighterTokens.some(f => f.id === id && f.faction === 'hegemony')) return 'var(--color-hostile-red)';
    return 'var(--color-text-secondary)';
  };

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

  const attackerName = attackerId ? getShipName(attackerId) : 'Unknown Attacker';
  const attackerColor = attackerId ? getAllegianceColor(attackerId) : 'var(--color-text-secondary)';
  const defColor = currentItem.defenderId ? getAllegianceColor(currentItem.defenderId) : 'var(--color-text-secondary)';

  return (
    <AnimatePresence>
      <motion.div
        data-testid="volley-breakdown-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="panel panel--glow"
        onClick={() => isCoarsePointer && setActiveTooltip(null)}
        style={{
          width: '500px',
          background: 'var(--color-bg-panel)',
          zIndex: 1000,
          padding: 'var(--space-md)',
          boxShadow: '0 0 50px rgba(0,0,0,0.8)'
        }}
      >
        <h2 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginBottom: '4px', textTransform: 'uppercase' }}>
          Volley Resolution
        </h2>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Attacker: <span style={{ color: attackerColor }}>{attackerName} {weaponName ? `(${weaponName})` : ''}</span>
          </div>
          <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Defender: <span style={{ color: defColor }}>{currentItem.defenderName}</span>
          </div>
        </div>

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
                let rows: { label: string; value: number }[] = [
                  { label: 'Base Evasion', value: b.baseEvasion },
                  { label: `Range Modifier`, value: b.rangeModifier },
                  { label: 'Terrain', value: b.terrainModifier },
                  { label: 'Evasive Maneuvers', value: b.evasiveManeuvers },
                  { label: 'Target Lock', value: b.targetLockModifier },
                  { label: 'Small Craft Tracking', value: b.trackingBonus },
                ];
                if (b.namedModifiers) {
                  b.namedModifiers.forEach(mod => {
                    rows.push({ label: mod.name, value: mod.value });
                  });
                }
                rows = rows.filter(r => r.value !== 0);
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                  {dieResult.rolls.map((rollValue: number, rollIdx: number) => {
                    const isHit = rollValue >= volley.targetNumber;
                    return (
                    <React.Fragment key={`roll-${activeTabIndex}-${i}-${rollIdx}`}>
                      {rollIdx > 0 && (
                        <span className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '1rem', lineHeight: 1, alignSelf: 'center', marginTop: '-15px' }}>+</span>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        {rollIdx > 0 && (
                          <span className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.5rem' }}>EXPLODED</span>
                        )}
                        <DiceVisual
                          dieType={dieResult.dieType}
                          finalResult={rollValue}
                          isExploded={rollIdx < dieResult.rolls.length - 1}
                          isHit={isHit}
                          isCriticalHit={isHit && dieResult.isCritical}
                        />
                        {isHit && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="mono" style={{ 
                              fontSize: '0.55rem', 
                              marginTop: '4px',
                              fontWeight: 'bold',
                              letterSpacing: '0.5px',
                              color: dieResult.isCritical ? 'var(--color-alert-amber)' : 'var(--color-holo-cyan)' 
                            }}>
                              {dieResult.isCritical ? 'PIERCING' : 'STANDARD'}
                            </span>
                            {dieResult.isConverted && (
                              <span className="mono" style={{ 
                                fontSize: '0.5rem', 
                                background: 'var(--color-alert-amber)',
                                color: 'var(--color-bg-deep)',
                                padding: '1px 3px',
                                borderRadius: '2px',
                                marginTop: '2px',
                                fontWeight: 'bold'
                              }}>
                                ⚡ UPGRADED
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  )})}
                  </div>
                </div>
              )})}
            </div>

            {(() => {
              const { experimentalTech, tachyonMatrixUsedThisScenario, retroactiveTachyonStrike } = useGameStore();
              const hasTTM = experimentalTech.some(t => t.id === 'tachyon-targeting-matrix');
              const canUseRetroactiveTTM = hasTTM && !tachyonMatrixUsedThisScenario && (volley?.totalStandardHits > 0);
              
              if (!canUseRetroactiveTTM || !currentItem.logEntryId) return null;
              
              return (
                <div style={{ marginBottom: 'var(--space-md)', padding: '8px', background: 'rgba(0, 204, 255, 0.05)', border: '1px solid var(--color-holo-cyan)', borderRadius: '4px' }}>
                  <button
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      fontSize: '0.8rem',
                      padding: '8px',
                      background: 'rgba(0, 204, 255, 0.15)',
                      borderColor: 'var(--color-holo-cyan)',
                      color: 'var(--color-holo-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      retroactiveTachyonStrike(currentItem.logEntryId!);
                      onClose();
                    }}
                  >
                    <span>⚡</span> RETROACTIVE TACHYON STRIKE
                  </button>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: 6, textAlign: 'center' }}>
                    Convert 1 standard hit into a critical hit (once per scenario)
                  </div>
                </div>
              );
            })()}

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
                    {currentItem.damageResult.isIonWeapon && (
                      <span style={{ color: 'var(--color-alert-amber)', display: 'block', marginBottom: '4px' }}>⚡ ION IMPACT ⚡</span>
                    )}
                    {currentItem.damageResult.isArmorPiercing && !currentItem.damageResult.isIonWeapon && (
                      <span style={{ color: 'var(--color-alert-amber)', display: 'block', marginBottom: '4px' }}>🎯 ARMOR PIERCING VOLLEY 🎯</span>
                    )}
                    {currentItem.damageResult.hullDamage === 0 && currentItem.damageResult.shieldHits > 0 && !currentItem.damageResult.isIonWeapon && (
                      <span style={{ color: 'var(--color-holo-cyan)' }}>IMPACT ABSORBED BY SHIELDS</span>
                    )}
                    {currentItem.damageResult.hullDamage === 0 && currentItem.damageResult.isIonWeapon && (
                      <span style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>ION FIELD NEUTRALIZED BY HULL PLATING</span>
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
                      <span className="label">Shield Breakdown</span>
                      {(() => {
                        const { shieldHits, struckSector, shieldRemaining, ionNebulaActive } = currentItem.damageResult;
                        
                        const formatSector = (sector: string) => {
                          const spaced = sector.replace(/([A-Z])/g, ' $1').trim();
                          return spaced.charAt(0).toUpperCase() + spaced.slice(1);
                        };
                        
                        const sectorLabel = formatSector(struckSector);
                        const initialShield = ionNebulaActive ? shieldRemaining : shieldRemaining + shieldHits;

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginTop: '6px' }}>
                            {ionNebulaActive ? (
                                <BreakdownRow
                                    id="ion-nebula"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="Ion Nebula completely disables shields."
                                    containerStyle={{fontSize: '0.75rem', marginBottom: '4px', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Shields Bypassed</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-alert-amber)' }}>(Ion Nebula)</span>}
                                  />
                            ) : (
                              <>
                                <BreakdownRow
                                    id="struck-arc"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The shield arc that intercepted the attack."
                                    containerStyle={{fontSize: '0.75rem', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Struck Arc</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-holo-cyan)' }}>{sectorLabel}</span>}
                                  />
                                <BreakdownRow
                                    id="init-shields"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The initial shield strength before the attack."
                                    containerStyle={{fontSize: '0.75rem', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Initial Shields</span>}
                                    valueNode={<span className="mono">{initialShield}</span>}
                                  />
                                <BreakdownRow
                                    id="shield-dmg"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The amount of shield energy depleted by the attack."
                                    containerStyle={{fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Shield Damage</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-alert-amber)' }}>-{shieldHits}</span>}
                                  />
                                <BreakdownRow
                                    id="rem-shields"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The remaining shield energy in this arc."
                                    containerStyle={{fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px', marginTop: '2px', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-primary)', cursor: 'help' }}>Remaining</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-holo-cyan)', fontWeight: 'bold' }}>{shieldRemaining}</span>}
                                  />
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="panel panel--raised" style={{ padding: 'var(--space-xs)' }}>
                      <span className="label">Hull Damage Breakdown</span>
                      {(() => {
                        const overflowHits = currentItem.damageResult.overflowHits;
                        const armorRoll = currentItem.damageResult.armorRoll;
                        const hullDamage = currentItem.damageResult.hullDamage;
                        const piercingHits = currentItem.damageResult.piercingHits ?? 0;
                        const netOverflowHits = currentItem.damageResult.netOverflowHits ?? 0;
                        const min1RuleApplied = netOverflowHits === 1 && (overflowHits - armorRoll) <= 0 && piercingHits === 0;

                        if (hullDamage === 0) {
                          return (
                            <div style={{ marginTop: '4px' }}>
                              <div className="mono" style={{ color: 'var(--color-hostile-red)', fontSize: '1.2rem' }}>0</div>
                              {currentItem.damageResult.isIonWeapon && (
                                <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '4px', lineHeight: 1.2 }}>
                                  SHIELD BREAKER:<br/>NO HULL DAMAGE
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', marginTop: '6px' }}>
                            {overflowHits > 0 && (
                              <>
                                <BreakdownRow
                                    id="overflow"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="Standard hits that bypassed shields and struck the hull directly."
                                    containerStyle={{fontSize: '0.75rem', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Overflow Hits</span>}
                                    valueNode={<span className="mono">+{overflowHits}</span>}
                                  />
                                <BreakdownRow
                                    id="armor-roll"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The defender's armor die roll, mitigating Overflow Hits."
                                    containerStyle={{fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Armor Roll ({currentItem.damageResult.armorDie})</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-text-dim)' }}>-{armorRoll}</span>}
                                  />
                                <div 
                                  className="flex-between" 
                                  style={{ fontSize: '0.75rem', position: 'relative' }} 
                                  title={isCoarsePointer ? undefined : (min1RuleApplied ? "Armor cannot reduce Overflow Hits below 1 unless there are piercing hits." : "The remaining Overflow Hits after armor mitigation.")}
                                  onClick={(e) => {
                                    if (isCoarsePointer) {
                                      e.stopPropagation();
                                      setActiveTooltip(activeTooltip === 'net-overflow' ? null : 'net-overflow');
                                    }
                                  }}
                                >
                                  <span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Net Overflow Hits{min1RuleApplied ? ' (Min 1)' : ''}</span>
                                  <span className="mono">{netOverflowHits}</span>
                                  {isCoarsePointer && activeTooltip === 'net-overflow' && (
                                    <div className="touch-tooltip" style={{ bottom: 'calc(100% + 8px)' }}>{min1RuleApplied ? "Armor cannot reduce Overflow Hits below 1 unless there are piercing hits." : "The remaining Overflow Hits after armor mitigation."}</div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {piercingHits > 0 && (
                              <BreakdownRow
                                    id="piercing"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="Critical hits that completely bypass shields and armor."
                                    containerStyle={{fontSize: '0.75rem', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-secondary)', cursor: 'help' }}>Piercing Hits</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-alert-amber)' }}>+{piercingHits}</span>}
                                  />
                            )}

                            <BreakdownRow
                                    id="total-dmg"
                                    activeTooltip={activeTooltip}
                                    setActiveTooltip={setActiveTooltip}
                                    isCoarsePointer={isCoarsePointer}
                                    tooltipText="The final amount of Hull Damage dealt to the defender."
                                    containerStyle={{fontSize: '0.9rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '6px', marginTop: '2px', position: 'relative'}}
                                    label={<span className="label" style={{ color: 'var(--color-text-primary)', cursor: 'help' }}>Total Damage</span>}
                                    valueNode={<span className="mono" style={{ color: 'var(--color-hostile-red)', fontWeight: 'bold' }}>{hullDamage}</span>}
                                  />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="mono" style={{ color: 'var(--color-holo-cyan)' }}>ATTACK MISSED / MITIGATED</div>
                )}
                
                {volley.totalHits > 0 && (
                  <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-xs)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', color: 'var(--color-text-dim)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><span className="mono" style={{ color: 'var(--color-alert-amber)' }}>PIERCING:</span> Bypasses shields completely.</div>
                    <div><span className="mono" style={{ color: 'var(--color-holo-cyan)' }}>STANDARD:</span> Strikes shields before overflowing to hull.</div>
                  </div>
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
