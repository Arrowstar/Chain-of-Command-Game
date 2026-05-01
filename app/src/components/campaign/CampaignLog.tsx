import React, { useEffect, useRef, useState } from 'react';
import { describeScarImpact } from '../board/ShipInfoPanel';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getEventById } from '../../data/eventNodes';
import { getTechById } from '../../data/experimentalTech';
import type { CampaignLogEntry, EventEffect, EventEffectTarget } from '../../types/campaignTypes';

const TYPE_CONFIG: Record<CampaignLogEntry['type'], { icon: string; color: string; label: string }> = {
  navigation: { icon: '►', color: 'var(--color-holo-cyan)', label: 'Navigation' },
  event: { icon: '✦', color: 'var(--color-alert-amber)', label: 'Event' },
  combat: { icon: '⚔', color: 'var(--color-hostile-red)', label: 'Combat' },
  resource: { icon: '◈', color: 'var(--color-alert-amber)', label: 'Resources' },
  repair: { icon: '🔧', color: 'var(--color-holo-green)', label: 'Repair' },
  market: { icon: '⬡', color: 'var(--color-shield-blue)', label: 'Logistics' },
  officer: { icon: '◎', color: 'var(--color-stress-orange)', label: 'Officer' },
  system: { icon: '◇', color: 'var(--color-text-dim)', label: 'System' },
};

function groupBySector(entries: CampaignLogEntry[]): Map<number, CampaignLogEntry[]> {
  const groups = new Map<number, CampaignLogEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.sector) ?? [];
    bucket.push(entry);
    groups.set(entry.sector, bucket);
  }
  return groups;
}

function formatEventTarget(target?: EventEffectTarget): string {
  switch (target) {
    case 'all':
      return 'all hands';
    case 'fleet':
      return 'the fleet';
    case 'random':
      return 'a random target';
    case 'helm':
      return 'helm officers';
    case 'tactical':
      return 'tactical officers';
    case 'engineering':
      return 'engineering officers';
    case 'sensors':
      return 'sensors officers';
    case 'station':
      return 'the assigned station';
    default:
      return 'the target';
  }
}

function describeCombatModifiers(modifiers?: EventEffect['combatModifiers']): string[] {
  if (!modifiers) return [];

  const notes: string[] = [];
  if (modifiers.threatBudgetBonus) notes.push(`enemy threat budget +${modifiers.threatBudgetBonus}`);
  if (modifiers.guaranteedEliteSpawn) notes.push('guaranteed elite enemy spawn');
  if (modifiers.enemyShieldsZeroRound1) notes.push('enemy shields start at 0 in Round 1');
  if (modifiers.playerActsFirst) notes.push('player fleet acts first in Round 1');
  if (modifiers.playerStartSpeed3) notes.push('player ships start at Speed 3');
  if (modifiers.playerCTRound1Modifier) notes.push(`player CT generation ${modifiers.playerCTRound1Modifier > 0 ? '+' : ''}${modifiers.playerCTRound1Modifier} in Round 1`);
  if (modifiers.playerMaxSpeedReduction) notes.push(`player max speed reduced by ${modifiers.playerMaxSpeedReduction}`);
  if (modifiers.playerCTZeroRound1) notes.push('player ships start with 0 CT in Round 1');
  if (modifiers.flagshipBonus) notes.push(`enemy flagship +${modifiers.flagshipBonus.evasion} EVA, +${modifiers.flagshipBonus.hull} Hull`);
  if (modifiers.highPriorityBounty) notes.push('high-priority bounty increases threat');
  if (modifiers.propagandaExposedBonus) notes.push(`enemy threat budget +${modifiers.propagandaExposedBonus} from exposed propaganda`);
  return notes;
}

