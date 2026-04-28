import React, { useState, useEffect } from 'react';
import { SHIP_CHASSIS, getChassisById } from '../../data/shipChassis';
import { OFFICERS } from '../../data/officers';
import { WEAPONS, TAG_DESCRIPTIONS, TAG_LABELS, getPurchasableWeapons } from '../../data/weapons';
import { SUBSYSTEMS, getPurchasableSubsystems } from '../../data/subsystems';
import { ADVERSARIES } from '../../data/adversaries';
import { useGameStore, type GameInitConfig } from '../../store/useGameStore';
import { computeDpBreakdown, DP_BUDGET } from '../../engine/dpCost';
import type { OfficerStation, OfficerState, ShipState, EnemyShipState, ShipArc } from '../../types/game';
import { HexFacing } from '../../types/game';
import { isInFiringArc, hexDistance } from '../../engine/hexGrid';
import type { CustomScenarioConfig } from './ScenarioEditor';

const WEAPON_COLORS = ['#4FD1C5', '#F6E05E', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED'];
const ARC_INDEX: Record<string, number> = { 'fore': 0, 'foreStarboard': 1, 'aftStarboard': 2, 'aft': 3, 'aftPort': 4, 'forePort': 5 };

function getArcBandPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 360) endAngle = startAngle + 359.99;
  const rad = (deg: number) => (deg - 90) * Math.PI / 180;
  
  const x1_out = cx + outerR * Math.cos(rad(startAngle));
  const y1_out = cy + outerR * Math.sin(rad(startAngle));
  const x2_out = cx + outerR * Math.cos(rad(endAngle));
  const y2_out = cy + outerR * Math.sin(rad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  
  if (innerR <= 0) {
    return `M ${cx} ${cy} L ${x1_out} ${y1_out} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2_out} ${y2_out} Z`;
  }
  
  const x1_in = cx + innerR * Math.cos(rad(endAngle));
  const y1_in = cy + innerR * Math.sin(rad(endAngle));
  const x2_in = cx + innerR * Math.cos(rad(startAngle));
  const y2_in = cy + innerR * Math.sin(rad(startAngle));

  return `M ${x1_out} ${y1_out} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2_out} ${y2_out} L ${x1_in} ${y1_in} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2_in} ${y2_in} Z`;
}

function getHexGridPath(cx: number, cy: number, hexSize: number, q: number, r: number) {
  const hx = cx + hexSize * (3 / 2 * q);
  const hy = cy + hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  const pts = [];
  for (let i = 0; i < 6; i++) {
    // Flat top vertices are at 0, 60, 120, etc.
    const rad = Math.PI / 180 * (60 * i);
    pts.push(`${hx + hexSize * Math.cos(rad)},${hy + hexSize * Math.sin(rad)}`);
  }
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
}

function ShipLoadoutPreview({ chassis, selectedWeaponIds }: { chassis: any, selectedWeaponIds: string[] }) {
  const cx = 150;
  const cy = 150;
  const hexSize = 16; 
  const baseRadius = 26;
  const weapons = selectedWeaponIds.map(id => WEAPONS.find(w => w.id === id)).filter(Boolean) as any[];

  const origin = { q: 0, r: 0 };
  const allHexCoords: {q: number, r: number}[] = [];
  for (let q = -6; q <= 6; q++) {
    for (let r = -6; r <= 6; r++) {
      if (hexDistance(origin, { q, r }) <= 6) {
        allHexCoords.push({ q, r });
      }
    }
  }

  const bgGridD = allHexCoords.map(h => getHexGridPath(cx, cy, hexSize, h.q, h.r)).join(' ');

  return (
    <div className="panel panel--raised" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: 'var(--space-md)', alignSelf: 'flex-start' }}>LOADOUT PREVIEW</div>
      <svg width="300" height="300" viewBox="0 0 300 300" style={{ background: 'var(--color-bg-deep)', borderRadius: '50%', border: '1px solid var(--color-border)' }}>
        {/* Hex Grid Background */}
        <path d={bgGridD} fill="none" stroke="var(--color-border)" strokeWidth="0.8" opacity="0.4" />

        {/* Highlighted Weapon Hexes */}
        {weapons.map((w, index) => {
          const color = WEAPON_COLORS[index % WEAPON_COLORS.length];
          const maxRange = w.rangeMax === Infinity ? 6 : w.rangeMax;
          const minRange = w.rangeMin || 0;
          
          const coveredHexes = allHexCoords.filter(h => {
            if (h.q === 0 && h.r === 0) return false;
            const dist = hexDistance(origin, h);
            if (dist < minRange || dist > maxRange) return false;
            return isInFiringArc(origin, HexFacing.Fore, h, w.arcs as ShipArc[]);
          });
          
          if (coveredHexes.length === 0) return null;
          const d = coveredHexes.map(h => getHexGridPath(cx, cy, hexSize, h.q, h.r)).join(' ');

          return (
            <path 
              key={`${w.id}-hexes`} 
              d={d}
              fill={color} 
              opacity="0.3"
              stroke={color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Shield Sectors */}
        {Object.keys(ARC_INDEX).map((arcName, index) => {
           const startAngle = index * 60 - 30;
           const endAngle = startAngle + 60;
           const txtR = baseRadius - 8;
           const txtX = cx + txtR * Math.cos((startAngle + 30 - 90) * Math.PI/180);
           const txtY = cy + txtR * Math.sin((startAngle + 30 - 90) * Math.PI/180);
           return (
             <g key={`shield-${index}`}>
               <path 
                 d={getArcBandPath(cx, cy, baseRadius - 16, baseRadius, startAngle + 2, endAngle - 2)}
                 fill="rgba(0, 204, 255, 0.1)"
                 stroke="var(--color-holo-cyan)"
                 strokeWidth="2"
                 opacity="0.9"
               />
               <text x={txtX} y={txtY} fill="white" fontSize="9" textAnchor="middle" alignmentBaseline="middle" className="mono" opacity="0.9">
                 {chassis.shieldsPerSector}
               </text>
             </g>
           )
        })}

        {/* Ship Icon (facing -30 deg) */}
        <path 
          d={`M ${cx + 12 * Math.cos(-30 * Math.PI/180)},${cy + 12 * Math.sin(-30 * Math.PI/180)} 
              L ${cx + 10 * Math.cos(105 * Math.PI/180)},${cy + 10 * Math.sin(105 * Math.PI/180)} 
              L ${cx + 4 * Math.cos(150 * Math.PI/180)},${cy + 4 * Math.sin(150 * Math.PI/180)} 
              L ${cx + 10 * Math.cos(195 * Math.PI/180)},${cy + 10 * Math.sin(195 * Math.PI/180)} Z`}
          fill="var(--color-bg-panel)"
          stroke="#A0AEC0"
          strokeWidth="1.5"
        />
      </svg>
      <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: 'var(--space-sm)' }}>
        SHIELD SECTORS & WEAPON ARCS
      </div>
    </div>
  );
}

