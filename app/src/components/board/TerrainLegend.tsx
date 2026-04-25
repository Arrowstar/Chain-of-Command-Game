import React from 'react';
import { TERRAIN_DATA } from '../../data/terrain';
import { TerrainType } from '../../types/game';

// Colour swatches matching HexMap.tsx terrain rendering
const TERRAIN_COLORS: Record<TerrainType, { bg: string; border: string }> = {
  open:        { bg: 'transparent',       border: 'transparent' },
  asteroids:   { bg: 'rgba(74,85,104,0.55)',  border: '#718096' },
  ionNebula:   { bg: 'rgba(214,188,250,0.35)', border: '#9F7AEA' },
  debrisField: { bg: 'rgba(160,174,192,0.45)', border: '#2C7A7B' },
  gravityWell: { bg: 'rgba(0,0,0,0.82)',   border: '#E53E3E' },
};

const TERRAIN_ICONS: Record<TerrainType, string> = {
  open:        '',
  asteroids:   '🪨',
  ionNebula:   '⚡',
  debrisField: '🌫️',
  gravityWell: '🌀',
};

const DISPLAY_ORDER: TerrainType[] = [
  TerrainType.Asteroids,
  TerrainType.IonNebula,
  TerrainType.DebrisField,
  TerrainType.GravityWell,
];

export const TerrainLegend: React.FC = () => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '12px',
      left: '12px',
      background: 'rgba(10,12,20,0.88)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      padding: '10px 14px',
      zIndex: 20,
      minWidth: '210px',
      backdropFilter: 'blur(6px)',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'uppercase',
        marginBottom: '8px',
      }}>
        Environmental Terrain
      </div>
      {DISPLAY_ORDER.map(type => {
        const data = TERRAIN_DATA[type];
        const colors = TERRAIN_COLORS[type];
        const icon = TERRAIN_ICONS[type];

        return (
          <div
            key={type}
            title={data.special}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '7px',
              cursor: 'help',
            }}
          >
            {/* Colour swatch */}
            <div style={{
              width: '18px',
              height: '18px',
              borderRadius: '3px',
              background: colors.bg,
              border: `2px solid ${colors.border}`,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
            }}>
              {icon}
            </div>

            {/* Name + quick-summary */}
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.2,
              }}>
                {capitalize(type.replace(/([A-Z])/g, ' $1'))}
              </div>
              <div style={{
                fontSize: '10px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.2,
              }}>
                {summaryLine(type, data.tnModifier)}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{
        marginTop: '6px',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: '9px',
        color: 'rgba(255,255,255,0.3)',
        fontStyle: 'italic',
      }}>
        Hover each row for full rule text
      </div>
    </div>
  );
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).trim();
}

function summaryLine(type: TerrainType, tnMod: number): string {
  const tnStr = tnMod > 0 ? `TN +${tnMod}` : tnMod < 0 ? `TN ${tnMod}` : 'TN 0';
  switch (type) {
    case 'asteroids':   return `${tnStr} · Blocks LoS · Halts drift`;
    case 'ionNebula':   return `${tnStr} · Strips all shields`;
    case 'debrisField': return `${tnStr} · Blocks fighters`;
    case 'gravityWell': return `${tnStr} · Pulls ships at Cleanup`;
    default: return tnStr;
  }
}

export default TerrainLegend;
