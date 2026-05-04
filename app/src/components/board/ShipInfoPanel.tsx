import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EnemyShipState, FighterToken, HexCoord, ObjectiveMarkerState, ShipArc, ShipState, StationState, TacticHazardState, TerrainType, TorpedoToken } from '../../types/game';
import { getWeaponById } from '../../data/weapons';
import { getSubsystemById } from '../../data/subsystems';
import { getChassisById } from '../../data/shipChassis';
import { getAdversaryById } from '../../data/adversaries';
import Tooltip from './Tooltip';
import { getStationById } from '../../data/stations';
import { getTerrainData } from '../../data/terrain';
import { ASSET_MAP } from '../../engine/pixiGraphics';
import { useGameStore } from '../../store/useGameStore';
import { getFighterClassById } from '../../data/fighters';

export function describeScarImpact(fromCriticalId: string): string {
  switch (fromCriticalId) {
    case 'thrusters-offline':
      return '-1 max speed';
    case 'coolant-leak':
      return '+1 ENG stress';
    case 'bridge-hit':
      return '-1 CT/round';
    case 'shield-generator-offline':
      return '-1 primary range';
    case 'targeting-array-damaged':
      return '-1 weapon die';
    case 'sensor-mast-damaged':
      return '+1 sensors stress';
    case 'weapon-mount-warped':
      return '-1 first-shot die';
    case 'structural-spine-buckled':
      return 'speed capped at 2';
    case 'power-bus-leak':
      return '+1 CT on first action';
    case 'command-spine-exposed':
      return '+1 HELM stress/round';
    default:
      return 'Persistent penalty';
  }
}

const ARC_ORDER: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
const WEAPON_PREVIEW_COLORS = ['#4FD1C5', '#F6E05E', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED'];

function getArcBandPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
  const x1Out = cx + outerR * Math.cos(rad(startAngle));
  const y1Out = cy + outerR * Math.sin(rad(startAngle));
  const x2Out = cx + outerR * Math.cos(rad(endAngle));
  const y2Out = cy + outerR * Math.sin(rad(endAngle));
  const x1In = cx + innerR * Math.cos(rad(endAngle));
  const y1In = cy + innerR * Math.sin(rad(endAngle));
  const x2In = cx + innerR * Math.cos(rad(startAngle));
  const y2In = cy + innerR * Math.sin(rad(startAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1Out} ${y1Out} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2In} ${y2In} Z`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function ShipSchematicPreview({ ship, isEnemy }: { ship: ShipState | EnemyShipState; isEnemy: boolean }) {
  const weapons = !isEnemy && 'equippedWeapons' in ship
    ? ship.equippedWeapons
        .map((weaponId, index) => ({ index, weaponId, weapon: weaponId ? getWeaponById(weaponId) : null }))
        .filter(entry => entry.weapon)
    : [];

  const adversary = isEnemy && 'adversaryId' in ship ? getAdversaryById(ship.adversaryId) : null;
  const maxShieldValue = !isEnemy && 'maxShieldsPerSector' in ship ? ship.maxShieldsPerSector : (adversary?.shieldsPerSector || 0);
  const shipSprite = 'chassisId' in ship ? ASSET_MAP[ship.chassisId] : (adversary ? ASSET_MAP[adversary.id] : null);

  const hasShields = maxShieldValue > 0;

  return (
    <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', margin: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
      <svg viewBox="0 0 120 120" width="140" height="140">
        <defs>
          <clipPath id={`ship-preview-clip-${ship.id}`}>
            <circle cx="60" cy="60" r="20" />
          </clipPath>
        </defs>
        {hasShields && ARC_ORDER.map((arc, index) => {
          const startAngle = index * 60 - 30;
          const endAngle = startAngle + 60;
          const shieldValue = ship.shields[arc];
          const opacity = 0.18 + (shieldValue / maxShieldValue) * 0.58;
          const labelPos = polarPoint(60, 60, 28, startAngle + 30);
          return (
            <Tooltip
              key={`shield-${arc}`}
              tag="g"
              content={
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--color-shield-blue)', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{arc} Shields</div>
                  <div>Strength: {shieldValue} / {maxShieldValue}</div>
                </div>
              }
            >
              <path
                d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                fill={isEnemy ? `rgba(255, 107, 107, ${opacity})` : `rgba(79, 209, 197, ${opacity})`}
                stroke={isEnemy ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)'}
                strokeWidth="1.2"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill="white"
                fontSize="7"
                textAnchor="middle"
                dominantBaseline="middle"
                className="mono"
              >
                {shieldValue}
              </text>
            </Tooltip>
          );
        })}

        {weapons.map((entry, weaponIndex) =>
          entry.weapon!.arcs.map(arc => {
            const arcIndex = ARC_ORDER.indexOf(arc as ShipArc);
            if (arcIndex < 0) return null;
            const startAngle = arcIndex * 60 - 30;
            const endAngle = startAngle + 60;
            return (
              <path
                key={`weapon-${entry.index}-${arc}`}
                d={getArcBandPath(60, 60, 41 + weaponIndex * 6, 46 + weaponIndex * 6, startAngle + 3, endAngle - 3)}
                fill={WEAPON_PREVIEW_COLORS[weaponIndex % WEAPON_PREVIEW_COLORS.length]}
                opacity="0.45"
                stroke={WEAPON_PREVIEW_COLORS[weaponIndex % WEAPON_PREVIEW_COLORS.length]}
                strokeWidth="1"
              />
            );
          }),
        )}

        <circle cx="60" cy="60" r="20.5" fill="rgba(9, 15, 28, 0.92)" stroke="rgba(160, 174, 192, 0.45)" strokeWidth="1.2" />
        {shipSprite ? (
          <image
            href={shipSprite}
            x="39"
            y="39"
            width="42"
            height="42"
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#ship-preview-clip-${ship.id})`}
            transform="rotate(-90 60 60)"
          />
        ) : (
          <path
            d="M 74 60 L 51 70 L 57 60 L 51 50 Z"
            fill="var(--color-bg-panel)"
            stroke={isEnemy ? 'var(--color-hostile-red)' : '#A0AEC0'}
            strokeWidth="1.5"
            transform="rotate(-90 60 60)"
          />
        )}
      </svg>
    </div>
  );
}

