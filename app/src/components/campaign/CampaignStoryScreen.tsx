import React, { useEffect, useState, useRef } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { StoryBeatId } from '../../types/campaignTypes';

// ─── Story Content ────────────────────────────────────────────────────────────

interface StoryBeat {
  title: string;
  subtitle: string;
  body: string;
  /** Relative path to the splash art, e.g. /assets/story/sector-1.webp */
  artPath: string | null;
  ctaLabel: string;
}

const STORY_BEATS: Record<StoryBeatId, StoryBeat> = {
  'sector-1': {
    title: 'The Hegemony Strikes',
    subtitle: 'Sector 1 — Vanguard Deployment',
    body: "Commander, the Hegemony has broken the armistice. Their fleets poured through the outer perimeter three hours ago, overwhelming our frontier garrisons with dreadnoughts and strike fighters. High Command is in disarray, and communications are jammed across the sector. You are the ranking officer of the 7th Vanguard Fleet. We cannot wait for reinforcements that may never come. Rally what ships you can, stabilize the sector, and push the Hegemony back. The fate of the outer colonies rests on your shoulders.",
    artPath: '/assets/story/campaign_start.png',
    ctaLabel: 'ACKNOWLEDGE — ENGAGE',
  },
  'sector-2': {
    title: 'Into the Expanse',
    subtitle: 'Sector 2 — Counter-Offensive',
    body: "Excellent work, Commander. You've stabilized Sector 1 and bought us crucial time. But the Hegemony forces aren't retreating; they are consolidating their hold in the Aegis Expanse. Reconnaissance indicates they are deploying Carrier groups and heavy Monitor artillery ships to lock down the jump gates. This is no longer just a defense — it's a counter-offensive. Break their blockade, sever their supply lines, and show them that our resolve will not crack. All ships, condition readiness one. Prepare for jump.",
    artPath: '/assets/story/sector2_start.png',
    ctaLabel: 'JUMP TO SECTOR 2',
  },
  'sector-3': {
    title: 'The Final Push',
    subtitle: 'Sector 3 — Tartarus Anomaly',
    body: "We've broken their lines. The Hegemony is falling back, but they are massing everything they have left at the Tartarus Anomaly. Scanners are picking up massive energy signatures — they've deployed a Dreadnought command ship to anchor their final defensive line. If we crush them here, their entire offensive collapses, and we secure peace for a generation. The fighting will be brutal, and they will throw every ship they have at you. Form up the fleet. Let's finish this.",
    artPath: '/assets/story/sector3_start.png',
    ctaLabel: 'ADVANCE TO TARTARUS',
  },
  'victory': {
    title: 'Campaign Victory',
    subtitle: 'The Hegemony Repelled',
    body: "Target destroyed. I repeat, the Hegemony Dreadnought has been neutralized. Enemy formations are breaking off and retreating into deep space. The sector is secure. Your tactical brilliance and the bravery of your crews have saved millions of lives today, Commander. High Command is finally back online, and reinforcements are arriving to secure the perimeter. Take a breath, and stand your crews down. You've earned your victory. Welcome home, heroes.",
    artPath: '/assets/story/campaign_victory.png',
    ctaLabel: 'RETURN TO COMMAND',
  },
};

