import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getCombatScenarioProgress } from '../../engine/scenarioProgress';

interface CombatScenarioProgressTrackerProps {
  variant?: 'briefing' | 'overlay';
}

export default function CombatScenarioProgressTracker({
  variant = 'overlay',
}: CombatScenarioProgressTrackerProps) {
  const scenarioId = useGameStore(s => s.scenarioId);
  const objectiveType = useGameStore(s => s.objectiveType);
  const round = useGameStore(s => s.round);
  const playerShips = useGameStore(s => s.playerShips);
  const enemyShips = useGameStore(s => s.enemyShips);
  const objectiveMarkers = useGameStore(s => s.objectiveMarkers);
  const warpedOutShipIds = useGameStore(s => s.warpedOutShipIds);
  const salvageCratesCollected = useGameStore(s => s.salvageCratesCollected);
  const dataSiphonedRelayNames = useGameStore(s => s.dataSiphonedRelayNames);
  const successfulEscapes = useGameStore(s => s.successfulEscapes);
  const scenarioRules = useGameStore(s => s.scenarioRules);

  const progress = getCombatScenarioProgress({
    scenarioId,
    objectiveType,
    round,
    playerShips,
    enemyShips,
    objectiveMarkers,
    warpedOutShipIds,
    salvageCratesCollected,
    dataSiphonedRelayNames,
    successfulEscapes,
  });

  if (!progress) return null;

  const isBriefing = variant === 'briefing';
  const statusLabel = `${progress.completedCount}/${progress.totalCount} complete`;
  const compactRulesText = scenarioRules.join('  |  ');

  return (
    <div
      className="panel panel--raised"
      style={{
        padding: isBriefing ? '10px 12px' : 'var(--space-md)',
        borderColor: 'rgba(230, 160, 0, 0.32)',
        background: isBriefing
          ? 'rgba(230, 160, 0, 0.06)'
          : 'linear-gradient(180deg, rgba(230, 160, 0, 0.08) 0%, rgba(10, 18, 30, 0.88) 100%)',
        maxHeight: isBriefing ? 'none' : 'min(60vh, 520px)',
        overflowY: isBriefing ? 'visible' : 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          marginBottom: isBriefing ? '6px' : 'var(--space-sm)',
        }}
      >
        <div className="label" style={{ color: 'var(--color-alert-amber)' }}>
          {isBriefing ? 'MISSION OBJECTIVES' : 'COMBAT SCENARIO PROGRESS'}
        </div>
        <div
          className="mono"
          style={{
            fontSize: '0.75rem',
            color: progress.completedCount === progress.totalCount
              ? 'var(--color-holo-green)'
              : 'var(--color-text-secondary)',
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div style={{ marginBottom: isBriefing ? '8px' : 'var(--space-sm)' }}>
        <h3 style={{ color: 'var(--color-text-bright)', marginBottom: isBriefing ? '2px' : 'var(--space-xs)', fontSize: isBriefing ? '1rem' : undefined }}>
          {progress.title}
        </h3>
        <div style={{ fontSize: isBriefing ? '0.8rem' : '0.88rem', lineHeight: isBriefing ? 1.35 : 1.5, color: 'var(--color-text-primary)' }}>
          {progress.summary}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isBriefing ? '1fr 1fr' : '1fr',
          gap: isBriefing ? '6px 10px' : 'var(--space-sm)',
        }}
      >
        {progress.items.map(item => (
          <div
            key={item.id}
            style={{
              border: `1px solid ${item.isComplete ? 'rgba(0, 255, 160, 0.28)' : 'rgba(255, 190, 80, 0.22)'}`,
              borderLeft: `3px solid ${item.isComplete ? 'var(--color-holo-green)' : 'var(--color-alert-amber)'}`,
              borderRadius: '10px',
              padding: isBriefing ? '6px 8px' : 'var(--space-sm)',
              background: item.isComplete ? 'rgba(0, 255, 160, 0.05)' : 'rgba(255, 190, 80, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                flexWrap: 'wrap',
                marginBottom: isBriefing ? 0 : '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span
                  className="mono"
                  style={{
                    color: item.isComplete ? 'var(--color-holo-green)' : 'var(--color-alert-amber)',
                    fontSize: isBriefing ? '0.72rem' : '0.8rem',
                  }}
                >
                  {item.isComplete ? '[x]' : '[ ]'}
                </span>
                <span style={{ color: 'var(--color-text-bright)', fontWeight: 600, fontSize: isBriefing ? '0.82rem' : undefined }}>
                  {item.label}
                </span>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: isBriefing ? '0.66rem' : '0.72rem',
                  color: item.isComplete ? 'var(--color-holo-green)' : 'var(--color-text-secondary)',
                }}
              >
                {item.statusText}
              </span>
            </div>
            {!isBriefing && (
              <div style={{ fontSize: '0.8rem', lineHeight: 1.45, color: 'var(--color-text-secondary)' }}>
                {item.requirement}
              </div>
            )}
          </div>
        ))}
      </div>

      {scenarioRules.length > 0 && isBriefing && (
        <div style={{ marginTop: '8px', fontSize: '0.72rem', lineHeight: 1.35, color: 'var(--color-text-secondary)' }}>
          <span className="label" style={{ color: 'var(--color-text-secondary)', marginRight: '6px' }}>
            RULES
          </span>
          {compactRulesText}
        </div>
      )}

      {scenarioRules.length > 0 && !isBriefing && (
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="label" style={{ color: 'var(--color-text-secondary)' }}>
            SCENARIO RULES
          </div>
          {scenarioRules.map((rule, index) => (
            <div
              key={`${rule}-${index}`}
              style={{
                fontSize: '0.8rem',
                lineHeight: 1.45,
                color: 'var(--color-text-secondary)',
                paddingLeft: 'var(--space-sm)',
                borderLeft: '2px solid rgba(0, 220, 255, 0.18)',
              }}
            >
              {rule}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