function formatEventEffect(effect: EventEffect): string {
  const target = formatEventTarget(effect.target);
  const modifierNotes = describeCombatModifiers(effect.combatModifiers);

  switch (effect.type) {
    case 'rp':
      return `Fleet requisition changed by ${effect.value && effect.value > 0 ? '+' : ''}${effect.value ?? 0} RP`;
    case 'ff':
      return `Fleet Favor changed by ${effect.value && effect.value > 0 ? '+' : ''}${effect.value ?? 0}`;
    case 'stress':
      return `${target} gained ${effect.value ?? 1} Stress`;
    case 'stressRecover':
      return effect.value === 999 ? `${target} cleared all accumulated Stress` : `${target} recovered ${effect.value ?? 1} Stress`;
    case 'trauma':
      return `${target} suffered a permanent Trauma trait`;
    case 'hull':
      return `${target} suffered ${effect.value ?? 1} direct Hull damage`;
    case 'tech':
      return `Recovered ${effect.value ?? 1} experimental tech item${(effect.value ?? 1) === 1 ? '' : 's'}`;
    case 'scar':
      return `${target} gained a permanent ship Scar`;
    case 'clearScar':
      return `${target} removed one existing ship Scar`;
    case 'transformToCombat':
      return `The encounter escalated into immediate combat${modifierNotes.length ? ` with modifiers: ${modifierNotes.join(', ')}` : ''}`;
    case 'skipNode':
      return 'The fleet earned clearance to skip the next node';
    case 'hullPatch':
      return `${target} restored 1 Hull`;
    case 'officerUpgrade':
      return `${target} received a free officer promotion`;
    case 'destroyWeapon':
      return `${target} lost a randomly equipped weapon module`;
    case 'maxHullReduction':
      return `${target} permanently lost ${effect.value ?? 1} Max Hull`;
    case 'subsystemSlotReduction':
      return `${target} permanently lost one subsystem slot`;
    case 'maxCTReduction':
      return `${target} permanently lost ${effect.value ?? 1} max CT generation`;
    case 'nextCombatModifier':
      return `The next combat was modified${modifierNotes.length ? `: ${modifierNotes.join(', ')}` : ''}`;
    case 'nothing':
      return 'No mechanical effect';
    default:
      return effect.type;
  }
}

function EventDetailRows({ details }: { details: Record<string, unknown> }) {
  const eventId = typeof details.eventId === 'string' ? details.eventId : undefined;
  const optionId = typeof details.optionId === 'string' ? details.optionId : undefined;
  const roll = typeof details.roll === 'number' ? details.roll : undefined;
  const rolledGood = typeof details.rolledGood === 'boolean' ? details.rolledGood : undefined;
  const effectsApplied = Array.isArray(details.effectsApplied) ? details.effectsApplied : [];
  const techAwarded = Array.isArray(details.techAwarded) ? details.techAwarded.filter(Boolean).map(String) : [];

  const event = eventId ? getEventById(eventId) : undefined;
  const option = optionId ? event?.options.find(entry => entry.id === optionId) : undefined;
  const threshold = option?.rollThreshold ?? (option?.requiresRoll ? 4 : undefined);

  return (
    <div className="game-log-details">
      {event && (
        <div className="game-log-details-row">
          <span>Event</span>
          <span>{event.title}</span>
        </div>
      )}
      {option && (
        <div className="game-log-details-row">
          <span>Choice</span>
          <span>{option.label}</span>
        </div>
      )}
      {typeof roll === 'number' && (
        <div className="game-log-details-row">
          <span>Roll</span>
          <span>
            {roll}
            {threshold ? ` ${rolledGood === true ? 'success' : rolledGood === false ? 'failure' : 'resolved'} (needed ${threshold}+)` : ''}
          </span>
        </div>
      )}
      {effectsApplied.length > 0 && (
        <div className="campaign-log-detail-block">
          <div className="campaign-log-detail-label">Outcome</div>
          <div className="campaign-log-detail-list">
            {effectsApplied.map((effect, index) => (
              <div key={`${String(effect)}-${index}`} className="campaign-log-detail-item">
                {typeof effect === 'object' && effect !== null ? formatEventEffect(effect as EventEffect) : String(effect)}
              </div>
            ))}
          </div>
        </div>
      )}
      {techAwarded.length > 0 && (
        <div className="campaign-log-detail-block">
          <div className="campaign-log-detail-label">Tech Acquired</div>
          <div className="campaign-log-detail-list">
            {techAwarded.map(techId => (
              <div key={techId} className="campaign-log-detail-item">{getTechById(techId)?.name ?? techId}</div>
            ))}
          </div>
        </div>
      )}
      {!event && !option && typeof roll !== 'number' && effectsApplied.length === 0 && techAwarded.length === 0 && (
        <GenericDetailRows details={details} />
      )}
    </div>
  );
}

function DetailValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="game-log-details-row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function DetailBulletBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="campaign-log-detail-block">
      <div className="campaign-log-detail-label">{label}</div>
      <div className="campaign-log-detail-list">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="campaign-log-detail-item">{item}</div>
        ))}
      </div>
    </div>
  );
}

function formatNodeType(nodeType: unknown): string {
  switch (nodeType) {
    case 'start':
      return 'Fleet Departure';
    case 'combat':
      return 'Hostile Patrol';
    case 'elite':
      return 'Elite Squadron';
    case 'event':
      return 'Anomalous Signal';
    case 'haven':
      return 'Hidden Drydock';
    case 'boss':
      return 'Hegemony Command';
    default:
      return String(nodeType ?? 'Unknown');
  }
}

function formatKeyLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, match => match.toUpperCase());
}

function stringifyDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringifyDetailValue).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => `${formatKeyLabel(k)}: ${stringifyDetailValue(v)}`)
      .join(' | ');
  }
  return String(value);
}

function NavigationDetailRows({ details }: { details: Record<string, unknown> }) {
  const toNodeType = formatNodeType(details.nodeType);
  const usedSkip = details.usedSkip === true;

  return (
    <div className="game-log-details">
      <DetailValueRow label="Destination" value={toNodeType} />
      {typeof details.fromNodeId === 'string' && <DetailValueRow label="From" value={details.fromNodeId} />}
      {typeof details.toNodeId === 'string' && <DetailValueRow label="To" value={details.toNodeId} />}
      <DetailValueRow label="Skip Route" value={usedSkip ? 'Yes' : 'No'} />
    </div>
  );
}

function CombatDetailRows({
  details,
  shipNames,
}: {
  details: Record<string, unknown>;
  shipNames: Map<string, string>;
}) {
  const bullets: string[] = [];
  if (typeof details.earnedFF === 'number') bullets.push(`${details.earnedFF >= 0 ? '+' : ''}${details.earnedFF} Fleet Favor earned`);
  if (typeof details.salvageBonusRp === 'number' && details.salvageBonusRp > 0) bullets.push(`+${details.salvageBonusRp} RP recovered by Salvager Drones`);
  if (typeof details.destroyedShipCount === 'number') bullets.push(`${details.destroyedShipCount} ship${details.destroyedShipCount === 1 ? '' : 's'} lost in the engagement`);
  if (details.campaignVictory === true) bullets.push('Campaign victory confirmed');
  if (typeof details.destroyedShipId === 'string') {
    const shipName = shipNames.get(details.destroyedShipId) ?? details.destroyedShipId;
    bullets.push(details.totalWipe === true ? `${shipName} was lost and the fleet was wiped out` : `${shipName} was lost but replacement is pending`);
  }

  return (
    <div className="game-log-details">
      {typeof details.nodeId === 'string' && <DetailValueRow label="Encounter Node" value={details.nodeId} />}
      {details.nodeType !== undefined && <DetailValueRow label="Encounter Type" value={formatNodeType(details.nodeType)} />}
      {typeof details.enemyCount === 'number' && <DetailValueRow label="Enemy Count" value={String(details.enemyCount)} />}
      {typeof details.fleetFavor === 'number' && <DetailValueRow label="Fleet Favor In" value={String(details.fleetFavor)} />}
      {typeof details.sector === 'number' && <DetailValueRow label="Sector" value={String(details.sector)} />}
      <DetailBulletBlock label="Combat Notes" items={bullets} />
    </div>
  );
}

