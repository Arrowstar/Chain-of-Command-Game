import React, { useRef, useState, useEffect } from 'react';
import { CampaignSaveManager } from '../../utils/CampaignSaveManager';
import SaveSlotModal from '../SaveSlotModal';

interface MainMenuProps {
  onStart?: () => void;
  onStartCampaign?: () => void;
  onContinueCampaign?: () => void;
  onStartTutorial?: () => void;
  /** Called when the player wants to exit the application. */
  onExit?: () => void;
}

const TITLE_TEXT = 'CHAIN OF COMMAND';

// Scrolling data — doubled so the seam is invisible
const DATA_LEFT = [
  'UPLINK SECURE', 'SUBSPACE: NOMINAL', 'SYS CHECK: OK',
  'AUTH: ADMIRAL-7', 'COMM: ENCRYPTED', 'PING: 14ms',
  'NAV GRID: ONLINE', 'SHIELD STATUS: READY', 'REACTOR: 98.4%',
  'CREW: 847/850', 'AI CORE: STANDBY', 'SECTORS: 12',
  'THREAT LVL: AMBER', 'FLEET READY: 4/4', 'JUMP DRIVE: CHARGED',
  '> AWAITING CMD_', 'GYRO: STABLE', 'ATMOS: NORMAL',
  'UPLINK SECURE', 'SUBSPACE: NOMINAL', 'SYS CHECK: OK',
  'AUTH: ADMIRAL-7', 'COMM: ENCRYPTED', 'PING: 14ms',
  'NAV GRID: ONLINE', 'SHIELD STATUS: READY', 'REACTOR: 98.4%',
  'CREW: 847/850', 'AI CORE: STANDBY', 'SECTORS: 12',
  'THREAT LVL: AMBER', 'FLEET READY: 4/4', 'JUMP DRIVE: CHARGED',
  '> AWAITING CMD_', 'GYRO: STABLE', 'ATMOS: NORMAL',
];

const DATA_RIGHT = [
  'HULL: 100%', 'ORDNANCE: LOADED', 'TARGETING: IDLE',
  'COM-1: ACTIVE', 'COM-2: STANDBY', 'ENCRYPTION: AES-512',
  'QUANTUM LINK: OK', 'DATA RELAY: SYNC', 'FUEL: 100%',
  'SECTOR 1: CLEAR', 'SECTOR 2: HOSTILE', 'SECTOR 3: UNKNOWN',
  'BEACON: LOCKED', 'STARMAP: UPDATED', 'WAYPOINT: SET',
  'ENGINE: READY', 'THRUSTER: NOMINAL', 'VENT: CLEAR',
  'HULL: 100%', 'ORDNANCE: LOADED', 'TARGETING: IDLE',
  'COM-1: ACTIVE', 'COM-2: STANDBY', 'ENCRYPTION: AES-512',
  'QUANTUM LINK: OK', 'DATA RELAY: SYNC', 'FUEL: 100%',
  'SECTOR 1: CLEAR', 'SECTOR 2: HOSTILE', 'SECTOR 3: UNKNOWN',
  'BEACON: LOCKED', 'STARMAP: UPDATED', 'WAYPOINT: SET',
  'ENGINE: READY', 'THRUSTER: NOMINAL', 'VENT: CLEAR',
];

const STATUS_INDICATORS = [
  { label: 'UPLINK',  color: 'var(--color-holo-green)',  delay: '0s' },
  { label: 'SYSTEMS', color: 'var(--color-holo-cyan)',   delay: '1.1s' },
  { label: 'WEAPONS', color: 'var(--color-alert-amber)', delay: '2.3s' },
  { label: 'SHIELDS', color: 'var(--color-holo-cyan)',   delay: '0.6s' },
  { label: 'COMMS',   color: 'var(--color-holo-green)',  delay: '1.8s' },
];

