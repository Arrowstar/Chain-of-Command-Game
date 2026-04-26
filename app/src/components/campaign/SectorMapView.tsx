import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { describeScarImpact } from '../board/ShipInfoPanel';
import { NodeType } from '../../engine/mapGenerator';
import type { SectorNode } from '../../engine/mapGenerator';
import { useCampaignStore } from '../../store/useCampaignStore';
import type { CampaignState } from '../../types/campaignTypes';
import type { OfficerData, OfficerState, PlayerState, ShipArc, ShipState } from '../../types/game';
import { getMaxStress } from '../../engine/stress';
import { getOfficerById } from '../../data/officers';
import { getWeaponById } from '../../data/weapons';
import { getSubsystemById } from '../../data/subsystems';
import { getChassisById } from '../../data/shipChassis';
import { ASSET_MAP } from '../../engine/pixiGraphics';

// ── SVG Icon Paths (inline, no external deps) ────────────────────────────────

const NODE_ICONS: Record<string, React.ReactNode> = {
  // Combat — crosshair target
  [NodeType.Combat]: (
    <g>
      <circle r="7" fill="none" strokeWidth="1.5" />
      <circle r="3" fill="none" strokeWidth="1.5" />
      <line x1="0" y1="-10" x2="0" y2="-8" strokeWidth="1.5" />
      <line x1="0" y1="8"  x2="0" y2="10" strokeWidth="1.5" />
      <line x1="-10" y1="0" x2="-8" y2="0" strokeWidth="1.5" />
      <line x1="8"  y1="0" x2="10" y2="0" strokeWidth="1.5" />
    </g>
  ),
  // Elite — aggressive double-ring with warning ticks
  [NodeType.Elite]: (
    <g>
      <circle r="9" fill="none" strokeWidth="2" />
      <circle r="5" fill="none" strokeWidth="1.5" />
      <line x1="0" y1="-13" x2="0" y2="-10" strokeWidth="2" />
      <line x1="0" y1="10"  x2="0" y2="13" strokeWidth="2" />
      <line x1="-13" y1="0" x2="-10" y2="0" strokeWidth="2" />
      <line x1="10"  y1="0" x2="13" y2="0" strokeWidth="2" />
      <line x1="-8" y1="-8" x2="-6" y2="-6" strokeWidth="1.5" />
      <line x1="6"  y1="-6" x2="8" y2="-8"  strokeWidth="1.5" />
    </g>
  ),
  // Event — radar arc pulse
  [NodeType.Event]: (
    <g>
      <path d="M-8,-4 A10,10 0 0,1 8,-4" fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-5,-1 A7,7 0 0,1 5,-1"  fill="none" strokeWidth="1.5" strokeLinecap="round" />
      <circle r="2" fill="currentColor" />
      <line x1="0" y1="2" x2="0" y2="8" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
  // Haven — wrench + shield outline
  [NodeType.Haven]: (
    <g>
      <path d="M0,-9 L5,-4 L2,-1 L9,6 L6,9 L-1,2 L-4,5 L-9,0 Z" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      <circle r="2" fill="currentColor" />
    </g>
  ),
  // Boss — skull silhouette
  [NodeType.Boss]: (
    <g>
      <path d="M0,-11 C-8,-11 -10,-5 -10,0 C-10,5 -7,8 -7,8 L-4,8 L-4,11 L4,11 L4,8 L7,8 C7,8 10,5 10,0 C10,-5 8,-11 0,-11 Z"
            fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="-4" cy="-1" r="2.5" fill="currentColor" />
      <circle cx="4"  cy="-1" r="2.5" fill="currentColor" />
      <line x1="-2.5" y1="6" x2="-2.5" y2="8" strokeWidth="2" />
      <line x1="0"    y1="6" x2="0"    y2="8" strokeWidth="2" />
      <line x1="2.5"  y1="6" x2="2.5"  y2="8" strokeWidth="2" />
    </g>
  ),
  // Start — upward-pointing delta / launch indicator
  [NodeType.Start]: (
    <g>
      <polygon points="0,-10 8,7 -8,7" fill="none" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="0" y1="-5" x2="0" y2="3" strokeWidth="1.5" />
    </g>
  ),
};

// ── Color palette by node type ────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  [NodeType.Start]:  'hsl(185, 90%, 55%)',    // cyan
  [NodeType.Combat]: 'hsl(185, 40%, 72%)',    // pale cyan-blue
  [NodeType.Elite]:  'hsl(0, 85%, 60%)',      // hostile red
  [NodeType.Event]:  'hsl(35, 100%, 58%)',    // alert amber
  [NodeType.Haven]:  'hsl(140, 80%, 50%)',    // holo green
  [NodeType.Boss]:   'hsl(45, 100%, 60%)',    // gold
};