function ResourceDetailRows({
  details,
  officerLabels,
}: {
  details: Record<string, unknown>;
  officerLabels: Map<string, string>;
}) {
  const bullets: string[] = [];
  if (typeof details.traumasGained === 'number') bullets.push(`${details.traumasGained} new officer trauma case${details.traumasGained === 1 ? '' : 's'}`);
  if (typeof details.scarsGained === 'number') bullets.push(`${details.scarsGained} new ship scar${details.scarsGained === 1 ? '' : 's'}`);
  if (Array.isArray(details.scarsApplied)) {
    details.scarsApplied.forEach((s: any) => {
      if (s.name && s.fromCriticalId) {
        bullets.push(`Scar: ${s.name} [Impact: ${describeScarImpact(s.fromCriticalId)}]`);
      }
    });
  }
  if (typeof details.autoDocPrevented === 'string' && details.autoDocPrevented) {
    bullets.push(`Auto-Doc Override prevented trauma for ${officerLabels.get(details.autoDocPrevented) ?? details.autoDocPrevented}`);
  }
  if (typeof details.rpBonus === 'number') bullets.push(`Sector-clear reward: +${details.rpBonus} RP`);

  return (
    <div className="game-log-details">
      {typeof details.ffConverted === 'number' && <DetailValueRow label="Fleet Favor Converted" value={String(details.ffConverted)} />}
      {typeof details.rpGained === 'number' && <DetailValueRow label="RP Gained" value={String(details.rpGained)} />}
      {typeof details.previousSector === 'number' && <DetailValueRow label="Previous Sector" value={String(details.previousSector)} />}
      {typeof details.newSector === 'number' && <DetailValueRow label="New Sector" value={String(details.newSector)} />}
      <DetailBulletBlock label="Resource Notes" items={bullets} />
    </div>
  );
}

function RepairDetailRows({
  details,
  shipNames,
}: {
  details: Record<string, unknown>;
  shipNames: Map<string, string>;
}) {
  const shipName = typeof details.shipId === 'string' ? (shipNames.get(details.shipId) ?? details.shipId) : undefined;

  return (
    <div className="game-log-details">
      {shipName && <DetailValueRow label="Ship" value={shipName} />}
      {typeof details.hullBefore === 'number' && typeof details.hullAfter === 'number' && (
        <DetailValueRow label="Hull" value={`${details.hullBefore} -> ${details.hullAfter}`} />
      )}
      {typeof details.scarName === 'string' && (
        <DetailValueRow
          label="Scar Removed"
          value={typeof details.scarFromCriticalId === 'string'
            ? `${details.scarName} [Restored: ${describeScarImpact(details.scarFromCriticalId)}]`
            : details.scarName}
        />
      )}
      {typeof details.rpDelta === 'number' && <DetailValueRow label="Cost" value={`${Math.abs(details.rpDelta)} RP`} />}
    </div>
  );
}

function MarketDetailRows({
  details,
  shipNames,
}: {
  details: Record<string, unknown>;
  shipNames: Map<string, string>;
}) {
  const shipName = typeof details.shipId === 'string' ? (shipNames.get(details.shipId) ?? details.shipId) : undefined;
  const bullets: string[] = [];
  if (typeof details.slotIndex === 'number') bullets.push(`Handled in slot ${details.slotIndex + 1}`);
  if (typeof details.excessCount === 'number' && details.excessCount > 0) bullets.push(`${details.excessCount} item(s) moved to fleet storage`);
  if (typeof details.action === 'string') bullets.push(details.action === 'equip' ? 'Moved from storage into active loadout' : 'Moved from active loadout into storage');

  return (
    <div className="game-log-details">
      {shipName && <DetailValueRow label="Ship" value={shipName} />}
      {typeof details.itemName === 'string' && <DetailValueRow label="Item" value={details.itemName} />}
      {typeof details.techName === 'string' && <DetailValueRow label="Tech" value={details.techName} />}
      {typeof details.previousChassisId === 'string' && typeof details.newChassisId === 'string' && (
        <DetailValueRow label="Chassis" value={`${details.previousChassisId} -> ${details.newChassisId}`} />
      )}
      {typeof details.rpDelta === 'number' && <DetailValueRow label="RP Change" value={`${details.rpDelta > 0 ? '+' : '-'}${Math.abs(details.rpDelta)} RP`} />}
      {typeof details.rpCost === 'number' && <DetailValueRow label="Cost" value={`${details.rpCost} RP`} />}
      <DetailBulletBlock label="Logistics Notes" items={bullets} />
    </div>
  );
}

