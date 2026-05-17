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
import { motion } from 'framer-motion';

interface Props {
  onStartCombat: () => void;
  onLeaveCampaign: () => void;
}

export default function CampaignScreen({ onStartCombat, onLeaveCampaign }: Props) {
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
          <CampaignGameOverScreen campaign={campaign} onLeave={onLeaveCampaign} />
        )}
      </main>
    </div>
  );
}

const TYPE_CONFIG = {
  navigation: { icon: '►', color: 'var(--color-holo-cyan)' },
  event: { icon: '✦', color: 'var(--color-alert-amber)' },
  combat: { icon: '⚔', color: 'var(--color-hostile-red)' },
  resource: { icon: '◈', color: 'var(--color-alert-amber)' },
  repair: { icon: '🔧', color: 'var(--color-holo-green)' },
  market: { icon: '⬡', color: 'var(--color-shield-blue)' },
  officer: { icon: '◎', color: 'var(--color-stress-orange)' },
  system: { icon: '◇', color: 'var(--color-text-dim)' },
};

function CampaignGameOverScreen({ campaign, onLeave }: { campaign: any; onLeave: () => void }) {
  const log = useCampaignStore(s => s.campaignLog);
  const victory = !!campaign.victory;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--color-bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-md)',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="panel panel--glow"
        style={{
          padding: 'var(--space-lg)',
          textAlign: 'center',
          maxWidth: '650px',
          width: '100%',
          boxShadow: victory
            ? '0 0 80px rgba(49, 151, 149, 0.4)'
            : '0 0 80px rgba(229, 62, 62, 0.4)',
          border: victory
            ? '1px solid rgba(49, 151, 149, 0.4)'
            : '1px solid rgba(229, 62, 62, 0.4)',
          borderRadius: '12px',
          background: 'rgba(10,12,20,0.95)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <h1 style={{
          fontSize: '2.5rem',
          color: victory ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)',
          textShadow: victory ? 'var(--glow-cyan)' : '0 0 20px var(--color-hostile-red)',
          marginBottom: 'var(--space-xs)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
        }}>
          {victory ? 'CAMPAIGN SECURED' : 'SECTOR COMMAND LOST'}
        </h1>

        <div className="label" style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem',
          lineHeight: '1.4',
          marginBottom: 'var(--space-md)',
          padding: '0 var(--space-md)'
        }}>
          {victory
            ? 'You have successfully secured the sector jump gates, neutralizing the Hegemony blockades. The flotilla is safe under your protection. Fleet Command recognizes your exemplary service.'
            : 'Fleet assets have been depleted or key objectives were lost. High Command has officially terminated your commission, and all contact with the vanguard task force has been severed.'}
        </div>

        {/* Statistics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-md)'
        }}>
          <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>SECTORS REACHED</div>
            <div className="mono" style={{ fontSize: '1.6rem', color: 'var(--color-holo-cyan)', fontWeight: 'bold' }}>
              {campaign.currentSector}
            </div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>REQUISITION POINTS</div>
            <div className="mono" style={{ fontSize: '1.6rem', color: 'var(--color-alert-amber)', fontWeight: 'bold' }}>
              {campaign.requisitionPoints}
            </div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>FLEET FAVOR</div>
            <div className="mono" style={{
              fontSize: '1.6rem',
              color: campaign.fleetFavor >= 0 ? 'var(--color-holo-green)' : 'var(--color-hostile-red)',
              fontWeight: 'bold'
            }}>
              {campaign.fleetFavor}
            </div>
          </div>
          <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>DIFFICULTY</div>
            <div className="mono" style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', paddingTop: '6px', fontWeight: 'bold' }}>
              {campaign.difficulty.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Scrollable Campaign Log Chronology */}
        <div style={{ textAlign: 'left', marginBottom: 'var(--space-md)' }}>
          <div className="label" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '6px', letterSpacing: '0.1em' }}>
            OPERATIONAL LOG CHRONOLOGY
          </div>
          <div className="panel panel--raised" style={{
            padding: 'var(--space-xs)',
            background: 'rgba(5,5,10,0.6)',
            border: '1px solid rgba(255,255,255,0.05)',
            maxHeight: '160px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            borderRadius: '6px',
          }}>
            {log.length === 0 ? (
              <div style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem', textAlign: 'center', padding: 'var(--space-md)' }}>
                No operations logged for this campaign.
              </div>
            ) : (
              log.slice().reverse().map(entry => {
                const config = TYPE_CONFIG[entry.type] ?? { icon: '◇', color: 'var(--color-text-dim)' };
                return (
                  <div key={entry.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.68rem',
                    fontFamily: 'var(--font-mono)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    paddingBottom: '4px',
                  }}>
                    <span style={{ color: config.color, flexShrink: 0 }}>{config.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{entry.message}</span>
                      {entry.outcome && (
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.62rem', marginTop: '2px' }}>
                          {entry.outcome}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--color-text-dim)', fontSize: '0.58rem', flexShrink: 0 }}>
                      S{entry.sector}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          className="btn"
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '10px',
            borderColor: victory ? 'var(--color-holo-cyan)' : 'var(--color-hostile-red)',
            color: '#fff',
            background: victory ? 'rgba(49,151,149,0.2)' : 'rgba(229,62,62,0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={onLeave}
          data-testid="campaign-return-to-menu-btn"
        >
          RETURN TO HIGH COMMAND
        </button>
      </motion.div>
    </div>
  );
}
