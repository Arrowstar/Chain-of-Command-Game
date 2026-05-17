import React, { useLayoutEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

/**
 * Renders a touch-friendly tooltip into document.body via a React portal,
 * so it is never clipped by overflow:hidden ancestors.
 *
 * Usage:
 *   <div style={{ position: 'relative' }}>
 *     <TouchTooltipPortal show={isSelected} anchorRef={divRef}>
 *       Tooltip text here
 *     </TouchTooltipPortal>
 *   </div>
 *
 * anchorRef should be attached to the element you want the tooltip to appear above.
 */
interface TouchTooltipPortalProps {
  show: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  width?: number | string;
}

export default function TouchTooltipPortal({
  show,
  anchorRef,
  children,
  width = 'max-content',
}: TouchTooltipPortalProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; caretOffset: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!show || !anchorRef.current || !tooltipRef.current) {
      if (!show) setCoords(null);
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const tipRect = tooltipRef.current.getBoundingClientRect();
    
    const anchorCenter = rect.left + rect.width / 2;
    let left = anchorCenter;
    const padding = 8;
    
    // Clamp to screen edges
    if (left - tipRect.width / 2 < padding) {
      left = tipRect.width / 2 + padding;
    } else if (left + tipRect.width / 2 > window.innerWidth - padding) {
      left = window.innerWidth - tipRect.width / 2 - padding;
    }

    const caretOffset = anchorCenter - left;

    // Position fully above the anchor
    setCoords({
      top: rect.top - tipRect.height - 12,
      left,
      caretOffset,
    });
  }, [show, anchorRef]);

  if (!show) return null;

  return ReactDOM.createPortal(
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: coords ? coords.top : -9999,
        left: coords ? coords.left : -9999,
        opacity: coords ? 1 : 0,
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--color-bg-deep)',
        border: '1px solid var(--color-holo-cyan)',
        color: 'var(--color-text-primary)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.72rem',
        width,
        maxWidth: '280px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.85), 0 0 10px rgba(0,204,255,0.2)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: 1.4,
        whiteSpace: 'normal',
        fontFamily: 'var(--font-ui)',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      {children}
      {/* Downward caret */}
      <span style={{
        position: 'absolute',
        top: '100%',
        left: `calc(50% + ${coords ? coords.caretOffset : 0}px)`,
        transform: 'translateX(-50%)',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid var(--color-holo-cyan)',
        display: 'block',
        width: 0,
        height: 0,
      }} />
    </div>,
    document.body,
  );
}