const NODE_LABELS: Record<string, string> = {
  [NodeType.Start]:  'Fleet Departure',
  [NodeType.Combat]: 'Hostile Patrol',
  [NodeType.Elite]:  'Elite Squadron',
  [NodeType.Event]:  'Anomalous Signal',
  [NodeType.Haven]:  'Hidden Drydock',
  [NodeType.Boss]:   'Hegemony Command',
};

// ── Tooltip state ─────────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: SectorNode | null;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const LAYER_HEIGHT = 130;
const NODE_RADIUS  = 24;
const ARC_ORDER: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
const ARC_LABELS: Record<ShipArc, string> = {
  fore: 'Fore',
  foreStarboard: 'Fore-Starboard',
  aftStarboard: 'Aft-Starboard',
  aft: 'Aft',
  aftPort: 'Aft-Port',
  forePort: 'Fore-Port',
};
const WEAPON_PREVIEW_COLORS = ['#4FD1C5', '#F6E05E', '#F6AD55', '#FC8181'];

// ── Main Component ────────────────────────────────────────────────────────────

export default function SectorMapView() {
  const mapData    = useCampaignStore(s => s.sectorMap);
  const campaign   = useCampaignStore(s => s.campaign);
  const persistedPlayers = useCampaignStore(s => s.persistedPlayers);
  const persistedShips = useCampaignStore(s => s.persistedShips);
  const officerDataMap = useCampaignStore(s => s.officerDataMap);
  const selectNode = useCampaignStore(s => s.selectNode);

  const [hoveredNodeId, setHoveredNodeId]   = useState<string | null>(null);
  const [tooltip, setTooltip]               = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!mapData || !campaign) return null;

  const currentNode      = mapData.nodes.find(n => n.id === campaign.currentNodeId);
  let selectablePaths  = currentNode?.paths ?? [];
  if (campaign.canSkipNode) {
    const grandchildren = selectablePaths.flatMap(childId => {
      const child = mapData.nodes.find(n => n.id === childId);
      return child?.paths ?? [];
    });
    selectablePaths = Array.from(new Set([...selectablePaths, ...grandchildren]));
  }
  const svgHeight        = (mapData.maxLayer + 2) * LAYER_HEIGHT;
  const containerWidth   = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // Resolve (x,y) for a given node
  const nodePos = (node: SectorNode) => ({
    x: containerWidth * node.position,
    y: svgHeight - (node.layer * LAYER_HEIGHT) - LAYER_HEIGHT,
  });

  useLayoutEffect(() => {
    if (campaign.campaignPhase !== 'sectorMap' || !currentNode) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    const targetTop = Math.min(
      maxScrollTop,
      Math.max(0, nodePos(currentNode).y - scrollContainer.clientHeight / 2),
    );

    if (typeof scrollContainer.scrollTo === 'function') {
      scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' });
      return;
    }

    scrollContainer.scrollTop = targetTop;
  }, [campaign.campaignPhase, campaign.currentNodeId, currentNode, containerWidth, svgHeight]);

  // ── Path highlighting logic ───────────────────────────────────────
  // Highlights paths that are adjacent to the hovered selectable node
  const getPathHighlight = (fromId: string, toId: string): 'active' | 'hover' | 'dim' | 'default' => {
    if (!hoveredNodeId) {
      const isFromCurrent = fromId === campaign.currentNodeId;
      return isFromCurrent ? 'active' : 'default';
    }
    // Something is hovered
    const isFromCurrent  = fromId === campaign.currentNodeId;
    const isToHovered    = toId   === hoveredNodeId;
    if (isFromCurrent && isToHovered) return 'hover';

    if (campaign.canSkipNode) {
      const directChildren = currentNode?.paths ?? [];
      if (!directChildren.includes(hoveredNodeId)) {
        if (isFromCurrent) {
          const toNode = mapData.nodes.find(n => n.id === toId);
          if (toNode?.paths.includes(hoveredNodeId)) return 'hover';
        }
        if (isToHovered && directChildren.includes(fromId)) return 'hover';
      }
    }

    if (isFromCurrent) return 'dim';
    return 'dim';
  };

  // ── Determine node status ─────────────────────────────────────────
  const getNodeStatus = (node: SectorNode) => {
    const isCurrent    = node.id === campaign.currentNodeId;
    const isSelectable = selectablePaths.includes(node.id);
    const isVisited    = campaign.visitedNodeIds.includes(node.id);
    const isRevealed   = campaign.revealedNodeIds.includes(node.id) || node.isRevealed || isVisited || isSelectable;

    return { isCurrent, isSelectable, isVisited, isRevealed };
  };

  // ── Tooltip handlers ──────────────────────────────────────────────
  const handleNodeEnter = useCallback((e: React.MouseEvent, node: SectorNode) => {
    setHoveredNodeId(node.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left + 16,
      y: e.clientY - rect.top  - 10,
      node,
    });
  }, []);

  const handleNodeMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(t => ({ ...t, x: e.clientX - rect.left + 16, y: e.clientY - rect.top - 10 }));
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHoveredNodeId(null);
    setTooltip(t => ({ ...t, visible: false, node: null }));
  }, []);

  const handleNodeClick = (nodeId: string) => {
    if (selectablePaths.includes(nodeId)) {
      selectNode(nodeId);
    }
  };

  // ── Render a single SVG path line ────────────────────────────────
  const renderPath = (fromNode: SectorNode, toId: string) => {
    const toNode = mapData.nodes.find(n => n.id === toId);
    if (!toNode) return null;

    const from      = nodePos(fromNode);
    const to        = nodePos(toNode);
    const highlight = getPathHighlight(fromNode.id, toId);

    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const d  = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;

    const strokeMap = {
      active:  { color: 'hsl(185, 90%, 55%)', width: 2.5, dash: '8,4',   opacity: 1 },
      hover:   { color: 'hsl(185, 90%, 72%)', width: 3,   dash: '0',     opacity: 1 },
      dim:     { color: 'hsl(220, 25%, 22%)', width: 1.5, dash: '4,6',   opacity: 0.35 },
      default: { color: 'hsl(220, 30%, 28%)', width: 1.5, dash: '4,6',   opacity: 0.55 },
    };
    const s = strokeMap[highlight];

    return (
      <path
        key={`${fromNode.id}-${toId}`}
        d={d}
        fill="none"
        stroke={s.color}
        strokeWidth={s.width}
        strokeDasharray={s.dash}
        opacity={s.opacity}
        strokeLinecap="round"
        className={highlight === 'active' || highlight === 'hover' ? 'path-flow' : undefined}
        data-testid={`path-${fromNode.id}-${toId}`}
      />
    );
  };

  // ── Render a single node ──────────────────────────────────────────
  const renderNode = (node: SectorNode) => {
    const { isCurrent, isSelectable, isVisited, isRevealed } = getNodeStatus(node);
    const { x, y } = nodePos(node);

    const color = NODE_COLORS[node.type] ?? 'white';
    const isHovered = hoveredNodeId === node.id;

    // Compute opacity / visual state
    const isLocked     = !isRevealed && !isCurrent && !isSelectable;
    const isMissed     = isVisited && !isCurrent; // passed-through node
    const dimOpacity   = isLocked ? 0.4 : isMissed ? 0.3 : 1;

    // Stroke / glow based on state
    let strokeColor = color;
    let strokeWidth = 1.5;
    let strokeOpacity = 0.6;
    let filterRef = 'url(#glow-default)';

    if (isCurrent) {
      strokeWidth = 3;
      strokeOpacity = 1;
      filterRef = 'url(#glow-current)';
    } else if (isSelectable) {
      strokeWidth = 2;
      strokeOpacity = 0.9;
      filterRef = 'url(#glow-selectable)';
    } else if (isHovered && !isLocked) {
      strokeWidth = 2;
      strokeOpacity = 0.8;
    }

    // Scale on hover for selectables
    const scale = isHovered && (isSelectable || isCurrent) ? 1.12 : 1;

    return (
      <g
        key={node.id}
        transform={`translate(${x}, ${y}) scale(${scale})`}
        style={{
          cursor: isSelectable ? 'pointer' : 'default',
          opacity: dimOpacity,
          transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
          transformOrigin: 'center',
          transformBox: 'fill-box',
        }}
        onClick={() => handleNodeClick(node.id)}
        onMouseEnter={e => handleNodeEnter(e, node)}
        onMouseMove={handleNodeMove}
        onMouseLeave={handleNodeLeave}
        data-testid={`node-${node.id}`}
      >
        {/* Outer hexagon shell */}
        <polygon
          points={hexPoints(NODE_RADIUS)}
          fill={`${color}11`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeOpacity={strokeOpacity}
          filter={filterRef}
        />
        {/* Inner hex accent for boss / elite */}
        {(node.type === NodeType.Boss || node.type === NodeType.Elite) && (
          <polygon
            points={hexPoints(NODE_RADIUS - 6)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={1}
            strokeOpacity={0.35}
          />
        )}
        {/* Visited fill overlay */}
        {isMissed && (
          <polygon points={hexPoints(NODE_RADIUS)} fill="hsl(220,15%,8%)" opacity={0.6} />
        )}
        {/* Current position ping ring */}
        {isCurrent && (
          <polygon
            points={hexPoints(NODE_RADIUS + 7)}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.4}
            className="ping-ring"
          />
        )}
        {/* Icon */}
        <g
          stroke={color}
          fill={color}
          strokeWidth="inherit"
        >
          {NODE_ICONS[node.type]}
        </g>
        {/* Selectable highlight dots at hex corners */}
        {isSelectable && !isCurrent && (
          hexCorners(NODE_RADIUS + 5).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={2} fill={color} opacity={0.6} />
          ))
        )}
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className="sector-map-root"
    >
      {/* ── Background grid overlay ── */}
      <div className="sector-map-grid" aria-hidden="true" />

      {/* ── Scan-line overlay ── */}
      <div className="scanline-overlay" aria-hidden="true" />

      {/* ── Header ── */}
      <div className="sector-map-header">
        <div className="sector-map-header-main">
          <h2 className="sector-map-title">SECTOR MAP</h2>
          <div className="sector-map-subtitle label">
            {selectablePaths.length > 0
              ? `${selectablePaths.length} JUMP COORDINATE${selectablePaths.length > 1 ? 'S' : ''} AVAILABLE`
              : 'AWAITING NAVIGATION ORDER'}
          </div>

        </div>
      </div>

      {/* ── SVG Map ── */}
      <div
        ref={scrollContainerRef}
        className="sector-map-scroll"
        data-testid="sector-map-scroll"
      >
        <div style={{ width: '100%', height: svgHeight, position: 'relative' }}>
          <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
          >
            <defs>
              {/* Glow filters */}
              <filter id="glow-current" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="6"  floodColor="hsl(185,90%,55%)" floodOpacity="0.9" />
                <feDropShadow dx="0" dy="0" stdDeviation="14" floodColor="hsl(185,90%,55%)" floodOpacity="0.4" />
              </filter>
              <filter id="glow-selectable" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="5"  floodColor="white" floodOpacity="0.5" />
                <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="white" floodOpacity="0.2" />
              </filter>
              <filter id="glow-default" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="hsl(220,30%,50%)" floodOpacity="0.3" />
              </filter>
              <filter id="glow-boss" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="8"  floodColor="hsl(45,100%,60%)" floodOpacity="0.8" />
                <feDropShadow dx="0" dy="0" stdDeviation="20" floodColor="hsl(45,100%,60%)" floodOpacity="0.35" />
              </filter>
              {/* Animated dash marker for active paths */}
              <marker id="arrow-cyan" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="hsl(185,90%,55%)" opacity="0.7" />
              </marker>
            </defs>

            {/* ── Paths layer ── */}
            <g>
              {mapData.nodes.map(node =>
                node.paths.map(pathId => renderPath(node, pathId))
              )}
            </g>

            {/* ── Nodes layer ── */}
            <g>
              {mapData.nodes.map(node => renderNode(node))}
            </g>
          </svg>
        </div>
      </div>

      {/* ── Fleet Status Side Rails ── */}
      <div className="fleet-status-rail-overlay" data-testid="fleet-status-rail">
        <div className="fleet-status-side-rail fleet-status-side-rail--left">
          {persistedPlayers.slice(0, 2).map(player => {
            const ship = persistedShips.find(candidate => candidate.id === player.shipId);
            return (
              <FleetStatusCard
                key={player.id}
                player={player}
                ship={ship}
                officerDataMap={officerDataMap}
              />
            );
          })}
        </div>
        <div className="fleet-status-side-rail fleet-status-side-rail--right">
          {persistedPlayers.slice(2, 4).map(player => {
            const ship = persistedShips.find(candidate => candidate.id === player.shipId);
            return (
              <FleetStatusCard
                key={player.id}
                player={player}
                ship={ship}
                officerDataMap={officerDataMap}
              />
            );
          })}
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip.visible && tooltip.node && (
        <div
          className="sector-map-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <TooltipContent node={tooltip.node} campaign={campaign} />
        </div>
      )}
    </div>
  );
}

