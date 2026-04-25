import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore } from '../../store/useUIStore';
import type { LogEntry } from '../../types/game';

// ═══════════════════════════════════════════════════════════════════
// GameLog — Slide-out panel from the left edge
// ═══════════════════════════════════════════════════════════════════

const TYPE_CONFIG: Record<
  LogEntry['type'],
  { icon: string; color: string; label: string }
> = {
  movement:  { icon: '▶', color: 'var(--color-holo-cyan)',    label: 'Movement'  },
  combat:    { icon: '⚔', color: 'var(--color-hostile-red)',  label: 'Combat'    },
  damage:    { icon: '💥', color: 'var(--color-hostile-red)',  label: 'Damage'    },
  critical:  { icon: '☠', color: 'hsl(45,100%,60%)',          label: 'Critical'  },
  fumble:    { icon: '⚡', color: 'var(--color-alert-amber)',   label: 'Fumble'    },
  roe:       { icon: '📋', color: 'var(--color-holo-green)',   label: 'Directive' },
  tactic:    { icon: '🎯', color: 'var(--color-alert-amber)',   label: 'Tactic'    },
  repair:    { icon: '🔧', color: 'var(--color-holo-green)',   label: 'Repair'    },
  system:    { icon: '◈',  color: 'var(--color-text-dim)',     label: 'System'    },
  stress:    { icon: '◎',  color: 'var(--color-stress-orange)', label: 'Stress'   },
  phase:     { icon: '⊡',  color: 'var(--color-shield-blue)',  label: 'Phase'     },
};

// Group entries by round
function groupByRound(entries: LogEntry[]): Map<number, LogEntry[]> {
  const map = new Map<number, LogEntry[]>();
  for (const entry of entries) {
    const bucket = map.get(entry.round) ?? [];
    bucket.push(entry);
    map.set(entry.round, bucket);
  }
  return map;
}

// ─── Detail expansion ──────────────────────────────────────────────

interface DiceDetailProps {
  details: Record<string, unknown>;
}

