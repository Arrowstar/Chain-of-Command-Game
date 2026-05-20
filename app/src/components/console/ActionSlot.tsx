import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { ActionDefinition } from '../../types/game';
import { useTokenSelectionStore } from '../../store/useTokenSelectionStore';
import { useViewport } from '../../utils/useViewport';
import { SmartTooltip } from '../TouchTooltipPortal';

interface ActionSlotProps {
  action: ActionDefinition;
  dragAction?: ActionDefinition;
  costNote?: string;
  /** All QueuedAction IDs currently assigned to this slot (one per CT spent). */
  assignedTokenIds: string[];
  onUnassign: (tokenId?: string) => void; // removes a specific or most-recent assignment
  /** Called when a previously-tapped token should be assigned here (touch model). */
  onTapAssign?: () => void;
  disabled?: boolean;
}

export default function ActionSlot({
  action,
  dragAction,
  costNote,
  assignedTokenIds,
  onUnassign,
  onTapAssign,
  disabled = false,
}: ActionSlotProps) {
  const count = assignedTokenIds.length;
  const isOccupied = count > 0;

  const { isOver, setNodeRef } = useDroppable({
    id: `action-slot-${action.id}`,
    data: { action: dragAction ?? action },
    // Slot stays open for additional CTs as long as the station isn't locked
    disabled: disabled,
  });

  const selectedTokenId = useTokenSelectionStore(s => s.selectedTokenId);
  const clearSelection = useTokenSelectionStore(s => s.clearSelection);
  const { isCoarsePointer } = useViewport();

  const isActive = isOver && !disabled;
  // On touch, the slot is always tap-ready unless disabled. On desktop, requires a selected token.
  const isTapReady = isCoarsePointer ? !disabled : (!!selectedTokenId && !disabled);

  // Cumulative stress paid: base + 0 + 1 + 2 + ... + (count-1) = base*count + count*(count-1)/2
  // We just display count and let the store tooltip (title) show the math.
  const cumulativeStress =
    count > 0
      ? Array.from({ length: count }, (_, i) => action.stressCost + i).reduce((a, b) => a + b, 0)
      : 0;

  const handleDropZoneClick = () => {
    if (!isCoarsePointer && disabled) return;
    if (isCoarsePointer && onTapAssign) {
      onTapAssign();
      if (selectedTokenId) clearSelection();
    } else if (selectedTokenId && onTapAssign) {
      onTapAssign();
      clearSelection();
    }
  };

  return (
    <div
      className={`panel ${isActive ? 'panel--glow' : ''}`}
      ref={setNodeRef}
      onClick={(e) => {
        if (isTapReady) handleDropZoneClick();
      }}
      style={{
        opacity: disabled ? 0.5 : 1,
        padding: 'var(--space-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-xs)',
        position: 'relative',
        transition: 'all 0.2s ease',
        cursor: disabled ? 'not-allowed' : 'default',
        minHeight: '80px',
        borderColor: isActive
          ? 'var(--color-holo-cyan)'
          : isTapReady
          ? 'hsla(185, 90%, 55%, 0.5)'
          : isOccupied
          ? 'var(--color-alert-amber)'
          : 'var(--color-border)',
        // Subtle pulse border to invite tap when a token is selected
        boxShadow: isTapReady && !isActive
          ? '0 0 8px hsla(185, 90%, 55%, 0.25)'
          : undefined,
      }}
      data-testid={`action-slot-${action.id}`}
    >
      <div className="flex-between" style={{ alignItems: 'flex-start' }}>
        <span className="label" style={{ color: 'var(--color-text-bright)' }}>{action.name}</span>
        <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textAlign: 'right', lineHeight: 1.2 }}>
          <div>{action.ctCost} CT</div>
          <div>{action.stressCost} STRESS</div>
          {costNote ? (
            <SmartTooltip content={costNote} as="div">
              <div
                style={{ color: 'var(--color-holo-cyan)', fontSize: '0.62rem', marginTop: '2px', cursor: 'help', position: 'relative' }}
              >
                {costNote}
              </div>
            </SmartTooltip>
          ) : null}
        </div>
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', flexGrow: 1 }}>
        {action.effect}
      </div>

      {/* Drop zone / tap-assign zone */}
      <div
        className="action-slot-dropzone"
        onClick={!isTapReady ? handleDropZoneClick : undefined}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '40px',
          background: 'var(--color-bg-deep)',
          borderRadius: 'var(--radius-sm)',
          border: `1px dashed ${
            isTapReady
              ? 'var(--color-holo-cyan)'
              : isOccupied
              ? 'var(--color-alert-amber)'
              : 'var(--color-border)'
          }`,
          marginTop: 'auto',
          gap: 'var(--space-xs)',
          cursor: isTapReady ? 'pointer' : 'default',
        }}
      >
        {isOccupied ? (
          <>
            {assignedTokenIds.map((tokenId, assignmentIdx) => (
              <div key={tokenId} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Stacked token visuals for this assignment */}
                <div style={{ position: 'relative', width: `${32 + (action.ctCost - 1) * 6}px`, height: '32px' }}>
                  {Array.from({ length: action.ctCost }).map((_, ctIdx) => (
                    <SmartTooltip key={ctIdx} content={`Assignment ${assignmentIdx + 1}: ${action.stressCost + assignmentIdx} stress`} as="div">
                      <div
                        style={{
                          position: 'absolute',
                          left: `${ctIdx * 6}px`,
                          top: 0,
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--color-bg-deep)',
                          border: '2px solid var(--color-alert-amber)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 4px var(--color-alert-amber)',
                          zIndex: ctIdx,
                        }}
                      >
                        <div style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: 'var(--color-alert-amber)',
                        }} />
                      </div>
                    </SmartTooltip>
                  ))}
                </div>

                {/* Unassign button for this specific assignment */}
                <SmartTooltip content="Remove this assignment" as="button">
                  <button
                    className="action-slot-unassign-btn"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      onUnassign(tokenId);
                    }}
                    style={{
                      position: 'absolute',
                      top: isCoarsePointer ? '-12px' : '-6px',
                      right: isCoarsePointer ? '-16px' : '-10px',
                      width: isCoarsePointer ? '32px' : '16px',
                      height: isCoarsePointer ? '32px' : '16px',
                      borderRadius: '50%',
                      background: 'var(--color-hostile-red)',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: isCoarsePointer ? '20px' : '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                    }}
                    data-testid={`unassign-btn-${action.id}-${assignmentIdx}`}
                  >
                    ×
                  </button>
                </SmartTooltip>
              </div>
            ))}

            {/* Total stress badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, marginLeft: '4px' }}>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                {cumulativeStress}S total
              </span>
            </div>
          </>
        ) : (
          <span className="label" style={{ opacity: isTapReady ? 0.7 : 0.3 }}>
            {isCoarsePointer ? 'TAP TO ASSIGN' : isTapReady ? 'TAP TO ASSIGN' : 'Drop CT Here'}
          </span>
        )}
      </div>
    </div>
  );
}
