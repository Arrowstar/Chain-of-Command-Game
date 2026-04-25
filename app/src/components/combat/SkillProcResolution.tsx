import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DiceVisual from './DiceVisual';
import type { SkillProcResult } from '../../utils/diceRoller';

export interface SkillProcResolutionData {
  title: string;
  officerName: string;
  station: string;
  actionName: string;
  result: SkillProcResult;
  standardEffect: string;
  failureEffect?: string;
  criticalEffect?: string;
}

interface SkillProcResolutionProps {
  data: SkillProcResolutionData;
  onClose: () => void;
}

export default function SkillProcResolution({ data, onClose }: SkillProcResolutionProps) {
  const [showOutcome, setShowOutcome] = useState(false);

  useEffect(() => {
    setShowOutcome(false);
    const timer = setTimeout(() => setShowOutcome(true), 1200);
    return () => clearTimeout(timer);
  }, [data]);

  const { result } = data;
  const outcomeLabel = result.isCritical ? 'CRITICAL SUCCESS' : result.isSuccess ? 'SUCCESS' : 'NO PROC';
  const outcomeColor = result.isCritical
    ? 'var(--color-alert-amber)'
    : result.isSuccess
    ? 'var(--color-holo-green)'
    : 'var(--color-text-dim)';

  const detailRows = [
    { label: 'Officer', value: data.officerName },
    { label: 'Station', value: data.station.toUpperCase() },
    { label: 'Action', value: data.actionName },
    { label: 'Skill Die', value: result.dieType.toUpperCase() },
    { label: 'Success On', value: `${result.successThreshold}+` },
    { label: 'Critical On', value: result.maxFace > result.successThreshold ? `${result.maxFace}` : 'GATED' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        data-testid="skill-proc-resolution-modal"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="panel panel--glow"
        style={{
          width: '500px',
          background: 'var(--color-bg-panel)',
          zIndex: 1000,
          padding: 'var(--space-md)',
          boxShadow: '0 0 50px rgba(0,0,0,0.8)',
        }}
      >
        <h2 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginBottom: 'var(--space-sm)' }}>
          {data.title}
        </h2>

        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'var(--color-bg-deep)' }}>
          <div className="flex-between" style={{ marginBottom: '6px' }}>
            <div className="label">Outcome</div>
            <div className="mono" style={{ fontSize: '1.1rem', color: outcomeColor }}>{outcomeLabel}</div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {detailRows.map(row => (
              <div key={row.label} className="flex-between" style={{ fontSize: '0.72rem' }}>
                <span className="label" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span className="mono" style={{ color: 'var(--color-text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px' }}>
            <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginBottom: '6px' }}>SKILL DIE</div>
            <DiceVisual
              dieType={result.dieType}
              finalResult={result.roll}
              isHit={result.isSuccess}
              isExploded={result.isCritical}
            />
          </div>
        </div>

        {showOutcome && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gap: 'var(--space-sm)' }}>
            <div className="panel panel--raised" style={{ padding: 'var(--space-sm)' }}>
              <div className="label" style={{ color: result.isSuccess ? 'var(--color-holo-green)' : 'var(--color-text-dim)' }}>
                Standard Effect
              </div>
              <div className="mono" style={{ marginTop: '4px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                {result.isSuccess ? data.standardEffect : (data.failureEffect ?? 'Base action resolves with no proc bonus.')}
              </div>
            </div>

            {data.criticalEffect && (
              <div
                className="panel panel--raised"
                style={{
                  padding: 'var(--space-sm)',
                  borderColor: result.isCritical ? 'var(--color-alert-amber)' : 'var(--color-border)',
                  boxShadow: result.isCritical ? '0 0 18px rgba(230, 160, 0, 0.18)' : undefined,
                }}
              >
                <div className="label" style={{ color: result.isCritical ? 'var(--color-alert-amber)' : 'var(--color-text-dim)' }}>
                  Critical Effect
                </div>
                <div className="mono" style={{ marginTop: '4px', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                  {result.isCritical ? data.criticalEffect : 'Not triggered.'}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {showOutcome && (
          <button className="btn" style={{ marginTop: 'var(--space-md)', width: '100%' }} onClick={onClose}>
            Acknowledge
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
