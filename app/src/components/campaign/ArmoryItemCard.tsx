import React from 'react';
import type { Subsystem, WeaponModule, ShipArc } from '../../types/game';
import { TAG_DESCRIPTIONS, TAG_LABELS } from '../../data/weapons';

const ARC_LABELS: Record<ShipArc, string> = {
  fore: 'Fore',
  foreStarboard: 'Fore Starboard',
  aftStarboard: 'Aft Starboard',
  aft: 'Aft',
  aftPort: 'Aft Port',
  forePort: 'Fore Port',
};

type Props = {
  item: WeaponModule | Subsystem;
  isWeapon: boolean;
  children?: React.ReactNode;
};

function isWeaponModule(item: WeaponModule | Subsystem): item is WeaponModule {
  return 'volleyPool' in item;
}

function isSubsystem(item: WeaponModule | Subsystem): item is Subsystem {
  return 'actionName' in item;
}

export default function ArmoryItemCard({ item, isWeapon, children }: Props) {
  return (
    <div className="panel" style={{ padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{item.name}</div>
        <span
          className="mono"
          style={{
            fontSize: '0.62rem',
            padding: '2px 6px',
            borderRadius: '999px',
            border: `1px solid ${isWeapon ? 'var(--color-holo-cyan)' : 'rgba(100, 255, 180, 0.35)'}`,
            color: isWeapon ? 'var(--color-holo-cyan)' : 'var(--color-holo-green)',
            background: isWeapon ? 'rgba(0, 204, 255, 0.12)' : 'rgba(100, 255, 180, 0.12)',
            whiteSpace: 'nowrap',
          }}
        >
          {isWeapon ? 'WEAPON' : 'SUBSYSTEM'}
        </span>
      </div>

      {isWeapon && isWeaponModule(item) ? (
        <>
          <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Range {item.rangeMin}-{item.rangeMax === Infinity ? 'INF' : item.rangeMax}
            {' | '}
            Volley {item.volleyPool.join(' + ').toUpperCase()}
          </div>
          <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', lineHeight: 1.4 }}>
            Arcs: {item.arcs.map(arc => ARC_LABELS[arc]).join(', ')}
          </div>
          {item.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {item.tags.map(tag => (
                <span
                  key={tag}
                  className="mono"
                  title={TAG_DESCRIPTIONS[tag] || tag}
                  style={{
                    fontSize: '0.6rem',
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'var(--color-text-bright)',
                    cursor: 'help',
                    border: '1px dotted rgba(255, 255, 255, 0.3)',
                  }}
                >
                  {TAG_LABELS[tag] || tag.toUpperCase()}
                </span>
              ))}
            </div>
          )}
          <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-holo-cyan)', lineHeight: 1.35 }}>
            {item.effect}
          </div>
        </>
      ) : isSubsystem(item) ? (
        <>
          <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Station: {item.station.toUpperCase()}
            {' | '}
            CT: {item.ctCost}
            {' | '}
            Stress: {item.stressCost}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {item.isPassive && (
              <span className="mono" style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(100, 255, 180, 0.12)', color: 'var(--color-holo-green)', border: '1px solid rgba(100, 255, 180, 0.35)' }}>
                PASSIVE
              </span>
            )}
            {item.requiresTarget && (
              <span className="mono" style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(0, 204, 255, 0.12)', color: 'var(--color-holo-cyan)', border: '1px solid rgba(0, 204, 255, 0.35)' }}>
                TARGETED
              </span>
            )}
          </div>
          <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-holo-cyan)', lineHeight: 1.35 }}>
            {item.actionName}: {item.effect}
          </div>
        </>
      ) : null
      }

      {children}
    </div>
  );
}
