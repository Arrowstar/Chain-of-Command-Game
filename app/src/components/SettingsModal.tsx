import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

export default function SettingsModal() {
  const isSettingsOpen = useSettingsStore(s => s.isSettingsOpen);
  const closeSettings = useSettingsStore(s => s.closeSettings);
  const musicVolume = useSettingsStore(s => s.musicVolume);
  const setMusicVolume = useSettingsStore(s => s.setMusicVolume);
  const sfxVolume = useSettingsStore(s => s.sfxVolume);
  const setSfxVolume = useSettingsStore(s => s.setSfxVolume);

  // Use local state while dragging the slider for responsiveness,
  // then sync to store on change.
  const [localMusic, setLocalMusic] = useState(musicVolume);
  const [localSfx, setLocalSfx] = useState(sfxVolume);

  // Sync back if the store changes externally
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalMusic(musicVolume);
      setLocalSfx(sfxVolume);
    }
  }, [musicVolume, sfxVolume, isSettingsOpen]);

  // Handle escape to close
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSettings();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const handleTestSound = () => {
    const testAudio = new Audio('/assets/sounds/button-click.wav');
    testAudio.volume = localSfx;
    testAudio.play().catch(() => {});
  };

  return (
    <div className="settings-modal-backdrop" onClick={closeSettings}>
      <div 
        className="settings-modal panel panel--glow animate-fadeIn" 
        onClick={e => e.stopPropagation()}
        data-testid="settings-modal"
      >
        <button className="settings-close-btn btn" onClick={closeSettings} aria-label="Close settings">×</button>
        
        <h2 style={{ color: 'var(--color-holo-cyan)', textShadow: 'var(--glow-cyan-strong)', marginBottom: 'var(--space-md)' }}>
          SYSTEM SETTINGS
        </h2>

        <div className="settings-tab-bar" style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
          <button className="btn btn--primary" style={{ flex: 1, pointerEvents: 'none' }}>AUDIO</button>
        </div>

        <div className="settings-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          
          {/* Music Volume Slider */}
          <div className="settings-slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="label" style={{ color: 'var(--color-text-primary)' }}>MUSIC VOLUME</span>
              <span className="mono" style={{ color: 'var(--color-holo-cyan)' }}>{Math.round(localMusic * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localMusic}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setLocalMusic(val);
                setMusicVolume(val);
              }}
              className="settings-slider"
              data-testid="music-volume-slider"
            />
          </div>

          {/* SFX Volume Slider */}
          <div className="settings-slider-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="label" style={{ color: 'var(--color-text-primary)' }}>SFX VOLUME</span>
              <span className="mono" style={{ color: 'var(--color-holo-cyan)' }}>{Math.round(localSfx * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSfx}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setLocalSfx(val);
                setSfxVolume(val);
              }}
              className="settings-slider"
              data-testid="sfx-volume-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                className="btn btn--secondary" 
                style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                onClick={handleTestSound}
              >
                TEST SOUND
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