export type MapHoverTarget =
  | { kind: 'ship'; ship: ShipState | EnemyShipState; isEnemy: boolean }
  | { kind: 'station'; station: StationState }
  | { kind: 'terrain'; terrainType: TerrainType; coord: HexCoord }
  | { kind: 'objective'; marker: ObjectiveMarkerState }
  | { kind: 'fighter'; fighter: FighterToken; stackCount?: number }
  | { kind: 'torpedo'; torpedo: TorpedoToken }
  | { kind: 'hazard'; hazard: TacticHazardState };

interface ShipInfoPanelProps {
  targets: MapHoverTarget[];
  position: { x: number; y: number } | null;
  onLock?: () => void;
  onClose?: () => void;
}

export function getMapHoverTargetId(target: MapHoverTarget | null): string {
  if (!target) return 'none';
  switch (target.kind) {
    case 'ship': return `ship-${target.ship.id}`;
    case 'station': return `station-${target.station.id}`;
    case 'terrain': return `terrain-${target.coord.q}-${target.coord.r}`;
    case 'objective': return `objective-${target.marker.name}`;
    case 'fighter': return `fighter-${target.fighter.id}`;
    case 'torpedo': return `torpedo-${target.torpedo.id}`;
    case 'hazard': return `hazard-${target.hazard.id}`;
    default: return 'unknown';
  }
}

export default function ShipInfoPanel({ targets, position, onClose, onLock }: ShipInfoPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = useState(position);
  const [lockProgress, setLockProgress] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (targets.length === 0) {
      setLockProgress(0);
      setIsLocked(false);
      return;
    }

    if (isLocked) return;

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / 1000) * 100);
      setLockProgress(progress);
      if (progress >= 100) {
        setIsLocked(true);
        if (onLock) onLock();
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [targets.map(t => getMapHoverTargetId(t)).join('|'), isLocked]);

  useLayoutEffect(() => {
    if (targets.length === 0 || !position || !panelRef.current || isLocked) {
      if (!isLocked) {
        setClampedPosition(position);
      }
      return;
    }

    const panel = panelRef.current;
    const parent = panel.parentElement;
    if (!parent) {
      setClampedPosition(position);
      return;
    }

    const padding = 12;
    const maxX = Math.max(padding, parent.clientWidth - panel.offsetWidth - padding);
    const maxY = Math.max(padding, parent.clientHeight - panel.offsetHeight - padding);

    setClampedPosition({
      x: Math.max(padding, Math.min(position.x, maxX)),
      y: Math.max(padding, Math.min(position.y, maxY)),
    });
  }, [targets, position, isLocked]);

  if (!targets.length || !position) return null;

  return (
    <div
      ref={panelRef}
      data-testid="ship-info-panel"
      className="panel panel--glow animate-slideRight"
      style={{
        position: 'absolute',
        top: clampedPosition?.y ?? position.y,
        left: clampedPosition?.x ?? position.x,
        display: 'flex',
        flexDirection: 'row',
        gap: 'var(--space-md)',
        padding: 'var(--space-md)',
        background: 'rgba(10, 15, 25, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 204, 255, 0.25)',
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.6), inset 0 0 10px rgba(0, 204, 255, 0.05)',
        zIndex: 'var(--z-tooltip)',
        pointerEvents: isLocked ? 'auto' : 'none',
        width: 'max-content',
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 40px)',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 204, 255, 0.5) transparent'
      }}
      onPointerLeave={() => {
        if (isLocked && onClose) {
          onClose();
        }
      }}
    >
      <LockIndicator progress={lockProgress} isLocked={isLocked} target={targets[0]} targetCount={targets.length} />
      
      {targets.map((target, idx) => (
        <div 
          key={`${target.kind}-${idx}`} 
          style={{ 
            width: '300px', 
            minWidth: '300px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '100%',
            overflowY: 'auto',
            borderRight: idx < targets.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            paddingRight: idx < targets.length - 1 ? 'var(--space-md)' : 0,
            paddingBottom: 'var(--space-sm)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 204, 255, 0.3) transparent'
          }}
        >
          {target.kind === 'ship' && <ShipTooltipContent ship={target.ship} isEnemy={target.isEnemy} />}
          {target.kind === 'station' && <StationTooltipContent station={target.station} />}
          {target.kind === 'terrain' && <TerrainTooltipContent terrainType={target.terrainType} coord={target.coord} />}
          {target.kind === 'objective' && <ObjectiveTooltipContent marker={target.marker} />}
          {target.kind === 'fighter' && <FighterTooltipContent fighter={target.fighter} stackCount={target.stackCount ?? 1} />}
          {target.kind === 'torpedo' && <TorpedoTooltipContent torpedo={target.torpedo} />}
          {target.kind === 'hazard' && <HazardTooltipContent hazard={target.hazard} />}
        </div>
      ))}
    </div>
  );
}

