import React from 'react';
import { useUIStore, type SelectionTarget } from '../../store/useUIStore';
import { useGameStore } from '../../store/useGameStore';
import { ASSET_MAP } from '../../engine/pixiGraphics';
import { getChassisById } from '../../data/shipChassis';
import { getAdversaryById } from '../../data/adversaries';
import { getStationById } from '../../data/stations';
import { getFighterClassById } from '../../data/fighters';

export default function SelectionPicker() {
  const selectionPicker = useUIStore(s => s.selectionPicker);
  const closeSelectionPicker = useUIStore(s => s.closeSelectionPicker);
  const resolveAction = useGameStore(s => s.resolveAction);
  const selectShip = useUIStore(s => s.selectShip);
  const players = useGameStore(s => s.players);

  if (!selectionPicker || !selectionPicker.isOpen) return null;

  const handlePick = (target: SelectionTarget) => {
    const { action, context } = selectionPicker;
    
    if (action) {
      // Targeting mode
      const player = players.find(p => p.shipId === action.shipId);
      if (player) {
        let targetId = '';
        if (target.kind === 'ship') targetId = target.ship.id;
        else if (target.kind === 'fighter') targetId = target.fighter.id;
        else if (target.kind === 'station') targetId = target.station.id;
        else if (target.kind === 'objective') targetId = target.marker.name;
        else if (target.kind === 'torpedo') targetId = target.torpedo.id;
        else if (target.kind === 'hazard') targetId = target.hazard.id;

        resolveAction(player.id, action.shipId, action.actionId, {
          ...context,
          targetShipId: targetId,
        });
        useUIStore.getState().clearTargeting();
      }
    } else {
      // Normal selection
      if (target.kind === 'ship') {
        selectShip(target.ship.id);
      } else if (target.kind === 'station') {
        selectShip(target.station.id);
      }
    }
    closeSelectionPicker();
  };

  return (
    <div 
      className="selection-picker-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 1000,
      }}
      onClick={closeSelectionPicker}
    >
      <div 
        className="panel panel--glow animate-fadeIn"
        style={{
          position: 'absolute',
          top: selectionPicker.position?.y,
          left: selectionPicker.position?.x,
          transform: 'translate(-50%, -100%) translateY(-20px)',
          minWidth: '260px',
          padding: 'var(--space-xs)',
          background: 'rgba(9, 15, 28, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-holo-cyan-alpha)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto',
          borderRadius: 'var(--radius-md)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="label" style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '6px', fontSize: '0.65rem', letterSpacing: '0.1em' }}>
          MULTIPLE CONTACTS DETECTED - SELECT TARGET
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {selectionPicker.targets.map((target, idx) => {
            const info = getTargetDisplayInfo(target);
            return (
              <button
                key={idx}
                className="picker-item-btn"
                onClick={() => handlePick(target)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '6px',
                  color: 'white',
                }}
              >
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '50%',
                  border: `1px solid ${info.color}44`,
                  flexShrink: 0
                }}>
                  {info.image ? (
                    <img src={info.image} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '10px', height: '10px', background: info.color || 'white', transform: 'rotate(45deg)' }} />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: info.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.name}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>{info.type}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -100%) translateY(-10px); }
          to { opacity: 1; transform: translate(-50%, -100%) translateY(-20px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s cubic-bezier(0, 0, 0.2, 1) forwards;
        }
        .picker-item-btn:hover {
          background: rgba(77, 163, 255, 0.12) !important;
          border-color: rgba(77, 163, 255, 0.3) !important;
          transform: translateX(4px);
        }
        .picker-item-btn:active {
          transform: scale(0.98) translateX(2px);
          background: rgba(77, 163, 255, 0.18) !important;
        }
      `}</style>
    </div>
  );
}

function getTargetDisplayInfo(target: SelectionTarget) {
  switch (target.kind) {
    case 'ship': {
      const isEnemy = target.isEnemy;
      const chassis = !isEnemy && 'chassisId' in target.ship ? getChassisById(target.ship.chassisId) : null;
      const adversary = isEnemy && 'adversaryId' in target.ship ? getAdversaryById(target.ship.adversaryId) : null;
      return {
        name: target.ship.name || (isEnemy ? adversary?.name : chassis?.name) || 'Unknown Ship',
        type: isEnemy ? 'Enemy Capital Ship' : 'Allied Capital Ship',
        image: ASSET_MAP[(!isEnemy && 'chassisId' in target.ship ? target.ship.chassisId : (adversary?.id || ''))],
        color: isEnemy ? '#FF6B6B' : '#4DA3FF',
      };
    }
    case 'fighter': {
      const fc = getFighterClassById(target.fighter.classId);
      return {
        name: target.fighter.name,
        type: `${target.fighter.allegiance === 'enemy' ? 'Enemy' : 'Allied'} ${fc?.name || 'Small Craft'}`,
        image: ASSET_MAP[fc?.imageKey || ''],
        color: target.fighter.allegiance === 'enemy' ? '#FF6B6B' : '#7CFFB2',
      };
    }
    case 'station': {
      const sd = getStationById(target.station.stationId);
      return {
        name: target.station.name,
        type: sd?.type === 'turret' ? 'Defense Turret' : 'Enemy Installation',
        image: ASSET_MAP[sd?.imageKey || ''],
        color: '#FF6B6B',
      };
    }
    case 'objective': {
      return {
        name: target.marker.name,
        type: 'Objective Marker',
        image: null,
        color: '#F6AD55',
      };
    }
    case 'torpedo': {
      return {
        name: target.torpedo.name,
        type: 'Ordnance',
        image: null,
        color: '#F6AD55',
      };
    }
    case 'hazard': {
      return {
        name: target.hazard.name,
        type: 'Tactic Hazard',
        image: null,
        color: '#FF6B6B',
      };
    }
    default:
      return { name: 'Unknown', type: 'Unknown', image: null, color: 'white' };
  }
}