function OfficerDetailRows({
  details,
  officerLabels,
  shipNames,
}: {
  details: Record<string, unknown>;
  officerLabels: Map<string, string>;
  shipNames: Map<string, string>;
}) {
  const officerName = typeof details.officerId === 'string' ? (officerLabels.get(details.officerId) ?? details.officerId) : undefined;
  const shipName = typeof details.shipId === 'string' ? (shipNames.get(details.shipId) ?? details.shipId) : undefined;

  return (
    <div className="game-log-details">
      {officerName && <DetailValueRow label="Officer" value={officerName} />}
      {shipName && <DetailValueRow label="Ship" value={shipName} />}
      {typeof details.traumaRemoved === 'string' && <DetailValueRow label="Trauma Removed" value={details.traumaRemoved} />}
      {typeof details.fromTier === 'string' && typeof details.toTier === 'string' && (
        <DetailValueRow label="Training" value={`${details.fromTier} -> ${details.toTier}`} />
      )}
      {typeof details.rpDelta === 'number' && <DetailValueRow label="Cost" value={`${Math.abs(details.rpDelta)} RP`} />}
    </div>
  );
}

function SystemDetailRows({ details }: { details: Record<string, unknown> }) {
  const bullets: string[] = [];
  if (typeof details.shipCount === 'number') bullets.push(`${details.shipCount} ship${details.shipCount === 1 ? '' : 's'} commissioned`);
  if (typeof details.weaponOffers === 'number' || typeof details.subsystemOffers === 'number') {
    bullets.push(`${details.weaponOffers ?? 0} weapon offers, ${details.subsystemOffers ?? 0} subsystem offers`);
  }
  if (typeof details.techOffer === 'string') bullets.push(`Experimental tech lead available: ${getTechById(details.techOffer)?.name ?? details.techOffer}`);
  if (typeof details.stashedWeapons === 'number' || typeof details.stashedSubsystems === 'number') {
    bullets.push(`Storage status: ${details.stashedWeapons ?? 0} weapons, ${details.stashedSubsystems ?? 0} subsystems`);
  }

  return (
    <div className="game-log-details">
      {typeof details.difficulty === 'string' && <DetailValueRow label="Difficulty" value={details.difficulty} />}
      {typeof details.dpBudget === 'number' && <DetailValueRow label="DP Budget" value={String(details.dpBudget)} />}
      {typeof details.remainingRP === 'number' && <DetailValueRow label="Remaining RP" value={String(details.remainingRP)} />}
      <DetailBulletBlock label="System Notes" items={bullets} />
    </div>
  );
}

function GenericDetailRows({ details }: { details: Record<string, unknown> }) {
  const rows = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && stringifyDetailValue(value) !== '')
    .map(([key, value]) => (
      <DetailValueRow key={key} label={formatKeyLabel(key)} value={stringifyDetailValue(value)} />
    ));

  return <div className="game-log-details">{rows}</div>;
}

function renderCampaignDetailRows({
  entry,
  shipNames,
  officerLabels,
}: {
  entry: CampaignLogEntry;
  shipNames: Map<string, string>;
  officerLabels: Map<string, string>;
}) {
  if (!entry.details) return null;

  switch (entry.type) {
    case 'event':
      return <EventDetailRows details={entry.details} />;
    case 'navigation':
      return <NavigationDetailRows details={entry.details} />;
    case 'combat':
      return <CombatDetailRows details={entry.details} shipNames={shipNames} />;
    case 'resource':
      return <ResourceDetailRows details={entry.details} officerLabels={officerLabels} />;
    case 'repair':
      return <RepairDetailRows details={entry.details} shipNames={shipNames} />;
    case 'market':
      return <MarketDetailRows details={entry.details} shipNames={shipNames} />;
    case 'officer':
      return <OfficerDetailRows details={entry.details} officerLabels={officerLabels} shipNames={shipNames} />;
    case 'system':
      return <SystemDetailRows details={entry.details} />;
    default:
      return <GenericDetailRows details={entry.details} />;
  }
}