export default function MainMenu({ onStart, onStartCampaign, onContinueCampaign, onStartTutorial, onExit }: MainMenuProps) {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [titleDone, setTitleDone] = useState(false);
  const [showExitHint, setShowExitHint] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [hasSaves, setHasSaves] = useState(false);

  // Check for existing saves on mount
  useEffect(() => {
    setHasSaves(CampaignSaveManager.hasSaves());
  }, []);

  // Typewriter effect
  useEffect(() => {
    // Brief initial delay before typing starts
    const startDelay = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setDisplayedTitle(TITLE_TEXT.slice(0, i));
        if (i >= TITLE_TEXT.length) {
          clearInterval(interval);
          setTitleDone(true);
        }
      }, 55);
      return () => clearInterval(interval);
    }, 400);
    return () => clearTimeout(startDelay);
  }, []);

  const handleLoadSuccess = (_slotId: string) => {
    setShowLoadModal(false);
    if (onContinueCampaign) onContinueCampaign();
  };

  return (
    <div className="main-menu-bg">
      {/* Drifting tactical grid */}
      <div className="main-menu-grid" />

      {/* Static CRT scanline texture */}
      <div className="main-menu-scanlines" />

      {/* Animated CRT sweep line */}
      <div className="main-menu-scanline-sweep" />

      {/* Corner info tags */}
      <div className="main-menu-corner-tag main-menu-corner-tag--tl">
        <div>CHAIN OF COMMAND: STELLAR WAR</div>
        <div>SYS v3.1.4 // BUILD 2025-A</div>
      </div>
      <div className="main-menu-corner-tag main-menu-corner-tag--tr">
        <div>CLASSIFIED: FLEET ADMIRAL ACCESS</div>
        <div>ENCRYPTION: AES-512</div>
      </div>
      <div className="main-menu-corner-tag main-menu-corner-tag--bl">
        TACTICAL CIC TERMINAL
      </div>
      <div className="main-menu-corner-tag main-menu-corner-tag--br">
        NODE: HEGEMONY-PRIME-01
      </div>

      {/* Left scrolling data column */}
      <div className="main-menu-data-column main-menu-data-column--left">
        <div className="main-menu-data-scroll">
          {DATA_LEFT.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>

      {/* Right scrolling data column */}
      <div className="main-menu-data-column main-menu-data-column--right">
        <div className="main-menu-data-scroll main-menu-data-scroll--slow">
          {DATA_RIGHT.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>

      {/* Centre menu panel */}
      <div className="main-menu-center-wrapper">
        <div className="panel panel--glow main-menu-panel">
          {/* Title with typewriter + glitch */}
          <h1
            className={titleDone ? 'main-menu-title-glitch' : ''}
            style={{
              color: 'var(--color-holo-cyan)',
              fontSize: '3rem',
              marginBottom: 'var(--space-md)',
              textShadow: 'var(--glow-cyan-strong)',
              fontFamily: 'var(--font-display)',
              minHeight: '3.6rem',
            }}
          >
            {displayedTitle}
            {!titleDone && <span className="main-menu-cursor">█</span>}
          </h1>

          <div className="label" style={{
            color: 'var(--color-alert-amber)',
            fontSize: '1.2rem',
            marginBottom: 'var(--space-lg)',
            letterSpacing: '4px',
            textShadow: 'var(--glow-amber)',
          }}>
            STELLAR WAR
          </div>

          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)' }}>
            The sector is in turmoil. Your crew is on the edge. Steel your nerves, issue the orders, and hold the line at all costs.
          </p>

          <div className="main-menu-btn-container">
            <button
              className="btn main-menu-btn"
              onClick={onStart}
              data-testid="start-scenario-btn"
            >
              START SKIRMISH
            </button>

            <button
              className="btn main-menu-btn"
              style={{
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
              className="btn main-menu-btn"
              onClick={onStartCampaign}
            >
              START CAMPAIGN
            </button>

            {hasSaves && (
              <button
                className="btn btn--secondary main-menu-btn"
                onClick={() => setShowLoadModal(true)}
                data-testid="load-campaign-btn"
              >
                LOAD CAMPAIGN
              </button>
            )}

            {/* Exit button — works on Capacitor native; shows a hint on web */}
            {showExitHint ? (
              <div
                data-testid="exit-hint"
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  border: '1px solid rgba(210, 72, 72, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.82rem',
                  textAlign: 'center',
                  background: 'rgba(210, 72, 72, 0.06)',
                }}
              >
                To exit, close this browser tab.
              </div>
            ) : (
              <button
                className="btn main-menu-btn"
                data-testid="exit-btn"
                style={{
                  borderColor: 'rgba(210, 72, 72, 0.45)',
                  background: 'rgba(210, 72, 72, 0.07)',
                  color: 'var(--color-hostile-red)',
                }}
                onClick={async () => {
                  if (onExit) {
                    try {
                      await onExit();
                    } catch {
                      // onExit threw (web) — show the close-tab hint
                      setShowExitHint(true);
                    }
                  } else {
                    setShowExitHint(true);
                  }
                }}
              >
                EXIT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom status indicators */}
      <div className="main-menu-status-bar">
        {STATUS_INDICATORS.map((s, i) => (
          <div key={i} className="main-menu-status-indicator">
            <div
              className="main-menu-status-dot"
              style={{
                background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
                animationDelay: s.delay,
              }}
            />
            {s.label}
          </div>
        ))}
      </div>

      {/* Load Campaign Modal */}
      {showLoadModal && (
        <SaveSlotModal
          mode="load"
          onLoad={handleLoadSuccess}
          onClose={() => setShowLoadModal(false)}
        />
      )}
    </div>
  );
}