function FleetStatusCard({
  player,
  ship,
  officerDataMap,
}: {
  player: PlayerState;
  ship?: ShipState;
  officerDataMap: Record<string, OfficerData>;
}) {
  const getResolvedOfficerData = (officer: OfficerState) => officerDataMap[officer.officerId] ?? getOfficerById(officer.officerId);
  const chassis = ship ? getChassisById(ship.chassisId) : null;
  const hullPct = ship ? Math.max(0, Math.round((ship.currentHull / Math.max(1, ship.maxHull)) * 100)) : 0;
  const unresolvedCriticals = ship?.criticalDamage.filter(crit => !crit.isRepaired).length ?? 0;
  const scarCount = ship?.scars.length ?? 0;
  const traumaCount = player.officers.reduce((sum, officer) => sum + officer.traumas.length, 0);
  const crewDangerCount = player.officers.filter(officer => isOfficerDanger(officer, getResolvedOfficerData(officer))).length;

  const shipStatusColor = !ship || ship.isDestroyed
    ? 'var(--color-hostile-red)'
    : hullPct <= 40
    ? 'var(--color-hostile-red)'
    : hullPct <= 70
    ? 'var(--color-alert-amber)'
    : 'var(--color-holo-green)';

  return (
    <div
      className="fleet-status-card"
      data-testid={`fleet-status-card-${player.id}`}
    >
      <div className="fleet-status-card-topline">
        <div>
          <div className="fleet-status-player-name">{player.name}</div>
          <div className="fleet-status-ship-name">{ship?.name ?? 'Missing Hull'}</div>
        </div>
        <div
          className="fleet-status-ship-state"
          style={{ color: shipStatusColor }}
        >
          {!ship ? 'UNKNOWN' : ship.isDestroyed ? 'DESTROYED' : `${hullPct}% HULL`}
        </div>
      </div>

      <div className="fleet-status-hullbar" aria-hidden="true">
        <div
          className="fleet-status-hullbar-fill"
          style={{
            width: `${ship && !ship.isDestroyed ? hullPct : 100}%`,
            background: shipStatusColor,
            opacity: ship && !ship.isDestroyed ? 1 : 0.45,
          }}
        />
      </div>

      <div className="fleet-status-badges">
        {ship?.isDestroyed && <StatusBadge color="var(--color-hostile-red)" label="Hull Lost" tooltip="This ship has been destroyed and is no longer combat-capable." />}
        {scarCount > 0 && <StatusBadge color="var(--color-alert-amber)" label={`${scarCount} Scar${scarCount === 1 ? '' : 's'}`} tooltip={describeScarTooltip(ship?.scars ?? [])} />}
        {unresolvedCriticals > 0 && <StatusBadge color="var(--color-hostile-red)" label={`${unresolvedCriticals} Crit${unresolvedCriticals === 1 ? '' : 's'}`} tooltip={describeCriticalTooltip(ship?.criticalDamage ?? [])} />}
        {traumaCount > 0 && <StatusBadge color="var(--color-stress-orange)" label={`${traumaCount} Trauma${traumaCount === 1 ? '' : 's'}`} tooltip={describeTraumaTooltip(player.officers)} />}
        {crewDangerCount > 0 && <StatusBadge color="var(--color-alert-amber)" label={`${crewDangerCount} Crew Risk`} tooltip={describeCrewRiskTooltip(player.officers, getResolvedOfficerData)} />}
        {!ship?.isDestroyed && scarCount === 0 && unresolvedCriticals === 0 && traumaCount === 0 && crewDangerCount === 0 && (
          <StatusBadge color="var(--color-holo-green)" label="Combat Ready" tooltip="No current scars, unresolved critical damage, trauma alerts, or crew stress warnings." />
        )}
      </div>

      {ship && chassis && <CompactShipPreview ship={ship} />}

      <div className="fleet-status-crew-grid">
        {player.officers.map(officer => (
          <OfficerStatusChip
            key={officer.officerId}
            officer={officer}
            officerData={getResolvedOfficerData(officer)}
          />
        ))}
      </div>
    </div>
  );
}

