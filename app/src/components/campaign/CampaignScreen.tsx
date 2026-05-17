import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import SectorMapView from './SectorMapView';
import DrydockView from './DrydockView';
import NodeResolutionModal from './NodeResolutionModal';
import PostCombatSummary from './PostCombatSummary';
import CampaignLog from './CampaignLog';
import FleetFavorConversionPanel from './FleetFavorConversionPanel';
import TechBadge from './TechBadge';
import CampaignStoryScreen from './CampaignStoryScreen';
import { CampaignSaveManager } from '../../utils/CampaignSaveManager';
import { useViewport } from '../../utils/useViewport';

interface Props {
  onStartCombat: () => void;
}

export default function CampaignScreen({ onStartCombat }: Props) {
  const campaign = useCampaignStore(s => s.campaign);
  const [showConversionPanel, setShowConversionPanel] = useState(false);
  const { isPhone } = useViewport();

  if (!campaign) return null;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-deep)', color: 'var(--color-text-primary)' }}>
      {/* Persistent Campaign HUD */}
      {isPhone ? (
        // ── Phone: two-row compact header ─────────────────────────
        <header className="panel panel--glow" style={{ padding: 'var(--space-xs) var(--space-sm)', paddingLeft: '60px', borderBottom: '1px solid var(--color-border)', borderRadius: 0, zIndex: 10 }}>
          {/* Row 1: stats */}
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              <span className="label" style={{ color: 'var(--color-holo-cyan)' }}>§ </span>
              <span style={{ fontWeight: 'bold' }}>{campaign.currentSector}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              <span className="label" style={{ color: 'var(--color-alert-amber)' }}>RP </span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-alert-amber)' }}>{campaign.requisitionPoints}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              <span className="label" style={{ color: 'var(--color-hostile-red)' }}>FF </span>
              <span style={{ fontWeight: 'bold', color: 'var(--color-hostile-red)' }}>{campaign.fleetFavor}</span>
            </span>
          </div>
          {/* Row 2: badges + buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center', marginTop: '4px' }}>
            {campaign.experimentalTech.map(tech => <TechBadge key={tech.id} tech={tech} />)}
            {campaign.pendingEconomicBuffs.nextStoreDiscountPercent > 0 && (
              <div className="label" style={{ border: '1px solid var(--color-border)', padding: '1px 5px', color: 'var(--color-alert-amber)', fontSize: '0.6rem' }}>
                -{campaign.pendingEconomicBuffs.nextStoreDiscountPercent}%
              </div>
            )}
            {campaign.campaignPhase === 'sectorMap' && (
              <button className="btn" style={{ padding: '3px 7px', fontSize: '0.7rem' }} onClick={() => setShowConversionPanel(c => !c)}>
                {showConversionPanel ? 'HIDE FF' : 'FF'}
              </button>
            )}
            {['sectorMap', 'drydock'].includes(campaign.campaignPhase) && (
              <button className="btn" style={{ padding: '3px 7px', fontSize: '0.7rem' }} onClick={() => { void CampaignSaveManager.quickSave(); }}>
                SAVE
              </button>
            )}
          </div>
        </header>
      ) : (
        // ── Desktop/tablet: existing header (unchanged) ─────────────
        <header className="panel panel--glow" style={{ padding: 'var(--space-sm) var(--space-md)', paddingLeft: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', borderRadius: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'center' }}>
            <div>
              <span className="label" style={{ color: 'var(--color-holo-cyan)' }}>SECTOR</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginLeft: 'var(--space-xs)' }}>{campaign.currentSector}</span>
            </div>
            <div>
              <span className="label" style={{ color: 'var(--color-alert-amber)' }}>REQUISITION POINTS (RP)</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginLeft: 'var(--space-xs)', color: 'var(--color-alert-amber)' }}>{campaign.requisitionPoints}</span>
            </div>
            <div>
              <span className="label" style={{ color: 'var(--color-hostile-red)' }}>FLEET FAVOR (FF)</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', marginLeft: 'var(--space-xs)', color: 'var(--color-hostile-red)' }}>{campaign.fleetFavor}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {campaign.experimentalTech.map(tech => (
              <TechBadge key={tech.id} tech={tech} />
            ))}
            {campaign.pendingEconomicBuffs.nextStoreDiscountPercent > 0 && (
              <div className="label" style={{ border: '1px solid var(--color-border)', padding: '2px 6px', color: 'var(--color-alert-amber)' }}>
                NEXT HAVEN -{campaign.pendingEconomicBuffs.nextStoreDiscountPercent}%
              </div>
            )}
            {campaign.pendingEconomicBuffs.freeRepairAtNextStation && (
              <div className="label" style={{ border: '1px solid var(--color-border)', padding: '2px 6px', color: 'var(--color-holo-green)' }}>
                NEXT HAVEN FREE REPAIR
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            {campaign.campaignPhase === 'sectorMap' && (
              <button
                className="btn btn--secondary"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                onClick={() => setShowConversionPanel(current => !current)}
              >
                {showConversionPanel ? 'HIDE FF CONVERSION' : 'CONVERT FF'}
              </button>
            )}
            {['sectorMap', 'drydock'].includes(campaign.campaignPhase) && (
              <>
                <button 
                  className="btn btn--secondary" 
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={() => { void CampaignSaveManager.quickSave(); }}
                >
                  QUICK SAVE
                </button>
                <button 
                  className="btn btn--secondary" 
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={() => { void CampaignSaveManager.exportToDisk(); }}
                >
                  EXPORT SAVE
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {campaign.campaignPhase === 'story' && <CampaignStoryScreen />}
        <CampaignLog />
        {campaign.campaignPhase === 'sectorMap' && showConversionPanel && (
          <div style={{ position: 'absolute', top: 'var(--space-md)', right: 'var(--space-md)', width: '360px', maxWidth: 'calc(100vw - 32px)', zIndex: 50 }}>
            <FleetFavorConversionPanel compact title="SECTOR MAP CONVERSION" />
          </div>
        )}
        {campaign.campaignPhase === 'sectorMap' && <SectorMapView />}
        {campaign.campaignPhase === 'nodeResolution' && (
          <>
            <SectorMapView />
            <div className="modal-backdrop" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 20 }}>
              <NodeResolutionModal onStartCombat={onStartCombat} />
            </div>
          </>
        )}
        {campaign.campaignPhase === 'postCombat' && <PostCombatSummary />}
        {campaign.campaignPhase === 'drydock' && <DrydockView />}
        {campaign.campaignPhase === 'gameOver' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <h1 style={{ color: campaign.victory ? 'var(--color-holo-green)' : 'var(--color-hostile-red)' }}>
              {campaign.victory ? 'CAMPAIGN VICTORY' : 'CAMPAIGN FAILED'}
            </h1>
          </div>
        )}
      </main>
    </div>
  );
}