function CampaignLogRow({
  entry,
  shipNames,
  officerLabels,
}: {
  entry: CampaignLogEntry;
  shipNames: Map<string, string>;
  officerLabels: Map<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;
  const hasDetails = !!entry.details && Object.keys(entry.details).length > 0;
  const time = new Date(entry.timestamp);
  const timeLabel = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

  return (
    <div
      className={`game-log-entry ${hasDetails ? 'clickable' : ''}`}
      onClick={() => hasDetails && setExpanded(current => !current)}
      title={hasDetails ? 'Click to expand outcome details' : undefined}
    >
      <span className="game-log-entry-icon" style={{ color: config.color }}>
        {config.icon}
      </span>
      <div className="game-log-entry-body">
        <span className="game-log-entry-message">{entry.message}</span>
        <span className="campaign-log-entry-outcome">{entry.outcome}</span>
        <span className="game-log-entry-meta">
          {config.label} · {entry.phase.toUpperCase()} · {timeLabel}
          {hasDetails && (
            <span style={{ color: 'var(--color-holo-cyan)', marginLeft: 4 }}>
              {expanded ? '▲ hide' : '▼ details'}
            </span>
          )}
        </span>
        {expanded && hasDetails && renderCampaignDetailRows({ entry, shipNames, officerLabels })}
      </div>
    </div>
  );
}

export default function CampaignLog() {
  const campaign = useCampaignStore(s => s.campaign);
  const log = useCampaignStore(s => s.campaignLog);
  const persistedShips = useCampaignStore(s => s.persistedShips);
  const persistedPlayers = useCampaignStore(s => s.persistedPlayers);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(log.length);

  useEffect(() => {
    if (log.length > prevLength.current) {
      const delta = log.length - prevLength.current;
      if (!open) {
        setUnread(current => current + delta);
      } else if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }
    prevLength.current = log.length;
  }, [log.length, open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      if (contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }
  }, [open]);

  if (!campaign) return null;

  const grouped = groupBySector(log);
  const sectors = Array.from(grouped.keys()).sort((a, b) => a - b);
  const shipNames = new Map(persistedShips.map(ship => [ship.id, ship.name]));
  const officerLabels = new Map(
    persistedPlayers.flatMap(player =>
      player.officers.map(officer => [
        officer.officerId,
        `${officer.station.toUpperCase()} officer${shipNames.get(player.shipId) ? ` (${shipNames.get(player.shipId)})` : ''}`,
      ] as const)
    )
  );

  return (
    <>
      <div
        className={`game-log-tab campaign-log-tab ${unread > 0 ? 'has-unread' : ''}`}
        onClick={() => setOpen(current => !current)}
        role="button"
        title="Toggle Campaign Log"
        aria-label={`Campaign log ${unread > 0 ? `with ${unread} new entries` : ''}`}
      >
        {unread > 0 && <span className="game-log-badge">{unread > 99 ? '99+' : unread}</span>}
        <span className="game-log-tab-icon">{open ? '◂' : '▸'}</span>
        <span className="game-log-tab-label">Campaign Log</span>
        <span className="game-log-tab-icon" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
          {log.length}
        </span>
      </div>

      <div className={`game-log-panel campaign-log-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="game-log-scanline" />
        <div className="game-log-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="game-log-header-title">Campaign Log</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>
              Sector {campaign.currentSector} · {log.length} {log.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <button className="game-log-close" onClick={() => setOpen(false)}>CLOSE</button>
        </div>

        <div className="game-log-panel-content" ref={contentRef}>
          {log.length === 0 ? (
            <div className="game-log-empty">
              <span style={{ fontSize: '2rem', opacity: 0.3 }}>◇</span>
              <span>No campaign actions recorded yet.</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>
                Orders and outcomes will appear here as the run unfolds.
              </span>
            </div>
          ) : (
            sectors.map(sector => (
              <div key={sector}>
                <div className="game-log-round-header">
                  <span className="game-log-round-label">Sector {sector}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--color-text-dim)' }}>
                    {grouped.get(sector)?.length ?? 0} events
                  </span>
                </div>
                {grouped.get(sector)?.map(entry => (
                  <CampaignLogRow
                    key={entry.id}
                    entry={entry}
                    shipNames={shipNames}
                    officerLabels={officerLabels}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
