import React, { useEffect, useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { PostCombatResult } from '../../types/campaignTypes';
import { getScarImpactLegendText, getScarStatusMeta } from '../console/scarStatus';
import FleetFavorConversionPanel from './FleetFavorConversionPanel';
import { NodeType } from '../../engine/mapGenerator';
import ScoreLedgerModal from './ScoreLedgerModal';
import { useViewport } from '../../utils/useViewport';

export default function PostCombatSummary() {
  const [result, setResult] = useState<PostCombatResult | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  
  const executePostCombat = useCampaignStore(s => s.executePostCombat);
  const finishPostCombat = useCampaignStore(s => s.finishPostCombat);
  const completeBossNode = useCampaignStore(s => s.completeBossNode);
  const campaign = useCampaignStore(s => s.campaign);
  const sectorMap = useCampaignStore(s => s.sectorMap);
  const { isPhone, isTablet } = useViewport();
  const isMobile = isPhone || isTablet;

  const scoreAtCombatStart = campaign?.scoreAtCombatStart ?? 0;
  const currentScore = campaign?.currentScore ?? 0;
  const scoreDelta = currentScore - scoreAtCombatStart;

  const isBossNode = sectorMap?.nodes.find(n => n.id === campaign?.currentNodeId)?.type === NodeType.Boss;
  const isBossDefeat = isBossNode && result && !result.victory;

  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;
    // Execute once on mount — synchronous, returns the result directly
    const res = executePostCombat();
    setResult(res);
  }, []);

  if (!result || !campaign) {
    return (
      <div className="panel panel--glow" style={{ margin: 'var(--space-xl) auto', width: '600px', maxWidth: '90vw', padding: 'var(--space-lg)', textAlign: 'center' }}>
        <div className="label">CONSOLIDATING AFTER-ACTION REPORT...</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: 'var(--space-xl) 0' }}>
      <div className="panel panel--glow" style={{ margin: '0 auto', width: '700px', maxWidth: '90vw', padding: isMobile ? 'var(--space-md)' : 'var(--space-lg)' }}>
        <h2 style={{ 
          color: (result.victory && !isBossDefeat) ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)', 
          textAlign: 'center', 
          marginTop: 0, 
          fontSize: isMobile ? '1.5rem' : '2rem',
          textShadow: (result.victory && !isBossDefeat) ? 'var(--glow-cyan)' : '0 0 15px var(--color-hostile-red)'
        }}>
          {isBossDefeat ? 'SECTOR COMMAND LOST' : (result.victory ? 'MISSION SUCCESS' : 'TACTICAL WITHDRAWAL')}
        </h2>
        <div className="label" style={{ textAlign: 'center', marginBottom: 'var(--space-lg)', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
          {result.reason}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: 'var(--space-md)', 
          margin: 'var(--space-lg) 0' 
        }}>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div className="label" style={{ color: 'var(--color-hostile-red)' }}>FLEET FAVOR ON HAND</div>
            <div className="mono" style={{ fontSize: isMobile ? '2rem' : '2.5rem', color: 'var(--color-hostile-red)' }}>{campaign.fleetFavor}</div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div className="label" style={{ color: 'var(--color-alert-amber)' }}>CURRENT RP</div>
            <div className="mono" style={{ fontSize: isMobile ? '2rem' : '2.5rem', color: 'var(--color-alert-amber)' }}>{campaign.requisitionPoints}</div>
          </div>
        </div>

        {/* Score Delta */}
        <div className="panel panel--raised" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-lg)', textAlign: 'center', border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.05)' }}>
          <div className="label" style={{ color: '#fbbf2488', fontSize: '0.65rem', letterSpacing: '2px', marginBottom: '6px' }}>FLEET COMMENDATION — COMBAT PHASE</div>
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 'var(--space-sm)' : 'var(--space-lg)', 
            justifyContent: 'center', 
            alignItems: 'baseline' 
          }}>
            <div>
              <div className="mono" style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 'bold', color: scoreDelta >= 0 ? 'var(--color-holo-green)' : 'var(--color-hostile-red)' }}>
                {scoreDelta >= 0 ? `+${scoreDelta.toLocaleString()}` : scoreDelta.toLocaleString()}
              </div>
              <div className="label" style={{ color: 'var(--color-text-dim)', fontSize: '0.6rem' }}>THIS ENGAGEMENT</div>
            </div>
            <div style={{ color: 'var(--color-text-dim)', transform: isMobile ? 'rotate(90deg)' : 'none', margin: isMobile ? '0 auto' : 0 }}>=</div>
            <div>
              <div className="mono" style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 'bold', color: '#fbbf24' }}>
                {currentScore.toLocaleString()}
              </div>
              <div className="label" style={{ color: 'var(--color-text-dim)', fontSize: '0.6rem' }}>TOTAL SCORE</div>
            </div>
          </div>
          <button
            className="btn"
            style={{ marginTop: '10px', padding: '3px 14px', fontSize: '0.7rem', borderColor: 'rgba(251,191,36,0.4)', color: '#fbbf24' }}
            onClick={() => setShowLedger(true)}
          >
            VIEW FULL LEDGER
          </button>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <FleetFavorConversionPanel title="IMMEDIATE FF TO RP CONVERSION" compact={isMobile} />
        </div>

        {/* Trauma Report */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
            OFFICER PSYCH EVALUATION
          </h3>
          {result.traumasGained.length === 0 ? (
            <div style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', padding: 'var(--space-sm) 0' }}>No officers reached critical stress levels.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              {result.traumasGained.map((t, idx) => (
                <div key={idx} className="panel" style={{ padding: 'var(--space-sm)', borderLeft: '4px solid #E53E3E', borderRadius: '0 4px 4px 0' }}>
                  <div style={{ color: '#E53E3E', fontWeight: 'bold' }}>{t.traumaName} <span style={{ color: 'var(--color-text-dim)', fontWeight: 'normal', fontSize: '0.9rem' }}>(Officer {t.officerId})</span></div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{t.traumaEffect}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scars Report */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
            <h3 style={{ color: 'var(--color-text-primary)', margin: 0 }}>
              SHIP DAMAGE CONSOLIDATION
            </h3>
            <span
              className="mono"
              title={getScarImpactLegendText()}
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-alert-amber)',
                border: '1px solid rgba(255, 170, 0, 0.28)',
                borderRadius: '999px',
                padding: '2px 7px',
                cursor: 'help',
                lineHeight: 1,
              }}
            >
              ?
            </span>
          </div>
          {result.scarsGained.length === 0 ? (
            <div style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', padding: 'var(--space-sm) 0' }}>No permanent hull scars sustained.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
              {result.scarsGained.map((s, idx) => (
                <div
                  key={idx}
                  className="panel"
                  title={`${s.scarName} | Impact: ${getScarStatusMeta(s.fromCritId).shortImpact} | ${s.scarEffect}`}
                  style={{ padding: 'var(--space-sm)', borderLeft: '4px solid var(--color-alert-amber)', borderRadius: '0 4px 4px 0' }}
                >
                  <div style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold' }}>
                    {s.scarName}
                    <span className="mono" style={{ marginLeft: '8px', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                      [{getScarStatusMeta(s.fromCritId).shortImpact}]
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{s.scarEffect}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button 
          className="btn" 
          style={{ width: '100%', padding: 'var(--space-md)', fontSize: '1.2rem', marginTop: 'var(--space-md)' }}
          onClick={finishPostCombat}
        >
          {isBossDefeat ? 'ACCEPT DEFEAT' : ( (isBossNode || sectorMap?.nodes.find(n => n.id === campaign?.currentNodeId)?.type === NodeType.Elite) && result.victory ? 'SALVAGE ASSETS' : 'RETURN TO SECTOR MAP')}
        </button>
      </div>

      {/* Score Ledger Modal */}
      {showLedger && <ScoreLedgerModal onClose={() => setShowLedger(false)} />}
    </div>
  );
}
