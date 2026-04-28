import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';
import { isAlliedStep, getShipSizeForStep } from '../../engine/GameStateMachine';
import { getChassisById } from '../../data/shipChassis';
import { getActionById } from '../../data/actions';
import { getSubsystemById } from '../../data/subsystems';
import { getWeaponById } from '../../data/weapons';
import { getAdversaryById } from '../../data/adversaries';
import { getValidTargetsForWeapon } from '../../engine/combat';
import { applyPlasmaAccelerators } from '../../engine/techEffects';
import type { ShieldState, ShipArc } from '../../types/game';
import { ASSET_MAP } from '../../engine/pixiGraphics';

const SHIELD_SECTORS: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
const ARC_LABELS: Record<ShipArc, string> = {
  fore: 'Fore',
  foreStarboard: 'Fore-Starboard',
  aftStarboard: 'Aft-Starboard',
  aft: 'Aft',
  aftPort: 'Aft-Port',
  forePort: 'Fore-Port',
};

interface CyberSelectionState {
  targetShipId: string | null;
  sector: ShipArc | null;
}

function getTargetableShieldSectors(ship: Pick<{ shields: ShieldState }, 'shields'>): ShipArc[] {
  return SHIELD_SECTORS.filter(sector => (ship.shields[sector] ?? 0) > 0);
}