function OfficerStatusChip({
  officer,
  officerData,
}: {
  officer: OfficerState;
  officerData?: OfficerData;
}) {
  const maxStress = officerData ? getMaxStress(officer, officerData) : null;
  const stationLabel = officer.station.slice(0, 3).toUpperCase();
  const warning = getOfficerWarning(officer, officerData, maxStress);
  const tierLabel = officer.currentTier.toUpperCase();

  return (
    <div
      className="fleet-status-officer"
      title={`${officerData?.name ?? officer.station.toUpperCase()}${maxStress !== null ? ` • Stress ${officer.currentStress}/${maxStress}` : ' • Stress immune'}${officer.traumas.length ? ` • ${officer.traumas.length} trauma` : ''}${officer.isLocked ? ' • Locked' : ''}`}
    >
      <span className="fleet-status-officer-station">{stationLabel}</span>
      <span className="fleet-status-officer-state" style={{ color: warning.color }}>
        {warning.label}
      </span>
      <div className="fleet-status-officer-detail">
        <span className="fleet-status-officer-name">{officerData?.name ?? 'Officer'}</span>
        <span className="fleet-status-officer-tier" title={`Experience tier: ${tierLabel}`}>
          {tierLabel}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ color, label, tooltip }: { color: string; label: string; tooltip: string }) {
  return (
    <span
      className="fleet-status-badge"
      style={{ borderColor: color, color }}
      title={tooltip}
    >
      {label}
    </span>
  );
}

