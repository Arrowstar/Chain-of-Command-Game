/**
 * TutorialOverlay
 *
 * Renders the Admiral's dialogue box over the combat screen during the tutorial.
 * Features:
 * - Admiral portrait placeholder (1:1 aspect ratio)
 * - Dialogue text with simple markdown-ish bold (**text**) support
 * - Highlight ring injected onto targeted elements via ID lookup
 * - "Next" gated by game-state conditions from useTutorialStore
 * - "Skip Tutorial" available at all times
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTutorialStore } from '../../store/useTutorialStore';
import { useGameStore } from '../../store/useGameStore';
import admiralPortrait from '../../assets/tutorial/admiral.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses simple **bold** markers into React nodes.
 * Supports multi-line via \n → <br />.
 */
function renderDialogue(text: string): React.ReactNode {
  const paragraphs = text.split('\n\n');
  return paragraphs.map((para, pi) => {
    const parts = para.split(/(\*\*[^*]+\*\*)/g);
    const nodes = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} style={{ color: 'var(--color-holo-cyan)' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle single-line breaks within a paragraph
      return part.split('\n').map((line, li, arr) => (
        <React.Fragment key={`${i}-${li}`}>
          {line}
          {li < arr.length - 1 && <br />}
        </React.Fragment>
      ));
    });
    return (
      <p key={pi} style={{ margin: pi > 0 ? '10px 0 0 0' : '0' }}>
        {nodes}
      </p>
    );
  });
}

// ─── Condition checker ────────────────────────────────────────────────────────

function useConditionMet(condition?: string): boolean {
  const phase = useGameStore(s => s.phase);
  const round = useGameStore(s => s.round);
  const players = useGameStore(s => s.players);

  if (!condition || condition === 'NONE') return true;

  switch (condition) {
    case 'PHASE_COMMAND':
      return phase === 'command';
    case 'PHASE_EXECUTION':
      return phase === 'execution';
    case 'PHASE_CLEANUP':
      return phase === 'cleanup';
    case 'ROUND_2':
      return round >= 2;
    case 'TOKEN_ASSIGNED':
      return players.some(p => p.assignedActions.length > 0);
    case 'EXECUTE_CLICKED':
      return phase === 'execution';
    default:
      return true;
  }
}

// ─── Element Highlighter ──────────────────────────────────────────────────────

function useHighlightElement(highlightId?: string) {
  useEffect(() => {
    if (!highlightId) return;

    const el = document.getElementById(highlightId);
    if (!el) return;

    el.style.outline = '3px solid rgba(0, 220, 180, 0.85)';
    el.style.outlineOffset = '4px';
    el.style.boxShadow = '0 0 24px rgba(0, 220, 180, 0.4)';
    el.style.borderRadius = '6px';
    el.style.transition = 'all 0.2s ease';
    
    // Only promote to relative if it's currently static (default).
    // This prevents breaking 'fixed' or 'absolute' layouts (like the Comms Log tab).
    const computedPos = window.getComputedStyle(el).position;
    if (computedPos === 'static') {
      el.style.position = 'relative';
    }
    
    el.style.zIndex = '1200';

    // Auto-scroll the element into view if it's currently off-screen (e.g., in a scrollable console panel)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.boxShadow = '';
      el.style.borderRadius = '';
      el.style.zIndex = '';
    };
  }, [highlightId]);
}

// ─── Typewriter effect ────────────────────────────────────────────────────────

