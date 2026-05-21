import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCampaignStore } from '../store/useCampaignStore';
import { useGameStore } from '../store/useGameStore';
import { useUIStore } from '../store/useUIStore';
import { CampaignSaveManager } from '../utils/CampaignSaveManager';
import SaveSlotModal from './SaveSlotModal';

// ─── Types ────────────────────────────────────────────────────────

/**
 * The exit-confirmation state shown inside the modal when the player
 * clicks "Return to Main Menu".
 *
 *  idle          – no confirmation shown yet
 *  campaign-save – on campaign map; offering Save & Exit / Exit Without Saving
 *  combat-warn   – in combat/tutorial; warning that progress will be lost
 */
type ConfirmState = 'idle' | 'campaign-save' | 'combat-warn';

// ─── Component ───────────────────────────────────────────────────

export default function SettingsModal() {
  const isSettingsOpen = useSettingsStore(s => s.isSettingsOpen);
  const closeSettings = useSettingsStore(s => s.closeSettings);
  const triggerReturnToMenu = useSettingsStore(s => s.triggerReturnToMenu);
  const returnToMenuCallback = useSettingsStore(s => s.returnToMenuCallback);
  const musicVolume = useSettingsStore(s => s.musicVolume);
  const setMusicVolume = useSettingsStore(s => s.setMusicVolume);
  const sfxVolume = useSettingsStore(s => s.sfxVolume);
  const setSfxVolume = useSettingsStore(s => s.setSfxVolume);

  // Campaign context — used to determine which confirmation to show
  const campaign = useCampaignStore(s => s.campaign);
  const gamePhase = useGameStore(s => s.phase);
  const isCombatActive = gamePhase !== 'setup' && gamePhase !== 'gameOver';

  // Use local state while dragging the slider for responsiveness,
  // then sync to store on change.
  const [localMusic, setLocalMusic] = useState(musicVolume);
  const [localSfx, setLocalSfx] = useState(sfxVolume);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');

  /** Whether the save slot modal is open and in which mode */
  const [saveModalContext, setSaveModalContext] = useState<'save-only' | 'save-and-exit' | null>(null);

  // Sync back if the store changes externally
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalMusic(musicVolume);
      setLocalSfx(sfxVolume);
    }
  }, [musicVolume, sfxVolume, isSettingsOpen]);

  // Reset the confirm panel each time the modal opens/closes
  useEffect(() => {
    if (!isSettingsOpen) {
      setConfirmState('idle');
      setSaveModalContext(null);
    }
  }, [isSettingsOpen]);

  // Handle escape to close
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (saveModalContext !== null) {
          // Let SaveSlotModal handle its own Escape
          return;
        }
        if (confirmState !== 'idle') {
          setConfirmState('idle');
        } else {
          closeSettings();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, closeSettings, confirmState, saveModalContext]);

  if (!isSettingsOpen) return null;

  /**
   * Determine what kind of confirmation to show when the player clicks
   * "Return to Main Menu".
   *
   * - If we're on the campaign map (sectorMap / drydock), offer to save first.
   * - Otherwise (combat, tutorial, skirmish) warn that progress will be lost.
   */
  const handleReturnToMenuClick = () => {
    // No callback means we're already on the main menu; button shouldn't show.
    if (!returnToMenuCallback) return;

    const savablePhases = ['sectorMap', 'drydock', 'nodeResolution'];
    const isCampaignSavable =
      campaign !== null && !isCombatActive && savablePhases.includes(campaign.campaignPhase);

    if (isCampaignSavable) {
      setConfirmState('campaign-save');
    } else {
      setConfirmState('combat-warn');
    }
  };

  const handleTestSound = () => {
    const testAudio = new Audio('/assets/sounds/button-click.wav');
    testAudio.volume = localSfx;
    testAudio.play().catch(() => {});
  };

  // Savable phases (mirrors above)
  const savablePhases = ['sectorMap', 'drydock', 'nodeResolution'];
  const isCampaignSavable = campaign !== null && !isCombatActive && savablePhases.includes(campaign.campaignPhase);

  return (
    <>
      <div className="settings-modal-backdrop" onClick={closeSettings}>
        <div
          className="settings-modal panel panel--glow animate-fadeIn"
          onClick={e => e.stopPropagation()}
          data-testid="settings-modal"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ color: 'var(--color-holo-cyan)', textShadow: 'var(--glow-cyan-strong)', margin: 0 }}>
              SYSTEM SETTINGS
            </h2>
            <button className="settings-close-btn btn" onClick={closeSettings} aria-label="Close settings">×</button>
          </div>

          <div className="settings-tab-bar" style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn--primary" style={{ flex: 1, pointerEvents: 'none' }}>AUDIO</button>
            <button 
              className="btn btn--secondary" 
              style={{ flex: 1 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                closeSettings();
                setTimeout(() => {
                  useUIStore.setState({ isHowToPlayOpen: true });
                }, 50);
              }}
            >
              RULES REFERENCE
            </button>
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

          {/* ── Navigation Section (hidden when on main menu) ─────────── */}
          {returnToMenuCallback && (
            <div
              data-testid="navigation-section"
              style={{
                marginTop: 'var(--space-xl)',
                paddingTop: 'var(--space-lg)',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div
                className="label"
                style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', letterSpacing: '2px' }}
              >
                NAVIGATION
              </div>

              {/* ── Idle state: show buttons ────────────────────────────── */}
              {confirmState === 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {/* Quick Save button — only when on a savable phase */}
                  {isCampaignSavable && (
                    <button
                      className="btn btn--primary"
                      data-testid="save-game-btn"
                      style={{ width: '100%', padding: '8px 16px' }}
                      onClick={() => setSaveModalContext('save-only')}
                    >
                      SAVE GAME
                    </button>
                  )}

                  <button
                    className="btn"
                    data-testid="return-to-menu-btn"
                    style={{
                      width: '100%',
                      borderColor: 'rgba(210, 72, 72, 0.45)',
                      background: 'rgba(210, 72, 72, 0.07)',
                      color: 'var(--color-hostile-red)',
                      padding: '8px 16px',
                    }}
                    onClick={handleReturnToMenuClick}
                  >
                    RETURN TO MAIN MENU
                  </button>
                </div>
              )}

              {/* ── Campaign-save confirmation ─────────────────────────── */}
              {confirmState === 'campaign-save' && (
                <div
                  data-testid="campaign-save-confirm"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-md)',
                    border: '1px solid rgba(230, 160, 0, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(230, 160, 0, 0.05)',
                  }}
                >
                  <p style={{ color: 'var(--color-alert-amber)', margin: 0, fontSize: '0.88rem' }}>
                    Return to the main menu? You can save your campaign progress first.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn--primary"
                      data-testid="save-and-exit-btn"
                      style={{ flex: 1 }}
                      onClick={() => setSaveModalContext('save-and-exit')}
                    >
                      SAVE &amp; EXIT
                    </button>
                    <button
                      className="btn"
                      data-testid="exit-without-saving-btn"
                      style={{
                        flex: 1,
                        borderColor: 'rgba(210, 72, 72, 0.45)',
                        background: 'rgba(210, 72, 72, 0.07)',
                        color: 'var(--color-hostile-red)',
                      }}
                      onClick={triggerReturnToMenu}
                    >
                      EXIT WITHOUT SAVING
                    </button>
                    <button
                      className="btn btn--secondary"
                      data-testid="cancel-return-btn"
                      style={{ flex: 1 }}
                      onClick={() => setConfirmState('idle')}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}

              {/* ── Combat / tutorial warning ──────────────────────────── */}
              {confirmState === 'combat-warn' && (
                <div
                  data-testid="combat-warn-confirm"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-sm)',
                    padding: 'var(--space-md)',
                    border: '1px solid rgba(210, 72, 72, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(210, 72, 72, 0.05)',
                  }}
                >
                  <p style={{ color: 'var(--color-hostile-red)', margin: 0, fontSize: '0.88rem' }}>
                    Combat progress cannot be saved. Abandoning now will lose all progress from this battle.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                    <button
                      className="btn"
                      data-testid="abandon-combat-btn"
                      style={{
                        flex: 1,
                        borderColor: 'rgba(210, 72, 72, 0.45)',
                        background: 'rgba(210, 72, 72, 0.07)',
                        color: 'var(--color-hostile-red)',
                      }}
                      onClick={triggerReturnToMenu}
                    >
                      ABANDON &amp; EXIT
                    </button>
                    <button
                      className="btn btn--secondary"
                      data-testid="cancel-return-btn"
                      style={{ flex: 1 }}
                      onClick={() => setConfirmState('idle')}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Slot Modal — rendered outside the settings backdrop so z-index stacks correctly */}
      {saveModalContext !== null && (
        <SaveSlotModal
          mode="save"
          onSaved={(_meta) => {
            setSaveModalContext(null);
            if (saveModalContext === 'save-and-exit') {
              triggerReturnToMenu();
            } else {
              // Just saved — close the settings modal too
              closeSettings();
            }
          }}
          onClose={() => {
            setSaveModalContext(null);
            // If they cancel a save-and-exit, go back to the confirm panel
            if (saveModalContext === 'save-and-exit') {
              setConfirmState('campaign-save');
            }
          }}
        />
      )}
    </>
  );
}
