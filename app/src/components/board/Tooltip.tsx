import React, { useState, useRef, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  delay?: number;
  tag?: React.ElementType;
}

const VIEWPORT_PADDING = 12;

export default function Tooltip({ content, children, maxWidth = '240px', delay = 0, tag = 'div' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (delay > 0) {
      timerRef.current = window.setTimeout(() => setVisible(true), delay);
    } else {
      setVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left + triggerRect.width / 2;

      if (tooltipRef.current) {
        const tooltipEl = tooltipRef.current;
        const tooltipWidth = tooltipEl.offsetWidth;
        const tooltipHeight = tooltipEl.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const halfWidth = tooltipWidth / 2;
        left = Math.max(
          VIEWPORT_PADDING + halfWidth,
          Math.min(left, vw - VIEWPORT_PADDING - halfWidth)
        );

        if (top + tooltipHeight > vh - VIEWPORT_PADDING) {
          top = triggerRect.top - tooltipHeight - 8;
        }
      }

      setTooltipPos({ top, left });
    };

    updatePosition();
    // Second pass to catch dimensions after portal render
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [visible, content]); // Re-measure if content changes too

  const Tag = tag as any;
  const isSvg = tag === 'g' || tag === 'svg';

  return (
    <>
      <Tag
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={isSvg ? { cursor: 'help' } : { display: 'inline-block', verticalAlign: 'middle', cursor: 'help' }}
      >
        {children}
      </Tag>
      {visible && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
            padding: '8px 12px',
            background: 'rgba(5, 15, 25, 0.95)',
            backdropFilter: 'blur(4px)',
            border: '1px solid var(--color-holo-cyan)',
            borderRadius: '4px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 204, 255, 0.1)',
            color: 'var(--color-text-primary)',
            fontSize: '0.75rem',
            zIndex: 10000,
            maxWidth,
            pointerEvents: 'none',
            lineHeight: 1.4,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
