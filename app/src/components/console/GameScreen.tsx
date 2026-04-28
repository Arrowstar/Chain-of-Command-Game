import React, { useLayoutEffect, useRef, useState } from 'react';
import { DndContext } from '@dnd-kit/core';
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
import CombatScenarioProgressTracker from '../combat/CombatScenarioProgressTracker';
import TechBadge from '../campaign/TechBadge';
import TutorialOverlay from '../tutorial/TutorialOverlay';
import { useGameStore } from '../../store/useGameStore';
import { useTutorialStore } from '../../store/useTutorialStore';
import { getOfficerById } from '../../data/officers';
import type { QueuedAction, OfficerStation } from '../../types/game';

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
  const phase = useGameStore(s => s.phase);
  const currentTactic = useGameStore(s => s.currentTactic);
  const experimentalTech = useGameStore(s => s.experimentalTech);
  const tutorialActive = useTutorialStore(s => s.isActive);

  const [pendingActionDrop, setPendingActionDrop] = React.useState<{ actionDef: any; ctCost: number; stressCost: number } | null>(null);
  const [showScenarioTracker, setShowScenarioTracker] = React.useState(false);
  const [showEnemyTactic, setShowEnemyTactic] = React.useState(false);
  const [hasUnreadEnemyTactic, setHasUnreadEnemyTactic] = React.useState(false);
  const previousTacticIdRef = useRef<string | null>(currentTactic?.id ?? null);

  const [activePlayerId, setActivePlayerId] = useState(players[0]?.id);
  const player = players.find(p => p.id === activePlayerId) || players[0];

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

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Game-wide overlays */}
      {phase === 'briefing' && <BriefingOverlay />}
      <GameLog />
      {tutorialActive && <TutorialOverlay />}

      {/* Debug Menu */}
      <DebugMenu onAutoWin={debugAutoWin} />

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

      {phase !== 'briefing' && (
        <div
          id="top-center-buttons"
          style={{
            position: 'fixed',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 180,
            width: 'min(760px, calc(100vw - 140px))',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: (showScenarioTracker || showEnemyTactic) ? '8px' : 0 }}>
            <button
              className="btn"
              style={{
                pointerEvents: 'auto',
                padding: '6px 14px',
                fontSize: '0.75rem',
                borderColor: 'rgba(230, 160, 0, 0.35)',
                background: 'rgba(12, 18, 28, 0.92)',
                color: 'var(--color-alert-amber)',
              }}
              onClick={() => setShowScenarioTracker(open => !open)}
            >
              {showScenarioTracker ? 'HIDE OBJECTIVES' : 'SHOW OBJECTIVES'}
            </button>
            <button
              className="btn"
              style={{
                pointerEvents: 'auto',
                padding: '6px 14px',
                fontSize: '0.75rem',
                borderColor: 'rgba(210, 72, 72, 0.35)',
                background: 'rgba(12, 18, 28, 0.92)',
                color: 'var(--color-hostile-red)',
              }}
              onClick={() => {
                setShowEnemyTactic(open => {
                  const nextOpen = !open;
                  if (nextOpen) {
                    setHasUnreadEnemyTactic(false);
                  }
                  return nextOpen;
                });
              }}
            >
              {hasUnreadEnemyTactic && (
                <span
                  data-testid="enemy-tactic-unread-indicator"
                  aria-label="New enemy tactic"
                  title="New enemy tactic"
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
              )}
              {showEnemyTactic ? 'HIDE ENEMY TACTIC' : 'SHOW ENEMY TACTIC'}
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gap: '8px',
            }}
          >
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

      {/* Left Interface: Holo-table (PixiJS) */}
      <div id="hex-map-container" style={{ width: 'var(--holotable-width)', position: 'relative', borderRight: '1px solid var(--color-border)' }}>
        <HexMap />
      </div>

      {/* Right Interface: Captain's Console or Execution Panel */}
      <div
        style={{
          width: 'var(--console-width)',
          height: '100%',
          background: 'var(--color-bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-md)',
          gap: 'var(--space-md)',
          overflowY: 'auto',
        }}
      >
        {phase === 'execution' ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div id="fleet-assets-panel" style={{ width: '280px', flexShrink: 0 }}>
                <FleetAssetsPanel />
              </div>
            </div>
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
          <DndContext onDragEnd={handleDragEnd}>
            {/* Player Tabs (Multiplayer only) */}
            {players.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {players.map((p, idx) => (
                  <button
                    key={p.id}
                    className="btn"
                    style={{
                      padding: '6px 12px',
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

            {/* Top: Fleet Info & Captain's Pool */}
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div id="captain-hand" style={{ flex: 1 }}>
                <CaptainHand playerId={player.id} />
              </div>
              <div id="fleet-assets-panel" style={{ width: '280px', flexShrink: 0 }}>
                <FleetAssetsPanel />
              </div>
            </div>

            {/* Middle: Bridge Officer Stations Grid */}
            {player && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-md)',
                  flex: 1,
                }}
              >
                {[...player.officers].sort((a, b) => a.station.localeCompare(b.station)).map(o => (
                  <OfficerStationPanel key={o.officerId} officerState={o} playerId={player.id} />
                ))}
              </div>
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
}: {
  ships: Array<{ id: string; name: string; facing: number }>;
  selectedShipId: string | null;
  deploymentBounds: import('../../types/game').DeploymentBounds | null;
  onSelectShip: (shipId: string) => void;
  onRotateShip: (shipId: string, delta?: 1 | -1) => void;
  onConfirm: () => void;
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

      <button className="btn btn--execute" style={{ padding: '14px 16px' }} onClick={onConfirm}>
        Confirm Deployment
      </button>
    </div>
  );
}

function DebugMenu({ onAutoWin }: { onAutoWin: () => void }) {
  const [open, setOpen] = useState(false);
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
      <button
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
        title="Toggle debug tools"
      >
        {open ? 'DEV ^' : 'DEV'}
      </button>
      {open && (
        <div style={{
          background: 'rgba(10,10,20,0.95)',
          border: '1px solid rgba(255,200,0,0.35)',
          borderRadius: '6px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          minWidth: '140px',
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
        </div>
      )}
    </div>
  );
}