function useTypewriter(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;

    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalRef.current!);
        setDone(true);
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed]);

  const skip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayed(text);
    setDone(true);
  };

  return { displayed, done, skip };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TutorialOverlay() {
  const { isActive, currentStep, steps, isFreePlay, nextStep, endTutorial, isHidden, hideTutorial, unhideTutorial } =
    useTutorialStore();

  const step = steps[currentStep];
  const conditionMet = useConditionMet(step?.waitForCondition);

  useEffect(() => {
    // If the tutorial is temporarily hidden and the user satisfies the condition,
    // automatically unhide it and advance to the next step.
    if (isHidden && conditionMet) {
      unhideTutorial();
      nextStep();
    }
  }, [isHidden, conditionMet, unhideTutorial, nextStep]);

  useHighlightElement(isHidden ? undefined : step?.highlightId);

  const { displayed, done, skip } = useTypewriter(step?.dialogue ?? '');

  if (!isActive || isFreePlay || !step) return null;
  if (isHidden) return null;

  const isLastStep = currentStep === steps.length - 1;
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <>
      {/* Dim backdrop — does NOT block pointer events so player can still interact */}
      <div
        data-testid="tutorial-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 6, 14, 0.55)',
          zIndex: 1100,
          pointerEvents: 'none',
        }}
      />

      {/* Dialogue panel — pinned to the bottom */}
      <div
        data-testid="tutorial-dialogue-panel"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 24px 20px',
          pointerEvents: 'auto',
        }}
      >
        <div
          className="panel panel--glow"
          style={{
            width: 'min(960px, 100%)',
            padding: '20px 24px',
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start',
            background: 'rgba(4, 12, 24, 0.97)',
            border: '1px solid rgba(0, 220, 180, 0.35)',
            boxShadow: '0 -8px 32px rgba(0, 220, 180, 0.12)',
          }}
        >
          {/* ── Admiral Portrait ── */}
          <div
            data-testid="tutorial-admiral-portrait"
            style={{
              width: '110px',
              height: '110px',
              flexShrink: 0,
              borderRadius: '8px',
              background:
                'linear-gradient(135deg, rgba(0,100,80,0.35) 0%, rgba(0,50,40,0.6) 100%)',
              border: '1px solid rgba(0, 220, 180, 0.45)',
              boxShadow: '0 0 18px rgba(0, 220, 180, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Admiral Image */}
            <img 
              src={admiralPortrait} 
              alt="Admiral Reyes"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top',
                position: 'absolute',
                bottom: 0,
                left: 0,
                filter: 'drop-shadow(0 0 10px rgba(0, 220, 180, 0.3))',
              }}
            />
            
            {/* Gradient overlay to fade bottom */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(4, 12, 24, 0.8) 0%, transparent 40%)',
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                bottom: 6,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: '0.6rem',
                letterSpacing: '0.12em',
                color: 'var(--color-holo-cyan)',
                fontFamily: 'var(--font-mono)',
                textShadow: '0 0 4px rgba(0,0,0,0.8)',
                zIndex: 1,
              }}
            >
              ADM. REYES
            </div>
          </div>

          {/* ── Dialogue ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Speaker label */}
            <div
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.15em',
                color: 'var(--color-alert-amber)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              FLEET ADMIRAL REYES — TACTICAL INSTRUCTION
            </div>

            {/* Text output */}
            <div
              data-testid="tutorial-dialogue-text"
              style={{
                fontSize: '0.92rem',
                color: 'var(--color-text-primary)',
                lineHeight: 1.65,
                minHeight: '80px',
                cursor: done ? 'default' : 'pointer',
              }}
              onClick={() => { if (!done) skip(); }}
            >
              {renderDialogue(displayed)}
              {!done && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1em',
                    background: 'var(--color-holo-cyan)',
                    marginLeft: '2px',
                    verticalAlign: 'text-bottom',
                    animation: 'blink 0.8s step-end infinite',
                  }}
                />
              )}
            </div>

            {/* Condition hint */}
            {step.waitForCondition && step.waitForCondition !== 'NONE' && !conditionMet && (
              <div
                data-testid="tutorial-condition-hint"
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--color-alert-amber)',
                  fontFamily: 'var(--font-mono)',
                  padding: '6px 10px',
                  background: 'rgba(255, 170, 0, 0.08)',
                  border: '1px solid rgba(255, 170, 0, 0.25)',
                  borderRadius: '4px',
                }}
              >
                ⧖ {step.conditionHint ?? 'Complete the required action to continue.'} Click "Got It" to interact with the console.
              </div>
            )}

            {/* Footer: progress + buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '4px',
              }}
            >
              {/* Progress bar */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: '3px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    data-testid="tutorial-progress-bar"
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background:
                        'linear-gradient(90deg, var(--color-holo-cyan) 0%, rgba(0,220,180,0.5) 100%)',
                      transition: 'width 0.3s ease',
                      borderRadius: '999px',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--color-text-dim)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: '3px',
                  }}
                >
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>

              {/* Skip tutorial */}
              <button
                data-testid="tutorial-skip-btn"
                className="btn"
                style={{ fontSize: '0.72rem', padding: '4px 12px', opacity: 0.7 }}
                onClick={endTutorial}
              >
                Skip Tutorial
              </button>

              {/* Next / Finish */}
              <button
                data-testid="tutorial-next-btn"
                className={`btn ${done ? 'btn--execute' : ''}`}
                disabled={!done}
                style={{
                  fontSize: '0.85rem',
                  padding: '6px 20px',
                  opacity: done ? 1 : 0.4,
                  cursor: done ? 'pointer' : 'not-allowed',
                }}
                onClick={() => {
                  if (done) {
                    if (isLastStep) {
                      endTutorial();
                    } else if (step.waitForCondition && step.waitForCondition !== 'NONE' && !conditionMet) {
                      hideTutorial();
                    } else {
                      nextStep();
                    }
                  }
                }}
              >
                {isLastStep ? 'Begin Free Play →' : (step.waitForCondition && step.waitForCondition !== 'NONE' && !conditionMet) ? 'Got It →' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
