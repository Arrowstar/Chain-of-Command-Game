import React from 'react';

interface RecoveryBannerProps {
  round: number;
  savedAt: string;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * Holographic alert banner displayed at the top of the Main Menu when a
 * background-killed combat session has been detected in the recovery cache.
 *
 * The player can choose to resume the interrupted battle or discard it and
 * start fresh.
 */
export default function RecoveryBanner({
  round,
  savedAt,
  onResume,
  onDiscard,
}: RecoveryBannerProps) {
  const date = new Date(savedAt);
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="recovery-banner animate-fadeIn"
      role="alert"
      aria-live="polite"
      data-testid="recovery-banner"
    >
      {/* Amber pulse bar */}
      <div className="recovery-banner-accent" aria-hidden="true" />

      <div className="recovery-banner-body">
        <div className="recovery-banner-header">
          <span className="recovery-banner-icon" aria-hidden="true">⚠</span>
          <span className="label recovery-banner-label">
            COMM LINK RESTORED
          </span>
        </div>

        <p className="recovery-banner-message">
          An interrupted battle was detected from{' '}
          <span className="recovery-banner-highlight">
            {dateStr} at {timeStr}
          </span>{' '}
          (Round {round}). Restore to continue where you left off.
        </p>

        <div className="recovery-banner-actions">
          <button
            className="btn btn--primary recovery-banner-btn"
            onClick={onResume}
            data-testid="recovery-resume-btn"
          >
            ▶ RESUME BATTLE
          </button>
          <button
            className="btn recovery-banner-btn recovery-banner-btn--discard"
            onClick={onDiscard}
            data-testid="recovery-discard-btn"
          >
            DISCARD
          </button>
        </div>
      </div>
    </div>
  );
}
