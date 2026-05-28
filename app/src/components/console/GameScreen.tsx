import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import HexMap from '../board/HexMap';
import GameLog from '../board/GameLog';
import CaptainHand from './CaptainHand';
import ExecutionPanel from './ExecutionPanel';
import OfficerStationPanel from './OfficerStationPanel';
import ExecuteButton from './ExecuteButton';
import FleetAssetsPanel from './FleetAssetsPanel';
import BriefingOverlay from './BriefingOverlay';
import EnemyTacticPanel from './EnemyTacticPanel';
import RoEPanel from './RoEPanel';
import CombatScenarioProgressTracker from '../combat/CombatScenarioProgressTracker';
import TechBadge from '../campaign/TechBadge';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import ExperimentalTechModal from './ExperimentalTechModal';
import CombatToastContainer from '../board/CombatToastContainer';
import AstroCafNotification from '../campaign/AstroCafNotification';
import ScoreLedgerModal from '../campaign/ScoreLedgerModal';
import { useGameStore } from '../../store/useGameStore';
import { useCampaignStore } from '../../store/useCampaignStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { useUIStore } from '../../store/useUIStore';
import { getOfficerById } from '../../data/officers';
import type { QueuedAction, OfficerStation } from '../../types/game';
import { useViewport } from '../../utils/useViewport';
import { useBgm } from '../../utils/useBgm';
import SettingsButton from '../SettingsButton';
import { SmartTooltip } from '../TouchTooltipPortal';
import { getStimInjectorBonus } from '../../engine/techEffects';
import { TRAUMA_POOL } from '../../data/traumaTraits';
import { SCAR_TEMPLATES } from '../../data/scarTemplates';
import { PLAYER_CRITICAL_DECK, ENEMY_CRITICAL_DECK } from '../../data/criticalDamage';

