/**
 * SectorMapTutorial
 *
 * One-time Admiral Reyes tutorial overlay for the Campaign Sector Map.
 * Shown the first time a player encounters the sector map in a new campaign.
 * After completion or dismissal, never shown again (persisted to localStorage).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSectorMapTutorialStore } from '../../store/useSectorMapTutorialStore';
import admiralPortrait from '../../assets/tutorial/admiral.png';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function useTypewriter(text: string, speed = 16) {
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SectorMapTutorial() {
  const { isActive, currentStep, steps, historyStack, tryActivate, nextStep, previousStep, dismiss } =
    useSectorMapTutorialStore();

  // Trigger the one-time tutorial on first render
  useEffect(() => {
    tryActivate();
  }, [tryActivate]);

  const step = steps[currentStep];

  if (!isActive || !step) return null;

  const isLastStep = currentStep === steps.length - 1;
  const canGoBack = historyStack.length > 0;
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  return (
    <SectorMapTutorialInner
      dialogue={step.dialogue}
      isLastStep={isLastStep}
      canGoBack={canGoBack}
      progress={progress}
      currentStep={currentStep}
      totalSteps={steps.length}
      onNext={nextStep}
      onBack={previousStep}
      onDismiss={dismiss}
    />
  );
}

interface InnerProps {
  dialogue: string;
  isLastStep: boolean;
  canGoBack: boolean;
  progress: number;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onDismiss: () => void;
}

function SectorMapTutorialInner({
  dialogue,
  isLastStep,
  canGoBack,
  progress,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onDismiss,
}: InnerProps) {
  const { displayed, done, skip } = useTypewriter(dialogue);

  return (
    <div
      data-testid="sector-map-tutorial"
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1500,
        width: 'min(460px, 92vw)',
        background: 'linear-gradient(135deg, rgba(5,15,30,0.97) 0%, rgba(8,20,40,0.97) 100%)',
        border: '1px solid var(--color-holo-cyan)',
        borderRadius: '12px',
        boxShadow: '0 0 28px rgba(0,220,180,0.3), inset 0 0 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}
    >
      {/* Header stripe */}
      <div
        style={{
          height: '3px',
          background: 'linear-gradient(90deg, var(--color-holo-cyan), rgba(0,220,180,0.3))',
        }}
      />

      <div style={{ display: 'flex', gap: '14px', padding: '14px 16px' }}>
        {/* Admiral portrait */}
        <div
          style={{
            width: '56px',
            height: '56px',
            flexShrink: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid var(--color-holo-cyan)',
            background: 'rgba(0,220,180,0.08)',
          }}
        >
          <img
            src={admiralPortrait}
            alt="Admiral Reyes"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Speaker label */}
          <div
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              color: 'var(--color-holo-cyan)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            Fleet Admiral Reyes · Strategic Command
          </div>

          {/* Dialogue */}
          <div
            onClick={!done ? skip : undefined}
            style={{
              fontSize: '0.83rem',
              color: 'var(--color-text-primary)',
              lineHeight: 1.55,
              cursor: !done ? 'pointer' : 'default',
              maxHeight: '220px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
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

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '12px',
            }}
          >
            {/* Progress */}
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
                  data-testid="sm-tutorial-progress-bar"
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
                  fontSize: '0.6rem',
                  color: 'var(--color-text-dim)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '2px',
                }}
              >
                Step {currentStep + 1} of {totalSteps}
              </div>
            </div>

            {/* Back */}
            {canGoBack && done && (
              <button
                data-testid="sm-tutorial-back-btn"
                className="btn"
                style={{ fontSize: '0.7rem', padding: '3px 10px', opacity: 0.7 }}
                onClick={onBack}
              >
                ← Back
              </button>
            )}

            {/* Dismiss */}
            <button
              data-testid="sm-tutorial-dismiss-btn"
              className="btn"
              style={{ fontSize: '0.7rem', padding: '3px 10px', opacity: 0.65 }}
              onClick={onDismiss}
            >
              Skip
            </button>

            {/* Next / Finish */}
            <button
              data-testid="sm-tutorial-next-btn"
              className={`btn ${done ? 'btn--execute' : ''}`}
              disabled={!done}
              style={{
                fontSize: '0.78rem',
                padding: '5px 16px',
                opacity: done ? 1 : 0.4,
                cursor: done ? 'pointer' : 'not-allowed',
              }}
              onClick={() => { if (done) onNext(); }}
            >
              {isLastStep ? 'Understood →' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
