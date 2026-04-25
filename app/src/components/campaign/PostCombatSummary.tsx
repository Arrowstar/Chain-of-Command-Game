import React, { useEffect, useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { PostCombatResult } from '../../types/campaignTypes';
import { getScarImpactLegendText, getScarStatusMeta } from '../console/scarStatus';
import FleetFavorConversionPanel from './FleetFavorConversionPanel';
import { NodeType } from '../../engine/mapGenerator';

export default function PostCombatSummary() {
  const [result, setResult] = useState<PostCombatResult | null>(null);
  
  const executePostCombat = useCampaignStore(s => s.executePostCombat);
  const finishPostCombat = useCampaignStore(s => s.finishPostCombat);
  const completeBossNode = useCampaignStore(s => s.completeBossNode);
  const campaign = useCampaignStore(s => s.campaign);
  const sectorMap = useCampaignStore(s => s.sectorMap);

  const isBossNode = sectorMap?.nodes.find(n => n.id === campaign?.currentNodeId)?.type === NodeType.Boss;

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
      <div className="panel panel--glow" style={{ margin: '0 auto', width: '700px', maxWidth: '90vw', padding: 'var(--space-lg)' }}>
        <h2 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginTop: 0, fontSize: '2rem' }}>POST-COMBAT SUMMARY</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', margin: 'var(--space-lg) 0' }}>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div className="label" style={{ color: 'var(--color-hostile-red)' }}>FLEET FAVOR ON HAND</div>
            <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--color-hostile-red)' }}>{campaign.fleetFavor}</div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-md)', textAlign: 'center' }}>
            <div className="label" style={{ color: 'var(--color-alert-amber)' }}>CURRENT RP</div>
            <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--color-alert-amber)' }}>{campaign.requisitionPoints}</div>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <FleetFavorConversionPanel title="IMMEDIATE FF TO RP CONVERSION" />
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
          onClick={isBossNode ? completeBossNode : finishPostCombat}
        >
          {isBossNode ? 'PROCEED TO NEXT SECTOR' : 'RETURN TO SECTOR MAP'}
        </button>
      </div>
    </div>
  );
}
