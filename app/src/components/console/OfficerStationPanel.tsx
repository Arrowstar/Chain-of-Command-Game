import React, { useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { getActionsByStation } from '../../data/actions';
import ActionSlot from './ActionSlot';
import StressBar from './StressBar';
import { getOfficerById } from '../../data/officers';
import { getChassisById } from '../../data/shipChassis';
import { getSubsystemById } from '../../data/subsystems';
import { getWeaponById } from '../../data/weapons';
import { calculateActionCosts } from '../../data/actions';
import type { OfficerState, ActionDefinition } from '../../types/game';
import { applyRecycledCoolant, getStimInjectorBonus } from '../../engine/techEffects';
import { getScarImpactLegendText, getScarStatusMeta, getScarTooltip, getStationScars } from './scarStatus';

interface OfficerStationPanelProps {
  officerState: OfficerState;
  playerId: string;
}

export default function OfficerStationPanel({ officerState, playerId }: OfficerStationPanelProps) {
  const officerData = getOfficerById(officerState.officerId);
  const unassignToken = useGameStore(s => s.unassignToken);
  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const experimentalTech = useGameStore(s => s.experimentalTech);
  const activeRoE = useGameStore(s => s.activeRoE);
  const currentTactic = useGameStore(s => s.currentTactic);
  const recycledCoolantUsedThisRound = useGameStore(s => s.recycledCoolantUsedThisRound);
  const invokeMiracleWorker = useGameStore(s => s.invokeMiracleWorker);
  const invokeCICSync = useGameStore(s => s.invokeCICSync);
  const player = players.find(p => p.id === playerId);

  const [cicTargetPlayerId, setCicTargetPlayerId] = useState<string | null>(null);

  if (!officerData || !player) return null;

  const objectiveType = useGameStore(s => s.objectiveType);
  const myShip = playerShips.find(s => s.id === player.shipId);
  const myChassis = myShip ? getChassisById(myShip.chassisId) : null;
  const stationScars = myShip ? getStationScars(myShip.scars, officerState.station) : [];

  const baseActions = getActionsByStation(officerState.station).filter(a => {
    if (a.hideUnlessObjective && a.hideUnlessObjective !== objectiveType) return false;
    
    if (a.hideIfNoOrdnance) {
      const hasOrdnance = myShip?.equippedWeapons.some(wId => {
        if (!wId) return false;
        const w = getWeaponById(wId);
        return w?.tags?.includes('ordnance');
      });
      if (!hasOrdnance) return false;
    }
    
    return true;
  });

  const subsystemActions: ActionDefinition[] = [];
  if (myShip) {
    myShip.equippedSubsystems.forEach(subId => {
      if (!subId) return;
      const sub = getSubsystemById(subId);
      if (sub && sub.station === officerState.station && !sub.isPassive) {
        subsystemActions.push({
          id: sub.id, // e.g. 'polarize-plating'
          station: sub.station,
          name: sub.actionName,   // the actual action name like 'Polarize Plating'
          ctCost: sub.ctCost,
          stressCost: sub.stressCost,
          effect: sub.effect,
          requiresTarget: sub.requiresTarget,
        });
      }
    });
  }

  const actions = [...baseActions, ...subsystemActions];
  const tacticLockout = currentTactic?.mechanicalEffect.disablePlayerStation === officerState.station;
  const maxStress = officerData.stressLimit === null
    ? null
    : officerData.stressLimit + getStimInjectorBonus(experimentalTech);

  // Find assignments for this station
  const stationAssignments = player.assignedActions.filter(a => a.station === officerState.station);

  // Miracle Worker check
  const isMiracleWorker = officerData.traitName === 'Miracle Worker';
  const mirWorkerUsed = officerState.usedMiracleWorker === true;
  const myCrits = myShip?.criticalDamage || [];

  // CIC Sync check
  const hasCICSync = myChassis?.uniqueTraitName === 'CIC Sync';
  const cicTargetPlayer = cicTargetPlayerId ? players.find(p => p.id === cicTargetPlayerId) : null;
  const cicTargetOfficer = cicTargetPlayer?.officers.find(o => o.station === officerState.station);
  const officerAbilityTooltip = `${officerData.traitName}: ${officerData.traitEffect}`;

  return (
    <div 
      className={`panel ${officerState.isLocked ? 'panel--danger' : 'panel--raised'}`} 
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
      id={`officer-station-${officerState.station}`}
      data-testid={`officer-station-${officerState.station}`}
    >
      {/* Header */}
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <img 
            src={officerData.avatar} 
            alt={officerData.name} 
            style={{ 
              width: '60px', 
              height: '60px', 
              flexShrink: 0,
              borderRadius: '10px', 
              objectFit: 'cover',
              border: '1px solid var(--color-holo-cyan)',
              boxShadow: '0 0 10px rgba(0, 204, 255, 0.2)'
            }} 
          />
          <div>
            <h3
              title={officerAbilityTooltip}
              style={{ color: 'var(--color-holo-cyan)', fontSize: '1rem', margin: '0 0 4px 0', cursor: 'help' }}
            >
              {officerData.name}
            </h3>
            <div className="label" style={{ color: 'var(--color-text-secondary)' }}>
              Station: {officerState.station.toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div 
            className="label" 
            style={{ color: 'var(--color-alert-amber)', cursor: 'help' }}
            title={officerAbilityTooltip}
          >
            {officerData.traitName}
          </div>
          <div className="mono" style={{ fontSize: '0.7rem' }}>Rank: {officerState.currentTier.toUpperCase()}</div>
        </div>
      </div>

      {/* Stress Bar */}
      <StressBar 
        currentStress={officerState.currentStress} 
        maxStress={maxStress} 
        officerName={officerData.name} 
      />

      {stationScars.length > 0 && (
        <div
          className="panel"
          style={{
            padding: 'var(--space-sm)',
            borderColor: 'rgba(255, 170, 0, 0.3)',
            background: 'rgba(255, 170, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="label" style={{ color: 'var(--color-alert-amber)' }}>
              Persistent Ship Damage
            </div>
            <span
              className="mono"
              title={getScarImpactLegendText()}
              style={{
                fontSize: '0.68rem',
                color: 'var(--color-alert-amber)',
                border: '1px solid rgba(255, 170, 0, 0.28)',
                borderRadius: '999px',
                padding: '2px 7px',
                cursor: 'help',
                lineHeight: 1,
              }}
            >
              ?
            </span>
          </div>
          <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)' }}>
            Hover a scar tag for the full penalty, or the ? for shorthand help.
          </div>
          {stationScars.map(scar => {
            const meta = getScarStatusMeta(scar.fromCriticalId);
            return (
              <div key={scar.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-bright)', fontSize: '0.82rem' }} title={getScarTooltip(scar)}>{scar.name}</span>
                <span
                  className="mono"
                  title={getScarTooltip(scar)}
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--color-alert-amber)',
                    border: '1px solid rgba(255, 170, 0, 0.28)',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                    cursor: 'help',
                  }}
                >
                  {meta.shortImpact}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Miracle Worker ── */}
      {isMiracleWorker && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
          <div className="label" style={{ color: 'var(--color-alert-amber)', marginBottom: 'var(--space-xs)' }}>
            ✦ MIRACLE WORKER {mirWorkerUsed ? '— SPENT' : ''}
          </div>
          {mirWorkerUsed ? (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              O'Bannon's miracle has already been called in this campaign.
            </div>
          ) : myCrits.length === 0 ? (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              No active critical damage to repair.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                Instantly clear one crit (no CT, no roll):
              </div>
              {myCrits.map(crit => (
                <button
                  key={crit.id}
                  className="btn btn--execute"
                  style={{ fontSize: '0.7rem' }}
                  onClick={() => invokeMiracleWorker(player.id, player.shipId, crit.id)}
                >
                  CLEAR: {crit.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CIC Sync ── */}
      {hasCICSync && players.length > 1 && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
          <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: 'var(--space-xs)' }}>
            ⬡ CIC SYNC — {player.commandTokens > 0 ? `${player.commandTokens} CT available` : 'No CT remaining'}
          </div>
          {player.commandTokens < 1 ? (
            <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>Cannot activate: no CTs left.</div>
          ) : (
            <>
              <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Spend 1 CT to queue a {officerState.station} action for an ally (they suffer the stress):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                {players.filter(p => p.id !== player.id).map(ally => (
                  <button
                    key={ally.id}
                    className={`btn ${cicTargetPlayerId === ally.id ? 'btn--execute' : ''}`}
                    style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                    onClick={() => setCicTargetPlayerId(prev => prev === ally.id ? null : ally.id)}
                  >
                    {ally.name}
                  </button>
                ))}
              </div>
              {cicTargetPlayer && cicTargetOfficer && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {actions.map(action => {
                    const queuedAction = {
                      id: `cic-pending-${action.id}`,
                      station: officerState.station,
                      actionId: action.id,
                      ctCost: 0,    // Aegis pays CT separately
                      stressCost: action.stressCost,
                    };
                    return (
                      <button
                        key={action.id}
                        className="btn"
                        style={{ fontSize: '0.7rem' }}
                        onClick={() => {
                          invokeCICSync(player.id, cicTargetPlayer.id, queuedAction);
                          setCicTargetPlayerId(null);
                        }}
                      >
                        {action.name} → {cicTargetPlayer.name} ({action.stressCost}S)
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Action Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>STATION COMMANDS</div>
        
        {actions.map(action => {
          // Collect ALL assignments for this action (sorted by insertion order)
          const assignments = stationAssignments.filter(a => a.actionId === action.id);
          const isFirstActionAssignedThisRound = stationAssignments.length === 0;
          const ctAdjustments: string[] = [];

          // Calculate the actual next-assignment cost so drag/drop and labels match gameplay.
          const modifiedCosts = calculateActionCosts(
            { actionId: action.id, ctCost: action.ctCost, stressCost: action.stressCost },
            officerData,
            assignments.length,
            undefined, // context unknown at render
            officerState.usedMethodicalThisRound,
            officerState.traumas,
            isFirstActionAssignedThisRound,
          );
          let displayCtCost = modifiedCosts.ctCost;
          let displayStressCost = modifiedCosts.stressCost;

          if (officerData.traitName === 'Heavy Loader' && action.id === 'load-ordinance') {
            ctAdjustments.push('Heavy Loader: -1 CT');
          }
          if (officerData.traitName === 'Synth-Logic' && action.id === 'damage-control') {
            ctAdjustments.push('Synth-Logic: 3 CT');
          }
          if (officerData.traitName === 'Hacker' && action.id === 'cyber-warfare') {
            ctAdjustments.push('Hacker: -1 CT');
          }
          if (officerState.traumas.some(trauma => trauma.id === 'resource-hoarder') && action.id === 'damage-control') {
            ctAdjustments.push('Resource Hoarder: 3 CT');
          }
          if (officerState.traumas.some(trauma => trauma.id === 'micromanager') && isFirstActionAssignedThisRound) {
            ctAdjustments.push('Micromanager: +1 CT');
          }
          if (officerState.traumas.some(trauma => trauma.id === 'gun-shy') && action.id === 'fire-primary') {
            ctAdjustments.push('Gun-Shy: +1 CT');
          }
          if (myShip && action.station === 'engineering' && myShip.scars.some(scar => scar.fromCriticalId === 'coolant-leak')) {
            displayStressCost += 1;
          }
          if (myShip && action.station === 'sensors' && myShip.scars.some(scar => scar.fromCriticalId === 'sensor-mast-damaged')) {
            displayStressCost += 1;
          }
          if (action.id === 'damage-control' && activeRoE?.mechanicalEffect.damageControlCostOverride !== undefined) {
            displayCtCost = activeRoE.mechanicalEffect.damageControlCostOverride;
            ctAdjustments.push(`RoE: ${displayCtCost} CT`);
          }
          if (myShip && player.assignedActions.length === 0 && myShip.scars.some(scar => scar.fromCriticalId === 'power-bus-leak')) {
            displayCtCost += 1;
            ctAdjustments.push('Leaking Power Bus: +1 CT');
          }

          const fatiguePenalty = officerState.traumas.some(trauma => trauma.id === 'lethargic') ? 2 : 1;
          const baseFatiguePenalty = assignments.length * fatiguePenalty;
          const coolantResult = applyRecycledCoolant(
            baseFatiguePenalty,
            recycledCoolantUsedThisRound,
            experimentalTech,
          );
          if (coolantResult.consumed) {
            displayStressCost = Math.max(0, displayStressCost - (baseFatiguePenalty - coolantResult.finalPenalty));
          }

          const displayAction = { ...action, ctCost: displayCtCost, stressCost: displayStressCost };

          return (
            <ActionSlot
              key={action.id}
              action={displayAction}
              dragAction={action}
              costNote={ctAdjustments.length > 0 ? ctAdjustments.join(' | ') : undefined}
              assignedTokenIds={assignments.map(a => a.id)}
              onUnassign={(tokenId) => {
                // Remove the specific assignment, or the most-recent if no ID provided
                const idToRemove = tokenId || assignments[assignments.length - 1]?.id;
                if (idToRemove) unassignToken(player.id, idToRemove);
              }}
              disabled={officerState.isLocked || tacticLockout}
            />
          );
        })}
      </div>
      
      {officerState.isLocked && (
        <div className="label" style={{ color: 'var(--color-hostile-red)', textAlign: 'center', marginTop: 'auto' }}>
          STATION LOCKED (FUMBLE)
        </div>
      )}
      {!officerState.isLocked && tacticLockout && (
        <div className="label" style={{ color: 'var(--color-hostile-red)', textAlign: 'center', marginTop: 'auto' }}>
          STATION JAMMED ({currentTactic?.name?.toUpperCase()})
        </div>
      )}
    </div>
  );
}
