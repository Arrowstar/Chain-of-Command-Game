import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import CombatScenarioProgressTracker from '../combat/CombatScenarioProgressTracker';
import EnemyTacticPanel from './EnemyTacticPanel';
import RoEPanel from './RoEPanel';
export default function BriefingOverlay() {
  const round = useGameStore(s => s.round);
  const activeRoE = useGameStore(s => s.activeRoE);
  const roeOverridden = useGameStore(s => s.roeOverridden);
  const overrideRoE = useGameStore(s => s.overrideRoE);
  const advancePhase = useGameStore(s => s.advancePhase);
  const tutorialActive = useTutorialStore(s => s.isActive);
  const isCampaign = useCampaignStore(s => !!s.campaign);

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 10, 20, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: tutorialActive ? 'flex-start' : 'center',
      alignItems: 'center',
      zIndex: 100,
      padding: 'var(--space-xl)',
      paddingTop: tutorialActive ? '40px' : 'var(--space-xl)',
      overflowY: 'auto',
    }}>
      <div id="briefing-overlay" className="panel panel--glow" style={{ width: '800px', maxWidth: '90vw', padding: 'var(--space-xl)' }}>
        <h1 style={{ color: 'var(--color-holo-cyan)', textAlign: 'center', marginBottom: 'var(--space-md)' }}>
          ROUND {round} - INTELLIGENCE BRIEFING
        </h1>

        <div className="label" style={{ color: 'var(--color-holo-green)', textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          ALL COMMAND TOKENS REPLENISHED FOR ACTIVE OFFICERS
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
          <RoEPanel showOverrideAction={isCampaign} />

          <EnemyTacticPanel showGhostMakerAction />
        </div>

        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <CombatScenarioProgressTracker variant="briefing" />
        </div>

        <button
          className="btn btn--execute"
          style={{ width: '100%', padding: 'var(--space-md)' }}
          onClick={advancePhase}
        >
          PROCEED TO COMMAND PHASE
        </button>
      </div>
    </div>
  );
}
