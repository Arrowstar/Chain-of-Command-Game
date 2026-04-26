import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ExperimentalTech } from '../../types/campaignTypes';

interface Props {
  tech: ExperimentalTech;
}

const CATEGORY_COLORS: Record<string, string> = {
  tactical: 'var(--color-hostile-red)',
  engineering: 'var(--color-holo-cyan)',
  command: 'var(--color-alert-amber)',
  crew: 'var(--color-holo-green)',
};

const BADGE_SIZE = 60;
const VIEWPORT_PADDING = 12;

export default function TechBadge({ tech }: Props) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const color = CATEGORY_COLORS[tech.category] ?? 'var(--color-holo-cyan)';
  const imageUrl = tech.imagePath;

  useLayoutEffect(() => {
    if (!hovered || !badgeRef.current) return;

    const badgeRect = badgeRef.current.getBoundingClientRect();
    let top = badgeRect.bottom + 8;
    let left = badgeRect.left + badgeRect.width / 2;

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

      top = Math.min(top, vh - VIEWPORT_PADDING - tooltipHeight);
    }

    setTooltipPos({ top, left });
  }, [hovered]);

  const tooltipContent = hovered ? (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        top: tooltipPos.top,
        left: tooltipPos.left,
        transform: 'translateX(-50%)',
        padding: '10px 14px',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-border-active)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
        zIndex: 10000,
        maxWidth: '320px',
        width: 'max-content',
        pointerEvents: 'none',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
      }}
    >
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color, marginBottom: '6px' }}>
        {tech.name}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
        {tech.effect}
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '8px' }}>
        {tech.flavorText}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        [{tech.category}] · {tech.rarity}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={badgeRef}
        className="tech-badge"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          flexShrink: 0,
          border: `1px solid ${color}`,
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(120, 130, 150, 0.25)',
          cursor: 'help',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: 'background 120ms ease, box-shadow 120ms ease',
          boxShadow: hovered ? `0 0 8px ${color}40` : 'none',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={tech.name}
            draggable={false}
            style={{
              width: '80%',
              height: '80%',
              objectFit: 'contain',
              opacity: tech.isConsumable && tech.isConsumed ? 0.35 : 1,
              filter: tech.isConsumable && tech.isConsumed ? 'grayscale(100%)' : 'none',
            }}
          />
        ) : (
          <span
            style={{
              fontSize: '0.5rem',
              fontFamily: 'var(--font-mono)',
              color: color,
              textAlign: 'center',
              lineHeight: 1.1,
            }}
          >
            {tech.name}
          </span>
        )}
      </div>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
}