function DiceDetail({ details }: DiceDetailProps) {
  const damageResult = details.damageResult as any;
  const tn = damageResult?.tnBreakdown;
  const volley = damageResult?.volleyResult;

  if (!tn && !volley) {
    // Generic detail display
    return (
      <div className="game-log-details">
        {Object.entries(details).map(([k, v]) => {
          let displayValue = String(v);
          if (v && typeof v === 'object') {
            if ('q' in v && 'r' in v) displayValue = `(${v.q}, ${v.r})`;
            else displayValue = JSON.stringify(v);
          }
          return (
            <div key={k} className="game-log-details-row">
              <span>{k}</span>
              <span>{displayValue}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="game-log-details">
      {tn && (
        <>
          <div className="game-log-details-row">
            <span>Target Number</span>
            <span>{tn.total}</span>
          </div>
          <div className="game-log-details-row">
            <span>Base Evasion</span>
            <span>{tn.baseEvasion}</span>
          </div>
          {tn.rangeModifier !== 0 && (
            <div className="game-log-details-row">
              <span>Range Modifier</span>
              <span>{tn.rangeModifier > 0 ? '+' : ''}{tn.rangeModifier}</span>
            </div>
          )}
          {tn.terrainModifier !== 0 && (
            <div className="game-log-details-row">
              <span>Terrain Modifier</span>
              <span>+{tn.terrainModifier}</span>
            </div>
          )}
          {tn.targetLockModifier !== 0 && (
            <div className="game-log-details-row">
              <span>Target Lock</span>
              <span>{tn.targetLockModifier}</span>
            </div>
          )}
        </>
      )}
      {volley && (
        <>
          <div className="game-log-details-row" style={{ marginTop: 4 }}>
            <span>Hits / Crits</span>
            <span>{volley.totalHits} / {volley.totalCrits}</span>
          </div>
          {volley.dice?.length > 0 && (
            <div className="game-log-dice-pool">
              {volley.dice.map((die: any, i: number) => {
                const rolled = die.rolls[die.rolls.length - 1];
                const isCrit = die.isCritical;
                const isHit = die.isHit;
                const cls = isCrit ? 'crit' : isHit ? 'hit' : 'miss';
                return (
                  <span key={i} className={`game-log-die ${cls}`} title={`${die.source ? `${die.source.toUpperCase()} ` : ''}${die.dieType}: ${die.rolls.join('→')}`}>
                    {die.source && <span style={{ fontSize: '0.5rem', opacity: 0.7, marginRight: 2 }}>{die.source.toUpperCase()}</span>}
                    {die.dieType} [{die.rolls.join('+')}]{isCrit ? '★' : ''}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}
      {damageResult && (
        <>
          {damageResult.shieldHits > 0 && (
            <div className="game-log-details-row" style={{ marginTop: 4 }}>
              <span>Shield Hit ({damageResult.struckSector})</span>
              <span>-{damageResult.shieldHits}</span>
            </div>
          )}
          {damageResult.hullDamage > 0 && (
            <>
              <div className="game-log-details-row">
                <span>Overflow Hits</span>
                <span>{damageResult.overflowHits}</span>
              </div>
              {damageResult.armorRoll > 0 && (
                <div className="game-log-details-row">
                  <span>Armor Roll</span>
                  <span>-{damageResult.armorRoll}</span>
                </div>
              )}
              <div className="game-log-details-row" style={{ color: 'var(--color-hostile-red)' }}>
                <span>Hull Damage</span>
                <span>{damageResult.hullDamage}</span>
              </div>
            </>
          )}
          {damageResult.criticalTriggered && (
            <div className="game-log-details-row" style={{ color: 'var(--color-crit-gold)' }}>
              <span>★ CRITICAL DAMAGE TRIGGERED</span>
              <span></span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Single Entry ──────────────────────────────────────────────────

interface LogEntryRowProps {
  entry: LogEntry;
}

function LogEntryRow({ entry }: LogEntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.system;
  const hasDetails = !!entry.details && Object.keys(entry.details).length > 0;
  const time = new Date(entry.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

  return (
    <div
      className={`game-log-entry ${hasDetails ? 'clickable' : ''}`}
      onClick={() => hasDetails && setExpanded(e => !e)}
      title={hasDetails ? 'Click to expand dice details' : undefined}
    >
      <span className="game-log-entry-icon" style={{ color: cfg.color }}>
        {cfg.icon}
      </span>
      <div className="game-log-entry-body">
        <span
          className="game-log-entry-message"
          style={{ color: cfg.color === 'var(--color-text-dim)' ? 'var(--color-text-secondary)' : cfg.color }}
        >
          {entry.message}
        </span>
        <span className="game-log-entry-meta">
          {cfg.label} · {entry.phase.toUpperCase()} · {timeStr}
          {hasDetails && <span style={{ color: 'var(--color-holo-cyan)', marginLeft: 4 }}>
            {expanded ? '▲ hide' : '▼ details'}
          </span>}
        </span>
        {expanded && hasDetails && <DiceDetail details={entry.details!} />}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────

export default function GameLog() {
  const log          = useGameStore(s => s.log);
  const round        = useGameStore(s => s.round);
  const open         = useUIStore(s => s.gameLogOpen);
  const unread       = useUIStore(s => s.unreadLogCount);
  const toggleGameLog    = useUIStore(s => s.toggleGameLog);
  const resetUnreadCount = useUIStore(s => s.resetUnreadCount);
  const incrementUnread  = useUIStore(s => s.incrementUnread);

  const contentRef   = useRef<HTMLDivElement>(null);
  const prevLen      = useRef(log.length);

  // Badge new entries when panel closed; auto-scroll when open
  useEffect(() => {
    if (log.length > prevLen.current) {
      if (!open) {
        incrementUnread();
      } else if (contentRef.current) {
        // Scroll to bottom (newest entries are appended at the bottom)
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }
    prevLen.current = log.length;
  }, [log.length, open, incrementUnread]);

  // Reset badge when panel opens
  useEffect(() => {
    if (open) resetUnreadCount();
  }, [open, resetUnreadCount]);

  const grouped = groupByRound(log);
  const rounds  = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <>
      {/* ── Always-visible left tab ── */}
      <div
        className={`game-log-tab ${unread > 0 ? 'has-unread' : ''}`}
        onClick={toggleGameLog}
        title="Toggle Game Log"
        role="button"
        aria-label={`Game log — ${unread > 0 ? `${unread} new entries` : 'click to open'}`}
      >
        {unread > 0 && (
          <span className="game-log-badge">{unread > 99 ? '99+' : unread}</span>
        )}
        <span className="game-log-tab-icon">{open ? '◂' : '▸'}</span>
        <span className="game-log-tab-label">Comms Log</span>
        <span className="game-log-tab-icon" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
          {log.length}
        </span>
      </div>

      {/* ── Slide-out panel ── */}
      <div className={`game-log-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="game-log-scanline" />

        {/* Header */}
        <div className="game-log-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="game-log-header-title">⊡ Comms Log</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>
              Round {round} · {log.length} {log.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <button className="game-log-close" onClick={toggleGameLog}>✕ CLOSE</button>
        </div>

        {/* Log content */}
        <div className="game-log-panel-content" ref={contentRef}>
          {log.length === 0 ? (
            <div className="game-log-empty">
              <span style={{ fontSize: '2rem', opacity: 0.3 }}>⊡</span>
              <span>No events recorded yet.</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)' }}>
                Events will appear here as the battle unfolds.
              </span>
            </div>
          ) : (
            rounds.map(r => (
              <div key={r}>
                {/* Round header */}
                <div className="game-log-round-header">
                  <span className="game-log-round-label">Round {r}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--color-text-dim)' }}>
                    {grouped.get(r)!.length} events
                  </span>
                </div>

                {/* Entries chronologically */}
                {grouped.get(r)!.map(entry => (
                  <LogEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
