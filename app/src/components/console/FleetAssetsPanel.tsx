import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { FLEET_ASSET_DEFINITIONS } from '../../data/fleetAssets';

const SHIP_IMPAIRMENTS = [
  { value: 'pdcDisabled', label: 'PDC Disabled' },
  { value: 'ordnanceJammed', label: 'Ordnance Jammed' },
  { value: 'armorDisabled', label: 'Armor Disabled' },
  { value: 'navLockout', label: 'Navigation Lockout' },
] as const;

const STATIONS = ['helm', 'tactical', 'engineering', 'sensors'] as const;

function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { minWidth?: string }
) {
  const { minWidth = '180px', children, ...rest } = props;
  return (
    <div className="fleet-assets-select-wrap" style={{ minWidth }}>
      <select className="fleet-assets-select" {...rest}>
        {children}
      </select>
    </div>
  );
}

import { SmartTooltip } from '../TouchTooltipPortal';

export default function FleetAssetsPanel({ asFab = false }: { asFab?: boolean } = {}) {
  const fleetFavor = useGameStore(s => s.fleetFavor);
  const players = useGameStore(s => s.players);
  const playerShips = useGameStore(s => s.playerShips);
  const enemyShips = useGameStore(s => s.enemyShips);
  const torpedoTokens = useGameStore(s => s.torpedoTokens);
  const pendingSpawns = useGameStore(s => s.pendingSpawns);
  const currentTactic = useGameStore(s => s.currentTactic);
  const fleetAssetRoundUses = useGameStore(s => s.fleetAssetRoundUses);
  const fleetAssetScenarioUses = useGameStore(s => s.fleetAssetScenarioUses);
  const fleetAssetShipRoundUses = useGameStore(s => s.fleetAssetShipRoundUses);
  const useFleetAsset = useGameStore(s => s.useFleetAsset);

  const [open, setOpen] = useState(false);

  const alliedShips = useMemo(
    () => playerShips.filter(ship => !ship.isDestroyed && !ship.warpedOut),
    [playerShips]
  );
  const activeEnemyShips = useMemo(
    () => enemyShips.filter(ship => !ship.isDestroyed),
    [enemyShips]
  );
  const incomingEnemyTorpedoes = useMemo(
    () => torpedoTokens.filter(token => token.faction === 'hegemony' && !token.isDestroyed),
    [torpedoTokens]
  );

  const [tacticalOverrideShipId, setTacticalOverrideShipId] = useState('');
  const [reinforcementShipId, setReinforcementShipId] = useState('');
  const [targetingShipId, setTargetingShipId] = useState('');
  const [targetingEnemyId, setTargetingEnemyId] = useState('');
  const [targetingMode, setTargetingMode] = useState<'tn' | 'reroll' | 'bonusHit'>('tn');
  const [damageShipId, setDamageShipId] = useState('');
  const [damageMode, setDamageMode] = useState<'hull' | 'shield' | 'clear-impairment'>('hull');
  const [damageSector, setDamageSector] = useState('fore');
  const [damageImpairment, setDamageImpairment] = useState('pdcDisabled');
  const [intelMode, setIntelMode] = useState<'delay-reinforcement' | 'cancel-tactic' | 'expose-enemy'>('delay-reinforcement');
  const [intelSpawnIndex, setIntelSpawnIndex] = useState('0');
  const [intelEnemyId, setIntelEnemyId] = useState('');
  const [moraleMode, setMoraleMode] = useState<'remove-stress' | 'clear-fumble-side-effect' | 'unlock-station'>('remove-stress');
  const [moralePlayerId, setMoralePlayerId] = useState('');
  const [moraleOfficerId, setMoraleOfficerId] = useState('');
  const [moraleShipId, setMoraleShipId] = useState('');
  const [moraleEffectType, setMoraleEffectType] = useState('pdcDisabled');
  const [moraleStation, setMoraleStation] = useState<'helm' | 'tactical' | 'engineering' | 'sensors'>('helm');
  const [escortMode, setEscortMode] = useState<'interceptor-screen' | 'flak-umbrella' | 'off-board-strike'>('interceptor-screen');
  const [escortTorpedoId, setEscortTorpedoId] = useState('');
  const [escortShipId, setEscortShipId] = useState('');
  const [escortEnemyId, setEscortEnemyId] = useState('');
  const [extractionShipId, setExtractionShipId] = useState('');

  const onSpend = (assetId: string, payload: Record<string, unknown>) => {
    if (useFleetAsset(assetId, payload)) {
      setOpen(false);
    }
  };

  const selectedMoralePlayer = players.find(player => player.id === moralePlayerId);
  const moraleOfficerOptions = selectedMoralePlayer?.officers ?? [];

  return (
    <>
      {/* FAB trigger: floating button on the hex map pane */}
      {asFab ? (
          <SmartTooltip 
            content={`Fleet Assets — ${fleetFavor} FF`} 
            as="button"
            onClick={() => setOpen(true)}
            style={{
              position: 'absolute',
              bottom: 'var(--space-lg)',
              left: 'var(--space-lg)',
              zIndex: 120,
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid var(--color-alert-amber)',
              background: 'rgba(10, 18, 28, 0.92)',
              boxShadow: '0 0 16px rgba(255, 181, 71, 0.35), 0 2px 8px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              gap: '2px',
              backdropFilter: 'blur(4px)',
              transition: 'box-shadow 0.2s ease, transform 0.15s ease',
            }}
            aria-label="Open Fleet Assets"
          >
            {/* Ship-wheel / assets icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-alert-amber)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" />
              <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" />
            </svg>
            {/* FF badge */}
            <span style={{
              fontSize: '0.58rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-alert-amber)',
              letterSpacing: '0.05em',
              lineHeight: 1,
            }}>
              {fleetFavor} FF
            </span>
          </SmartTooltip>
      ) : (
        /* Inline compact trigger (Settings toolbar row) */
        <button
          className="btn"
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}
          onClick={() => setOpen(true)}
        >
          <span style={{ color: 'var(--color-alert-amber)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.06em' }}>
            ⛟ FLEET ASSETS
          </span>
          <span className="mono" style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
            {fleetFavor} FF
          </span>
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 8, 16, 0.88)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'var(--space-lg)',
        }}>
          <div className="panel panel--glow" style={{ width: 'min(1100px, 96vw)', maxHeight: '88vh', overflowY: 'auto', padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <div>
                <h2 style={{ color: 'var(--color-alert-amber)', marginBottom: '4px' }}>Fleet Assets</h2>
                <div className="mono" style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                  Spend shared Fleet Favor on temporary combat interventions. Current pool: {fleetFavor} FF.
                </div>
              </div>
              <button className="btn" onClick={() => setOpen(false)}>Close</button>
            </div>

            {FLEET_ASSET_DEFINITIONS.map(asset => (
              <div key={asset.id} className="panel panel--raised" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="flex-between" style={{ alignItems: 'baseline' }}>
                  <div>
                    <h3 style={{ color: 'var(--color-text-bright)', marginBottom: '4px' }}>{asset.name}</h3>
                    <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                      Cost: {asset.ffCost} FF | Timing: {asset.timing}
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', textAlign: 'right' }}>
                    This round: {fleetAssetRoundUses[asset.id] ?? 0}
                    <br />
                    This scenario: {fleetAssetScenarioUses[asset.id] ?? 0}
                  </div>
                </div>
                <div style={{ fontSize: '0.9rem' }}>{asset.effect}</div>
                <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--color-alert-amber)' }}>{asset.limitations}</div>

                {asset.id === 'tactical-override' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={tacticalOverrideShipId} onChange={e => setTacticalOverrideShipId(e.target.value)}>
                      <option value="">Select ship</option>
                      {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <button className="btn btn--execute" disabled={!tacticalOverrideShipId || fleetFavor < asset.ffCost || (fleetAssetRoundUses[asset.id] ?? 0) >= 1} onClick={() => onSpend(asset.id, { shipId: tacticalOverrideShipId })}>
                      Authorize Override
                    </button>
                  </div>
                )}

                {asset.id === 'emergency-reinforcement' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={reinforcementShipId} onChange={e => setReinforcementShipId(e.target.value)}>
                      <option value="">Select ship</option>
                      {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <button
                      className="btn btn--execute"
                      disabled={
                        !reinforcementShipId ||
                        fleetFavor < asset.ffCost ||
                        (fleetAssetRoundUses[asset.id] ?? 0) >= 2 ||
                        ((fleetAssetShipRoundUses[asset.id] ?? {})[reinforcementShipId] ?? 0) >= 1
                      }
                      onClick={() => onSpend(asset.id, { shipId: reinforcementShipId })}
                    >
                      Grant +1 CT
                    </button>
                  </div>
                )}

                {asset.id === 'targeting-package' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={targetingShipId} onChange={e => setTargetingShipId(e.target.value)}>
                      <option value="">Attacking ship</option>
                      {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <SelectField value={targetingEnemyId} onChange={e => setTargetingEnemyId(e.target.value)}>
                      <option value="">Target enemy</option>
                      {activeEnemyShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <SelectField value={targetingMode} onChange={e => setTargetingMode(e.target.value as any)} minWidth="220px">
                      <option value="tn">-1 TN</option>
                      <option value="reroll">+1 Reroll</option>
                      <option value="bonusHit">+1 Bonus Hit (needs Target Lock)</option>
                    </SelectField>
                    <button className="btn btn--execute" disabled={!targetingShipId || !targetingEnemyId || fleetFavor < asset.ffCost} onClick={() => onSpend(asset.id, { attackerShipId: targetingShipId, targetShipId: targetingEnemyId, mode: targetingMode })}>
                      Queue Package
                    </button>
                  </div>
                )}

                {asset.id === 'damage-control-authorization' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={damageShipId} onChange={e => setDamageShipId(e.target.value)}>
                      <option value="">Select ship</option>
                      {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <SelectField value={damageMode} onChange={e => setDamageMode(e.target.value as any)} minWidth="240px">
                      <option value="hull">Restore 1 Hull</option>
                      <option value="shield">Restore one shield arc to 1</option>
                      <option value="clear-impairment">Clear ship impairment</option>
                    </SelectField>
                    {damageMode === 'shield' && (
                      <SelectField value={damageSector} onChange={e => setDamageSector(e.target.value)}>
                        {['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'].map(sector => <option key={sector} value={sector}>{sector}</option>)}
                      </SelectField>
                    )}
                    {damageMode === 'clear-impairment' && (
                      <SelectField value={damageImpairment} onChange={e => setDamageImpairment(e.target.value)} minWidth="220px">
                        {SHIP_IMPAIRMENTS.filter(item => item.value !== 'navLockout').map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </SelectField>
                    )}
                    <button className="btn btn--execute" disabled={!damageShipId || fleetFavor < asset.ffCost || (fleetAssetRoundUses[asset.id] ?? 0) >= 2} onClick={() => onSpend(asset.id, { shipId: damageShipId, mode: damageMode, sector: damageSector, effectType: damageImpairment })}>
                      Authorize Repair
                    </button>
                  </div>
                )}

                {asset.id === 'intel-feed' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={intelMode} onChange={e => setIntelMode(e.target.value as any)} minWidth="240px">
                      <option value="delay-reinforcement">Delay reinforcement group</option>
                      <option value="cancel-tactic">Cancel current tactic</option>
                      <option value="expose-enemy">Expose enemy ship</option>
                    </SelectField>
                    {intelMode === 'delay-reinforcement' && (
                      <SelectField value={intelSpawnIndex} onChange={e => setIntelSpawnIndex(e.target.value)} minWidth="260px">
                        {pendingSpawns.length === 0 && <option value="">No pending reinforcements</option>}
                        {pendingSpawns.map((spawn, index) => <option key={`${spawn.adversaryId}-${index}`} value={String(index)}>Round {spawn.spawnRound}: {spawn.adversaryId}</option>)}
                      </SelectField>
                    )}
                    {intelMode === 'expose-enemy' && (
                      <SelectField value={intelEnemyId} onChange={e => setIntelEnemyId(e.target.value)}>
                        <option value="">Target enemy</option>
                        {activeEnemyShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                      </SelectField>
                    )}
                    <button
                      className="btn btn--execute"
                      disabled={
                        fleetFavor < asset.ffCost ||
                        (fleetAssetRoundUses[asset.id] ?? 0) >= 1 ||
                        (intelMode === 'delay-reinforcement' && pendingSpawns.length === 0) ||
                        (intelMode === 'cancel-tactic' && !currentTactic) ||
                        (intelMode === 'expose-enemy' && !intelEnemyId)
                      }
                      onClick={() => onSpend(asset.id, { mode: intelMode, spawnIndex: Number(intelSpawnIndex), targetShipId: intelEnemyId })}
                    >
                      Use Intel Feed
                    </button>
                  </div>
                )}

                {asset.id === 'morale-discipline' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={moraleMode} onChange={e => setMoraleMode(e.target.value as any)} minWidth="240px">
                      <option value="remove-stress">Remove 1 Stress</option>
                      <option value="clear-fumble-side-effect">Clear fumble side effect</option>
                      <option value="unlock-station">Unlock station</option>
                    </SelectField>
                    {(moraleMode === 'remove-stress' || moraleMode === 'unlock-station') && (
                      <SelectField value={moralePlayerId} onChange={e => setMoralePlayerId(e.target.value)}>
                        <option value="">Select player</option>
                        {players.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                      </SelectField>
                    )}
                    {moraleMode === 'remove-stress' && (
                      <SelectField value={moraleOfficerId} onChange={e => setMoraleOfficerId(e.target.value)}>
                        <option value="">Select officer</option>
                        {moraleOfficerOptions.map(officer => <option key={officer.officerId} value={officer.officerId}>{officer.station}</option>)}
                      </SelectField>
                    )}
                    {moraleMode === 'unlock-station' && (
                      <SelectField value={moraleStation} onChange={e => setMoraleStation(e.target.value as any)}>
                        {STATIONS.map(station => <option key={station} value={station}>{station}</option>)}
                      </SelectField>
                    )}
                    {moraleMode === 'clear-fumble-side-effect' && (
                      <>
                        <SelectField value={moraleShipId} onChange={e => setMoraleShipId(e.target.value)}>
                          <option value="">Select ship</option>
                          {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                        </SelectField>
                        <SelectField value={moraleEffectType} onChange={e => setMoraleEffectType(e.target.value)} minWidth="220px">
                          {SHIP_IMPAIRMENTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </SelectField>
                      </>
                    )}
                    <button
                      className="btn btn--execute"
                      disabled={
                        fleetFavor < asset.ffCost ||
                        (fleetAssetRoundUses[asset.id] ?? 0) >= 2 ||
                        (moraleMode === 'remove-stress' && (!moralePlayerId || !moraleOfficerId)) ||
                        (moraleMode === 'unlock-station' && !moralePlayerId) ||
                        (moraleMode === 'clear-fumble-side-effect' && !moraleShipId)
                      }
                      onClick={() => onSpend(asset.id, {
                        mode: moraleMode,
                        playerId: moralePlayerId,
                        officerId: moraleOfficerId,
                        station: moraleStation,
                        shipId: moraleShipId,
                        effectType: moraleEffectType,
                      })}
                    >
                      Apply Morale / Discipline
                    </button>
                  </div>
                )}

                {asset.id === 'escort-support-call' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={escortMode} onChange={e => setEscortMode(e.target.value as any)} minWidth="240px">
                      <option value="interceptor-screen">Destroy enemy torpedo</option>
                      <option value="flak-umbrella">Grant fighter immunity</option>
                      <option value="off-board-strike">Deal 1 hull off-board strike</option>
                    </SelectField>
                    {escortMode === 'interceptor-screen' && (
                      <SelectField value={escortTorpedoId} onChange={e => setEscortTorpedoId(e.target.value)}>
                        <option value="">Select torpedo</option>
                        {incomingEnemyTorpedoes.map(token => <option key={token.id} value={token.id}>{token.name}</option>)}
                      </SelectField>
                    )}
                    {escortMode === 'flak-umbrella' && (
                      <SelectField value={escortShipId} onChange={e => setEscortShipId(e.target.value)}>
                        <option value="">Select ship</option>
                        {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                      </SelectField>
                    )}
                    {escortMode === 'off-board-strike' && (
                      <SelectField value={escortEnemyId} onChange={e => setEscortEnemyId(e.target.value)}>
                        <option value="">Target enemy</option>
                        {activeEnemyShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                      </SelectField>
                    )}
                    <button
                      className="btn btn--execute"
                      disabled={
                        fleetFavor < asset.ffCost ||
                        (fleetAssetRoundUses[asset.id] ?? 0) >= 1 ||
                        (escortMode === 'interceptor-screen' && !escortTorpedoId) ||
                        (escortMode === 'flak-umbrella' && !escortShipId) ||
                        (escortMode === 'off-board-strike' && !escortEnemyId)
                      }
                      onClick={() => onSpend(asset.id, {
                        mode: escortMode,
                        torpedoId: escortTorpedoId,
                        shipId: escortShipId,
                        targetShipId: escortEnemyId,
                      })}
                    >
                      Call Support
                    </button>
                  </div>
                )}

                {asset.id === 'extraction-window' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <SelectField value={extractionShipId} onChange={e => setExtractionShipId(e.target.value)}>
                      <option value="">Select ship</option>
                      {alliedShips.map(ship => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                    </SelectField>
                    <button className="btn btn--execute" disabled={!extractionShipId || fleetFavor < asset.ffCost || (fleetAssetScenarioUses[asset.id] ?? 0) >= 1} onClick={() => onSpend(asset.id, { shipId: extractionShipId })}>
                      Open Extraction Window
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
