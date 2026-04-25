import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface CommandTokenProps {
  id: string;
  isAssigned?: boolean; // true when this slot has been spent
}

export default function CommandToken({ id, isAssigned = false }: CommandTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: isAssigned,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isAssigned ? 0.2 : isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
    cursor: isAssigned ? 'default' : isDragging ? 'grabbing' : 'grab',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: isAssigned ? 'var(--color-bg-deep)' : 'var(--color-bg-surface)',
    border: `2px solid ${isAssigned ? 'var(--color-border)' : 'var(--color-holo-cyan)'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isAssigned ? 'none' : isDragging ? 'none' : 'var(--glow-cyan)',
    transition: 'opacity 0.2s, box-shadow 0.2s',
    flexShrink: 0,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`command-token-${id}`}
      title={isAssigned ? 'Token spent' : 'Drag to assign action'}
    >
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: isAssigned ? 'var(--color-text-dim)' : 'var(--color-holo-cyan)',
        opacity: isAssigned ? 0.4 : 0.8,
      }} />
    </div>
  );
}