function CompactShipPreview({ ship }: { ship: ShipState }) {
  const weapons = ship.equippedWeapons
    .map((weaponId, index) => ({ index, weaponId, weapon: weaponId ? getWeaponById(weaponId) : null }))
    .filter(entry => entry.weapon);
  const maxShieldValue = Math.max(1, ship.maxShieldsPerSector);
  const shipSprite = ASSET_MAP[ship.chassisId];

  return (
    <div className="fleet-status-loadout" data-testid={`fleet-loadout-${ship.id}`}>
      <div className="fleet-status-preview-schematic" title="Compact ship schematic showing current shield sectors and equipped weapon firing arcs.">
        <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
          <defs>
            <clipPath id={`fleet-preview-clip-${ship.id}`}>
              <circle cx="60" cy="60" r="20" />
            </clipPath>
          </defs>
          {ARC_ORDER.map((arc, index) => {
            const startAngle = index * 60 - 30;
            const endAngle = startAngle + 60;
            const shieldValue = ship.shields[arc];
            const opacity = 0.18 + (shieldValue / maxShieldValue) * 0.58;
            const labelPos = polarPoint(60, 60, 28, startAngle + 30);
            return (
              <g key={`shield-${arc}`}>
                <path
                  d={getArcBandPath(60, 60, 24, 38, startAngle + 2, endAngle - 2)}
                  fill={`rgba(79, 209, 197, ${opacity})`}
                  stroke="var(--color-holo-cyan)"
                  strokeWidth="1.2"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  fill="white"
                  fontSize="7"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="mono"
                >
                  {shieldValue}
                </text>
              </g>
            );
          })}

          {weapons.map((entry, weaponIndex) =>
            entry.weapon!.arcs.map(arc => {
              const arcIndex = ARC_ORDER.indexOf(arc as ShipArc);
              if (arcIndex < 0) return null;
              const startAngle = arcIndex * 60 - 30;
              const endAngle = startAngle + 60;
              return (
                <path
                  key={`weapon-${entry.index}-${arc}`}
                  d={getArcBandPath(60, 60, 41 + weaponIndex * 6, 46 + weaponIndex * 6, startAngle + 3, endAngle - 3)}
                  fill={WEAPON_PREVIEW_COLORS[weaponIndex % WEAPON_PREVIEW_COLORS.length]}
                  opacity="0.45"
                  stroke={WEAPON_PREVIEW_COLORS[weaponIndex % WEAPON_PREVIEW_COLORS.length]}
                  strokeWidth="1"
                />
              );
            }),
          )}

          <circle cx="60" cy="60" r="20.5" fill="rgba(9, 15, 28, 0.92)" stroke="rgba(160, 174, 192, 0.45)" strokeWidth="1.2" />
          {shipSprite ? (
            <image
              data-testid={`fleet-loadout-image-${ship.id}`}
              href={shipSprite}
              x="39"
              y="39"
              width="42"
              height="42"
              preserveAspectRatio="xMidYMid meet"
              clipPath={`url(#fleet-preview-clip-${ship.id})`}
              transform="rotate(-90 60 60)"
            />
          ) : (
            <path
              d="M 74 60 L 51 70 L 57 60 L 51 50 Z"
              fill="var(--color-bg-panel)"
              stroke="#A0AEC0"
              strokeWidth="1.5"
            />
          )}
        </svg>
      </div>

      <div className="fleet-status-loadout-columns">
        <div className="fleet-status-loadout-group">
          <div className="fleet-status-loadout-label" title="Equipped weapon modules. Hover a slot for weapon name, firing arcs, and range.">
            Weapons
          </div>
          <div className="fleet-status-loadout-pills">
            {ship.equippedWeapons.map((weaponId, index) => {
              const weapon = weaponId ? getWeaponById(weaponId) : null;
              const weaponColor = WEAPON_PREVIEW_COLORS[index % WEAPON_PREVIEW_COLORS.length];
              return (
                <span
                  key={`weapon-slot-${index}`}
                  className={`fleet-status-loadout-pill ${weapon ? '' : 'is-empty'}`}
                  style={weapon ? { borderColor: weaponColor, color: weaponColor, background: `${weaponColor}18` } : undefined}
                  title={weapon
                    ? `${weapon.name} • Arcs: ${weapon.arcs.map(arc => ARC_LABELS[arc as ShipArc]).join(', ')} • Range ${weapon.rangeMin}-${weapon.rangeMax === Infinity ? 'INF' : weapon.rangeMax}`
                    : `Weapon slot ${index + 1} is empty.`}
                >
                  W{index + 1}
                </span>
              );
            })}
          </div>
        </div>

        <div className="fleet-status-loadout-group">
          <div className="fleet-status-loadout-label" title="Equipped subsystem modules. Hover a slot for subsystem name and assigned station.">
            Systems
          </div>
          <div className="fleet-status-loadout-pills">
            {ship.equippedSubsystems.map((subsystemId, index) => {
              const subsystem = subsystemId ? getSubsystemById(subsystemId) : null;
              return (
                <span
                  key={`sub-slot-${index}`}
                  className={`fleet-status-loadout-pill ${subsystem ? '' : 'is-empty'}`}
                  title={subsystem
                    ? `${subsystem.name} • ${subsystem.station.toUpperCase()} • ${subsystem.effect}`
                    : `Subsystem slot ${index + 1} is empty.`}
                >
                  S{index + 1}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function isOfficerDanger(officer: OfficerState, officerData?: OfficerData): boolean {
  if (officer.isLocked || officer.traumas.length > 0) return true;
  if (!officerData) return officer.currentStress > 0;
  const maxStress = getMaxStress(officer, officerData);
  if (maxStress === null) return false;
  return officer.currentStress >= Math.max(1, maxStress - 1);
}

function getOfficerWarning(
  officer: OfficerState,
  officerData: OfficerData | undefined,
  maxStress: number | null,
): { label: string; color: string } {
  if (officer.isLocked) return { label: 'LOCK', color: 'var(--color-hostile-red)' };
  if (officer.traumas.length > 0) return { label: `T${officer.traumas.length}`, color: 'var(--color-stress-orange)' };
  if (maxStress === null) return { label: 'IMM', color: 'var(--color-holo-cyan)' };
  const remaining = maxStress - officer.currentStress;
  if (remaining <= 0) return { label: 'MAX', color: 'var(--color-hostile-red)' };
  if (remaining === 1) return { label: 'HOT', color: 'var(--color-alert-amber)' };
  if (officer.currentStress > 0) return { label: `${officer.currentStress}/${maxStress}`, color: 'var(--color-holo-cyan)' };
  return { label: 'OK', color: 'var(--color-holo-green)' };
}

// ── Tooltip content ───────────────────────────────────────────────────────────

function describeScarTooltip(scars: ShipState['scars']): string {
  if (scars.length === 0) return 'No persistent ship scars.';
  return `Persistent ship scars: ${scars.map(scar => `${scar.name} (${scar.effect}) [Impact: ${describeScarImpact(scar.fromCriticalId)}]`).join(' | ')}`;
}

function describeCriticalTooltip(criticals: ShipState['criticalDamage']): string {
  const unresolved = criticals.filter(crit => !crit.isRepaired);
  if (unresolved.length === 0) return 'No unresolved critical damage.';
  return `Unrepaired critical damage: ${unresolved.map(crit => `${crit.name} (${crit.effect})`).join(' | ')}`;
}

function describeTraumaTooltip(officers: PlayerState['officers']): string {
  const traumas = officers.flatMap(officer =>
    officer.traumas.map(trauma => `${officer.station.toUpperCase()}: ${trauma.name}`),
  );
  if (traumas.length === 0) return 'No officer trauma recorded.';
  return `Officer trauma: ${traumas.join(' | ')}`;
}

function describeCrewRiskTooltip(
  officers: PlayerState['officers'],
  getOfficerData: (officer: OfficerState) => OfficerData | undefined,
): string {
  const risks = officers
    .map(officer => {
      const officerData = getOfficerData(officer);
      const maxStress = officerData ? getMaxStress(officer, officerData) : null;
      if (officer.isLocked) return `${officer.station.toUpperCase()} locked by fumble damage`;
      if (officer.traumas.length > 0) return `${officer.station.toUpperCase()} carrying ${officer.traumas.length} trauma`;
      if (maxStress !== null && officer.currentStress >= Math.max(1, maxStress - 1)) {
        return `${officer.station.toUpperCase()} stress ${officer.currentStress}/${maxStress}`;
      }
      if (!officerData && officer.currentStress > 0) return `${officer.station.toUpperCase()} stress ${officer.currentStress}`;
      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (risks.length === 0) return 'No crew currently in a danger state.';
  return `Crew at risk: ${risks.join(' | ')}`;
}

function getArcBandPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
  const x1Out = cx + outerR * Math.cos(rad(startAngle));
  const y1Out = cy + outerR * Math.sin(rad(startAngle));
  const x2Out = cx + outerR * Math.cos(rad(endAngle));
  const y2Out = cy + outerR * Math.sin(rad(endAngle));
  const x1In = cx + innerR * Math.cos(rad(endAngle));
  const y1In = cy + innerR * Math.sin(rad(endAngle));
  const x2In = cx + innerR * Math.cos(rad(startAngle));
  const y2In = cy + innerR * Math.sin(rad(startAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1Out} ${y1Out} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Out} ${y2Out} L ${x1In} ${y1In} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2In} ${y2In} Z`;
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function TooltipContent({ node, campaign }: { node: SectorNode; campaign: CampaignState }) {
  const color      = NODE_COLORS[node.type] ?? 'white';
  const label      = NODE_LABELS[node.type] ?? node.type;
  const isVisited  = campaign.visitedNodeIds.includes(node.id);
  const isCurrent  = campaign.currentNodeId === node.id;

  const statusText = isCurrent
    ? 'CURRENT POSITION'
    : isVisited
    ? 'SECTOR CLEARED'
    : 'AWAITING JUMP';

  return (
    <>
      <div className="tooltip-type" style={{ color }}>{label.toUpperCase()}</div>
      <div className="tooltip-status label">{statusText}</div>
      {node.type === NodeType.Event && (
        <div className="tooltip-detail label">
          <span style={{ color: 'hsl(35,100%,58%)' }}>⚠ ANOMALOUS READING</span>
        </div>
      )}
      {node.type === NodeType.Haven && (
        <div className="tooltip-detail label">
          <span style={{ color: 'hsl(140,80%,50%)' }}>✦ REPAIR &amp; REARM</span>
        </div>
      )}
      {node.type === NodeType.Elite && (
        <div className="tooltip-detail label">
          <span style={{ color: 'hsl(0,85%,60%)' }}>▲ HIGH THREAT</span>
        </div>
      )}
      {node.type === NodeType.Boss && (
        <div className="tooltip-detail label">
          <span style={{ color: 'hsl(45,100%,60%)' }}>☠ SECTOR COMMANDER</span>
        </div>
      )}
    </>
  );
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

/** Returns SVG points string for a flat-top hexagon of given radius */
function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${r * Math.cos(a)},${r * Math.sin(a)}`;
  }).join(' ');
}

/** Returns [x,y] pairs for the 6 corners of a hexagon */
function hexCorners(r: number): [number, number][] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
  });
}
