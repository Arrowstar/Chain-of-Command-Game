import { useLayoutEffect, useRef, useState } from 'react';
import type { EnemyShipState, FighterToken, HexCoord, ObjectiveMarkerState, ShipArc, ShipState, TacticHazardState, TerrainType, TorpedoToken } from '../../types/game';
import { getWeaponById } from '../../data/weapons';
import { getChassisById } from '../../data/shipChassis';
import { getAdversaryById } from '../../data/adversaries';
import { getTerrainData } from '../../data/terrain';
import { ASSET_MAP } from '../../engine/pixiGraphics';

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
  const maxShieldValue = !isEnemy && 'maxShieldsPerSector' in ship ? Math.max(1, ship.maxShieldsPerSector) : (adversary?.shieldsPerSector || 1);
  const shipSprite = 'chassisId' in ship ? ASSET_MAP[ship.chassisId] : (adversary ? ASSET_MAP[adversary.id] : null);

  return (
    <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', margin: 'var(--space-sm) 0', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
      <svg viewBox="0 0 120 120" width="140" height="140">
        <defs>
          <clipPath id={`ship-preview-clip-${ship.id}`}>
            <circle cx="60" cy="60" r="20" />
          </clipPath>
        </defs>
        {ARC_ORDER.map((arc, index) => {
          const startAngle = index * 60 - 30;
          const endAngle = startAngle + 60;
          const shieldValue = ship.shields[arc];
          const opacity = 0.18 + (shieldValue / maxShieldValue) * 0.58;
          const labelPos = polarPoint(60, 60, 28, startAngle + 30);
          return (
            <g key={`shield-${arc}`}>
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
            </g>
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
  | { kind: 'terrain'; terrainType: TerrainType; coord: HexCoord }
  | { kind: 'objective'; marker: ObjectiveMarkerState }
  | { kind: 'fighter'; fighter: FighterToken; stackCount?: number }
  | { kind: 'torpedo'; torpedo: TorpedoToken }
  | { kind: 'hazard'; hazard: TacticHazardState };

interface Props {
  target: MapHoverTarget | null;
  position: { x: number; y: number } | null;
}

export default function ShipInfoPanel({ target, position }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = useState(position);

  useLayoutEffect(() => {
    if (!target || !position || !panelRef.current) {
      setClampedPosition(position);
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
  }, [target, position]);

  if (!target || !position) return null;

  return (
    <div
      ref={panelRef}
      data-testid="ship-info-panel"
      className="panel panel--glow animate-slideRight"
      style={{
        position: 'absolute',
        top: clampedPosition?.y ?? position.y,
        left: clampedPosition?.x ?? position.x,
        width: '320px',
        maxWidth: 'min(320px, calc(100% - 24px))',
        maxHeight: 'calc(100% - 24px)',
        overflowY: 'auto',
        zIndex: 'var(--z-tooltip)',
        pointerEvents: 'none',
      }}
    >
      {target.kind === 'ship' && <ShipTooltipContent ship={target.ship} isEnemy={target.isEnemy} />}
      {target.kind === 'terrain' && <TerrainTooltipContent terrainType={target.terrainType} coord={target.coord} />}
      {target.kind === 'objective' && <ObjectiveTooltipContent marker={target.marker} />}
      {target.kind === 'fighter' && <FighterTooltipContent fighter={target.fighter} stackCount={target.stackCount ?? 1} />}
      {target.kind === 'torpedo' && <TorpedoTooltipContent torpedo={target.torpedo} />}
      {target.kind === 'hazard' && <HazardTooltipContent hazard={target.hazard} />}
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
        <StatCard label="Hull Integrity" value={`${ship.currentHull} / ${maxHull}`} color={ship.currentHull < maxHull / 2 ? 'var(--color-hostile-red)' : 'var(--color-holo-green)'} />
        <StatCard label="Current Speed" value={String(ship.currentSpeed)} />

      </div>

      <ShipSchematicPreview ship={ship} isEnemy={isEnemy} />

      {!isEnemy && (ship as ShipState).equippedWeapons.length > 0 && (
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          <div className="label" style={{ marginBottom: '4px' }}>Equipped Weaponry</div>
          { (ship as ShipState).equippedWeapons.map((weaponId, idx) => {
            const weapon = weaponId ? getWeaponById(weaponId) : null;
            if (!weapon) return null;
            const weaponColor = WEAPON_PREVIEW_COLORS[idx % WEAPON_PREVIEW_COLORS.length];
            return (
              <div key={`${weaponId}-${idx}`} className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginBottom: '4px', borderLeft: `2px solid ${weaponColor}` }}>
                <div className="label" style={{ color: weaponColor, fontSize: '0.75rem', marginBottom: '2px' }}>{weapon.name}</div>
                <div className="mono flex-between" style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-dim)' }}>Range:</span>
                  <span>{weapon.rangeMin}-{weapon.rangeMax === Infinity ? '∞' : weapon.rangeMax}</span>
                </div>
                <div className="mono flex-between" style={{ fontSize: '0.8rem', marginTop: '1px' }}>
                  <span style={{ color: 'var(--color-text-dim)' }}>Volley:</span>
                  <span>{weapon.volleyPool.join(', ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEnemy && adversary && (
        <div className="panel panel--raised" style={{ padding: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <div className="label" style={{ marginBottom: '4px' }}>Weaponry</div>
          <div className="mono flex-between" style={{ fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Range:</span>
            <span>{adversary.weaponRangeMin}-{adversary.weaponRangeMax}</span>
          </div>
          <div className="mono flex-between" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
            <span style={{ color: 'var(--color-text-dim)' }}>Volley:</span>
            <span>{adversary.volleyPool.join(', ')}</span>
          </div>
        </div>
      )}

      {ship.criticalDamage && ship.criticalDamage.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <div className="label" style={{ color: 'var(--color-alert-amber)' }}>Critical Damage</div>
          <ul style={{ paddingLeft: 'var(--space-md)', marginTop: '4px' }}>
            {ship.criticalDamage.map(crit => (
              <li key={crit.id} className="mono" style={{ color: 'var(--color-alert-amber)', fontSize: '0.8rem' }}>
                {crit.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isEnemy && 'scars' in ship && (ship as ShipState).scars.length > 0 && (
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
        <StatCard label="TN Modifier" value={`${terrain.tnModifier >= 0 ? '+' : ''}${terrain.tnModifier}`} color="var(--color-holo-cyan)" />
        <StatCard label="Blocks LoS" value={terrain.blocksLoS ? 'Yes' : 'No'} />
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
        <StatCard label="Hull Integrity" value={`${marker.hull} / ${marker.maxHull}`} color={hullColor} />
        <StatCard label="Shields / Arc" value={String(marker.shieldsPerSector)} color="var(--color-shield-blue)" />
      </div>
    </>
  );
}

function FighterTooltipContent({ fighter, stackCount }: { fighter: FighterToken; stackCount: number }) {
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
          Fighter Wing
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        <StatCard label="Hull" value={`${fighter.currentHull} / ${fighter.maxHull}`} color="var(--color-holo-green)" />
        <StatCard label="Speed" value={String(fighter.speed)} />
        <StatCard label="Evasion" value={String(fighter.baseEvasion)} />
        <StatCard label="Stack in Hex" value={String(stackCount)} />
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
        <StatCard label="Hull" value={`${torpedo.currentHull} / ${torpedo.maxHull}`} color="var(--color-holo-green)" />
        <StatCard label="Speed" value={String(torpedo.speed)} />
        <StatCard label="Evasion" value={String(torpedo.baseEvasion)} />
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

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="panel panel--raised" style={{ padding: 'var(--space-sm)' }}>
      <div className="label">{label}</div>
      <div className="mono" style={{ fontSize: '1.05rem', color: color ?? 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );
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