function LockIndicator({ progress, isLocked, target, targetCount }: { progress: number; isLocked: boolean; target: MapHoverTarget; targetCount: number }) {
  let color = 'var(--color-holo-cyan)';
  if (target.kind === 'ship') {
    color = target.isEnemy ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)';
  } else if (target.kind === 'station' || target.kind === 'hazard') {
    color = 'var(--color-hostile-red)';
  } else if (target.kind === 'terrain' || target.kind === 'objective') {
    color = 'var(--color-alert-amber)';
  } else if (target.kind === 'fighter') {
    color = target.fighter?.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)';
  } else if (target.kind === 'torpedo') {
    color = target.torpedo?.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)';
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '50%',
        border: `1px solid ${isLocked ? color : 'rgba(255,255,255,0.1)'}`,
        boxShadow: isLocked ? `0 0 8px ${color}` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24">
        {/* Background circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="2"
        />
        {/* Progress circle */}
        {!isLocked && (
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="62.8"
            strokeDashoffset={62.8 * (1 - progress / 100)}
            transform="rotate(-90 12 12)"
            strokeLinecap="round"
          />
        )}
        {/* Lock icon or count */}
        {isLocked ? (
          <path
            d="M7 11V7a5 5 0 0 1 10 0v4h1v9H6v-9h1zm2 0h6V7a3 3 0 0 0-6 0v4z"
            fill={color}
            transform="scale(0.8) translate(3, 3)"
          />
        ) : (
          targetCount > 1 && (
            <text 
              x="12" 
              y="12" 
              textAnchor="middle" 
              dominantBaseline="central" 
              fontSize="11" 
              fontFamily="var(--font-display)"
              fontWeight="bold" 
              fill={color}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {targetCount}
            </text>
          )
        )}
      </svg>
    </div>
  );
}