export default function GameScreen() {
  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const deploymentMode = useGameStore(s => s.deploymentMode);
  const deploymentBounds = useGameStore(s => s.deploymentBounds);
  const deploymentSelectedShipId = useGameStore(s => s.deploymentSelectedShipId);
  const selectDeploymentShip = useGameStore(s => s.selectDeploymentShip);
  const rotateDeploymentShip = useGameStore(s => s.rotateDeploymentShip);
  const confirmDeployment = useGameStore(s => s.confirmDeployment);
  const assignToken = useGameStore(s => s.assignToken);
  const debugAutoWin = useGameStore(s => s.debugAutoWin);
  const debugAutoLose = useGameStore(s => s.debugAutoLose);
  const phase = useGameStore(s => s.phase);
  const currentTactic = useGameStore(s => s.currentTactic);
  const experimentalTech = useGameStore(s => s.experimentalTech);
  const tutorialActive = useTutorialStore(s => s.isActive);
  const tutorialCurrentStep = useTutorialStore(s => s.currentStep);
  const tutorialSteps = useTutorialStore(s => s.steps);
  const tutorialIsHidden = useTutorialStore(s => s.isHidden);
  const isCampaign = useCampaignStore(s => !!s.campaign);
  const campaignScore = useCampaignStore(s => s.campaign?.currentScore ?? 0);

  const [pendingActionDrop, setPendingActionDrop] = React.useState<{ actionDef: any; ctCost: number; stressCost: number } | null>(null);
  const [showScenarioTracker, setShowScenarioTracker] = React.useState(false);
  const [showRoE, setShowRoE] = React.useState(false);
  const [showEnemyTactic, setShowEnemyTactic] = React.useState(false);
  const [hasUnreadEnemyTactic, setHasUnreadEnemyTactic] = React.useState(false);
  const [showScoreLedger, setShowScoreLedger] = React.useState(false);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const previousTacticIdRef = useRef<string | null>(currentTactic?.id ?? null);

  const [activePlayerId, setActivePlayerId] = useState(players[0]?.id);
  const [activeTabletStation, setActiveTabletStation] = useState<OfficerStation | null>(null);
  const [activePhoneTab, setActivePhoneTab] = useState<'map' | 'console'>('map');
  const player = players.find(p => p.id === activePlayerId) || players[0];

  const { isTablet, isCoarsePointer, isPhone } = useViewport();
  const targetingMode = useUIStore(s => s.targetingMode);

  useLayoutEffect(() => {
    if (isPhone && targetingMode !== null) {
      setActivePhoneTab('map');
    }
  }, [isPhone, targetingMode]);

  useLayoutEffect(() => {
    if (!tutorialActive || tutorialIsHidden) return;
    
    const currentStepObj = tutorialSteps[tutorialCurrentStep];
    if (!currentStepObj) return;

    const highlightId = currentStepObj.highlightId;
    if (!highlightId) return;

    if (isPhone) {
      if (
        highlightId === 'hex-map-container' ||
        highlightId === 'top-center-buttons' ||
        highlightId === 'game-log-tab'
      ) {
        setActivePhoneTab('map');
      } else if (
        highlightId === 'captain-hand' ||
        highlightId === 'fleet-assets-panel' ||
        highlightId === 'execute-button' ||
        highlightId === 'execution-panel' ||
        highlightId.startsWith('officer-station')
      ) {
        setActivePhoneTab('console');
      }
    }

    if (isPhone || isTablet) {
      if (highlightId.startsWith('officer-station-')) {
        const station = highlightId.replace('officer-station-', '') as OfficerStation;
        setActiveTabletStation(station);
      } else if (highlightId === 'captain-hand') {
        setActiveTabletStation('helm');
      }
    }
  }, [isPhone, isTablet, tutorialActive, tutorialIsHidden, tutorialCurrentStep, tutorialSteps]);

  const combatMusicSrc = useMemo(() => {
    const tracks = [
      '/assets/music/Iron_Perimeter.mp3',
      '/assets/music/Hull_Integrity.mp3',
      '/assets/music/View_From_The_Command_Deck.mp3',
      '/assets/music/Below_The_Permafrost.mp3',
    ];
    return tracks[Math.floor(Math.random() * tracks.length)];
  }, []);
  useBgm(combatMusicSrc, 0.15);

  // Configure dnd sensors: PointerSensor for mouse, TouchSensor for touch.
  // TouchSensor uses a hold delay so that a quick tap is NOT treated as a drag,
  // allowing tap-to-assign to fire the onClick on CommandToken instead.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  useLayoutEffect(() => {
    const previousTacticId = previousTacticIdRef.current;
    const nextTacticId = currentTactic?.id ?? null;

    if (nextTacticId && previousTacticId && nextTacticId !== previousTacticId && !showEnemyTactic) {
      setHasUnreadEnemyTactic(true);
    }

    if (showEnemyTactic) {
      setHasUnreadEnemyTactic(false);
    }

    previousTacticIdRef.current = nextTacticId;
  }, [currentTactic?.id, showEnemyTactic]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // active.id is the CT id (e.g. 'ct-p1-0')
    // over.id is the ActionSlot id (e.g. 'action-slot-adjust-speed')
    // over.data.current.action is the ActionDefinition

    if (over && over.data.current) {
      const actionDef = over.data.current.action;
      const ctCost = actionDef.ctCost;
      const stressCost = actionDef.stressCost;

      // Ensure player has enough tokens
      if (player && player.commandTokens >= ctCost) {
        if (actionDef.id === 'adjust-speed') {
          // Only ask for context during planning if Lead Foot is in play
          const helmOfficer = player.officers.find(o => o.station === 'helm');
          const officerData = helmOfficer ? getOfficerById(helmOfficer.officerId) : null;

          if (officerData?.traitName === 'Lead Foot') {
            setPendingActionDrop({ actionDef, ctCost, stressCost });
            return;
          }
        }

        const action: QueuedAction = {
          id: crypto.randomUUID(),
          station: actionDef.station as OfficerStation,
          actionId: actionDef.id,
          ctCost,
          stressCost,
          subsystemSlotIndex: actionDef.subsystemSlotIndex,
        };

        assignToken(player.id, action);
      }
    }
  };

  const confirmAdjustSpeed = (delta: number) => {
    if (!pendingActionDrop || !player) return;
    const { actionDef, ctCost, stressCost } = pendingActionDrop;
    const action: QueuedAction = {
      id: crypto.randomUUID(),
      station: actionDef.station as OfficerStation,
      actionId: actionDef.id,
      ctCost,
      stressCost,
      context: { delta },
      subsystemSlotIndex: actionDef.subsystemSlotIndex,
    };
    assignToken(player.id, action);
    setPendingActionDrop(null);
  };

  // ── Phone landscape layout (≤640px) ─────────────────────────────
  if (isPhone) {
    const sortedOfficers = (Array.isArray(player?.officers) ? player.officers : [])
      .slice()
      .sort((a, b) => (a.station || '').localeCompare(b.station || ''));
    const currentStation = activeTabletStation || sortedOfficers[0]?.station;
    const activeOfficer = sortedOfficers.find(o => o.station === currentStation);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {/* Game-wide overlays */}
        {phase === 'briefing' && <BriefingOverlay />}
        <GameLog />
        <CombatToastContainer />
        {tutorialActive && <TutorialOverlay />}
        <AstroCafNotification />
        <DebugMenu onAutoWin={debugAutoWin} onAutoLose={debugAutoLose} />
        <ExperimentalTechModal isOpen={isTechModalOpen} onClose={() => setIsTechModalOpen(false)} />

        {/* Tab bar */}
        <div className="phone-tab-bar">
          <button
            className={`phone-tab-btn${activePhoneTab === 'map' ? ' active' : ''}`}
            onClick={() => setActivePhoneTab('map')}
          >
            MAP
          </button>
          <button
            className={`phone-tab-btn${activePhoneTab === 'console' ? ' active' : ''}`}
            onClick={() => setActivePhoneTab('console')}
          >
            CONSOLE
          </button>
          {phase !== 'briefing' && (
            <button
              className="phone-tab-btn"
              style={{
                flex: '0 0 auto',
                width: 'auto',
                padding: '0 16px',
                color: experimentalTech.length > 0 ? 'var(--color-alert-amber)' : 'var(--color-text-secondary)',
                opacity: experimentalTech.length > 0 ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onClick={() => setIsTechModalOpen(true)}
              aria-label="Open Experimental Tech"
            >
              <span>⚙</span>
              <span>TECH ({experimentalTech.length})</span>
            </button>
          )}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

          {/* ── MAP TAB ────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            display: activePhoneTab === 'map' ? 'block' : 'none',
          }}>
            {phase !== 'briefing' && (
              <div
                id="top-center-buttons"
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 180,
                  width: 'min(760px, calc(100% - 16px))',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px', padding: '0 52px', marginBottom: (showScenarioTracker || showEnemyTactic || showRoE) ? '8px' : 0 }}>
                  <button
                    className="btn"
                    style={{ pointerEvents: 'auto', padding: '8px 10px', minHeight: '40px', fontSize: '0.75rem', borderColor: 'rgba(0, 204, 255, 0.35)', background: 'rgba(12, 18, 28, 0.92)', color: 'var(--color-holo-cyan)' }}
                    onClick={() => {
                      setShowRoE(open => {
                        const next = !open;
                        if (next) {
                          setShowScenarioTracker(false);
                          setShowEnemyTactic(false);
                        }
                        return next;
                      });
                    }}
                  >
                    {showRoE ? 'HIDE ROE' : 'ROE'}
                  </button>
                  <button
                    className="btn"
                    style={{ pointerEvents: 'auto', padding: '8px 10px', minHeight: '40px', fontSize: '0.75rem', borderColor: 'rgba(230, 160, 0, 0.35)', background: 'rgba(12, 18, 28, 0.92)', color: 'var(--color-alert-amber)' }}
                    onClick={() => {
                      setShowScenarioTracker(open => {
                        const next = !open;
                        if (next) {
                          setShowRoE(false);
                          setShowEnemyTactic(false);
                        }
                        return next;
                      });
                    }}
                  >
                    {showScenarioTracker ? 'HIDE OBJ' : 'OBJ'}
                  </button>
                  <button
                    className="btn"
                    style={{ pointerEvents: 'auto', padding: '8px 10px', minHeight: '40px', fontSize: '0.75rem', borderColor: 'rgba(210, 72, 72, 0.35)', background: 'rgba(12, 18, 28, 0.92)', color: 'var(--color-hostile-red)' }}
                    onClick={() => {
                      setShowEnemyTactic(open => {
                        const next = !open;
                        if (next) {
                          setShowRoE(false);
                          setShowScenarioTracker(false);
                          setHasUnreadEnemyTactic(false);
                        }
                        return next;
                      });
                    }}
                  >
                    {hasUnreadEnemyTactic && (
                      <SmartTooltip content="New enemy tactic" as="span">
                        <span
                          data-testid="enemy-tactic-unread-indicator"
                          aria-label="New enemy tactic"
                          style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '999px', background: 'var(--color-hostile-red)', boxShadow: '0 0 10px rgba(210, 72, 72, 0.75)', marginRight: '6px', flexShrink: 0 }}
                        />
                      </SmartTooltip>
                    )}
                    {showEnemyTactic ? 'HIDE TACTIC' : 'TACTIC'}
                  </button>
                  {/* Score counter — campaign only */}
                  {isCampaign && (
                    <SmartTooltip 
                      content="Fleet Commendation Score — tap to view ledger" 
                      as="button"
                      className="btn"
                      style={{ pointerEvents: 'auto', padding: '8px 10px', minHeight: '40px', fontSize: '0.75rem', borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(12, 18, 28, 0.92)', color: '#fbbf24', fontFamily: 'var(--font-mono)' }}
                      onClick={() => setShowScoreLedger(true)}
                    >
                      ★ {campaignScore.toLocaleString()}
                    </SmartTooltip>
                  )}
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ pointerEvents: showRoE ? 'auto' : 'none', opacity: showRoE ? 1 : 0, maxHeight: showRoE ? '320px' : '0px', overflow: 'hidden', transform: showRoE ? 'translateY(0)' : 'translateY(-18px)', transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease' }}>
                    {showRoE && <div style={{ width: 'min(540px, 100%)', margin: '0 auto' }}><RoEPanel showOverrideAction={isCampaign} /></div>}
                  </div>
                  <div style={{ pointerEvents: showScenarioTracker ? 'auto' : 'none', opacity: showScenarioTracker ? 1 : 0, maxHeight: showScenarioTracker ? '320px' : '0px', overflow: 'hidden', transform: showScenarioTracker ? 'translateY(0)' : 'translateY(-18px)', transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease' }}>
                    {showScenarioTracker && <CombatScenarioProgressTracker variant="overlay" />}
                  </div>
                  <div style={{ pointerEvents: showEnemyTactic ? 'auto' : 'none', opacity: showEnemyTactic ? 1 : 0, maxHeight: showEnemyTactic ? '280px' : '0px', overflow: 'hidden', transform: showEnemyTactic ? 'translateY(0)' : 'translateY(-18px)', transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease' }}>
                    {showEnemyTactic && <div style={{ width: 'min(540px, 100%)', margin: '0 auto' }}><EnemyTacticPanel /></div>}
                  </div>
                </div>
              </div>
            )}
            <HexMap />
          </div>

          {/* ── CONSOLE TAB ────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            overflowY: 'auto',
            display: activePhoneTab === 'console' ? 'flex' : 'none',
            flexDirection: 'column',
            padding: 'var(--space-sm)',
            gap: 'var(--space-sm)',
            background: 'var(--color-bg-panel)',
            paddingBottom: '60px', // space for pinned execute bar
          }}>
            {/* Fleet Assets */}
            <FleetAssetsPanel />

            {phase === 'execution' ? (
              <div id="execution-panel"><ExecutionPanel /></div>
            ) : phase === 'setup' && deploymentMode ? (
              <DeploymentPanel
                ships={playerShips}
                selectedShipId={deploymentSelectedShipId}
                deploymentBounds={deploymentBounds}
                onSelectShip={selectDeploymentShip}
                onRotateShip={rotateDeploymentShip}
                onConfirm={confirmDeployment}
                hideConfirmBtn={true}
              />
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                {/* Multiplayer player tabs */}
                {players.length > 1 && (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {players.map(p => (
                      <button
                        key={p.id}
                        className="btn"
                        style={{ padding: '8px 12px', fontSize: '0.8rem', borderColor: p.id === activePlayerId ? 'var(--color-holo-cyan)' : 'transparent', background: p.id === activePlayerId ? 'rgba(0, 204, 255, 0.1)' : 'transparent', color: p.id === activePlayerId ? 'var(--color-text-bright)' : 'var(--color-text-secondary)' }}
                        onClick={() => setActivePlayerId(p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Captain's CT pool */}
                <div id="captain-hand" style={{ width: '100%' }}>
                  <CaptainHand playerId={player.id} />
                </div>

                {/* Officer station tabs */}
                {player && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flex: 1 }}>
                    <div style={{ display: 'flex', overflowX: 'auto' }}>
                      {sortedOfficers.map(o => {
                        const officerData = getOfficerById(o.officerId);
                        const isActive = o.station === currentStation;
                        const assignments = player.assignedActions.filter(a => a.station === o.station).length;
                        const maxStress = (!officerData || officerData.stressLimit === null) 
                          ? null 
                          : officerData.stressLimit + getStimInjectorBonus(experimentalTech);
                        return (
                          <button
                            key={o.station}
                            onClick={() => setActiveTabletStation(o.station)}
                            className="station-tab-btn"
                            style={{
                              flex: 1, minWidth: 60, padding: '6px 4px', fontSize: '0.68rem',
                              borderBottom: isActive ? '2px solid var(--color-holo-cyan)' : '1px solid transparent',
                              background: isActive ? 'rgba(0, 204, 255, 0.1)' : o.isLocked ? 'rgba(255,0,0,0.1)' : 'var(--color-bg-panel)',
                              color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-secondary)',
                              position: 'relative',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '2px' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{o.station.toUpperCase()}</span>
                              {assignments > 0 && (
                                <span style={{ color: 'var(--color-bg-deep)', background: 'var(--color-holo-cyan)', borderRadius: '999px', padding: '0 4px', fontSize: '0.58rem', fontWeight: 'bold', flexShrink: 0 }}>{assignments}</span>
                              )}
                            </div>
                            {maxStress !== null ? (
                              <div style={{ display: 'flex', gap: '2px', width: '100%', height: '4px', marginTop: '2px' }}>
                                {Array.from({ length: maxStress }).map((_, i) => (
                                  <div key={i} style={{ flex: 1, background: i < o.currentStress ? 'var(--color-stress-orange)' : 'rgba(255,255,255,0.1)', borderRadius: '1px' }} />
                                ))}
                              </div>
                            ) : (
                              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.3)' }} />
                              </div>
                            )}
                            {o.isLocked && <div style={{ fontSize: '0.55rem', color: 'var(--color-hostile-red)', fontWeight: 'bold' }}>LOCKED</div>}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ flex: 1 }}>
                      {activeOfficer ? <OfficerStationPanel key={activeOfficer.officerId} officerState={activeOfficer} playerId={player.id} /> : null}
                    </div>
                  </div>
                )}
              </DndContext>
            )}
          </div>
        </div>

        {/* Pinned Action Bar — Contextual */}
        {(phase === 'command' || (phase === 'setup' && deploymentMode)) && (
          <div className="phone-execute-bar">
            {phase === 'setup' && deploymentMode ? (
              <button 
                className="btn btn--execute" 
                style={{ width: '100%', padding: '14px 16px', marginTop: 0 }} 
                onClick={confirmDeployment}
              >
                CONFIRM DEPLOYMENT
              </button>
            ) : (
              <ExecuteButton />
            )}
          </div>
        )}

        {/* Adjust Speed context modal */}
        {pendingActionDrop && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="panel" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxWidth: 'calc(100vw - 24px)' }}>
              <h3 style={{ color: 'var(--color-holo-cyan)' }}>Adjust Speed</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Select vector shift direction:</p>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn--execute" onClick={() => confirmAdjustSpeed(1)}>Accelerate (+)</button>
                <button className="btn" onClick={() => confirmAdjustSpeed(-1)}>Decelerate (-)</button>
              </div>
              <button className="btn" style={{ marginTop: 'var(--space-md)' }} onClick={() => setPendingActionDrop(null)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Score Ledger Modal */}
        {showScoreLedger && isCampaign && <ScoreLedgerModal onClose={() => setShowScoreLedger(false)} />}
      </div>
    );
  }
  // ── End phone layout ──────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Game-wide overlays */}
      {phase === 'briefing' && <BriefingOverlay />}
      <GameLog />
      <CombatToastContainer />
      {tutorialActive && <TutorialOverlay />}
      <AstroCafNotification />

      {/* Debug Menu */}
      <DebugMenu onAutoWin={debugAutoWin} onAutoLose={debugAutoLose} />

      {phase !== 'briefing' && experimentalTech.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 180,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '6px',
              pointerEvents: 'auto',
            }}
          >
            {experimentalTech.map(tech => (
              <TechBadge key={tech.id} tech={tech} />
            ))}
          </div>
        </div>
      )}

      {/* Left Interface: Holo-table (PixiJS) */}
      <div
        id="hex-map-container"
        style={{
          width: isTablet ? '55%' : 'var(--holotable-width)',
          position: 'relative',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {phase !== 'briefing' && (
          <div
            id="top-center-buttons"
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 180,
              width: 'min(760px, calc(100% - 16px))',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: (showScenarioTracker || showEnemyTactic || showRoE) ? '8px' : 0 }}>
              <button
                className="btn"
                style={{
                  pointerEvents: 'auto',
                  padding: isCoarsePointer ? '10px 16px' : '6px 14px',
                  minHeight: isCoarsePointer ? '44px' : undefined,
                  fontSize: isCoarsePointer ? '0.82rem' : '0.75rem',
                  borderColor: 'rgba(0, 204, 255, 0.35)',
                  background: 'rgba(12, 18, 28, 0.92)',
                  color: 'var(--color-holo-cyan)',
                }}
                onClick={() => {
                  setShowRoE(open => {
                    const next = !open;
                    if (next && isTablet) {
                      setShowScenarioTracker(false);
                      setShowEnemyTactic(false);
                    }
                    return next;
                  });
                }}
              >
                {showRoE ? 'HIDE ROE' : 'SHOW ROE'}
              </button>
              <button
                className="btn"
                style={{
                  pointerEvents: 'auto',
                  padding: isCoarsePointer ? '10px 16px' : '6px 14px',
                  minHeight: isCoarsePointer ? '44px' : undefined,
                  fontSize: isCoarsePointer ? '0.82rem' : '0.75rem',
                  borderColor: 'rgba(230, 160, 0, 0.35)',
                  background: 'rgba(12, 18, 28, 0.92)',
                  color: 'var(--color-alert-amber)',
                }}
                onClick={() => {
                  setShowScenarioTracker(open => {
                    const next = !open;
                    if (next && isTablet) {
                      setShowRoE(false);
                      setShowEnemyTactic(false);
                    }
                    return next;
                  });
                }}
              >
                {showScenarioTracker ? 'HIDE OBJECTIVES' : 'SHOW OBJECTIVES'}
              </button>
              <button
                className="btn"
                style={{
                  pointerEvents: 'auto',
                  padding: isCoarsePointer ? '10px 16px' : '6px 14px',
                  minHeight: isCoarsePointer ? '44px' : undefined,
                  fontSize: isCoarsePointer ? '0.82rem' : '0.75rem',
                  borderColor: 'rgba(210, 72, 72, 0.35)',
                  background: 'rgba(12, 18, 28, 0.92)',
                  color: 'var(--color-hostile-red)',
                }}
                onClick={() => {
                  setShowEnemyTactic(open => {
                    const nextOpen = !open;
                    if (nextOpen) {
                      setHasUnreadEnemyTactic(false);
                      if (isTablet) {
                        setShowRoE(false);
                        setShowScenarioTracker(false);
                      }
                    }
                    return nextOpen;
                  });
                }}
              >
                {hasUnreadEnemyTactic && (
                  <SmartTooltip content="New enemy tactic" as="span">
                    <span
                      data-testid="enemy-tactic-unread-indicator"
                      aria-label="New enemy tactic"
                      style={{
                        display: 'inline-flex',
                        width: '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: 'var(--color-hostile-red)',
                        boxShadow: '0 0 10px rgba(210, 72, 72, 0.75)',
                        marginRight: '8px',
                        flexShrink: 0,
                      }}
                    />
                  </SmartTooltip>
                )}
                {showEnemyTactic ? 'HIDE ENEMY TACTIC' : 'SHOW ENEMY TACTIC'}
              </button>
              {/* Score counter — campaign only */}
              {isCampaign && (
                <SmartTooltip 
                  content="Fleet Commendation Score — click to view ledger" 
                  as="button"
                  className="btn"
                  style={{
                    pointerEvents: 'auto',
                    padding: isCoarsePointer ? '10px 16px' : '6px 14px',
                    minHeight: isCoarsePointer ? '44px' : undefined,
                    fontSize: isCoarsePointer ? '0.82rem' : '0.75rem',
                    borderColor: 'rgba(251,191,36,0.4)',
                    background: 'rgba(12, 18, 28, 0.92)',
                    color: '#fbbf24',
                    fontFamily: 'var(--font-mono)',
                  }}
                  onClick={() => setShowScoreLedger(true)}
                >
                  ★ {campaignScore.toLocaleString()}
                </SmartTooltip>
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gap: '8px',
              }}
            >
              <div
                style={{
                  pointerEvents: showRoE ? 'auto' : 'none',
                  opacity: showRoE ? 1 : 0,
                  maxHeight: showRoE ? '320px' : '0px',
                  overflow: 'hidden',
                  transform: showRoE ? 'translateY(0)' : 'translateY(-18px)',
                  transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease',
                }}
              >
                {showRoE && (
                  <div style={{ width: 'min(540px, 100%)', margin: '0 auto' }}>
                    <RoEPanel showOverrideAction={isCampaign} />
                  </div>
                )}
              </div>
              <div
                style={{
                  pointerEvents: showScenarioTracker ? 'auto' : 'none',
                  opacity: showScenarioTracker ? 1 : 0,
                  maxHeight: showScenarioTracker ? '320px' : '0px',
                  overflow: 'hidden',
                  transform: showScenarioTracker ? 'translateY(0)' : 'translateY(-18px)',
                  transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease',
                }}
              >
                {showScenarioTracker && <CombatScenarioProgressTracker variant="overlay" />}
              </div>
              <div
                style={{
                  pointerEvents: showEnemyTactic ? 'auto' : 'none',
                  opacity: showEnemyTactic ? 1 : 0,
                  maxHeight: showEnemyTactic ? '280px' : '0px',
                  overflow: 'hidden',
                  transform: showEnemyTactic ? 'translateY(0)' : 'translateY(-18px)',
                  transition: 'opacity 180ms ease, transform 180ms ease, max-height 180ms ease',
                }}
              >
                {showEnemyTactic && (
                  <div style={{ width: 'min(540px, 100%)', margin: '0 auto' }}>
                    <EnemyTacticPanel />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <HexMap />
      </div>

      {/* Right Interface: Captain's Console or Execution Panel */}
      <div
        style={{
          width: isTablet ? '45%' : 'var(--console-width)',
          height: '100%',
          background: 'var(--color-bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-md)',
          gap: 'var(--space-md)',
          overflowY: 'auto',
        }}
      >
        {/* Compact toolbar: Fleet Assets trigger */}
        <FleetAssetsPanel />
        {phase === 'execution' ? (
          <>
            <div id="execution-panel">
              <ExecutionPanel />
            </div>
          </>
        ) : phase === 'setup' && deploymentMode ? (
          <DeploymentPanel
            ships={playerShips}
            selectedShipId={deploymentSelectedShipId}
            deploymentBounds={deploymentBounds}
            onSelectShip={selectDeploymentShip}
            onRotateShip={rotateDeploymentShip}
            onConfirm={confirmDeployment}
          />
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            {/* Player Tabs (Multiplayer only) */}
            {players.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {players.map((p, idx) => (
                  <button
                    key={p.id}
                    className="btn"
                    style={{
                      padding: isCoarsePointer ? '10px 16px' : '6px 12px',
                      fontSize: '0.8rem',
                      borderColor: p.id === activePlayerId ? 'var(--color-holo-cyan)' : 'transparent',
                      background: p.id === activePlayerId ? 'rgba(0, 204, 255, 0.1)' : 'transparent',
                      color: p.id === activePlayerId ? 'var(--color-text-bright)' : 'var(--color-text-secondary)',
                    }}
                    onClick={() => setActivePlayerId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {/* Top: Captain's Pool — always full width (Fleet Assets is now a FAB on the map) */}
            <div id="captain-hand" style={{ width: '100%' }}>
              <CaptainHand playerId={player.id} />
            </div>

            {/* Middle: Bridge Officer Stations Grid / Tabs */}
            {player && (
              isTablet ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', flex: 1 }}>
                   <div style={{ display: 'flex' }}>
                    {(() => {
                      const officersArr = Array.isArray(player.officers) ? player.officers : [];
                      const sortedOfficers = officersArr.slice().sort((a, b) => (a.station || '').localeCompare(b.station || ''));
                      const currentStation = activeTabletStation || sortedOfficers[0]?.station;
                      return sortedOfficers.map(o => {
                        const officerData = getOfficerById(o.officerId);
                        const isActive = o.station === currentStation;
                        const assignments = player.assignedActions.filter(a => a.station === o.station).length;
                        
                        const maxStress = (!officerData || officerData.stressLimit === null) 
                          ? null 
                          : officerData.stressLimit + getStimInjectorBonus(experimentalTech);

                        return (
                        <button
                          key={o.station}
                          onClick={() => setActiveTabletStation(o.station)}
                          className="station-tab-btn"
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '8px 6px',
                            borderBottom: isActive ? '2px solid var(--color-holo-cyan)' : '1px solid transparent',
                            background: isActive ? 'rgba(0, 204, 255, 0.1)' : o.isLocked ? 'rgba(255,0,0,0.1)' : 'var(--color-bg-panel)',
                            color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-secondary)',
                            position: 'relative',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: isActive ? 'var(--color-text-bright)' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {o.station.toUpperCase()}
                            </span>
                            {assignments > 0 && (
                              <span style={{ 
                                color: 'var(--color-bg-deep)', 
                                background: 'var(--color-holo-cyan)', 
                                borderRadius: '999px',
                                padding: '1px 5px',
                                fontSize: '0.6rem',
                                fontWeight: 'bold'
                              }}>
                                {assignments}
                              </span>
                            )}
                          </div>
                          
                          {/* Stress mini-bar */}
                          {maxStress !== null ? (
                            <div style={{ display: 'flex', gap: '2px', width: '100%', height: '4px' }}>
                               {Array.from({ length: maxStress }).map((_, i) => (
                                 <div 
                                   key={i} 
                                   style={{ 
                                     flex: 1, 
                                     background: i < o.currentStress ? 'var(--color-stress-orange)' : 'rgba(255,255,255,0.1)',
                                     borderRadius: '1px'
                                   }} 
                                 />
                               ))}
                            </div>
                          ) : (
                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.3)' }} />
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '6px', fontSize: '0.65rem', minHeight: '12px' }}>
                            {o.isLocked && <span style={{ color: 'var(--color-hostile-red)', fontWeight: 'bold' }}>LOCKED</span>}
                            {o.traumas.length > 0 && <span style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold' }}>⚠ {o.traumas.length} TRAUMA</span>}
                          </div>
                        </button>
                      );
                    })})()}
                  </div>
                  
                  {/* Active Panel */}
                  <div style={{ flex: 1 }}>
                    {(() => {
                      const officersArr = Array.isArray(player.officers) ? player.officers : [];
                      const sortedOfficers = officersArr.slice().sort((a, b) => (a.station || '').localeCompare(b.station || ''));
                      const currentStation = activeTabletStation || sortedOfficers[0]?.station;
                      const activeOfficer = officersArr.find(o => o.station === currentStation);
                      return activeOfficer ? <OfficerStationPanel key={activeOfficer.officerId} officerState={activeOfficer} playerId={player.id} /> : null;
                    })()}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 'var(--space-md)',
                    flex: 1,
                  }}
                >
                  {(Array.isArray(player.officers) ? player.officers : []).slice().sort((a, b) => (a.station || '').localeCompare(b.station || '')).map(o => (
                    <OfficerStationPanel key={o.officerId} officerState={o} playerId={player.id} />
                  ))}
                </div>
              )
            )}

            {/* Bottom: Commitment */}
            <ExecuteButton />
          </DndContext>
        )}
      </div>

      {/* Adjust Speed Context Modal */}
      {pendingActionDrop && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="panel" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-holo-cyan)' }}>Adjust Speed</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Select vector shift direction:</p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn--execute" onClick={() => confirmAdjustSpeed(1)}>Accelerate (+)</button>
              <button className="btn" onClick={() => confirmAdjustSpeed(-1)}>Decelerate (-)</button>
            </div>
            <button className="btn" style={{ marginTop: 'var(--space-md)' }} onClick={() => setPendingActionDrop(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Score Ledger Modal */}
      {showScoreLedger && isCampaign && <ScoreLedgerModal onClose={() => setShowScoreLedger(false)} />}
    </div>
  );
}

function DeploymentPanel({
  ships,
  selectedShipId,
  deploymentBounds,
  onSelectShip,
  onRotateShip,
  onConfirm,
  hideConfirmBtn,
}: {
  ships: Array<{ id: string; name: string; facing: number }>;
  selectedShipId: string | null;
  deploymentBounds: import('../../types/game').DeploymentBounds | null;
  onSelectShip: (shipId: string) => void;
  onRotateShip: (shipId: string, delta?: 1 | -1) => void;
  onConfirm: () => void;
  hideConfirmBtn?: boolean;
}) {
  const selectedShip = selectedShipId ? ships.find(ship => ship.id === selectedShipId) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', height: '100%' }}>
      <div className="panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--color-alert-amber)', fontFamily: 'var(--font-mono)' }}>
          DEPLOYMENT
        </div>
        <h3 style={{ margin: 0, color: 'var(--color-holo-cyan)' }}>Choose your formation</h3>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Place each ship inside the highlighted amber deployment zone, set its facing, then confirm when the fleet is ready.
          Enemy positions stay hidden until you lock in your starting formation.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 181, 71, 0.12)',
            border: '1px solid rgba(255, 181, 71, 0.35)',
            color: 'var(--color-text-primary)',
            fontSize: '0.85rem',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #ffd89a 0%, #ffb547 100%)',
              boxShadow: '0 0 10px rgba(255, 181, 71, 0.45)',
              flexShrink: 0,
            }}
          />
          Amber hexes mark valid deployment positions.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          <div>1. Select a ship from the roster or click it on the map.</div>
          <div>2. Rotate it with the buttons below, or click the selected ship again on the map.</div>
          <div>3. Click an open amber hex to place it, then repeat until the formation looks right.</div>
          <div>4. Press Confirm Deployment to begin the battle.</div>
        </div>
        {deploymentBounds && (
          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
            Deployment zone: {deploymentBounds.label ? `${deploymentBounds.label}, ` : ''}Q {deploymentBounds.minQ} to {deploymentBounds.maxQ}, R {deploymentBounds.minR} to {deploymentBounds.maxR}
            {deploymentBounds.hexes ? `, ${deploymentBounds.hexes.length} valid hexes` : ''}
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flex: 1 }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
          SHIPS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {ships.map(ship => {
            const selected = ship.id === selectedShipId;
            return (
              <button
                key={ship.id}
                className="btn"
                style={{
                  justifyContent: 'space-between',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderColor: selected ? 'rgba(0, 220, 180, 0.55)' : undefined,
                  background: selected ? 'rgba(0, 220, 180, 0.1)' : undefined,
                  color: selected ? 'var(--color-holo-cyan)' : undefined,
                }}
                onClick={() => onSelectShip(ship.id)}
              >
                <span>{ship.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                  F{ship.facing}
                </span>
              </button>
            );
          })}
        </div>

        {selectedShip && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap', marginTop: 'auto' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              Selected: {selectedShip.name}
            </span>
            <button className="btn" onClick={() => onRotateShip(selectedShip.id, -1)}>Rotate Left</button>
            <button className="btn" onClick={() => onRotateShip(selectedShip.id, 1)}>Rotate Right</button>
          </div>
        )}
      </div>

      {!hideConfirmBtn && (
        <button className="btn btn--execute" style={{ padding: '14px 16px' }} onClick={onConfirm}>
          Confirm Deployment
        </button>
      )}
    </div>
  );
}

function DebugMenu({ onAutoWin, onAutoLose }: { onAutoWin: () => void; onAutoLose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);

  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const enemyShips = useGameStore(s => s.enemyShips);
  const debugAddTrauma = useGameStore(s => s.debugAddTrauma);
  const debugAddScar = useGameStore(s => s.debugAddScar);
  const debugAddCriticalToShip = useGameStore(s => s.debugAddCriticalToShip);

  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [selectedTraumaId, setSelectedTraumaId] = useState(TRAUMA_POOL[0]?.id || '');
  const [selectedShipId, setSelectedShipId] = useState('');
  const [selectedScarId, setSelectedScarId] = useState(Object.keys(SCAR_TEMPLATES)[0] || '');
  const [selectedPlayerCritShipId, setSelectedPlayerCritShipId] = useState('');
  const [selectedPlayerCritId, setSelectedPlayerCritId] = useState(PLAYER_CRITICAL_DECK[0]?.id || '');
  const [selectedEnemyCritShipId, setSelectedEnemyCritShipId] = useState('');
  const [selectedEnemyCritId, setSelectedEnemyCritId] = useState(ENEMY_CRITICAL_DECK[0]?.id || '');

  // Flatten officers from all players
  const allOfficers = players.flatMap(p => p.officers.map(o => {
    const data = getOfficerById(o.officerId);
    return {
      officerId: o.officerId,
      name: data?.name || o.officerId,
      station: o.station,
    };
  }));

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.altKey && e.key.toLowerCase() === 'd') {
        setVisible(v => !v);
      }
    };
    // 5-finger tap to open dev menu on touch devices (no keyboard available)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 5) {
        setVisible(v => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // Initialize selected officer when loaded
  React.useEffect(() => {
    if (allOfficers.length > 0 && !selectedOfficerId) {
      setSelectedOfficerId(allOfficers[0].officerId);
    }
  }, [allOfficers, selectedOfficerId]);

  // Initialize selected ship when loaded
  React.useEffect(() => {
    if (playerShips.length > 0 && !selectedShipId) {
      setSelectedShipId(playerShips[0].id);
    }
  }, [playerShips, selectedShipId]);

  // Initialize selected player crit ship
  React.useEffect(() => {
    if (playerShips.length > 0 && !selectedPlayerCritShipId) {
      setSelectedPlayerCritShipId(playerShips[0].id);
    }
  }, [playerShips, selectedPlayerCritShipId]);

  // Initialize selected enemy crit ship
  React.useEffect(() => {
    const activeEnemyShips = enemyShips.filter(s => !s.isDestroyed);
    if (activeEnemyShips.length > 0 && !selectedEnemyCritShipId) {
      setSelectedEnemyCritShipId(activeEnemyShips[0].id);
    }
  }, [enemyShips, selectedEnemyCritShipId]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '8px',
      right: '8px',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '4px',
    }}>
      <SmartTooltip 
        content="Toggle debug tools" 
        as="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(20,20,30,0.85)',
          border: '1px solid rgba(255,200,0,0.4)',
          color: 'rgba(255,200,0,0.7)',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          letterSpacing: '0.08em',
        }}
      >
        {open ? 'DEV ^' : 'DEV'}
      </SmartTooltip>
      {open && (
        <div style={{
          background: 'rgba(10,10,20,0.95)',
          border: '1px solid rgba(255,200,0,0.35)',
          borderRadius: '6px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '180px',
          maxHeight: 'calc(100vh - 50px)',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            DEBUG TOOLS
          </div>
          <button
            className="btn btn--danger"
            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
            onClick={() => { onAutoWin(); setOpen(false); }}
          >
            Auto-Win
          </button>
          <button
            className="btn btn--danger"
            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
            onClick={() => { onAutoLose(); setOpen(false); }}
          >
            Auto-Lose
          </button>

          <div style={{ borderTop: '1px solid rgba(255,200,0,0.2)', marginTop: 4, marginBottom: 4 }} />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            RESOURCES
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button className="btn" style={{ fontSize: '0.65rem', padding: '4px' }} onClick={() => useCampaignStore.setState(s => ({ campaign: s.campaign ? { ...s.campaign, requisitionPoints: Math.max(0, s.campaign.requisitionPoints + 50) } : null }))}>+50 RP</button>
            <button className="btn" style={{ fontSize: '0.65rem', padding: '4px' }} onClick={() => useCampaignStore.setState(s => ({ campaign: s.campaign ? { ...s.campaign, requisitionPoints: Math.max(0, s.campaign.requisitionPoints - 50) } : null }))}>-50 RP</button>
            <button className="btn" style={{ fontSize: '0.65rem', padding: '4px' }} onClick={() => useCampaignStore.setState(s => ({ campaign: s.campaign ? { ...s.campaign, fleetFavor: Math.max(0, s.campaign.fleetFavor + 5) } : null }))}>+5 FF</button>
            <button className="btn" style={{ fontSize: '0.65rem', padding: '4px' }} onClick={() => useCampaignStore.setState(s => ({ campaign: s.campaign ? { ...s.campaign, fleetFavor: Math.max(0, s.campaign.fleetFavor - 5) } : null }))}>-5 FF</button>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,200,0,0.2)', marginTop: 4, marginBottom: 4 }} />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            ADD TRAUMA
          </div>
          {allOfficers.length > 0 ? (
            <>
              <select
                value={selectedOfficerId}
                onChange={e => setSelectedOfficerId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {allOfficers.map(o => (
                  <option key={o.officerId} value={o.officerId}>
                    {o.name} ({o.station.toUpperCase()})
                  </option>
                ))}
              </select>
              <select
                value={selectedTraumaId}
                onChange={e => setSelectedTraumaId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {TRAUMA_POOL.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn--danger"
                style={{ fontSize: '0.72rem', padding: '4px 10px', marginTop: '2px' }}
                onClick={() => {
                  if (selectedOfficerId && selectedTraumaId) {
                    debugAddTrauma(selectedOfficerId, selectedTraumaId);
                  }
                }}
              >
                Apply Trauma
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>No officers found.</div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,200,0,0.2)', marginTop: 4, marginBottom: 4 }} />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            ADD SHIP SCAR
          </div>
          {playerShips.length > 0 ? (
            <>
              <select
                value={selectedShipId}
                onChange={e => setSelectedShipId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {playerShips.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedScarId}
                onChange={e => setSelectedScarId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {Object.entries(SCAR_TEMPLATES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn--danger"
                style={{ fontSize: '0.72rem', padding: '4px 10px', marginTop: '2px' }}
                onClick={() => {
                  if (selectedShipId && selectedScarId) {
                    debugAddScar(selectedShipId, selectedScarId);
                  }
                }}
              >
                Apply Scar
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>No ships found.</div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,200,0,0.2)', marginTop: 4, marginBottom: 4 }} />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            ADD CRIT TO PLAYER SHIP
          </div>
          {playerShips.length > 0 ? (
            <>
              <select
                value={selectedPlayerCritShipId}
                onChange={e => setSelectedPlayerCritShipId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {playerShips.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedPlayerCritId}
                onChange={e => setSelectedPlayerCritId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {PLAYER_CRITICAL_DECK.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn--danger"
                style={{ fontSize: '0.72rem', padding: '4px 10px', marginTop: '2px' }}
                onClick={() => {
                  if (selectedPlayerCritShipId && selectedPlayerCritId) {
                    debugAddCriticalToShip(selectedPlayerCritShipId, selectedPlayerCritId, false);
                  }
                }}
              >
                Apply Crit
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>No player ships.</div>
          )}

          <div style={{ borderTop: '1px solid rgba(255,200,0,0.2)', marginTop: 4, marginBottom: 4 }} />
          <div style={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.5)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
            ADD CRIT TO ENEMY SHIP
          </div>
          {enemyShips.filter(s => !s.isDestroyed).length > 0 ? (
            <>
              <select
                value={selectedEnemyCritShipId}
                onChange={e => setSelectedEnemyCritShipId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {enemyShips.filter(s => !s.isDestroyed).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedEnemyCritId}
                onChange={e => setSelectedEnemyCritId(e.target.value)}
                style={{ fontSize: '0.7rem', padding: '4px', background: 'var(--color-bg-deep)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
              >
                {ENEMY_CRITICAL_DECK.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn--danger"
                style={{ fontSize: '0.72rem', padding: '4px 10px', marginTop: '2px' }}
                onClick={() => {
                  if (selectedEnemyCritShipId && selectedEnemyCritId) {
                    debugAddCriticalToShip(selectedEnemyCritShipId, selectedEnemyCritId, true);
                  }
                }}
              >
                Apply Crit
              </button>
            </>
          ) : (
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>No enemy ships.</div>
          )}
        </div>
      )}
    </div>
  );
}