// ─── Typewriter Hook ─────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18): [string, boolean] {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset on text change
    setDisplayed('');
    setDone(false);
    indexRef.current = 0;
    lastTimeRef.current = null;

    function tick(timestamp: number) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= speed) {
        const charsToAdd = Math.floor(elapsed / speed);
        const next = indexRef.current + charsToAdd;
        indexRef.current = Math.min(next, text.length);
        setDisplayed(text.slice(0, indexRef.current));
        lastTimeRef.current = timestamp;

        if (indexRef.current >= text.length) {
          setDone(true);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed]);

  return [displayed, done];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignStoryScreen() {
  const campaign = useCampaignStore(s => s.campaign);
  const dismissStory = useCampaignStore(s => s.dismissStory);

  const storyId = campaign?.pendingStoryId ?? 'sector-1';
  const beat = STORY_BEATS[storyId];

  const [bodyText, typingDone] = useTypewriter(beat.body);

  // Allow skipping the typewriter by clicking the text area
  const [skipped, setSkipped] = useState(false);
  const isComplete = typingDone || skipped;
  const displayText = isComplete ? beat.body : bodyText;

  // Reset skip state when beat changes
  useEffect(() => { setSkipped(false); }, [storyId]);

  function handleSkip() {
    if (!isComplete) setSkipped(true);
    else dismissStory();
  }

  const isVictory = storyId === 'victory';

  return (
    <div style={styles.backdrop}>
      {/* Scanline overlay for atmosphere */}
      <div style={styles.scanlines} aria-hidden="true" />

      <div style={styles.container}>
        {/* ── Art Panel ── */}
        <div style={styles.artPanel} onClick={handleSkip} role="button" aria-label="Skip or advance story">
          {beat.artPath ? (
            <img src={beat.artPath} alt={beat.title} style={styles.artImage} />
          ) : (
            <div style={styles.artPlaceholder}>
              <span style={styles.artPlaceholderIcon}>🎨</span>
              <span style={styles.artPlaceholderText}>ART PLACEHOLDER</span>
              <span style={styles.artPlaceholderSub}>{beat.title.toUpperCase()}</span>
              <span style={styles.artPlaceholderNote}>16:9 · cinematic · replace with generated art</span>
            </div>
          )}
        </div>

        {/* ── Text Panel ── */}
        <div style={styles.textPanel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.subtitle}>{beat.subtitle}</div>
            <h1 style={{ ...styles.title, color: isVictory ? 'var(--color-holo-green)' : 'var(--color-holo-cyan)' }}>
              {beat.title}
            </h1>
            <div style={styles.divider} />
          </div>

          {/* Body */}
          <div style={styles.body} onClick={handleSkip} title={isComplete ? '' : 'Click to skip'}>
            <p style={styles.bodyText}>{displayText}</p>
            {!isComplete && <span style={styles.cursor} aria-hidden="true">█</span>}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            {!isComplete && (
              <button className="btn btn--secondary" style={styles.skipBtn} onClick={handleSkip}>
                SKIP ▶▶
              </button>
            )}
            {isComplete && (
              <button
                id="story-continue-btn"
                className="btn btn--primary"
                style={{ ...styles.ctaBtn, borderColor: isVictory ? 'var(--color-holo-green)' : 'var(--color-holo-cyan)', color: isVictory ? 'var(--color-holo-green)' : 'var(--color-holo-cyan)' }}
                onClick={dismissStory}
                autoFocus
              >
                {beat.ctaLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'var(--color-bg-deep)',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    zIndex: 100,
    overflow: 'hidden',
  },
  scanlines: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  artPanel: {
    flex: '0 0 58%',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'var(--color-bg-panel)',
    borderBottom: '1px solid var(--color-border)',
  },
  artImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  artPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1f35 50%, #0a0f1a 100%)',
    border: '2px dashed rgba(0,200,255,0.2)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  artPlaceholderIcon: {
    fontSize: '3rem',
    opacity: 0.4,
  },
  artPlaceholderText: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '1rem',
    fontWeight: 700,
    letterSpacing: '0.3em',
    color: 'rgba(0,200,255,0.35)',
  },
  artPlaceholderSub: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.75rem',
    letterSpacing: '0.2em',
    color: 'rgba(0,200,255,0.2)',
  },
  artPlaceholderNote: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.1)',
  },
  textPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--space-lg) var(--space-xl)',
    gap: 'var(--space-md)',
    overflow: 'hidden',
    background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  subtitle: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.3em',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'var(--font-display, var(--font-mono, monospace))',
    fontSize: 'clamp(1.4rem, 3vw, 2.2rem)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    margin: 0,
    textTransform: 'uppercase',
    textShadow: '0 0 30px currentColor',
  },
  divider: {
    height: '1px',
    background: 'linear-gradient(to right, var(--color-border), transparent)',
    marginTop: 'var(--space-xs)',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    cursor: 'pointer',
  },
  bodyText: {
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: 'clamp(0.8rem, 1.4vw, 0.95rem)',
    lineHeight: '1.85',
    color: 'var(--color-text-primary)',
    margin: 0,
    display: 'inline',
  },
  cursor: {
    display: 'inline-block',
    animation: 'blink 1s step-end infinite',
    color: 'var(--color-holo-cyan)',
    marginLeft: '2px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--space-sm)',
    paddingTop: 'var(--space-sm)',
    borderTop: '1px solid var(--color-border)',
  },
  skipBtn: {
    padding: '6px 16px',
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    opacity: 0.7,
  },
  ctaBtn: {
    padding: '10px 28px',
    fontSize: '0.85rem',
    letterSpacing: '0.2em',
    fontWeight: 700,
    background: 'transparent',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'background 0.2s, box-shadow 0.2s',
    boxShadow: '0 0 20px -5px currentColor',
  },
};