function ShipTooltipContent({ ship, isEnemy }: { ship: ShipState | EnemyShipState; isEnemy: boolean }) {
  const chassis = !isEnemy && 'chassisId' in ship ? getChassisById(ship.chassisId) : null;
  const adversary = isEnemy && 'adversaryId' in ship ? getAdversaryById(ship.adversaryId) : null;
  const maxHull = ship.maxHull ?? ship.currentHull;
  const rawVesselName = ship.name || (isEnemy ? adversary?.name : chassis?.name) || 'Unknown Vessel';
  const isFlagship = isEnemy && /\(Flagship\)/i.test(rawVesselName);
  const vesselName = isEnemy ? formatEnemyVesselName(rawVesselName) : rawVesselName;
  const vesselClass = isEnemy ? (adversary?.name ?? 'Unknown Adversary Class') : (chassis?.className ?? 'Unknown Vessel Class');
  const maxShieldValue = !isEnemy && 'maxShieldsPerSector' in ship ? (ship as ShipState).maxShieldsPerSector : (adversary?.shieldsPerSector || 0);
  const hasShields = maxShieldValue > 0;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: isEnemy ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)' }}>
          {isEnemy ? 'Enemy Vessel' : 'Allied Vessel'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
          <h3 style={{ margin: 0, color: isEnemy ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)' }}>
            {vesselName}
          </h3>
          {isFlagship && (
            <span
              className="mono"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--color-alert-amber)',
                border: '1px solid rgba(255, 204, 0, 0.45)',
                borderRadius: '999px',
                padding: '2px 8px',
                background: 'rgba(255, 204, 0, 0.12)',
              }}
            >
              Flagship
            </span>
          )}
        </div>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          {vesselClass}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard 
          label="Hull Integrity" 
          value={`${ship.currentHull} / ${maxHull}`} 
          color={ship.currentHull < maxHull / 2 ? 'var(--color-hostile-red)' : 'var(--color-holo-green)'} 
          tooltip={
            <div>
              <div style={{ color: 'var(--color-holo-cyan)', fontWeight: 'bold', marginBottom: '4px' }}>Hull Integrity</div>
              <div>Current: {ship.currentHull} / {maxHull}</div>
              <div style={{ marginTop: '4px', fontSize: '0.7rem', opacity: 0.8 }}>
                {ship.currentHull <= maxHull / 2 
                  ? '⚠️ DAMAGED: Vessel is below 50% hull and may suffer critical failures.' 
                  : 'Vessel is structurally sound.'}
              </div>
            </div>
          }
        />
        <StatCard 
          label="Current Speed" 
          value={String(ship.currentSpeed)} 
          tooltip="Tactical movement limit for the current round."
        />
        <StatCard 
          label="Evasion" 
          value={String(ship.baseEvasion + ((ship as any).evasionModifiers || 0))} 
          color="var(--color-holo-green)"
          tooltip="Base evasion value. Used to avoid incoming fire. Higher is better."
        />
        {hasShields && (
          <StatCard 
            label="Shield Capacity" 
            value={String(maxShieldValue)} 
            color="var(--color-shield-blue)"
            tooltip="Maximum shield strength per sector."
          />
        )}
      </div>

      <ShipSchematicPreview ship={ship} isEnemy={isEnemy} />

      {!isEnemy && 'equippedWeapons' in ship && (ship as ShipState).equippedWeapons?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          <div className="label" style={{ marginBottom: '4px' }}>Equipped Weaponry</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          { (ship as ShipState).equippedWeapons.map((wId, index) => {
            if (!wId) return null;
            const weapon = getWeaponById(wId);
            if (!weapon) return null;
            return (
              <Tooltip key={index} content={
                <div>
                  <div style={{ color: 'var(--color-holo-cyan)', fontWeight: 'bold', marginBottom: '4px' }}>{weapon.name}</div>
                  <div>Range: {weapon.rangeMin || 0}-{weapon.rangeMax === Infinity ? '∞' : weapon.rangeMax}</div>
                  <div>Dice: {weapon.volleyPool.join(', ')}</div>
                  {weapon.tags && weapon.tags.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                      {weapon.tags.join(' · ')}
                    </div>
                  )}
                </div>
              }>
                <div style={{ padding: '4px 8px', background: 'rgba(0,204,255,0.1)', border: '1px solid rgba(0,204,255,0.3)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-holo-cyan)' }}>
                  {weapon.name}
                </div>
              </Tooltip>
            );
          })}
          </div>
        </div>
      )}

      {!isEnemy && 'equippedSubsystems' in ship && (ship as ShipState).equippedSubsystems?.length > 0 && (
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <div className="label" style={{ marginBottom: '4px' }}>Installed Subsystems</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(ship as ShipState).equippedSubsystems.map((sId, index) => {
              if (!sId) return null;
              const sub = getSubsystemById(sId);
              if (!sub) return null;
              return (
                <Tooltip key={index} content={
                  <div>
                    <div style={{ color: 'var(--color-holo-green)', fontWeight: 'bold', marginBottom: '4px' }}>{sub.name}</div>
                    <div>{sub.effect}</div>
                    <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                      {sub.station.toUpperCase()} · Cost: {sub.ctCost} CT / {sub.stressCost} Stress
                    </div>
                  </div>
                }>
                  <div style={{ padding: '4px 8px', background: 'rgba(0,255,153,0.1)', border: '1px solid rgba(0,255,153,0.3)', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--color-holo-green)' }}>
                    {sub.name}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {isEnemy && adversary && (
        <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <Tooltip content={
            <div>
              <div style={{ color: 'var(--color-hostile-red)', fontWeight: 'bold', marginBottom: '4px' }}>Standard Armament</div>
              <div>Range: {adversary.weaponRangeMin}-{adversary.weaponRangeMax}</div>
              <div>Volley: {adversary.volleyPool.join(', ')}</div>
              {adversary.weaponTags && adversary.weaponTags.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                  {adversary.weaponTags.join(' · ')}
                </div>
              )}
            </div>
          }>
            <div className="mono flex-between" style={{ fontSize: '0.85rem', cursor: 'help' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Range:</span>
              <span>{adversary.weaponRangeMin}-{adversary.weaponRangeMax}</span>
            </div>
            <div className="mono flex-between" style={{ fontSize: '0.85rem', marginTop: '2px', cursor: 'help' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Volley:</span>
              <span>{adversary.volleyPool.join(', ')}</span>
            </div>
          </Tooltip>
          {adversary.traits && adversary.traits.length > 0 && (
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              <div className="label" style={{ color: 'var(--color-alert-amber)', fontSize: '0.7rem', marginBottom: '4px' }}>Special Traits</div>
              {adversary.traits.map((trait, idx) => (
                <Tooltip key={idx} content={
                  <div>
                    <div style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold', marginBottom: '2px' }}>{formatTraitName(trait)}</div>
                    <div>{formatTraitDescription(trait)}</div>
                  </div>
                }>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-bright)', marginBottom: '2px', lineHeight: 1.3, cursor: 'help' }}>
                    • {formatTraitDescription(trait)}
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}

      {ship.criticalDamage && ship.criticalDamage.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <div className="label" style={{ color: 'var(--color-alert-amber)' }}>Critical Damage</div>
          <ul style={{ paddingLeft: 'var(--space-md)', marginTop: '4px' }}>
            {ship.criticalDamage.map(crit => (
              <Tooltip key={crit.id} content={
                <div>
                  <div style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold', marginBottom: '4px' }}>{crit.name}</div>
                  <div>{crit.effect}</div>
                  <div style={{ marginTop: '4px', fontSize: '0.7rem', fontStyle: 'italic', color: 'var(--color-text-dim)' }}>Permanent until repaired.</div>
                </div>
              }>
                <li className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.8rem', cursor: 'help', marginBottom: '2px' }}>
                  {crit.name}
                </li>
              </Tooltip>
            ))}
          </ul>
        </div>
      )}

      {!isEnemy && 'scars' in ship && (ship as ShipState).scars?.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <div className="label" style={{ color: 'var(--color-alert-amber)', marginBottom: '6px' }}>
            Persistent Scars
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {(ship as ShipState).scars.map(scar => (
              <div
                key={scar.id}
                className="panel panel--raised"
                style={{
                  padding: 'var(--space-sm)',
                  borderLeft: '3px solid var(--color-alert-amber)',
                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  background: 'linear-gradient(90deg, rgba(255, 170, 0, 0.12), rgba(255, 170, 0, 0.03))',
                }}
              >
                <Tooltip content={
                  <div>
                    <div style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold', marginBottom: '4px' }}>{scar.name}</div>
                    <div>{scar.effect}</div>
                  </div>
                }>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ color: 'var(--color-alert-amber)', fontWeight: 700, fontSize: '0.82rem' }}>
                      {scar.name}
                    </span>
                    <span
                      className="mono"
                      style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-bright)',
                        border: '1px solid rgba(255, 170, 0, 0.28)',
                        borderRadius: '999px',
                        padding: '2px 8px',
                        background: 'rgba(255, 170, 0, 0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {describeScarImpact(scar.fromCriticalId)}
                    </span>
                  </div>
                  <div style={{ marginTop: '4px', color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: 1.35 }}>
                    {scar.effect}
                  </div>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TerrainTooltipContent({ terrainType, coord }: { terrainType: TerrainType; coord: HexCoord }) {
  const terrain = getTerrainData(terrainType);

  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-alert-amber)' }}>Terrain</div>
        <h3 style={{ margin: '4px 0 2px', color: 'var(--color-alert-amber)', textTransform: 'uppercase' }}>
          {formatTerrainName(terrainType)}
        </h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          Hex {coord.q}, {coord.r}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard 
          label="TN Modifier" 
          value={`${terrain.tnModifier >= 0 ? '+' : ''}${terrain.tnModifier}`} 
          color="var(--color-holo-cyan)" 
          tooltip="Accuracy penalty applied to units inside this terrain."
        />
        <StatCard 
          label="Blocks LoS" 
          value={terrain.blocksLoS ? 'Yes' : 'No'} 
          tooltip="Whether this terrain obstructs Line of Sight for attacks."
        />
      </div>

      <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        <DetailBlock label="Movement" value={terrain.movementEffect} />
        <DetailBlock label="Effect" value={terrain.special} />
      </div>
    </>
  );
}

function ObjectiveTooltipContent({ marker }: { marker: ObjectiveMarkerState }) {
  const hullColor = marker.hull <= Math.ceil(marker.maxHull / 2) ? 'var(--color-hostile-red)' : 'var(--color-holo-green)';

  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-alert-amber)' }}>Objective</div>
        <h3 style={{ margin: '4px 0 2px', color: 'var(--color-alert-amber)' }}>{marker.name}</h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          Mission Structure
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard 
          label="Hull Integrity" 
          value={`${marker.hull} / ${marker.maxHull}`} 
          color={hullColor} 
          tooltip="Damage this objective can sustain before destruction."
        />
        {marker.shieldsPerSector > 0 && (
          <StatCard 
            label="Shields / Arc" 
            value={String(marker.shieldsPerSector)} 
            color="var(--color-shield-blue)" 
            tooltip="Active shield strength per hex face."
          />
        )}
      </div>
    </>
  );
}

function StationTooltipContent({ station }: { station: StationState }) {
  const stationData = getStationById(station.stationId);
  const hullColor = station.currentHull <= Math.ceil(station.maxHull / 2) ? 'var(--color-hostile-red)' : 'var(--color-holo-green)';
  const maxShieldValue = station.maxShieldsPerSector || 0;
  const hasShields = maxShieldValue > 0;

  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-hostile-red)' }}>
          {stationData?.type === 'turret' ? 'Defense Turret' : 'Enemy Installation'}
        </div>
        <h3 style={{ margin: '4px 0 2px', color: 'var(--color-hostile-red)' }}>{station.name}</h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          {stationData?.special ?? 'Static defensive position'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard 
          label="Hull" 
          value={`${station.currentHull} / ${station.maxHull}`} 
          color={hullColor} 
          tooltip="Structural integrity of the installation."
        />
        <StatCard 
          label="Armor" 
          value={station.armorDie.toUpperCase()} 
          tooltip="Heavy plating that reduces incoming hull damage."
        />
        <StatCard 
          label="Evasion" 
          value={String(station.baseEvasion)} 
          tooltip="Base difficulty for enemies to hit this target."
        />
        {hasShields && (
          <StatCard 
            label="Max Shield" 
            value={String(station.maxShieldsPerSector)} 
            tooltip="Maximum shield capacity per defensive arc."
          />
        )}
      </div>

      {hasShields && (
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <svg viewBox="0 0 120 120" width="140" height="140" style={{ display: 'block', margin: '0 auto' }}>
            {ARC_ORDER.map((arc, index) => {
            const startAngle = index * 60 - 30;
            const endAngle = startAngle + 60;
            const shieldValue = station.shields[arc];
            const opacity = 0.18 + (shieldValue / maxShieldValue) * 0.58;
            const labelPos = polarPoint(60, 60, 28, startAngle + 30);
            return (
              <Tooltip
                key={`shield-${arc}`}
                tag="g"
                content={
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--color-shield-blue)', fontWeight: 'bold', marginBottom: '2px', textTransform: 'uppercase' }}>{arc} Arc</div>
                    <div>Shields: {shieldValue} / {maxShieldValue}</div>
                  </div>
                }
              >
                <path
                  d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                  fill={`rgba(255, 107, 107, ${opacity})`}
                  stroke="var(--color-hostile-red)"
                  strokeWidth="1.2"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="white"
                  fontSize="7"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {shieldValue}
                </text>
              </Tooltip>
            );
          })}
          <circle cx="60" cy="60" r="14" fill="rgba(0,0,0,0.35)" stroke="var(--color-hostile-red)" strokeWidth="1.5" />
          {stationData?.imageKey ? (
            <image 
              href={ASSET_MAP[stationData.imageKey as keyof typeof ASSET_MAP]} 
              x="49" y="49" width="22" height="22" 
              style={{ opacity: 0.8 }}
            />
          ) : (
            <text x="60" y="60" fill="white" fontSize="8" textAnchor="middle" dominantBaseline="middle">
              {stationData?.type === 'turret' ? 'TUR' : 'STN'}
            </text>
          )}
        </svg>
      </div>
      )}

      {stationData?.fighterHangar && (
        <Tooltip content="Current available fighters and launch capability.">
          <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginTop: 'var(--space-sm)', cursor: 'help' }}>
            <div className="label" style={{ marginBottom: '4px' }}>Fighter Hangar</div>
            <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.4, fontSize: '0.82rem' }}>
              {station.remainingFighters} / {stationData.fighterHangar.totalFighters} fighters remaining. 
              Launches {stationData.fighterHangar.fightersPerLaunch} per round.
            </div>
          </div>
        </Tooltip>
      )}

      {stationData && (
        <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <Tooltip content={
            <div>
              <div style={{ color: 'var(--color-hostile-red)', fontWeight: 'bold', marginBottom: '4px' }}>Standard Armament</div>
              <div>Range: {stationData.weaponRangeMin}-{stationData.weaponRangeMax}</div>
              <div>Volley: {stationData.volleyPool.join(', ')}</div>
              {stationData.weaponTags && stationData.weaponTags.length > 0 && (
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
                  {stationData.weaponTags.join(' · ')}
                </div>
              )}
            </div>
          }>
            <div className="mono flex-between" style={{ fontSize: '0.82rem', cursor: 'help' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Range:</span>
              <span>{stationData.weaponRangeMin}-{stationData.weaponRangeMax}</span>
            </div>
            <div className="mono flex-between" style={{ fontSize: '0.82rem', marginTop: '2px', cursor: 'help' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>Volley:</span>
              <span>{stationData.volleyPool.join(', ')}</span>
            </div>
          </Tooltip>

          {stationData.heavyVolleyPool && (
            <Tooltip content={
              <div>
                <div style={{ color: 'var(--color-hostile-red)', fontWeight: 'bold', marginBottom: '4px' }}>Heavy Battery (Forward Arcs)</div>
                <div>Range: {stationData.heavyWeaponRangeMin}-{stationData.heavyWeaponRangeMax}</div>
                <div>Volley: {stationData.heavyVolleyPool.join(', ')}</div>
              </div>
            }>
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', cursor: 'help' }}>
                <div className="mono flex-between" style={{ fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--color-text-dim)' }}>Heavy Range:</span>
                  <span>{stationData.heavyWeaponRangeMin}-{stationData.heavyWeaponRangeMax}</span>
                </div>
                <div className="mono flex-between" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                  <span style={{ color: 'var(--color-text-dim)' }}>Heavy Volley:</span>
                  <span>{stationData.heavyVolleyPool.join(', ')}</span>
                </div>
              </div>
            </Tooltip>
          )}

          {stationData.traits && stationData.traits.length > 0 && (
            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
              <div className="label" style={{ color: 'var(--color-alert-amber)', fontSize: '0.7rem', marginBottom: '4px' }}>Special Traits</div>
              {stationData.traits.map((trait, idx) => (
                <Tooltip key={idx} content={
                  <div>
                    <div style={{ color: 'var(--color-alert-amber)', fontWeight: 'bold', marginBottom: '2px' }}>{formatTraitName(trait)}</div>
                    <div>{formatTraitDescription(trait)}</div>
                  </div>
                }>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-bright)', marginBottom: '4px', lineHeight: 1.3, cursor: 'help' }}>
                    • {formatTraitDescription(trait)}
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function FighterTooltipContent({ fighter, stackCount }: { fighter: FighterToken; stackCount: number }) {
  const getShipName = useGameStore(state => state.getShipName);
  const targetName = fighter.assignedTargetId ? getShipName(fighter.assignedTargetId) : 'None';

  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: fighter.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)' }}>
          {fighter.allegiance === 'enemy' ? 'Enemy Small Craft' : 'Allied Small Craft'}
        </div>
        <h3 style={{ margin: '4px 0 2px', color: fighter.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)' }}>
          {fighter.name}
        </h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          {getFighterClassById(fighter.classId)?.name ?? 'Fighter Wing'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard label="Hull" value={`${fighter.currentHull} / ${fighter.maxHull}`} color="var(--color-holo-green)" />
        <StatCard label="Speed" value={String(fighter.speed)} />
        <StatCard label="Evasion" value={String(fighter.baseEvasion)} />
        <StatCard label="Stack in Hex" value={String(stackCount)} />
        {fighter.allegiance === 'allied' && (
          <>
            <StatCard label="Behavior" value={fighter.behavior.replace('_', ' ').toUpperCase()} />
            <StatCard label="Target" value={targetName} />
          </>
        )}
      </div>

      <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
        <Tooltip content={
          <div>
            <div style={{ color: fighter.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)', fontWeight: 'bold', marginBottom: '4px' }}>Standard Armament</div>
            <div>Max Range: {fighter.weaponRangeMax}</div>
            <div>Volley: {fighter.volleyPool.join(', ')}</div>
          </div>
        }>
          <div className="mono flex-between" style={{ fontSize: '0.82rem', cursor: 'help' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Range:</span>
            <span>0-{fighter.weaponRangeMax}</span>
          </div>
          <div className="mono flex-between" style={{ fontSize: '0.82rem', marginTop: '2px', cursor: 'help' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Volley:</span>
            <span>{fighter.volleyPool.join(', ')}</span>
          </div>
        </Tooltip>
        
        {getFighterClassById(fighter.classId)?.specialRules && (
          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            <div className="label" style={{ color: 'var(--color-alert-amber)', fontSize: '0.7rem', marginBottom: '4px' }}>Special Rules</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-bright)', lineHeight: 1.3 }}>
              • {getFighterClassById(fighter.classId)?.specialRules}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TorpedoTooltipContent({ torpedo }: { torpedo: TorpedoToken }) {
  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: torpedo.allegiance === 'enemy' ? 'var(--color-hostile-red)' : 'var(--color-alert-amber)' }}>
          {torpedo.allegiance === 'enemy' ? 'Enemy Ordnance' : 'Allied Ordnance'}
        </div>
        <h3 style={{ margin: '4px 0 2px', color: 'var(--color-alert-amber)' }}>{torpedo.name}</h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          Seeker Torpedo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard 
          label="Hull" 
          value={`${torpedo.currentHull} / ${torpedo.maxHull}`} 
          color="var(--color-holo-green)" 
          tooltip="Damage needed to destroy this torpedo before impact."
        />
        <StatCard 
          label="Speed" 
          value={String(torpedo.speed)} 
          tooltip="Movement distance per activation phase."
        />
        <StatCard 
          label="Evasion" 
          value={String(torpedo.baseEvasion)} 
          tooltip="Difficulty for PDCs and fighters to intercept."
        />
      </div>
    </>
  );
}

function HazardTooltipContent({ hazard }: { hazard: TacticHazardState }) {
  return (
    <>
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div className="label" style={{ color: 'var(--color-hostile-red)' }}>Tactic Hazard</div>
        <h3 style={{ margin: '4px 0 2px', color: 'var(--color-hostile-red)' }}>{hazard.name}</h3>
        <div className="label" style={{ color: 'var(--color-text-dim)' }}>
          Hex {hazard.position.q}, {hazard.position.r}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard label="Hull Damage" value={`${hazard.damage}`} color="var(--color-hostile-red)" />
        <StatCard label="Trigger" value="Move through" />
      </div>

      <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
        <div className="label" style={{ marginBottom: '4px' }}>Effect</div>
        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.4, fontSize: '0.82rem' }}>
          The first ship to move through this hex takes {hazard.damage} unblockable Hull damage. Expires after Round {hazard.expiresAfterRound}.
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, color, tooltip }: { label: string; value: string; color?: string; tooltip?: React.ReactNode }) {
  const card = (
    <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', cursor: tooltip ? 'help' : 'default' }}>
      <div className="label">{label}</div>
      <div className="mono" style={{ fontSize: '1.05rem', color: color ?? 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
  if (tooltip) return <Tooltip content={tooltip}>{card}</Tooltip>;
  return card;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel panel--raised" style={{ padding: 'var(--space-sm)' }}>
      <div className="label" style={{ marginBottom: '4px' }}>{label}</div>
      <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.4, fontSize: '0.82rem' }}>{value}</div>
    </div>
  );
}

function formatTerrainName(type: TerrainType) {
  switch (type) {
    case 'asteroids':
      return 'Asteroid Field';
    case 'ionNebula':
      return 'Ion Nebula';
    case 'debrisField':
      return 'Debris Field';
    case 'gravityWell':
      return 'Gravity Well';
    default:
      return 'Open Space';
  }
}

function formatEnemyVesselName(name: string) {
  const withoutFlagship = name.replace(/\s*\(Flagship\)\s*/gi, '').trim();
  const angleMatch = withoutFlagship.match(/[<"«]([^>"»]+)[>"»]\s*$/);
  if (angleMatch) {
    return `HEG ${angleMatch[1].trim()}`;
  }

  const quotedMatch = withoutFlagship.match(/"([^"]+)"\s*$/);
  if (quotedMatch) {
    return `HEG ${quotedMatch[1].trim()}`;
  }

  const classPrefixMatch = withoutFlagship.match(/^Hegemony\s+.+?\([^)]*\)\s*(.+)$/i);
  if (classPrefixMatch) {
    return `HEG ${classPrefixMatch[1].trim()}`;
  }

  return withoutFlagship;
}

function formatTraitName(trait: any): string {
  switch (trait.type) {
    case 'aura': return 'Tactical Aura';
    case 'rangeConditional': return 'Precision Calibration';
    case 'flankingConditional': return 'Exploitative Volley';
    case 'terrainConditional': return 'Environmental Adaptation';
    case 'spawner': return 'Hangar Operations';
    case 'movementConditional': return 'High-Speed Maneuvering';
    case 'hullThresholdConditional': return 'Enrage Protocol';
    case 'stationaryConditional': return 'Siege Configuration';
    case 'isolationConditional': return 'Stealth Systems';
    case 'shieldBreaker': return 'Ionized Volley';
    default: return 'Special Capability';
  }
}

function formatTraitDescription(trait: any): string {
  switch (trait.type) {
    case 'aura':
      return `${trait.effect === 'tnPenalty' ? 'Jamming' : 'Command'} Aura (${trait.radius} hex): ${trait.amount > 0 ? '+' : ''}${trait.amount} ${trait.effect === 'tnPenalty' ? 'TN to attackers' : 'Evasion to allies'}`;
    case 'rangeConditional':
      return `Precision Fire: ${trait.extraVolley ? '+' + trait.extraVolley.join(',') : ''} ${trait.evasionBonus ? '+' + trait.evasionBonus + ' Evasion' : ''} at Range ${trait.minRange}-${trait.maxRange}`;
    case 'flankingConditional':
      return `Exploitative Fire: +${trait.extraVolley.join(',')} when striking ${trait.requiredArcs.length >= 3 ? 'Flank/Rear' : trait.requiredArcs.join('/')} arcs`;
    case 'terrainConditional':
      return `Environmental Advantage: +${trait.evasionBonus} Evasion in ${trait.terrain}`;
    case 'spawner':
      return `Hangar Bay: Spawns ${trait.count} ${trait.tokenClass.replace('enemy-fighter-', '').toUpperCase()} each round`;
    case 'movementConditional':
      return `Hit and Run: +${trait.evasionBonus} Evasion if moved ${trait.minHexesMoved}+ hexes`;
    case 'hullThresholdConditional':
      return `Enrage Protocol: +${trait.extraVolley.join(',')} when below ${trait.threshold * 100}% Hull`;
    case 'stationaryConditional':
      return `Siege Mode: Grants Armor Piercing if ship did not move`;
    case 'isolationConditional':
      return `Stealth Coating: +${trait.evasionBonus} Evasion when no enemies within ${trait.radius} hexes`;
    case 'shieldBreaker':
      return `Shield Breaker: Double shield damage, 0 hull damage`;
    default:
      return 'Unique tactical capability';
  }
}