export default function ExecutionPanel() {
  const phase = useGameStore(s => s.phase);
  const executionStep = useGameStore(s => s.executionStep);

  if (phase !== 'execution' || !executionStep) return null;

  const isAllied = isAlliedStep(executionStep);
  const size = getShipSizeForStep(executionStep);
  const playerShips = useGameStore(s => s.playerShips);
  const enemyShips = useGameStore(s => s.enemyShips);
  const fighterTokens = useGameStore(s => s.fighterTokens);
  const torpedoTokens = useGameStore(s => s.torpedoTokens);
  const players = useGameStore(s => s.players);
  const experimentalTech = useGameStore(s => s.experimentalTech);
  const combatModifiers = useGameStore(s => s.combatModifiers);
  const resolvedSteps = useGameStore(s => s.resolvedSteps);
  const advanceExecutionStep = useGameStore(s => s.advanceExecutionStep);
  const resolveDrift = useGameStore(s => s.resolveDrift);
  const resolveAction = useGameStore(s => s.resolveAction);
  const resolveEnemyTurn = useGameStore(s => s.resolveEnemyTurn);
  const resolveFighterStep = useGameStore(s => s.resolveFighterStep);
  const resolveTorpedoStep = useGameStore(s => s.resolveTorpedoStep);
  
  const targetingMode = useUIStore(s => s.targetingMode);
  const clearTargeting = useUIStore(s => s.clearTargeting);
  const startTargeting = useUIStore(s => s.startTargeting);
  const activeTargetingAction = useUIStore(s => s.activeTargetingAction);
  const activeTargetingContext = useUIStore(s => s.activeTargetingContext);

  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [cyberSelections, setCyberSelections] = useState<Record<string, CyberSelectionState>>({});
  const [rotateShieldsSelections, setRotateShieldsSelections] = useState<Record<string, { donorSector: import('../../types/game').ShipArc | null; receiverSector: import('../../types/game').ShipArc | null }>>({});
  const [reinforceShieldsSelections, setReinforceShieldsSelections] = useState<Record<string, import('../../types/game').ShipArc | null>>({});

  const shipsInStep = isAllied ? playerShips.filter(s => !s.isDestroyed && getChassisById(s.chassisId)?.size === size) : [];

  // Filter ships for this step
  const activeAllied = isAllied ? playerShips.filter(s => {
    const c = getChassisById(s.chassisId);
    return c?.size === size && !s.isDestroyed;
  }) : [];

  const activeEnemy = !isAllied ? enemyShips.filter(s => {
    if (s.isDestroyed) return false;
    const adversary = getAdversaryById(s.adversaryId);
    if (size === 'small' && adversary?.size === 'fighter') return true;
    return adversary?.size === size;
  }) : [];

  const handleNextStep = () => {
    advanceExecutionStep();
  };

  // Allied fighters relevant to this step (small step only)
  const alliedFighters = (isAllied && size === 'small')
    ? fighterTokens.filter(f => f.allegiance === 'allied' && !f.isDestroyed)
    : [];
  const enemyFighters = (!isAllied && size === 'small')
    ? fighterTokens.filter(f => f.allegiance === 'enemy' && !f.isDestroyed)
    : [];
  const activeTorpedoes = (isAllied && size === 'small')
    ? torpedoTokens.filter(t => t.allegiance === 'allied' && !t.isDestroyed)
    : [];
  const enemyTorpedoes = (!isAllied && size === 'small')
    ? torpedoTokens.filter(t => t.allegiance === 'enemy' && !t.isDestroyed)
    : [];

  const isStepResolved = isAllied
    ? activeAllied.every(ship => {
        const owner = players.find(p => p.shipId === ship.id);
        const allActionsResolved = owner?.assignedActions.every(a => a.resolved) ?? true;
        return ship.hasDrifted && allActionsResolved;
      }) && alliedFighters.every(f => f.hasDrifted) && activeTorpedoes.every(t => t.hasMoved)
    : resolvedSteps.includes(executionStep);

  // If no ships are in this step, it is effectively resolved
  const isEmptyStep = isAllied 
    ? activeAllied.length === 0 && alliedFighters.length === 0 && activeTorpedoes.length === 0 
    : activeEnemy.length === 0 && enemyFighters.length === 0 && enemyTorpedoes.length === 0;

  let noValidTargets = false;
  if (targetingMode && activeTargetingAction?.actionId === 'fire-primary' && activeTargetingContext?.weaponId) {
    const weapon = getWeaponById(activeTargetingContext.weaponId as string);
    const attackerShip = playerShips.find(s => s.id === activeTargetingAction.shipId);
    if (weapon && attackerShip) {
      const effectiveWeapon = {
        ...weapon,
        rangeMax: applyPlasmaAccelerators(weapon.rangeMax, weapon.tags.includes('ordnance'), experimentalTech),
      };
      const allShips = [...playerShips, ...enemyShips];
      const validIds = getValidTargetsForWeapon(attackerShip.position, attackerShip.facing, effectiveWeapon, allShips, useGameStore.getState().terrainMap);
      if (validIds.length === 0) {
        noValidTargets = true;
      }
    }
  }

  return (
    <div className="panel panel--glow" style={{ padding: 'var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="flex-between">
        <h2 style={{ color: 'var(--color-holo-cyan)' }}>Execution Phase</h2>
        <div className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>STEP: {executionStep.toUpperCase()}</span>
          {(isStepResolved || isEmptyStep) && <span style={{ background: 'var(--color-holo-green)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>✓ COMPLETE</span>}
        </div>
      </div>

      {targetingMode && (
        <div className="panel panel--danger" style={{ padding: 'var(--space-sm)' }}>
          <div className="flex-between" style={{ marginBottom: noValidTargets ? '8px' : '0' }}>
            <span className="label" style={{ color: 'var(--color-hostile-red)' }}>
              {(() => {
                const ctx = useUIStore.getState().activeTargetingContext;
                if (targetingMode === 'hex') {
                  return 'SELECT ADJACENT HEX FOR DEPLOYMENT...';
                } else if (ctx?.phase === 'pickTarget') {
                  return 'SQUADRON DEPLOYED. SELECT ENGAGEMENT TARGET...';
                }
                return 'AWAITING TARGET COORDINATES...';
              })()}
            </span>
            <button className="btn" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={clearTargeting}>Cancel</button>
          </div>
          {noValidTargets && (
            <button 
              className="btn btn--danger" 
              style={{ width: '100%', fontSize: '0.8rem', padding: '8px' }}
              onClick={() => {
                const player = players.find(p => p.shipId === activeTargetingAction!.shipId);
                resolveAction(player!.id, activeTargetingAction!.shipId, activeTargetingAction!.actionId, { ...activeTargetingContext, discharge: true });
                clearTargeting();
              }}
            >
              DISCHARGE WEAPON (NO VALID TARGETS)
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {isAllied && activeAllied.map(ship => {
          const chassis = getChassisById(ship.chassisId);
          const owner = players.find(p => p.shipId === ship.id);
          const actions = owner?.assignedActions || [];

          return (
            <div key={ship.id} className="panel panel--raised">
              <div className="label" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-text-bright)' }}>
                {owner?.name} - {chassis?.className}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div className="flex-between" style={{ padding: '8px', background: 'var(--color-bg-deep)', borderLeft: '2px solid var(--color-holo-cyan)' }}>
                  <span className="mono" style={{ fontSize: '0.8rem' }}>Mandatory Drift</span>
                  {ship.hasDrifted ? (
                    <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>RESOLVED</span>
                  ) : (
                    <button className="btn" style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={() => resolveDrift(ship.id, true)}>RESOLVE</button>
                  )}
                </div>

                {actions.map(action => {
                  let def = getActionById(action.actionId);
                  if (!def) {
                    const sub = getSubsystemById(action.actionId);
                    if (sub) {
                      def = {
                        id: sub.id,
                        station: sub.station,
                        name: sub.actionName,
                        ctCost: sub.ctCost,
                        stressCost: sub.stressCost,
                        effect: sub.effect,
                        requiresTarget: sub.requiresTarget,
                        requiresHexTarget: sub.requiresHexTarget,
                      };
                    }
                  }
                  
                  const isExpanded = expandedActionId === action.id;
                  const driftRequired = !ship.hasDrifted;
                  const cyberSelection = cyberSelections[action.id] ?? { targetShipId: null, sector: null };
                  
                  const needsExpansion = [
                    'rotate', 'fire-primary', 'adjust-speed',
                    'reinforce-shields', 'rotate-shields', 'damage-control', 'cyber-warfare',
                    'load-ordinance', 'steady-nerves',
                  ].includes(def?.id || '');

                  const handleResolveAction = () => {
                    if (driftRequired) return;
                    if (def?.id === 'fighter-hangar') {
                      // Enter hex-targeting mode — player clicks an adjacent hex to deploy
                      startTargeting('hex', { shipId: ship.id, actionId: action.id });
                    } else if (def?.id === 'vector-orders') {
                      // Enter ship-targeting mode — player clicks an enemy to vector fighters
                      startTargeting('ship', { shipId: ship.id, actionId: action.id });
                    } else if (needsExpansion) {
                      setExpandedActionId(isExpanded ? null : action.id);
                    } else if (def?.requiresHexTarget) {
                      startTargeting('hex', { shipId: ship.id, actionId: action.id });
                    } else if (def?.requiresTarget) {
                      startTargeting('ship', { shipId: ship.id, actionId: action.id });
                    } else {
                      resolveAction(owner!.id, ship.id, action.id);
                    }
                  };
                  
                  return (
                    <div key={action.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      {/* Derive amber-highlight for Load Ordnance when any ordnance slot is empty */}
                      {(() => {
                        const isLoadAction = def?.id === 'load-ordinance';
                        const hasUnloadedOrdnance = isLoadAction && ship.equippedWeapons.some((wId, idx) => {
                          if (!wId) return false;
                          const w = getWeaponById(wId);
                          return w?.tags?.includes('ordnance') && (ship.ordnanceLoadedStatus ?? {})[idx] === false;
                        });
                        const rowBorderColor = hasUnloadedOrdnance
                          ? 'var(--color-alert-amber)'
                          : 'var(--color-holo-green)';
                        return (
                          <div className="flex-between" style={{ padding: '8px', background: 'var(--color-bg-deep)', borderLeft: `2px solid ${rowBorderColor}` }}>
                        <div>
                          <span className="mono" style={{ fontSize: '0.8rem', display: 'block', color: action.resolved ? 'var(--color-text-dim)' : 'inherit' }}>
                            {def?.name}
                          </span>
                          <span className="label" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>{action.station.toUpperCase()}</span>
                        </div>
                        
                          {action.resolved ? (
                            <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>RESOLVED</span>
                          ) : driftRequired ? (
                            <span className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.7rem', opacity: 0.6 }}>DRIFT FIRST</span>
                          ) : (
                            <button className="btn btn--execute" style={{ padding: '4px 12px', fontSize: '0.7rem' }} onClick={handleResolveAction}>
                              {isExpanded ? 'CANCEL' : needsExpansion ? 'OPTIONS...' : 'RESOLVE'}
                            </button>
                          )}
                        </div>
                        );
                      })()}

                      {/* Inline Options Panel */}
                      {isExpanded && !action.resolved && (
                        <div style={{ padding: '8px', background: 'var(--color-bg-panel)', borderLeft: '2px solid var(--color-holo-green)', marginTop: '2px' }}>
                          
                          {/* Rotation Options */}
                          {def?.id === 'rotate' && (
                            <>
                              <div className="label" style={{ marginBottom: '8px' }}>Select Rotation Direction:</div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={() => {
                                  resolveAction(owner!.id, ship.id, action.id, { direction: 'counter-clockwise' });
                                  setExpandedActionId(null);
                                }}>PORT (CCW)</button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => {
                                  resolveAction(owner!.id, ship.id, action.id, { direction: 'clockwise' });
                                  setExpandedActionId(null);
                                }}>STARBOARD (CW)</button>
                              </div>
                            </>
                          )}

                          {/* Adjust Speed Options */}
                          {def?.id === 'adjust-speed' && (() => {
                            const scarSpeedPenalty = ship.scars?.some(s => s.fromCriticalId === 'thrusters-offline') ? 1 : 0;
                            const eventSpeedPenalty = combatModifiers?.playerMaxSpeedReduction ?? 0;
                            const chassisMaxSpeed = Math.max(0, (chassis?.maxSpeed ?? 4) - scarSpeedPenalty - eventSpeedPenalty);
                            const scarSpeedCap = ship.scars?.some(s => s.fromCriticalId === 'structural-spine-buckled') ? 2 : null;
                            const helmOfficer = owner?.officers.find(o => o.station === 'helm');
                            const hasOverCautious = helmOfficer?.traumas.some(t => t.id === 'over-cautious');
                            const isLumbering = chassis?.uniqueTraitName === 'Lumbering';

                            const effectiveMaxSpeed = Math.min(
                              hasOverCautious ? Math.min(2, chassisMaxSpeed) : chassisMaxSpeed,
                              scarSpeedCap ?? Number.POSITIVE_INFINITY,
                              isLumbering ? 1 : Number.POSITIVE_INFINITY,
                            );

                            const isAtMax = ship.currentSpeed >= effectiveMaxSpeed;
                            const isAtMin = ship.currentSpeed <= 0;
                            const isStuck = isAtMax && isAtMin;

                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Adjust Speed:</div>
                                {isStuck ? (
                                  <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                    <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                      Ship speed is locked and cannot be adjusted.
                                    </div>
                                    <button
                                      className="btn btn--execute"
                                      title="This ship is currently unable to adjust its speed due to size constraints or critical damage."
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'Speed is locked' });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      WASTE ACTION
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                      className={`btn ${isAtMax ? 'btn--disabled' : ''}`} 
                                      style={{ flex: 1 }} 
                                      disabled={isAtMax}
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { delta: 1 });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      ▲ INCREASE
                                    </button>
                                    <button 
                                      className={`btn ${isAtMin ? 'btn--disabled' : ''}`} 
                                      style={{ flex: 1 }} 
                                      disabled={isAtMin}
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { delta: -1 });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      ▼ DECREASE
                                    </button>
                                  </div>
                                )}
                              </>
                            );

                          })()}

                          {/* Fire Primary Weapon Selector */}
                          {def?.id === 'fire-primary' && (() => {
                            const canFireAny = ship.equippedWeapons.some((wId, i) => {
                              if (!wId) return false;
                              const weapon = getWeaponById(wId);
                              const hasFired = ship.firedWeaponIndicesThisRound?.includes(i);
                              const isLoaded = weapon?.tags?.includes('ordnance') ? (ship.ordnanceLoadedStatus ?? {})[i] !== false : true;
                              return !hasFired && isLoaded;
                            });

                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Select Weapon to Fire:</div>
                                {!canFireAny ? (
                                  <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                    <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                      No weapons are primed or available to fire this round.
                                    </div>
                                    <button
                                      className="btn btn--execute"
                                      title="All weapons have either already fired or require reloading."
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'No available weapons' });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      WASTE ACTION
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {ship.equippedWeapons.map((wId, i) => {
                                      if (!wId) return null;
                                      const weapon = getWeaponById(wId);
                                      const hasFired = ship.firedWeaponIndicesThisRound?.includes(i);
                                      const isOrdnance = weapon?.tags?.includes('ordnance');
                                      const isLoaded = isOrdnance ? (ship.ordnanceLoadedStatus ?? {})[i] !== false : true;
                                      const canFire = !hasFired && isLoaded;
                                      return (
                                        <button
                                          key={i}
                                          className={`btn ${!canFire ? 'btn--disabled' : ''}`}
                                          disabled={!canFire}
                                          onClick={() => {
                                            const isAoE = weapon?.tags?.includes('areaOfEffect');
                                            startTargeting(isAoE ? 'hex' : 'ship', { shipId: ship.id, actionId: action.id }, { weaponId: wId, weaponIndex: i });
                                            setExpandedActionId(null);
                                          }}
                                        >
                                          <span>{weapon?.name || wId}</span>
                                          {hasFired && <span style={{ marginLeft: 6, color: 'var(--color-text-dim)', fontSize: '0.8em' }}>(FIRED)</span>}
                                          {!hasFired && isOrdnance && isLoaded && <span style={{ marginLeft: 8, color: 'var(--color-holo-green)', fontSize: '0.75em', fontWeight: 'bold' }}>● LOADED</span>}
                                          {!hasFired && isOrdnance && !isLoaded && <span style={{ marginLeft: 8, color: 'var(--color-hostile-red)', fontSize: '0.75em', fontWeight: 'bold' }}>⬡ EMPTY</span>}
                                          {weapon?.tags?.includes('areaOfEffect') && <span style={{ marginLeft: 6, fontSize: '0.8em' }}>(AOE)</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}

                          {def?.id === 'reinforce-shields' && (() => {
                            const allShieldsFull = SHIELD_SECTORS.every(sector => (ship.shields[sector] ?? 0) >= ship.maxShieldsPerSector);
                            const selectedSector = reinforceShieldsSelections[action.id] ?? null;
                            
                            if (allShieldsFull) {
                              return (
                                <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                    All shield sectors are already at maximum integrity.
                                  </div>
                                  <button
                                    className="btn btn--execute"
                                    title="All shield arcs are currently at their maximum capacity."
                                    onClick={() => {
                                      resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'All shields at max' });
                                      setExpandedActionId(null);
                                    }}
                                  >
                                    WASTE ACTION
                                  </button>
                                </div>
                              );
                            }

                            const handleConfirm = () => {
                              if (selectedSector) {
                                resolveAction(owner!.id, ship.id, action.id, { sector: selectedSector });
                                setExpandedActionId(null);
                                setReinforceShieldsSelections(prev => {
                                  const next = { ...prev };
                                  delete next[action.id];
                                  return next;
                                });
                              }
                            };

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <ReinforceShieldsArcSelector
                                  shipId={ship.id}
                                  spriteId={ship.chassisId}
                                  shipName={ship.name}
                                  shields={ship.shields}
                                  selectedSector={selectedSector}
                                  maxShieldsPerSector={ship.maxShieldsPerSector}
                                  onSelectSector={(sector) => {
                                    setReinforceShieldsSelections(prev => ({ ...prev, [action.id]: sector }));
                                  }}
                                />

                                {selectedSector && (
                                  <button
                                    className="btn btn--execute"
                                    style={{ marginTop: '4px' }}
                                    onClick={handleConfirm}
                                  >
                                    CONFIRM REINFORCE {ARC_LABELS[selectedSector].toUpperCase()}
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Rotate Shields Options */}
                          {def?.id === 'rotate-shields' && (() => {
                            const selection = rotateShieldsSelections[action.id] ?? { donorSector: null, receiverSector: null };
                            
                            // Check if action is impossible (no shields to transfer, or all shields at max)
                            const hasDonor = SHIELD_SECTORS.some(sector => (ship.shields[sector] ?? 0) > 0);
                            const hasReceiver = SHIELD_SECTORS.some(sector => (ship.shields[sector] ?? 0) < ship.maxShieldsPerSector);
                            const canRotate = hasDonor && hasReceiver;

                            if (!canRotate) {
                              const reason = !hasDonor ? 'No shields to transfer' : 'All shields are at maximum';
                              return (
                                <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                    {reason}.
                                  </div>
                                  <button
                                    className="btn btn--execute"
                                    onClick={() => {
                                      resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason });
                                      setExpandedActionId(null);
                                    }}
                                  >
                                    WASTE ACTION
                                  </button>
                                </div>
                              );
                            }

                            const handleSelectSector = (sector: import('../../types/game').ShipArc) => {
                              if (!selection.donorSector) {
                                // First click: pick donor
                                setRotateShieldsSelections(prev => ({
                                  ...prev,
                                  [action.id]: { donorSector: sector, receiverSector: null }
                                }));
                              } else if (!selection.receiverSector && sector !== selection.donorSector) {
                                // Second click: pick receiver (if different from donor)
                                setRotateShieldsSelections(prev => ({
                                  ...prev,
                                  [action.id]: { donorSector: selection.donorSector, receiverSector: sector }
                                }));
                              } else if (sector === selection.donorSector) {
                                // Clicking donor again resets selection
                                setRotateShieldsSelections(prev => ({
                                  ...prev,
                                  [action.id]: { donorSector: null, receiverSector: null }
                                }));
                              }
                            };

                            const handleConfirm = () => {
                              if (selection.donorSector && selection.receiverSector) {
                                resolveAction(owner!.id, ship.id, action.id, {
                                  donorSector: selection.donorSector,
                                  receiverSector: selection.receiverSector
                                });
                                setExpandedActionId(null);
                                setRotateShieldsSelections(prev => {
                                  const next = { ...prev };
                                  delete next[action.id];
                                  return next;
                                });
                              }
                            };

                            const canConfirm = selection.donorSector && selection.receiverSector;

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <RotateShieldsArcSelector
                                  shipId={ship.id}
                                  spriteId={ship.chassisId}
                                  shipName={ship.name}
                                  shields={ship.shields}
                                  donorSector={selection.donorSector}
                                  receiverSector={selection.receiverSector}
                                  maxShieldsPerSector={ship.maxShieldsPerSector}
                                  onSelectSector={handleSelectSector}
                                />

                                {canConfirm && (
                                  <button
                                    className="btn btn--execute"
                                    style={{ marginTop: '4px' }}
                                    onClick={handleConfirm}
                                  >
                                    CONFIRM ROTATION
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Damage Control Options */}
                          {def?.id === 'damage-control' && (() => {
                            const thisChassisData = getChassisById(ship.chassisId);
                            const isForgeClass = thisChassisData?.uniqueTraitName === 'Repair Drones';
                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Damage Control:</div>
                                {ship.currentHull >= ship.maxHull && ship.criticalDamage.length === 0 && !isForgeClass ? (
                                  <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                    <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                      No hull damage or critical effects to repair.
                                    </div>
                                    <button
                                      className="btn btn--execute"
                                      title="This ship is at full structural integrity and has no active critical damage."
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'No damage to repair' });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      WASTE ACTION
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '6px' }}>
                                      <button className="btn" disabled={ship.currentHull >= ship.maxHull} onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { targetShipId: ship.id });
                                        setExpandedActionId(null);
                                      }}>REPAIR 1 HULL (SELF)</button>
                                      {ship.criticalDamage.map(crit => (
                                        <button key={crit.id} className="btn btn--danger" style={{ fontSize: '0.65rem' }} onClick={() => {
                                          resolveAction(owner!.id, ship.id, action.id, { clearCritId: crit.id });
                                          setExpandedActionId(null);
                                        }}>CLEAR: {crit.name} (4+ D6)</button>
                                      ))}
                                    </div>
                                    {isForgeClass && (
                                      <>
                                        <div className="label" style={{ marginBottom: '4px', color: 'var(--color-holo-cyan)' }}>⬡ REPAIR DRONES — Target Allied Ship:</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {playerShips.filter(s => s.id !== ship.id && !s.isDestroyed).map(ally => (
                                            <button key={ally.id} className="btn" style={{ fontSize: '0.7rem' }} onClick={() => {
                                              resolveAction(owner!.id, ship.id, action.id, { targetShipId: ally.id });
                                              setExpandedActionId(null);
                                            }}>REPAIR {ally.id} ({ally.currentHull}/{ally.maxHull} Hull)</button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </>
                                )}

                              </>
                            );
                          })()}

                          {/* Load Ordnance Weapon Selector */}
                          {def?.id === 'load-ordinance' && (() => {
                            const ordnanceSlots = ship.equippedWeapons
                              .map((wId, i) => ({ wId, i, weapon: wId ? getWeaponById(wId) : null }))
                              .filter(({ weapon }) => weapon?.tags?.includes('ordnance'));

                            const allLoaded = ordnanceSlots.length > 0 && ordnanceSlots.every(({ i }) => (ship.ordnanceLoadedStatus ?? {})[i] !== false);

                            if (ordnanceSlots.length === 0) {
                              return (
                                <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
                                  No [Ordnance] weapons equipped on this ship.
                                </span>
                              );
                            }

                            if (allLoaded) {
                              return (
                                <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                    All ordnance systems are already loaded.
                                  </div>
                                  <button
                                    className="btn btn--execute"
                                    title="All [Ordnance] weapons are already primed and ready. This action provides no benefit."
                                    onClick={() => {
                                      resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'All weapons already loaded' });
                                      setExpandedActionId(null);
                                    }}
                                  >
                                    WASTE ACTION
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Select Ordnance Weapon to Reload:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {ordnanceSlots.map(({ wId, i, weapon }) => {
                                    const isLoaded = (ship.ordnanceLoadedStatus ?? {})[i] !== false;
                                    return (
                                      <button
                                        key={i}
                                        className={`btn ${isLoaded ? 'btn--disabled' : 'btn--execute'}`}
                                        disabled={isLoaded}
                                        onClick={() => {
                                          resolveAction(owner!.id, ship.id, action.id, { weaponIndex: i });
                                          setExpandedActionId(null);
                                        }}
                                      >
                                        {isLoaded ? (
                                          <span>✓ {weapon?.name} — Already Loaded</span>
                                        ) : (
                                          <span>⟳ Reload {weapon?.name}</span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            );
                          })()}


                          {/* Steady Nerves Officer Selector */}
                          {def?.id === 'steady-nerves' && (() => {
                            const stressedOfficers = owner?.officers.filter(officer => officer.currentStress > 0) ?? [];
                            if (stressedOfficers.length === 0) {
                              return (
                                <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                    No officers currently have Stress to reduce.
                                  </div>
                                  <button
                                    className="btn btn--execute"
                                    title="All officers are currently at 0 Stress."
                                    onClick={() => {
                                      resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'No stressed officers' });
                                      setExpandedActionId(null);
                                    }}
                                  >
                                    WASTE ACTION
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Select Officer to Calm:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {stressedOfficers.map(officer => (
                                    <button
                                      key={officer.officerId}
                                      className="btn"
                                      onClick={() => {
                                        resolveAction(owner!.id, ship.id, action.id, { targetOfficerId: officer.officerId });
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      {officer.station.toUpperCase()} ({officer.currentStress} Stress)
                                    </button>
                                  ))}
                                </div>
                              </>
                            );
                          })()}

                          {/* Cyber Warfare Sector Selector */}
                          {def?.id === 'cyber-warfare' && (() => {
                            const cyberTargets = enemyShips
                              .filter(enemy => !enemy.isDestroyed)
                              .map(enemy => ({ enemy, sectors: getTargetableShieldSectors(enemy) }))
                              .filter(({ sectors }) => sectors.length > 0);
                            const selectedTarget = cyberTargets.find(({ enemy }) => enemy.id === cyberSelection.targetShipId) ?? null;

                            if (cyberTargets.length === 0) {
                              return (
                                <div style={{ padding: '8px', border: '1px dashed var(--color-text-dim)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '8px' }}>
                                    No enemy ships currently have active shields to strip.
                                  </div>
                                  <button
                                    className="btn btn--execute"
                                    title="There are no visible enemy ships with active shield sectors within sensor range."
                                    onClick={() => {
                                      resolveAction(owner!.id, ship.id, action.id, { wasted: true, reason: 'No valid enemy targets' });
                                      setExpandedActionId(null);
                                    }}
                                  >
                                    WASTE ACTION
                                  </button>
                                </div>
                              );
                            }

                            return (
                              <>
                                <div className="label" style={{ marginBottom: '8px' }}>Cyber Warfare Targeting:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <div>
                                    <div className="label" style={{ marginBottom: '6px', color: 'var(--color-hostile-red)' }}>1. Select Target Ship</div>
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                      {cyberTargets.map(({ enemy, sectors }) => {
                                        const isSelectedTarget = cyberSelection.targetShipId === enemy.id;
                                        return (
                                          <button
                                            key={enemy.id}
                                            className="btn"
                                            style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              borderColor: isSelectedTarget ? 'var(--color-holo-cyan)' : 'var(--color-border)',
                                              background: isSelectedTarget ? 'rgba(79, 209, 197, 0.12)' : undefined,
                                              textAlign: 'left',
                                            }}
                                            onClick={() => {
                                              setCyberSelections(prev => ({
                                                ...prev,
                                                [action.id]: {
                                                  targetShipId: enemy.id,
                                                  sector: prev[action.id]?.targetShipId === enemy.id ? prev[action.id]?.sector ?? null : null,
                                                },
                                              }));
                                            }}
                                          >
                                            <span>{enemy.name}</span>
                                            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
                                              {sectors.map(sector => ARC_LABELS[sector]).join(' · ')}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div>
                                    <div className="label" style={{ marginBottom: '6px', color: selectedTarget ? 'var(--color-holo-cyan)' : 'var(--color-text-dim)' }}>
                                      2. Select Shield Arc
                                    </div>
                                    {selectedTarget ? (
                                      <CyberWarfareArcSelector
                                        shipId={selectedTarget.enemy.id}
                                        spriteId={selectedTarget.enemy.adversaryId}
                                        shipName={selectedTarget.enemy.name}
                                        shields={selectedTarget.enemy.shields}
                                        selectedSector={cyberSelection.sector}
                                        onSelectSector={(sector) => {
                                          if (!selectedTarget.sectors.includes(sector)) return;
                                          setCyberSelections(prev => ({
                                            ...prev,
                                            [action.id]: {
                                              targetShipId: selectedTarget.enemy.id,
                                              sector,
                                            },
                                          }));
                                        }}
                                      />
                                    ) : (
                                      <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', padding: '12px', border: '1px dashed var(--color-border)' }}>
                                        Select a target ship to open its shield arc display.
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="label" style={{ marginBottom: '6px', color: cyberSelection.sector ? 'var(--color-holo-green)' : 'var(--color-text-dim)' }}>
                                      3. Confirm Arc Choice
                                    </div>
                                    <button
                                      className={`btn ${selectedTarget && cyberSelection.sector ? 'btn--execute' : 'btn--disabled'}`}
                                      disabled={!selectedTarget || !cyberSelection.sector}
                                      style={{ width: '100%' }}
                                      onClick={() => {
                                        if (!selectedTarget || !cyberSelection.sector) return;
                                        resolveAction(owner!.id, ship.id, action.id, {
                                          targetShipId: selectedTarget.enemy.id,
                                          sector: cyberSelection.sector,
                                        });
                                        setCyberSelections(prev => ({
                                          ...prev,
                                          [action.id]: { targetShipId: null, sector: null },
                                        }));
                                        setExpandedActionId(null);
                                      }}
                                    >
                                      {selectedTarget && cyberSelection.sector
                                        ? `CONFIRM ${ARC_LABELS[cyberSelection.sector].toUpperCase()} ON ${selectedTarget.enemy.name.toUpperCase()}`
                                        : 'SELECT TARGET AND ARC TO CONFIRM'}
                                    </button>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                          
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isAllied && (
          <div className="panel panel--raised">
            <div className="label" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-hostile-red)' }}>Enemy Protocol Executing...</div>
            {isStepResolved ? (
              <div className="mono" style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '16px' }}>Enemy operations concluded.</div>
            ) : (
              <button
                className={`btn ${(activeEnemy.length === 0 && enemyFighters.length === 0 && enemyTorpedoes.length === 0) ? 'btn--disabled' : ''}`}
                style={{ width: '100%', opacity: (activeEnemy.length === 0 && enemyFighters.length === 0 && enemyTorpedoes.length === 0) ? 0.5 : 1 }}
                onClick={resolveEnemyTurn}
                disabled={activeEnemy.length === 0 && enemyFighters.length === 0 && enemyTorpedoes.length === 0}
              >
                Automate Enemy Turn
              </button>
            )}
            {/* Enemy fighters in small steps are resolved as part of the enemy turn automation */}
            {(enemyFighters.length > 0 || enemyTorpedoes.length > 0) && (
              <div className="mono" style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                ⧡ {enemyFighters.length} enemy fighter{enemyFighters.length !== 1 ? 's' : ''} and {enemyTorpedoes.length} torpedo{enemyTorpedoes.length !== 1 ? 'es' : ''} will auto-resolve with enemy turn.
              </div>
            )}
          </div>
        )}

        {/* Allied Small Craft Section (Fighters & Torpedoes) */}
        {isAllied && (alliedFighters.length > 0 || activeTorpedoes.length > 0) && (
          <div className="panel panel--raised" style={{ borderLeft: '2px solid var(--color-holo-cyan)' }}>
            <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
              <div>
                <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>
                  ⧡ Small Craft Operations
                </div>
                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                  {alliedFighters.filter(f => !f.hasDrifted).length + activeTorpedoes.filter(t => !t.hasMoved).length} ready · {alliedFighters.filter(f => f.hasDrifted).length + activeTorpedoes.filter(t => t.hasMoved).length} activated
                </div>
              </div>
              {alliedFighters.every(f => f.hasDrifted) && activeTorpedoes.every(t => t.hasMoved) ? (
                <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>RESOLVED</span>
              ) : (
                <button
                  className="btn btn--execute"
                  style={{ padding: '4px 14px', fontSize: '0.75rem' }}
                  onClick={() => {
                    resolveFighterStep('allied');
                    resolveTorpedoStep('allied');
                  }}
                >
                  RESOLVE SMALL CRAFT
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {alliedFighters.map(f => (
                <div key={f.id} className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>⧡ {f.name} @ ({f.position.q},{f.position.r})</span>
                  <span style={{ color: f.assignedTargetId ? 'var(--color-holo-green)' : 'var(--color-alert-amber)' }}>
                    {f.assignedTargetId ? `→ ${useGameStore.getState().getShipName(f.assignedTargetId)}` : 'NO TARGET'}
                  </span>
                  <span style={{ color: f.hasDrifted ? 'var(--color-text-dim)' : 'var(--color-holo-cyan)' }}>
                    {f.hasDrifted ? 'DONE' : 'READY'}
                  </span>
                </div>
              ))}
              {activeTorpedoes.map(t => (
                <div key={t.id} className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>🚀 {t.name} @ ({t.position.q},{t.position.r})</span>
                  <span style={{ color: 'var(--color-alert-amber)' }}>
                    → {useGameStore.getState().getShipName(t.targetShipId)}
                  </span>
                  <span style={{ color: t.hasMoved ? 'var(--color-text-dim)' : 'var(--color-holo-cyan)' }}>
                    {t.hasMoved ? 'DONE' : 'READY'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEmptyStep && (
          <div className="mono" style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: '16px' }}>No ships acting this step.</div>
        )}
      </div>

      <button
        className={`btn btn--execute ${(!isStepResolved && !isEmptyStep) ? 'btn--disabled' : ''}`}
        style={{ marginTop: 'auto', opacity: (!isStepResolved && !isEmptyStep) ? 0.5 : 1 }}
        onClick={handleNextStep}
        disabled={!isStepResolved && !isEmptyStep}
      >
        ADVANCE STEP
      </button>
    </div>
  );
}

function CyberWarfareArcSelector({
  shipId,
  spriteId,
  shipName,
  shields,
  selectedSector,
  onSelectSector,
}: {
  shipId: string;
  spriteId: string;
  shipName: string;
  shields: ShieldState;
  selectedSector: ShipArc | null;
  onSelectSector: (sector: ShipArc) => void;
}) {
  const maxShieldValue = Math.max(1, ...SHIELD_SECTORS.map(sector => shields[sector] ?? 0));
  const shipSprite = ASSET_MAP[spriteId];

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        padding: '10px',
        border: '1px solid var(--color-border)',
        background: 'rgba(9, 15, 28, 0.72)',
      }}
    >
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`Shield arcs for ${shipName}`}>
        <defs>
          <clipPath id={`cyber-preview-clip-${shipId}`}>
            <circle cx="60" cy="60" r="20" />
          </clipPath>
        </defs>
        {SHIELD_SECTORS.map((arc, index) => {
          const startAngle = index * 60 - 30;
          const endAngle = startAngle + 60;
          const shieldValue = shields[arc] ?? 0;
          const isAvailable = shieldValue > 0;
          const isSelected = selectedSector === arc;
          const labelPos = polarPoint(60, 60, 28, startAngle + 30);
          const fillOpacity = isAvailable ? 0.18 + (shieldValue / maxShieldValue) * 0.58 : 0.06;

          return (
            <g key={arc}>
              <path
                d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                fill={isSelected ? 'rgba(246, 224, 94, 0.82)' : `rgba(79, 209, 197, ${fillOpacity})`}
                stroke={isAvailable ? (isSelected ? '#F6E05E' : 'var(--color-holo-cyan)') : 'rgba(160, 174, 192, 0.3)'}
                strokeWidth={isSelected ? '2.2' : '1.2'}
                style={{ cursor: isAvailable ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  if (isAvailable) onSelectSector(arc);
                }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill={isAvailable ? 'white' : 'rgba(255,255,255,0.45)'}
                fontSize="7"
                textAnchor="middle"
                dominantBaseline="middle"
                className="mono"
                style={{ pointerEvents: 'none' }}
              >
                {shieldValue}
              </text>
            </g>
          );
        })}

        <circle cx="60" cy="60" r="20.5" fill="rgba(9, 15, 28, 0.92)" stroke="rgba(160, 174, 192, 0.45)" strokeWidth="1.2" />
        {shipSprite ? (
          <image
            href={shipSprite}
            x="39"
            y="39"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#cyber-preview-clip-${shipId})`}
            transform="rotate(-90 60 60)"
          />
        ) : (
          <path
            d="M 74 60 L 51 70 L 57 60 L 51 50 Z"
            fill="var(--color-bg-panel)"
            stroke="#A0AEC0"
            strokeWidth="1.5"
          />
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div className="label" style={{ color: 'var(--color-hostile-red)' }}>{shipName}</div>
        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          Click a highlighted shield arc on the schematic to queue the cyber attack.
        </div>
        <div className="mono" style={{ fontSize: '0.75rem', color: selectedSector ? '#F6E05E' : 'var(--color-text-dim)' }}>
          {selectedSector ? `Selected arc: ${ARC_LABELS[selectedSector]}` : 'No arc selected yet.'}
        </div>
      </div>
    </div>
  );
}

function getArcBandPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const startOuter = polarPoint(cx, cy, outerR, startAngle);
  const endOuter = polarPoint(cx, cy, outerR, endAngle);
  const startInner = polarPoint(cx, cy, innerR, endAngle);
  const endInner = polarPoint(cx, cy, innerR, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function RotateShieldsArcSelector({
  shipId,
  spriteId,
  shipName,
  shields,
  donorSector,
  receiverSector,
  maxShieldsPerSector,
  onSelectSector,
}: {
  shipId: string;
  spriteId: string;
  shipName: string;
  shields: ShieldState;
  donorSector: ShipArc | null;
  receiverSector: ShipArc | null;
  maxShieldsPerSector: number;
  onSelectSector: (sector: ShipArc) => void;
}) {
  const shipSprite = ASSET_MAP[spriteId];

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        padding: '10px',
        border: '1px solid var(--color-border)',
        background: 'rgba(9, 15, 28, 0.72)',
      }}
    >
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`Shield arcs for ${shipName}`}>
        <defs>
          <clipPath id={`rotate-preview-clip-${shipId}`}>
            <circle cx="60" cy="60" r="20" />
          </clipPath>
        </defs>
        {SHIELD_SECTORS.map((arc, index) => {
          const startAngle = index * 60 - 30;
          const endAngle = startAngle + 60;
          const shieldValue = shields[arc] ?? 0;
          const isDonor = donorSector === arc;
          const isReceiver = receiverSector === arc;
          
          let isAvailable = false;
          if (!donorSector) {
            isAvailable = shieldValue > 0;
          } else if (!receiverSector) {
            isAvailable = shieldValue < maxShieldsPerSector && arc !== donorSector;
          } else {
            isAvailable = isDonor || isReceiver;
          }

          const labelPos = polarPoint(60, 60, 28, startAngle + 30);
          const fillOpacity = (shieldValue / maxShieldsPerSector) * 0.58 + 0.18;

          let fillColor = `rgba(79, 209, 197, ${fillOpacity})`;
          let strokeColor = 'rgba(160, 174, 192, 0.3)';
          let strokeWidth = '1.2';

          if (isDonor) {
            fillColor = 'rgba(255, 100, 100, 0.4)';
            strokeColor = 'var(--color-hostile-red)';
            strokeWidth = '2.2';
          } else if (isReceiver) {
            fillColor = 'rgba(100, 255, 100, 0.4)';
            strokeColor = 'var(--color-holo-green)';
            strokeWidth = '2.2';
          } else if (isAvailable) {
            strokeColor = 'var(--color-holo-cyan)';
          }

          if (!isAvailable && !isDonor && !isReceiver) {
            fillColor = 'rgba(79, 209, 197, 0.06)';
          }

          return (
            <g key={arc}>
              <path
                d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{ cursor: isAvailable || isDonor || isReceiver ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  if (isAvailable || isDonor || isReceiver) onSelectSector(arc);
                }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill={(isAvailable || isDonor || isReceiver) ? 'white' : 'rgba(255,255,255,0.45)'}
                fontSize="7"
                textAnchor="middle"
                dominantBaseline="middle"
                className="mono"
                style={{ pointerEvents: 'none' }}
              >
                {shieldValue}
              </text>
            </g>
          );
        })}

        <circle cx="60" cy="60" r="20.5" fill="rgba(9, 15, 28, 0.92)" stroke="rgba(160, 174, 192, 0.45)" strokeWidth="1.2" />
        {shipSprite ? (
          <image
            href={shipSprite}
            x="39"
            y="39"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#rotate-preview-clip-${shipId})`}
            transform="rotate(-90 60 60)"
          />
        ) : (
          <path
            d="M 74 60 L 51 70 L 57 60 L 51 50 Z"
            fill="var(--color-bg-panel)"
            stroke="#A0AEC0"
            strokeWidth="1.5"
          />
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>Rotate Shields</div>
        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {!donorSector 
            ? "Step 1: Select DONOR arc (must have ≥1 shield)" 
            : !receiverSector 
              ? "Step 2: Select RECEIVER arc (must not be at max)" 
              : "Ready to confirm."}
        </div>
        <div className="mono" style={{ fontSize: '0.75rem', color: donorSector ? 'var(--color-hostile-red)' : 'var(--color-text-dim)' }}>
          {donorSector ? `Donor: ${ARC_LABELS[donorSector]}` : 'No donor selected.'}
        </div>
        <div className="mono" style={{ fontSize: '0.75rem', color: receiverSector ? 'var(--color-holo-green)' : 'var(--color-text-dim)' }}>
          {receiverSector ? `Receiver: ${ARC_LABELS[receiverSector]}` : 'No receiver selected.'}
        </div>
      </div>
    </div>
  );
}

function ReinforceShieldsArcSelector({
  shipId,
  spriteId,
  shipName,
  shields,
  selectedSector,
  maxShieldsPerSector,
  onSelectSector,
}: {
  shipId: string;
  spriteId: string;
  shipName: string;
  shields: ShieldState;
  selectedSector: ShipArc | null;
  maxShieldsPerSector: number;
  onSelectSector: (sector: ShipArc) => void;
}) {
  const shipSprite = ASSET_MAP[spriteId];

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        padding: '10px',
        border: '1px solid var(--color-border)',
        background: 'rgba(9, 15, 28, 0.72)',
      }}
    >
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`Shield arcs for ${shipName}`}>
        <defs>
          <clipPath id={`reinforce-preview-clip-${shipId}`}>
            <circle cx="60" cy="60" r="20" />
          </clipPath>
        </defs>
        {SHIELD_SECTORS.map((arc, index) => {
          const startAngle = index * 60 - 30;
          const endAngle = startAngle + 60;
          const shieldValue = shields[arc] ?? 0;
          const isSelected = selectedSector === arc;
          const isAvailable = shieldValue < maxShieldsPerSector;

          const labelPos = polarPoint(60, 60, 28, startAngle + 30);
          const fillOpacity = (shieldValue / maxShieldsPerSector) * 0.58 + 0.18;

          let fillColor = `rgba(79, 209, 197, ${fillOpacity})`;
          let strokeColor = 'rgba(160, 174, 192, 0.3)';
          let strokeWidth = '1.2';

          if (isSelected) {
            fillColor = 'rgba(100, 255, 100, 0.4)';
            strokeColor = 'var(--color-holo-green)';
            strokeWidth = '2.2';
          } else if (isAvailable) {
            strokeColor = 'var(--color-holo-cyan)';
          }

          if (!isAvailable && !isSelected) {
            fillColor = 'rgba(79, 209, 197, 0.06)';
          }

          return (
            <g key={arc}>
              <path
                d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                style={{ cursor: isAvailable || isSelected ? 'pointer' : 'not-allowed' }}
                onClick={() => {
                  if (isAvailable || isSelected) onSelectSector(arc);
                }}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill={(isAvailable || isSelected) ? 'white' : 'rgba(255,255,255,0.45)'}
                fontSize="7"
                textAnchor="middle"
                dominantBaseline="middle"
                className="mono"
                style={{ pointerEvents: 'none' }}
              >
                {shieldValue}
              </text>
            </g>
          );
        })}

        <circle cx="60" cy="60" r="20.5" fill="rgba(9, 15, 28, 0.92)" stroke="rgba(160, 174, 192, 0.45)" strokeWidth="1.2" />
        {shipSprite ? (
          <image
            href={shipSprite}
            x="39"
            y="39"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#reinforce-preview-clip-${shipId})`}
            transform="rotate(-90 60 60)"
          />
        ) : (
          <path
            d="M 74 60 L 51 70 L 57 60 L 51 50 Z"
            fill="var(--color-bg-panel)"
            stroke="#A0AEC0"
            strokeWidth="1.5"
          />
        )}
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>Reinforce Shields</div>
        <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {!selectedSector 
            ? "Click an available arc to reinforce."
            : "Ready to confirm."}
        </div>
        <div className="mono" style={{ fontSize: '0.75rem', color: selectedSector ? 'var(--color-holo-green)' : 'var(--color-text-dim)' }}>
          {selectedSector ? `Selected: ${ARC_LABELS[selectedSector]}` : 'No arc selected.'}
        </div>
      </div>
    </div>
  );
}