interface FleetBuilderProps {
  scenarioConfig?: CustomScenarioConfig | null;
  onCancel?: () => void;
  isCampaignSetup?: boolean;
  onCampaignStart?: (fleetAdmiralPlayerId: string, players: any[], ships: any[], difficulty: 'easy' | 'normal' | 'hard', dpBudget: number) => void;
  onSkirmishStart?: () => void;
}

export default function FleetBuilder({ scenarioConfig, onCancel, isCampaignSetup, onCampaignStart, onSkirmishStart }: FleetBuilderProps) {
  const purchasableWeapons = getPurchasableWeapons();
  const purchasableSubsystems = getPurchasableSubsystems();

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [completedPlayers, setCompletedPlayers] = useState<{ player: any, ship: any }[]>([]);

  // Per-player draft state for non-linear tab switching
  // Note: defaultChassisId is computed below, so we initialize to null and patch on first switch.
  const [drafts, setDrafts] = useState<{
    chassisId: string | null;
    officers: Record<string, string>;
    weapons: string[];
    subsystems: string[];
    shipName: string;
  }[]>(() => Array.from({ length: 4 }).map(() => ({ chassisId: null, officers: {}, weapons: [], subsystems: [], shipName: '' })));

  // In campaign mode, players always start with the Vanguard chassis.
  const defaultChassisId = isCampaignSetup ? 'vanguard' : null;
  const defaultStep = 1;

  const [step, setStep] = useState<number>(defaultStep);
  const [selectedChassisId, setSelectedChassisId] = useState<string | null>(defaultChassisId);
  const [campaignPlayerCount, setCampaignPlayerCount] = useState<number>(1);
  const [campaignDifficulty, setCampaignDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [campaignShipNames, setCampaignShipNames] = useState<string[]>(['ISS Vanguard', 'ISS Vanguard 2', 'ISS Vanguard 3', 'ISS Vanguard 4']);
  const [customShipName, setCustomShipName] = useState<string>('');

  const dpBudgetMap = {
    easy: 130,
    normal: 115,
    hard: 100,
  };
  const campaignBudget = isCampaignSetup ? dpBudgetMap[campaignDifficulty] : 100;

  useEffect(() => {
    if (isCampaignSetup) return; // Campaign names are handled separately
    const chassisName = selectedChassisId ? getChassisById(selectedChassisId)?.name || 'Vanguard' : 'Ship';
    setCustomShipName(`ISS ${chassisName}${currentPlayerIndex > 0 ? ` ${currentPlayerIndex + 1}` : ''}`);
  }, [currentPlayerIndex, selectedChassisId, isCampaignSetup]);
  
  // Officer state: station -> officerId
  const [selectedOfficers, setSelectedOfficers] = useState<Record<string, string>>({});
  
  // Module state
  const [selectedWeapons, setSelectedWeapons] = useState<string[]>([]);
  const [selectedSubsystems, setSelectedSubsystems] = useState<string[]>([]);

  // Saves current UI state into the drafts array for the active player
  const saveCurrentDraftRef = React.useRef<() => void>(() => {});
  saveCurrentDraftRef.current = () => {
    setDrafts(prev => {
      const next = [...prev];
      next[currentPlayerIndex] = {
        chassisId: selectedChassisId,
        officers: selectedOfficers,
        weapons: selectedWeapons,
        subsystems: selectedSubsystems,
        shipName: customShipName,
      };
      return next;
    });
  };

  const handleTabClick = (idx: number) => {
    if (idx === currentPlayerIndex) return;
    // Save current player's state into drafts
    const savedDrafts = [...drafts];
    savedDrafts[currentPlayerIndex] = {
      chassisId: selectedChassisId,
      officers: selectedOfficers,
      weapons: selectedWeapons,
      subsystems: selectedSubsystems,
      shipName: customShipName,
    };
    setDrafts(savedDrafts);
    // Load target player's draft, applying default chassis if in campaign mode
    const raw = savedDrafts[idx];
    const targetChassisId = raw.chassisId ?? defaultChassisId;
    setSelectedChassisId(targetChassisId);
    setSelectedOfficers(raw.officers);
    setSelectedWeapons(raw.weapons);
    setSelectedSubsystems(raw.subsystems);
    setCustomShipName(raw.shipName);
    setCurrentPlayerIndex(idx);
    // Navigate to appropriate step
    if (!targetChassisId) setStep(1);
    else if (!['helm','tactical','engineering','sensors'].every(st => raw.officers[st])) setStep(2);
    else setStep(3);
  };

  const initializeGame = useGameStore(s => s.initializeGame);

  const chassisList = SHIP_CHASSIS;
  const activeChassis = selectedChassisId ? getChassisById(selectedChassisId) : null;

  const handleOfficerToggle = (station: string, officerId: string) => {
    setSelectedOfficers(prev => ({ ...prev, [station]: officerId }));
  };

  const handleWeaponAdd = (weaponId: string) => {
    if (!activeChassis) return;
    if (selectedWeapons.length < activeChassis.weaponSlots) {
      setSelectedWeapons(prev => [...prev, weaponId]);
    }
  };

  const handleWeaponRemove = (weaponId: string) => {
    if (!activeChassis) return;
    setSelectedWeapons(prev => {
      const index = prev.lastIndexOf(weaponId);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const handleSubsystemToggle = (subsystemId: string) => {
    if (!activeChassis) return;
    if (selectedSubsystems.includes(subsystemId)) {
      setSelectedSubsystems(prev => prev.filter(id => id !== subsystemId));
    } else if (selectedSubsystems.length < activeChassis.internalSlots) {
      setSelectedSubsystems(prev => [...prev, subsystemId]);
    }
  };

  const handleFinish = () => {
    if (!activeChassis) return;

    // Snapshot current player's UI state into allDrafts
    const allDrafts = [...drafts];
    allDrafts[currentPlayerIndex] = {
      chassisId: selectedChassisId,
      officers: selectedOfficers,
      weapons: selectedWeapons,
      subsystems: selectedSubsystems,
      shipName: customShipName,
    };

    const totalPlayersCount = isCampaignSetup ? campaignPlayerCount : (scenarioConfig ? scenarioConfig.playerSpawns.length : 1);

    // Build all players and ships from the drafts array
    const finalPlayers: any[] = [];
    const finalShips: ShipState[] = [];

    for (let idx = 0; idx < totalPlayersCount; idx++) {
      const draft = allDrafts[idx];
      const draftChassisId = draft.chassisId ?? (isCampaignSetup ? 'vanguard' : null);
      const draftChassis = draftChassisId ? getChassisById(draftChassisId) : null;
      if (!draftChassis) continue;

      const pid = `p${idx + 1}`;
      const sid = `s${idx + 1}`;

      let pos = { q: 0, r: 0 };
      let facing: HexFacing = HexFacing.Fore;
      if (scenarioConfig && scenarioConfig.playerSpawns[idx]) {
        pos = scenarioConfig.playerSpawns[idx].coord;
        facing = scenarioConfig.playerSpawns[idx].facing;
      }

      const draftShipName = isCampaignSetup
        ? (campaignShipNames[idx]?.trim() || `ISS Vanguard ${idx + 1}`)
        : (draft.shipName.trim() || `ISS ${draftChassis.name}${idx > 0 ? ` ${idx + 1}` : ''}`);

      const draftStations: OfficerStation[] = ['helm', 'tactical', 'engineering', 'sensors'];
      const draftOfficers: OfficerState[] = draftStations.map(st => ({
        officerId: draft.officers[st],
        station: st,
        currentStress: 0,
        currentTier: 'rookie',
        isLocked: false,
        lockDuration: 0,
        traumas: [],
        hasFumbledThisRound: false,
        actionsPerformedThisRound: 0,
      }));

      finalShips.push({
        id: sid,
        name: draftShipName,
        chassisId: draftChassis.id,
        ownerId: pid,
        position: pos,
        facing,
        currentSpeed: 1,
        currentHull: draftChassis.baseHull,
        maxHull: draftChassis.baseHull,
        shields: {
          fore: draftChassis.shieldsPerSector, foreStarboard: draftChassis.shieldsPerSector, aftStarboard: draftChassis.shieldsPerSector,
          aft: draftChassis.shieldsPerSector, aftPort: draftChassis.shieldsPerSector, forePort: draftChassis.shieldsPerSector,
        },
        maxShieldsPerSector: draftChassis.shieldsPerSector,
        equippedWeapons: draft.weapons,
        equippedSubsystems: draft.subsystems,
        criticalDamage: [],
        scars: [],
        armorDie: draftChassis.armorDie,
        baseEvasion: draftChassis.baseEvasion,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
      });

      finalPlayers.push({
        id: pid,
        name: `Player ${idx + 1}`,
        shipId: sid,
        commandTokens: draftChassis.ctGeneration,
        maxCommandTokens: draftChassis.ctGeneration,
        assignedActions: [],
        officers: draftOfficers,
      });
    }

    // Campaign launch
    if (isCampaignSetup && onCampaignStart) {
      onCampaignStart(finalPlayers[0].id, finalPlayers, finalShips, campaignDifficulty, campaignBudget);
      return;
    }

    // Skirmish / scenario launch
    let config: GameInitConfig;
    if (scenarioConfig) {
      const combinedSpawns = [
        ...(scenarioConfig.enemies || []).map(e => ({ ...e, isAllied: false })),
        ...(scenarioConfig.allies || []).map(a => ({ ...a, isAllied: true }))
      ];
      const mappedEnemies = combinedSpawns.map((e, i) => {
        const adv = ADVERSARIES.find(a => a.id === e.adversaryId) || ADVERSARIES[0];
        return {
          id: `e${i + 1}`, name: adv.name, adversaryId: adv.id,
          position: e.coord, facing: e.facing, currentSpeed: adv.speed,
          currentHull: adv.hull, maxHull: adv.hull,
          baseEvasion: adv.baseEvasion, armorDie: adv.armorDie,
          shields: { fore: adv.shieldsPerSector, foreStarboard: adv.shieldsPerSector, aftStarboard: adv.shieldsPerSector, aft: adv.shieldsPerSector, aftPort: adv.shieldsPerSector, forePort: adv.shieldsPerSector },
          maxShieldsPerSector: adv.shieldsPerSector, criticalDamage: [],
          isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [], isAllied: e.isAllied,
        } as EnemyShipState;
      });
      config = { scenarioId: 'custom-scenario', maxRounds: 8, terrain: scenarioConfig.terrain, players: finalPlayers, playerShips: finalShips, enemyShips: mappedEnemies };
    } else {
      const enemy = ADVERSARIES[0];
      const enemyShip: EnemyShipState = {
        id: 'e1', name: enemy.name, adversaryId: enemy.id,
        position: { q: 9, r: -9 }, facing: HexFacing.Aft, currentSpeed: enemy.speed,
        currentHull: enemy.hull, maxHull: enemy.hull,
        baseEvasion: enemy.baseEvasion, armorDie: enemy.armorDie,
        shields: { fore: enemy.shieldsPerSector, foreStarboard: enemy.shieldsPerSector, aftStarboard: enemy.shieldsPerSector, aft: enemy.shieldsPerSector, aftPort: enemy.shieldsPerSector, forePort: enemy.shieldsPerSector },
        maxShieldsPerSector: enemy.shieldsPerSector, criticalDamage: [],
        isDestroyed: false, hasDroppedBelow50: false, hasDrifted: false, targetLocks: [],
      };
      config = { scenarioId: 'skirmish-1', maxRounds: 8, terrain: [], players: finalPlayers, playerShips: finalShips, enemyShips: [enemyShip] };
    }

    initializeGame(config);
    if (onSkirmishStart) onSkirmishStart();
  };


  const stations: OfficerStation[] = ['helm', 'tactical', 'engineering', 'sensors'];
  const hasAllOfficers = stations.every(s => selectedOfficers[s]);
  // Require at least 1 weapon; subsystems are optional (any number from 0 to max slots).
  const hasAllModules = activeChassis && selectedWeapons.length >= 1;

  // ── DP Budget (campaign mode only) ─────────────────────────────────
  const dpBreakdown = (() => {
    if (!isCampaignSetup || !activeChassis) return null;
    const officerDps = stations.map(st => {
      const oId = selectedOfficers[st];
      const o = oId ? OFFICERS.find(x => x.id === oId) : undefined;
      return o?.dpCost ?? 0;
    });
    const weaponDps = selectedWeapons.map(wId => {
      const w = WEAPONS.find(x => x.id === wId);
      return w?.dpCost ?? 0;
    });
    const subDps = selectedSubsystems.map(id => {
      const s = SUBSYSTEMS.find(s => s.id === id);
      return s?.dpCost ?? 0;
    });
    return computeDpBreakdown(activeChassis.dpCost, officerDps, weaponDps, subDps, campaignBudget);
  })();

  // Build a map of officerId -> ship name for officers claimed by other players' drafts
  const claimedOfficerMap: Record<string, string> = {};
  drafts.forEach((draft, idx) => {
    if (idx === currentPlayerIndex) return; // Don't block the active player's own picks
    const draftShipName = isCampaignSetup
      ? (campaignShipNames[idx]?.trim() || `ISS Vanguard ${idx + 1}`)
      : (draft.shipName || `Player ${idx + 1}`);
    Object.values(draft.officers).forEach(offId => {
      if (offId) claimedOfficerMap[offId] = draftShipName;
    });
  });

  const currentShipName = isCampaignSetup
    ? (campaignShipNames[currentPlayerIndex]?.trim() || `ISS Vanguard ${currentPlayerIndex + 1}`)
    : (customShipName.trim() || 'Your Ship');

  const totalPlayers = isCampaignSetup ? campaignPlayerCount : (scenarioConfig ? scenarioConfig.playerSpawns.length : 1);

  const allDraftsForReadiness = drafts.map((d, i) => i === currentPlayerIndex
    ? { chassisId: selectedChassisId, officers: selectedOfficers, weapons: selectedWeapons, subsystems: selectedSubsystems, shipName: customShipName }
    : d
  );
  const readinessRows = allDraftsForReadiness.slice(0, totalPlayers).map((d, idx) => {
    const shipLabel = isCampaignSetup
      ? (campaignShipNames[idx]?.trim() || `ISS Vanguard ${idx + 1}`)
      : (d.shipName || `Player ${idx + 1}`);
    const officersFilled = ['helm','tactical','engineering','sensors'].filter(st => d.officers[st as OfficerStation]).length;
    const hasOfficers = officersFilled === 4;
    const hasWeapons = d.weapons.length >= 1;
    const isOver = isCampaignSetup && (() => {
      const ch = d.chassisId ? getChassisById(d.chassisId) : null;
      if (!ch) return false;
      const offDp = Object.values(d.officers).reduce((s, id) => s + (OFFICERS.find(o => o.id === id)?.dpCost ?? 0), 0);
      const wDp = d.weapons.reduce((s, id) => s + (WEAPONS.find(w => w.id === id)?.dpCost ?? 0), 0);
      const sDp = d.subsystems.reduce((s, id) => s + (SUBSYSTEMS.find(sub => sub.id === id)?.dpCost ?? 0), 0);
      return ch.dpCost + offDp + wDp + sDp > campaignBudget;
    })();
    const ready = hasOfficers && hasWeapons && !isOver;
    return { idx, shipLabel, officersFilled, hasOfficers, hasWeapons, isOver, ready };
  });

  const allReady = readinessRows.every(r => r.ready);

  return (
    <div className="panel" style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', borderRadius: 0, border: 'none' }}>
      {/* ── Top Bar ── */}
      <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          {onCancel && <button className="btn" onClick={onCancel} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>&larr; BACK</button>}
          <h2 style={{ color: 'var(--color-holo-cyan)', margin: 0 }}>Deployment Setup</h2>
        </div>
        {/* Clickable step breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(isCampaignSetup ? [1, 2] : [1, 2, 3]).map((s, idx, arr) => {
            const stepLabels: Record<number, string> = {
              1: isCampaignSetup ? 'INIT' : 'CHASSIS',
              2: 'OFFICERS',
              3: 'MODULES',
            };
            const isActive = step === s;
            const isPast = step > s;
            // Can navigate back to any completed step; can't skip forward past current
            const isClickable = isPast;
            return (
              <React.Fragment key={s}>
                <button
                  onClick={() => isClickable && setStep(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: isClickable ? 'pointer' : 'default',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.1em',
                    color: isActive
                      ? 'var(--color-holo-cyan)'
                      : isPast
                        ? 'var(--color-holo-green)'
                        : 'var(--color-text-dim)',
                    textDecoration: isClickable ? 'underline' : 'none',
                    textDecorationColor: 'hsla(140, 80%, 50%, 0.5)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    transition: 'color 0.2s',
                  }}
                  title={isClickable ? `Go back to ${stepLabels[s]}` : undefined}
                >
                  {isPast ? '✓ ' : isActive ? '▶ ' : ''}{s}. {stepLabels[s]}
                </button>
                {idx < arr.length - 1 && (
                  <span style={{ color: 'var(--color-text-dim)', fontSize: '0.7rem' }}>/</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Player Progress Tracker ── */}
      {totalPlayers > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)' }}>
          {Array.from({ length: totalPlayers }).map((_, idx) => {
            const isActive = idx === currentPlayerIndex;
            const draft = isActive
              ? { chassisId: selectedChassisId, officers: selectedOfficers, weapons: selectedWeapons, subsystems: selectedSubsystems, shipName: customShipName }
              : drafts[idx];
            const _ch = draft?.chassisId ? getChassisById(draft.chassisId) : null;
            const hasOffs = ['helm','tactical','engineering','sensors'].every(st => draft?.officers[st]);
            const hasMods = (draft?.weapons.length ?? 0) >= 1;
            const isDone = !!(draft?.chassisId && hasOffs && hasMods);
            const shipNameForIdx = isCampaignSetup
              ? (campaignShipNames[idx]?.trim() || `ISS Vanguard ${idx + 1}`)
              : (draft?.shipName || `Player ${idx + 1}`);
            return (
              <div
                key={idx}
                onClick={() => handleTabClick(idx)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRight: idx < totalPlayers - 1 ? '1px solid var(--color-border)' : 'none',
                  background: isActive ? 'rgba(0, 204, 255, 0.08)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--color-holo-cyan)' : '2px solid transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div className="mono" style={{ fontSize: '0.65rem', color: isDone ? 'var(--color-holo-green)' : isActive ? 'var(--color-holo-cyan)' : 'var(--color-text-dim)' }}>
                  {isDone ? '✓ ' : isActive ? '▶ ' : ''}{`PLAYER ${idx + 1}`}
                </div>
                <div className="mono" style={{ fontSize: '0.8rem', color: isDone ? 'var(--color-holo-green)' : isActive ? 'var(--color-text-bright)' : 'var(--color-text-dim)', fontWeight: isActive ? 'bold' : 'normal' }}>
                  {shipNameForIdx}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Active Player Banner (only shown during officer/module steps) ── */}
      {step >= 2 && (
        <div style={{ padding: '10px var(--space-lg)', background: 'rgba(0, 204, 255, 0.05)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span className="label" style={{ color: 'var(--color-holo-cyan)' }}>NOW CONFIGURING:</span>
          <span className="mono" style={{ color: 'var(--color-text-bright)', fontSize: '1.1rem' }}>{currentShipName}</span>
          {totalPlayers > 1 && <span className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>(Player {currentPlayerIndex + 1} of {totalPlayers})</span>}
          {isCampaignSetup && (
            <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-alert-amber)', border: '1px solid var(--color-alert-amber)', padding: '2px 8px', borderRadius: '4px' }}>
              CAMPAIGN: VANGUARD-CLASS ASSIGNED
            </span>
          )}
        </div>
      )}

      {/* ── DP Budget Tracker (campaign Steps 2 & 3 only) ── */}
      {isCampaignSetup && step >= 2 && dpBreakdown && (() => {
        const pct = Math.min((dpBreakdown.total / campaignBudget) * 100, 100);
        const isOver = dpBreakdown.isOverBudget;
        const isWarn = !isOver && dpBreakdown.total > campaignBudget * 0.8;
        const barColor = isOver
          ? 'var(--color-hostile-red)'
          : isWarn
            ? 'var(--color-alert-amber)'
            : 'var(--color-holo-green)';
        const labelColor = isOver
          ? 'var(--color-hostile-red)'
          : isWarn
            ? 'var(--color-alert-amber)'
            : 'var(--color-text-bright)';
        return (
          <div style={{
            padding: '8px var(--space-lg)',
            background: isOver ? 'rgba(180, 30, 30, 0.08)' : 'rgba(0,0,0,0.4)',
            borderBottom: `1px solid ${isOver ? 'var(--color-hostile-red)' : 'var(--color-border)'}`,
            transition: 'border-color 0.3s, background 0.3s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: '5px' }}>
              <span className="label" style={{ color: isOver ? 'var(--color-hostile-red)' : 'var(--color-holo-cyan)', flexShrink: 0, transition: 'color 0.3s' }}>DP BUDGET</span>
              {/* Progress bar track */}
              <div style={{
                flex: 1, height: '8px',
                background: isOver ? 'hsla(0, 85%, 55%, 0.15)' : 'rgba(255,255,255,0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
                transition: 'background 0.3s',
              }}>
                <div
                  className={isOver ? 'dp-over-budget-bar' : ''}
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: barColor,
                    borderRadius: '4px',
                    transition: 'width 0.25s ease, background 0.25s ease',
                    boxShadow: isWarn ? '0 0 6px var(--color-alert-amber)' : 'none',
                  }}
                />
              </div>
              <span className="mono" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: labelColor, flexShrink: 0, minWidth: '80px', textAlign: 'right', transition: 'color 0.3s' }}>
                {dpBreakdown.total} / {campaignBudget} DP
              </span>
              {isOver && (
                <span
                  className="mono dp-over-budget-badge"
                  style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '3px', flexShrink: 0, border: '1px solid' }}
                >
                  ⚠ OVER BUDGET
                </span>
              )}
            </div>
            {/* Itemized breakdown */}
            <div style={{ display: 'flex', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
              {([
                { label: 'Chassis', value: dpBreakdown.chassis },
                { label: 'Officers', value: dpBreakdown.officers },
                { label: 'Weapons', value: dpBreakdown.weapons },
                { label: 'Subsystems', value: dpBreakdown.subsystems },
              ] as { label: string; value: number }[]).map(item => (
                <span key={item.label} className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                  {item.label}: <span style={{ color: 'var(--color-text-secondary)' }}>{item.value} DP</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ flex: 1, padding: 'var(--space-lg)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {step === 1 && (
          <>
            {isCampaignSetup ? (
              <>
                <h3 style={{ color: 'var(--color-text-bright)' }}>Campaign Initialization</h3>
                <div className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
                  {currentPlayerIndex === 0 ? (
                    <>
                      <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: '8px' }}>NUMBER OF PLAYERS</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[1, 2, 3, 4].map(num => (
                            <button
                              key={num}
                              className={`btn ${campaignPlayerCount === num ? 'btn--execute' : ''}`}
                              onClick={() => setCampaignPlayerCount(num)}
                              style={{ width: '40px', height: '40px' }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: 'var(--space-lg)' }}>
                        <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: '8px' }}>DIFFICULTY</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className={`btn ${campaignDifficulty === 'easy' ? 'btn--execute' : ''}`}
                            onClick={() => setCampaignDifficulty('easy')}
                            title="130 DP per ship"
                          >
                            WELL-EQUIPPED (130 DP)
                          </button>
                          <button
                            className={`btn ${campaignDifficulty === 'normal' ? 'btn--execute' : ''}`}
                            onClick={() => setCampaignDifficulty('normal')}
                            title="115 DP per ship"
                          >
                            STANDARD (115 DP)
                          </button>
                          <button
                            className={`btn ${campaignDifficulty === 'hard' ? 'btn--execute' : ''}`}
                            onClick={() => setCampaignDifficulty('hard')}
                            title="100 DP per ship"
                          >
                            DESPERATE (100 DP)
                          </button>
                        </div>
                      </div>
                      
                      {Array.from({ length: campaignPlayerCount }).map((_, idx) => (
                        <div key={idx} style={{ marginBottom: 'var(--space-md)' }}>
                          <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: '8px' }}>SHIP NAME PLAYER {idx + 1}</div>
                          <input 
                            type="text" 
                            className="panel"
                            value={campaignShipNames[idx]}
                            onChange={e => {
                              const newNames = [...campaignShipNames];
                              newNames[idx] = e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 25);
                              setCampaignShipNames(newNames);
                            }}
                            placeholder={`Enter ship name for player ${idx + 1}...`}
                            style={{ 
                              width: '100%', 
                              padding: '8px 12px', 
                              fontSize: '1rem', 
                              fontFamily: 'var(--font-mono)',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-text-bright)'
                            }}
                          />
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="mono" style={{ color: 'var(--color-text-dim)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                      Initialization complete. Proceed to draft officers for {campaignShipNames[currentPlayerIndex]}.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: 'var(--color-text-bright)' }}>Select Ship Chassis</h3>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: '8px' }}>SHIP NAME</div>
                  <input 
                    type="text" 
                    className="panel"
                    value={customShipName}
                    onChange={e => setCustomShipName(e.target.value.replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 25))}
                    placeholder="Enter ship name..."
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      fontSize: '1rem', 
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-bright)'
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                  {chassisList.map(chassis => (
                    <div 
                      key={chassis.id}
                      className={`panel ${selectedChassisId === chassis.id ? 'panel--glow' : 'panel--raised'}`}
                      style={{ cursor: 'pointer', borderColor: selectedChassisId === chassis.id ? 'var(--color-holo-cyan)' : 'var(--color-border)' }}
                      onClick={() => setSelectedChassisId(chassis.id)}
                      data-testid={`chassis-card-${chassis.id}`}
                    >
                      <div className="flex-between" style={{ marginBottom: '8px' }}>
                        <div className="label" style={{ color: 'var(--color-holo-cyan)', fontSize: '1rem' }}>{chassis.className}</div>
                        <div className="mono">Hull: {chassis.baseHull}</div>
                      </div>
                      <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                        Type: {chassis.size} | Max Speed: {chassis.maxSpeed} | CT: {chassis.ctGeneration}
                      </div>
                      <div className="label" style={{ fontSize: '0.7rem' }}>
                        Weapons: {chassis.weaponSlots} | Subsystems: {chassis.internalSlots}
                      </div>
                      {chassis.uniqueTraitName && (
                        <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(49,151,149,0.1)', borderRadius: '4px', borderLeft: '2px solid var(--color-holo-cyan)' }}>
                          <div className="label" style={{ fontSize: '0.65rem', color: 'var(--color-holo-cyan)' }}>{chassis.uniqueTraitName}</div>
                          <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{chassis.uniqueTraitEffect}</div>
                        </div>
                      )}
                      <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '8px', fontStyle: 'italic' }}>
                        {chassis.flavorText}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <button 
              className="btn" 
              style={{ alignSelf: 'flex-end', marginTop: 'auto' }}
              disabled={isCampaignSetup ? (currentPlayerIndex === 0 && campaignShipNames.slice(0, campaignPlayerCount).some(n => !n.trim())) : (!selectedChassisId || !customShipName.trim())}
              onClick={() => setStep(2)}
              data-testid="next-btn-1"
            >
              NEXT: DRAFT OFFICERS
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ color: 'var(--color-text-bright)' }}>Draft Bridge Officers</h3>
            {Object.keys(claimedOfficerMap).length > 0 && (
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', padding: '6px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                ⚠ Officers marked <span style={{ color: 'var(--color-alert-red)' }}>ASSIGNED</span> are already serving on another ship and cannot be selected.
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {stations.map(station => (
                <div key={station} className="panel panel--raised" style={{ flex: '1 1 300px' }}>
                  <div className="label" style={{ marginBottom: 'var(--space-sm)', color: 'var(--color-holo-cyan)', textTransform: 'uppercase' }}>
                    {station}
                  </div>
                  {OFFICERS.filter(o => o.station === station).map(officer => {
                    const claimedBy = claimedOfficerMap[officer.id];
                    const isSelected = selectedOfficers[station] === officer.id;
                    const isClaimed = !!claimedBy && !isSelected;
                    return (
                      <div 
                        key={officer.id}
                        className={`panel`}
                        style={{ 
                          margin: '8px 0', padding: '8px',
                          cursor: isClaimed ? 'not-allowed' : 'pointer',
                          borderColor: isSelected ? 'var(--color-holo-green)' : isClaimed ? 'rgba(255,100,100,0.3)' : 'var(--color-border)',
                          background: isSelected ? 'rgba(49, 151, 149, 0.1)' : isClaimed ? 'rgba(255,50,50,0.05)' : 'transparent',
                          opacity: isClaimed ? 0.5 : 1,
                        }}
                        onClick={() => !isClaimed && handleOfficerToggle(station, officer.id)}
                        data-testid={`officer-select-${officer.id}`}
                      >
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <img 
                            src={officer.avatar} 
                            alt={officer.name} 
                            style={{ 
                              width: '48px', 
                              height: '48px', 
                              flexShrink: 0,
                              borderRadius: '8px', 
                              objectFit: 'cover',
                              border: `1px solid ${isSelected ? 'var(--color-holo-green)' : isClaimed ? 'rgba(255,100,100,0.3)' : 'var(--color-border)'}` 
                            }} 
                          />
                          <div style={{ flex: 1 }}>
                            <div className="flex-between">
                              <strong style={{ color: isClaimed ? 'var(--color-text-dim)' : 'inherit' }}>{officer.name}</strong>
                              {isClaimed ? (
                                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-alert-red)', border: '1px solid var(--color-alert-red)', padding: '1px 5px', borderRadius: '3px' }}>
                                  ASSIGNED · {claimedBy}
                                </span>
                              ) : (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span className="mono" style={{ fontSize: '0.7rem' }}>Stress: {officer.stressLimit ?? 'IMMUNE'}</span>
                                  <span className="mono" style={{
                                    fontSize: '0.68rem', padding: '1px 6px', borderRadius: '3px',
                                    background: 'rgba(0, 204, 255, 0.12)',
                                    border: '1px solid var(--color-holo-cyan)',
                                    color: 'var(--color-holo-cyan)',
                                    fontWeight: 'bold',
                                  }}>
                                    {officer.dpCost} DP
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="label" style={{ fontSize: '0.7rem', color: isClaimed ? 'var(--color-text-dim)' : 'var(--color-alert-amber)', marginTop: '4px' }}>
                              {officer.traitName}
                            </div>
                            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>
                              {officer.traitEffect}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              {/* Back button — only show in skirmish (step 1 = chassis selection) */}
              {!isCampaignSetup ? (
                <button
                  className="btn"
                  onClick={() => setStep(1)}
                  style={{ fontSize: '0.85rem' }}
                >
                  ← CHASSIS
                </button>
              ) : <div />}
              <button
                className="btn"
                disabled={!hasAllOfficers || (isCampaignSetup && !!dpBreakdown?.isOverBudget)}
                onClick={() => setStep(3)}
                data-testid="next-btn-2"
                title={isCampaignSetup && dpBreakdown?.isOverBudget ? `Over DP budget by ${(dpBreakdown.total - campaignBudget)} DP — remove items to proceed` : undefined}
              >
                EQUIP MODULES →
              </button>
            </div>
          </>
        )}

        {step === 3 && activeChassis && (
          <>
            <h3 style={{ color: 'var(--color-text-bright)' }}>Equip Weapons & Subsystems</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr) minmax(300px, 1fr)', gap: 'var(--space-lg)' }}>
              
              {/* Weapons */}
              <div className="panel panel--raised">
                <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>WEAPONS</div>
                    <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)', padding: '1px 5px', borderRadius: '3px' }}>MIN 1</span>
                  </div>
                  <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedWeapons.length >= 1 && <span style={{ color: 'var(--color-holo-green)', fontSize: '0.8rem' }}>✓</span>}
                    <span style={{ color: selectedWeapons.length >= 1 ? 'var(--color-holo-green)' : 'var(--color-text-dim)' }}>
                      {selectedWeapons.length}/{activeChassis.weaponSlots}
                    </span>
                  </div>
                </div>
                {purchasableWeapons.map(weapon => {
                  const count = selectedWeapons.filter(id => id === weapon.id).length;
                  const isSelected = count > 0;
                  return (
                  <div 
                    key={weapon.id}
                    className={`panel`}
                    style={{ 
                      margin: '8px 0',
                      borderColor: isSelected ? 'var(--color-holo-green)' : 'var(--color-border)',
                      opacity: !isSelected && selectedWeapons.length >= activeChassis.weaponSlots ? 0.3 : 1
                    }}
                    data-testid={`weapon-select-${weapon.id}`}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {weapon.imagePath && (
                        <img
                          src={weapon.imagePath}
                          alt={weapon.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            flexShrink: 0,
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: `1px solid ${isSelected ? 'var(--color-holo-green)' : 'var(--color-border)'}`,
                            background: 'var(--color-bg-raised)',
                          }}
                        />
                      )}
                    <div style={{ flex: 1 }}>
                    <div className="flex-between">
                      <strong>{weapon.name}</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>RP: {weapon.rpCost}</span>
                        <span className="mono" style={{
                          fontSize: '0.68rem', padding: '1px 6px', borderRadius: '3px',
                          background: 'rgba(0, 204, 255, 0.12)',
                          border: '1px solid var(--color-holo-cyan)',
                          color: 'var(--color-holo-cyan)',
                          fontWeight: 'bold',
                        }}>
                          {weapon.dpCost} DP
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '2px' }}>
                          <button 
                            className="btn" 
                            style={{ minWidth: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); handleWeaponRemove(weapon.id); }}
                            disabled={count === 0}
                          >-</button>
                          <span className="mono" style={{ width: '16px', textAlign: 'center', fontSize: '0.8rem' }}>{count}</span>
                          <button 
                            className="btn" 
                            style={{ minWidth: '24px', height: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); handleWeaponAdd(weapon.id); }}
                            disabled={selectedWeapons.length >= activeChassis.weaponSlots}
                            data-testid={`weapon-add-${weapon.id}`}
                          >+</button>
                        </div>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      Range: {weapon.rangeMin}–{weapon.rangeMax === Infinity ? '∞' : weapon.rangeMax} | Dice: {weapon.volleyPool.join(', ')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                      {weapon.arcs.map((arc: string) => {
                        const color = isSelected ? WEAPON_COLORS[selectedWeapons.indexOf(weapon.id) % WEAPON_COLORS.length] : 'var(--color-text-dim)';
                        const arcLabel: Record<string, string> = {
                          fore: 'FORE', foreStarboard: 'F-STBD', aftStarboard: 'A-STBD',
                          aft: 'AFT', aftPort: 'A-PORT', forePort: 'F-PORT',
                        };
                        return (
                          <span key={arc} className="mono" style={{
                            fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px',
                            border: `1px solid ${color}`, color, opacity: isSelected ? 1 : 0.5,
                          }}>
                            {arcLabel[arc] ?? arc}
                          </span>
                        );
                      })}
                    </div>
                    {weapon.tags && weapon.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                        {weapon.tags.map((tag: string) => (
                          <span 
                            key={tag} 
                            className="mono" 
                            title={TAG_DESCRIPTIONS[tag] || tag}
                            style={{
                              fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px',
                              background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-bright)',
                              cursor: 'help', border: '1px dotted rgba(255, 255, 255, 0.3)'
                            }}
                          >
                            {TAG_LABELS[tag] || tag.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                    {isSelected && (
                      <div style={{ marginTop: '6px', height: '4px', background: WEAPON_COLORS[selectedWeapons.indexOf(weapon.id) % WEAPON_COLORS.length], borderRadius: '2px' }} />
                    )}
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-holo-cyan)', marginTop: '6px', lineHeight: '1.3' }}>
                      {weapon.effect}
                    </div>
                  </div>
                  </div>
                  </div>
                  )})}
              </div>

              {/* Subsystems */}
              <div className="panel panel--raised">
                <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="label" style={{ color: 'var(--color-holo-cyan)' }}>SUBSYSTEMS</div>
                    <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', border: '1px solid var(--color-border)', padding: '1px 5px', borderRadius: '3px' }}>OPTIONAL</span>
                  </div>
                  <div className="mono" style={{ color: 'var(--color-text-dim)' }}>
                    {selectedSubsystems.length}/{activeChassis.internalSlots}
                  </div>
                </div>
                {purchasableSubsystems.map(sub => (
                  <div 
                    key={sub.id}
                    className={`panel`}
                    style={{ 
                      margin: '8px 0', cursor: 'pointer',
                      borderColor: selectedSubsystems.includes(sub.id) ? 'var(--color-holo-green)' : 'var(--color-border)',
                      opacity: !selectedSubsystems.includes(sub.id) && selectedSubsystems.length >= activeChassis.internalSlots ? 0.3 : 1
                    }}
                    onClick={() => handleSubsystemToggle(sub.id)}
                    data-testid={`subsystem-select-${sub.id}`}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {sub.imagePath && (
                        <img
                          src={sub.imagePath}
                          alt={sub.name}
                          style={{
                            width: '56px',
                            height: '56px',
                            flexShrink: 0,
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: `1px solid ${selectedSubsystems.includes(sub.id) ? 'var(--color-holo-green)' : 'var(--color-border)'}`,
                            background: 'var(--color-bg-raised)',
                          }}
                        />
                      )}
                    <div style={{ flex: 1 }}>
                    <div className="flex-between">
                      <strong>{sub.name}</strong>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>RP: {sub.rpCost}</span>
                        <span className="mono" style={{
                          fontSize: '0.68rem', padding: '1px 6px', borderRadius: '3px',
                          background: 'rgba(0, 204, 255, 0.12)',
                          border: '1px solid var(--color-holo-cyan)',
                          color: 'var(--color-holo-cyan)',
                          fontWeight: 'bold',
                        }}>
                          {sub.dpCost} DP
                        </span>
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      CT: {sub.ctCost} | Stress: {sub.stressCost} | Station: {sub.station}
                    </div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-holo-cyan)', marginTop: '3px', lineHeight: '1.3' }}>
                      {sub.actionName}: {sub.effect}
                    </div>
                  </div>
                  </div>
                  </div>
                ))}
              </div>

              {/* Preview Segment */}
              <ShipLoadoutPreview chassis={activeChassis} selectedWeaponIds={selectedWeapons} />

            </div>
            

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <button
                className="btn"
                onClick={() => setStep(2)}
                style={{ fontSize: '0.85rem' }}
              >
                ← OFFICERS
              </button>
              <button
                className="btn btn--execute"
                disabled={!allReady}
                onClick={handleFinish}
                data-testid="launch-btn"
                title={!allReady ? "Not all ships are ready" : undefined}
              >
                {scenarioConfig && currentPlayerIndex < scenarioConfig.playerSpawns.length - 1 ? 'NEXT PLAYER' : 'LAUNCH MISSION'}
              </button>
            </div>
          </>
        )}
      </div>
      {/* ── Fleet Readiness Panel (Global) ── */}
      {totalPlayers > 1 && (() => {
        if (allReady) return null;
        return (
          <div style={{ padding: 'var(--space-md)', background: 'rgba(0,0,0,0.5)', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <div className="label" style={{ padding: '5px 10px', borderBottom: '1px solid var(--color-border)', fontSize: '0.6rem', color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>FLEET READINESS</div>
              {readinessRows.map(({ idx, shipLabel, officersFilled, hasOfficers, hasWeapons, isOver, ready }) => (
                <div
                  key={idx}
                  onClick={() => handleTabClick(idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderBottom: idx < totalPlayers - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: idx === currentPlayerIndex ? 'default' : 'pointer', background: idx === currentPlayerIndex ? 'rgba(0,204,255,0.06)' : 'transparent', transition: 'background 0.15s' }}
                >
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: ready ? 'var(--color-holo-green)' : 'var(--color-hostile-red)', flexShrink: 0 }} />
                  <span className="mono" style={{ fontSize: '0.7rem', color: idx === currentPlayerIndex ? 'var(--color-text-bright)' : 'var(--color-text-secondary)', flex: 1 }}>{shipLabel}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span title={`Officers: ${officersFilled}/4`} style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: hasOfficers ? 'rgba(0,200,100,0.15)' : 'rgba(255,80,80,0.15)', color: hasOfficers ? 'var(--color-holo-green)' : '#ff7070', fontFamily: 'var(--font-mono)' }}>
                      {hasOfficers ? '✓' : `${officersFilled}/4`} OFF
                    </span>
                    <span title={hasWeapons ? 'Weapons equipped' : 'No weapons equipped'} style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: hasWeapons ? 'rgba(0,200,100,0.15)' : 'rgba(255,80,80,0.15)', color: hasWeapons ? 'var(--color-holo-green)' : '#ff7070', fontFamily: 'var(--font-mono)' }}>
                      {hasWeapons ? '✓' : '!'} WPN
                    </span>
                    {isCampaignSetup && (
                      <span title={isOver ? 'Over DP budget' : 'Within DP budget'} style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '3px', background: isOver ? 'rgba(255,80,80,0.15)' : 'rgba(0,200,100,0.15)', color: isOver ? '#ff7070' : 'var(--color-holo-green)', fontFamily: 'var(--font-mono)' }}>
                        {isOver ? '!' : '✓'} DP
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
