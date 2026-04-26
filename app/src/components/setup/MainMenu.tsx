import React, { useRef } from 'react';
import { CampaignSaveManager } from '../../utils/CampaignSaveManager';

interface MainMenuProps {
  onStart?: () => void;
  onStartCampaign?: () => void;
  onContinueCampaign?: () => void;
  onStartTutorial?: () => void;
}

export default function MainMenu({ onStart, onStartCampaign, onContinueCampaign, onStartTutorial }: MainMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await CampaignSaveManager.importFromDisk(e.target.files[0]);
      if (success && onContinueCampaign) {
        onContinueCampaign();
      }
    }
  };

  return (
    <div 
      className="panel"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-deep)',
        border: 'none',
        borderRadius: 0
      }}
    >
      <div className="panel panel--glow" style={{ padding: 'var(--space-lg)', textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{ color: 'var(--color-holo-cyan)', fontSize: '3rem', marginBottom: 'var(--space-md)', textShadow: 'var(--glow-cyan)' }}>
          CHAIN OF COMMAND
        </h1>
        <div className="label" style={{ color: 'var(--color-alert-amber)', fontSize: '1.2rem', marginBottom: 'var(--space-lg)', letterSpacing: '4px' }}>
          STELLAR WAR
        </div>

        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Assume command. Manage the stress of your bridge officers. Secure the sector.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <button 
            className="btn" 
            style={{ fontSize: '1.2rem', padding: 'var(--space-md)' }}
            onClick={onStart}
            data-testid="start-scenario-btn"
          >
            START SKIRMISH
          </button>

          <button
            className="btn"
            style={{
              fontSize: '1.2rem',
              padding: 'var(--space-md)',
              borderColor: 'rgba(0, 220, 180, 0.55)',
              background: 'rgba(0, 220, 180, 0.08)',
              color: 'var(--color-holo-cyan)',
            }}
            onClick={onStartTutorial}
            data-testid="start-tutorial-btn"
          >
            COMBAT TUTORIAL
          </button>
          
          <button 
            className="btn" 
            style={{ fontSize: '1.2rem', padding: 'var(--space-md)' }}
            onClick={onStartCampaign}
          >
            START CAMPAIGN
          </button>

          {CampaignSaveManager.hasBrowserSave() && (
            <button 
              className="btn btn--secondary" 
              style={{ fontSize: '1.2rem', padding: 'var(--space-md)' }}
              onClick={() => {
                if (CampaignSaveManager.loadFromBrowser() && onContinueCampaign) {
                  onContinueCampaign();
                }
              }}
            >
              CONTINUE CAMPAIGN
            </button>
          )}

          <button 
            className="btn btn--secondary" 
            style={{ fontSize: '1.2rem', padding: 'var(--space-md)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            IMPORT CAMPAIGN
          </button>
          <input 
            type="file" 
            accept=".json" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleImport} 
          />
        </div>
      </div>
    </div>
  );
}
