import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useTokenSelectionStore } from '../../store/useTokenSelectionStore';
import { useViewport } from '../../utils/useViewport';
import { SmartTooltip } from '../TouchTooltipPortal';

interface CommandTokenProps {
  id: string;
  isAssigned?: boolean; // true when this slot has been spent
}

export default function CommandToken({ id, isAssigned = false }: CommandTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: isAssigned,
  });

  const selectedTokenId = useTokenSelectionStore(s => s.selectedTokenId);
  const selectToken = useTokenSelectionStore(s => s.selectToken);
  const clearSelection = useTokenSelectionStore(s => s.clearSelection);
  const { isCoarsePointer } = useViewport();

  const isSelected = selectedTokenId === id;

  const handleClick = (e: React.MouseEvent) => {
    // Only activate tap-to-assign on coarse pointer (touch).
    // Mouse users use drag-and-drop; clicks here are just cosmetic.
    if (isAssigned) return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    e.stopPropagation();
    if (isSelected) {
      clearSelection();
    } else {
      selectToken(id);
    }
  };

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isAssigned ? 0.2 : isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
    cursor: isAssigned ? 'default' : isDragging ? 'grabbing' : 'grab',
    width: isCoarsePointer ? '40px' : '32px',
    height: isCoarsePointer ? '40px' : '32px',
    borderRadius: '50%',
    background: isAssigned ? 'var(--color-bg-deep)' : 'var(--color-bg-surface)',
    border: `2px solid ${
      isAssigned
        ? 'var(--color-border)'
        : isSelected
        ? 'var(--color-crit-gold)'
        : 'var(--color-holo-cyan)'
    }`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isAssigned
      ? 'none'
      : isSelected
      ? 'var(--glow-gold)'
      : isDragging
      ? 'none'
      : 'var(--glow-cyan)',
    transition: 'opacity 0.2s, box-shadow 0.2s, border-color 0.15s',
    flexShrink: 0,
    position: 'relative',
    // Enlarge touch target on coarse-pointer devices without changing visual size
    touchAction: 'none',
  };

  return (
    <SmartTooltip
      content={
        isAssigned
          ? 'Token spent'
          : isSelected
          ? 'Tap an action slot to assign'
          : 'Drag to assign action (or tap on touch screens)'
      }
      as="div"
    >
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={handleClick}
        data-testid={`command-token-${id}`}
      >
        <div style={{
          width: isCoarsePointer ? '20px' : '16px',
          height: isCoarsePointer ? '20px' : '16px',
          borderRadius: '50%',
          background: isAssigned
            ? 'var(--color-text-dim)'
            : isSelected
            ? 'var(--color-crit-gold)'
            : 'var(--color-holo-cyan)',
          opacity: isAssigned ? 0.4 : 0.8,
        }} />
      </div>
    </SmartTooltip>
  );
}
