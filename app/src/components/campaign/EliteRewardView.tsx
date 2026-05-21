import React from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { motion } from 'framer-motion';
import { SmartTooltip } from '../TouchTooltipPortal';

export default function EliteRewardView() {
  const campaign = useCampaignStore(s => s.campaign);
  const sectorMap = useCampaignStore(s => s.sectorMap);
  const claimEliteReward = useCampaignStore(s => s.claimEliteReward);

  if (!campaign || campaign.campaignPhase !== 'eliteReward' || !campaign.pendingEliteRewards) {
    return null;
  }

  const isBossNode = sectorMap?.nodes.find(n => n.id === campaign.pendingEliteRewardNodeId)?.type === 'boss';
  const titleText = isBossNode ? 'Sector Command Assets' : 'Elite Asset Recovery';
  const subtitleText = isBossNode
    ? 'The destroyed Sector Command ship carried high-value assets. Choose one to salvage.'
    : 'The destroyed elite squadron carried valuable assets. Choose one to salvage.';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(6, 10, 16, 0.92)',
      backdropFilter: 'blur(6px)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
      overflow: 'auto',
    }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: '12px', flexShrink: 0 }}
      >
        <h2 style={{
          color: 'var(--color-alert-amber)',
          margin: 0,
          fontSize: 'clamp(0.9rem, 3vw, 1.3rem)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}>
          {titleText}
        </h2>
        <p style={{
          color: 'var(--color-text-secondary)',
          margin: '4px 0 0 0',
          fontSize: 'clamp(0.7rem, 2vw, 0.88rem)',
        }}>
          {subtitleText}
        </p>
      </motion.div>

      {/* 3-column card grid — always horizontal in landscape */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        width: '100%',
        maxWidth: '860px',
        flexShrink: 0,
      }}>
        {campaign.pendingEliteRewards.map((reward, i) => (
          <motion.button
            key={reward.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.04, borderColor: 'var(--color-alert-amber)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => claimEliteReward(reward.id)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'border-color 0.2s, background 0.2s',
              minHeight: 0,
            }}
          >
            {/* Icon or Image */}
            {reward.imagePath ? (
              <img
                src={reward.imagePath}
                alt={reward.label}
                style={{
                  width: '52px',
                  height: '52px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                lineHeight: 1,
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                flexShrink: 0,
              }}>
                {reward.icon}
              </div>
            )}

            {/* Label — with tooltip ⓘ if item has description */}
            {reward.tooltip ? (
              <SmartTooltip content={reward.tooltip} as="div">
                <div style={{
                  color: 'var(--color-text-primary)',
                  fontWeight: 'bold',
                  fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}>
                  {reward.label}{' '}
                  <span style={{ fontSize: '0.7em', color: 'var(--color-holo-cyan)' }}>ⓘ</span>
                </div>
              </SmartTooltip>
            ) : (
              <div style={{
                color: 'var(--color-text-primary)',
                fontWeight: 'bold',
                fontSize: 'clamp(0.65rem, 1.8vw, 0.8rem)',
                fontFamily: 'var(--font-mono)',
                textAlign: 'center',
                lineHeight: 1.3,
              }}>
                {reward.label}
              </div>
            )}

            {/* Sub-description */}
            <div style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'clamp(0.6rem, 1.5vw, 0.75rem)',
              textAlign: 'center',
              lineHeight: 1.3,
            }}>
              {reward.description}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
