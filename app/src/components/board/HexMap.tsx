import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../../store/useGameStore';
import { useUIStore, type SelectionTarget } from '../../store/useUIStore';
import SelectionPicker from './SelectionPicker';
import { hexToPixel, hexCorners, hexKey, pixelToHex, isInFiringArc, hexDistance, hexNeighbors } from '../../engine/hexGrid';
import { EXECUTION_STEP_ORDER, getShipSizeForStep, isAlliedStep, isInBreakoutZone } from '../../engine/GameStateMachine';
import type { TerrainType, ShipArc, ShipState, EnemyShipState, TacticHazardState } from '../../types/game';
import { getWeaponById } from '../../data/weapons';
import { applyPlasmaAccelerators } from '../../engine/techEffects';
import { getAdversaryById } from '../../data/adversaries';
import { getStationById } from '../../data/stations';
import { TerrainLegend } from './TerrainLegend';
import { getTerrainColor, drawHexPolygon, drawShipTriangle, drawShipShields, attachOrUpdateSprite, drawFacingIndicator, drawShipHull } from '../../engine/pixiGraphics';
import { getFighterClassById } from '../../data/fighters';
import { getValidTargetsForWeapon } from '../../engine/combat';
import { createWeaponFireAnimation, type ActiveFireAnimation } from '../../engine/weaponFireAnimations';

import { getSubsystemById } from '../../data/subsystems';
import { projectDriftPreview } from '../../engine/movement';
import { previewAITierMovement, type AIMovementPreview } from '../../engine/ai/aiTurn';
import { resolveFighterMovement } from '../../engine/ai/fighterAI';
import ShipInfoPanel, { getMapHoverTargetId, type MapHoverTarget } from './ShipInfoPanel';

// ─── Raw PixiJS via useRef (no @pixi/react reconciler) ──────────



interface TrackedEntity {
  gfx: PIXI.Graphics;
  targetX: number;
  targetY: number;
  targetRot: number;
}

export default function HexMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);

  const layersRef = useRef<{
    terrain: PIXI.Container | null;
    entities: PIXI.Container | null;
    overlays: PIXI.Container | null;
    animations: PIXI.Container | null;
  }>({ terrain: null, entities: null, overlays: null, animations: null });

  const entitiesRef = useRef<{
    ships: Map<string, TrackedEntity>;
    enemies: Map<string, TrackedEntity>;
    fighters: Map<string, TrackedEntity>;
    torpedoes: Map<string, TrackedEntity>;
    stations: Map<string, TrackedEntity>;
  }>({
    ships: new Map(),
    enemies: new Map(),
    fighters: new Map(),
    torpedoes: new Map(),
    stations: new Map(),
  });

  // Tracks animations currently being driven by the PixiJS ticker
  const activeAnimationsRef = useRef<Map<string, ActiveFireAnimation>>(new Map());

  const terrainMap = useGameStore(s => s.terrainMap);
  const playerShips = useGameStore(s => s.playerShips);
  const enemyShips = useGameStore(s => s.enemyShips);
  const fighterTokens = useGameStore(s => s.fighterTokens);
  const torpedoTokens = useGameStore(s => s.torpedoTokens);
  const stations = useGameStore(s => s.stations);
  const objectiveMarkers = useGameStore(s => s.objectiveMarkers);
  const tacticHazards = useGameStore(s => s.tacticHazards);
  const objectiveType = useGameStore(s => s.objectiveType);
  const scenarioId = useGameStore(s => s.scenarioId);
  const currentTactic = useGameStore(s => s.currentTactic);
  const deploymentMode = useGameStore(s => s.deploymentMode);
  const deploymentBounds = useGameStore(s => s.deploymentBounds);
  const deploymentSelectedShipId = useGameStore(s => s.deploymentSelectedShipId);
  const resolveAction = useGameStore(s => s.resolveAction);
  const selectDeploymentShip = useGameStore(s => s.selectDeploymentShip);
  const rotateDeploymentShip = useGameStore(s => s.rotateDeploymentShip);
  const setDeploymentShipPosition = useGameStore(s => s.setDeploymentShipPosition);
  const players = useGameStore(s => s.players);
  const { cameraX, cameraY, cameraZoom, panCamera, zoomCamera, hoveredHex } = useUIStore();
  const selectedShipId = useUIStore(s => s.selectedShipId);
  const targetingMode = useUIStore(s => s.targetingMode);
  const activeTargetingAction = useUIStore(s => s.activeTargetingAction);
  const activeTargetingContext = useUIStore(s => s.activeTargetingContext);

  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });
  const [pointerDown, setPointerDown] = useState({ x: 0, y: 0 });
  const [hoverTooltip, setHoverTooltip] = useState<{ target: MapHoverTarget; position: { x: number; y: number } } | null>(null);
  const [isTooltipLocked, setIsTooltipLocked] = useState(false);
  const isLockedRef = useRef(false);

  // Subscribe to pending fire animation queue
  const pendingFireAnimations = useUIStore(s => s.pendingFireAnimations);

  // ─── Init Pixi app ───────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const app = new PIXI.Application({
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: containerRef.current,
    });
    containerRef.current.appendChild(app.view as HTMLCanvasElement);
    
    const world = new PIXI.Container();
    app.stage.addChild(world);
    
    layersRef.current.terrain = new PIXI.Container();
    layersRef.current.entities = new PIXI.Container();
    layersRef.current.overlays = new PIXI.Container();
    layersRef.current.animations = new PIXI.Container();

    world.addChild(layersRef.current.terrain);
    world.addChild(layersRef.current.entities);
    world.addChild(layersRef.current.overlays);
    world.addChild(layersRef.current.animations);

    appRef.current = app;
    worldRef.current = world;

    // Run custom lerp ticker
    app.ticker.add((delta) => {
      // 0.15 * delta feels nicely responsive ~200ms settling time
      const lerpAmt = 0.15 * delta;

      const animateMap = (map: Map<string, TrackedEntity>, syncRot: boolean) => {
        map.forEach(ent => {
          ent.gfx.x += (ent.targetX - ent.gfx.x) * lerpAmt;
          ent.gfx.y += (ent.targetY - ent.gfx.y) * lerpAmt;
          
          if (syncRot) {
            let diff = ent.targetRot - ent.gfx.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            ent.gfx.rotation += diff * lerpAmt;
          }
          
          const unrotatable = ent.gfx.getChildByName('unrotatable');
          if (unrotatable) {
            unrotatable.rotation = -ent.gfx.rotation;
          }
        });
      };

      animateMap(entitiesRef.current.ships, true);
      animateMap(entitiesRef.current.enemies, true);
      animateMap(entitiesRef.current.torpedoes, true);
      animateMap(entitiesRef.current.fighters, true);
      animateMap(entitiesRef.current.stations, false);

      // ─── Drive weapon fire animations ────────────────────────────────────
      // delta is in ticker units (~1 per frame at 60fps); *16.7 ≈ ms
      const dtMs = delta * (1000 / 60);
      activeAnimationsRef.current.forEach((anim, id) => {
        anim.elapsed += dtMs;
        const progress = Math.min(1, anim.elapsed / anim.duration);
        anim.gfx.clear();
        anim.update(anim.gfx, progress);
        if (progress >= 1) {
          layersRef.current.animations?.removeChild(anim.gfx);
          anim.gfx.destroy();
          activeAnimationsRef.current.delete(id);
        }
      });
    });

    // Center the camera on hex (0,0) which is the player's starting position
    useUIStore.getState().setCameraPosition(w / 2, h / 2, 1);

    return () => {
      app.destroy(true, { children: true });
      appRef.current = null;
      worldRef.current = null;
      layersRef.current = { terrain: null, entities: null, overlays: null, animations: null };
      entitiesRef.current = { ships: new Map(), enemies: new Map(), fighters: new Map(), torpedoes: new Map(), stations: new Map() };
      activeAnimationsRef.current.clear();
    };
  }, []);

  // ─── Spawn new fire animations from the UIStore queue ──────────────────────
  useEffect(() => {
    if (!layersRef.current.animations) return;
    pendingFireAnimations.forEach(event => {
      if (event.weaponTags.includes('torpedo')) return;
      if (activeAnimationsRef.current.has(event.id)) return; // don't double-spawn
      const fromPx = hexToPixel(event.attackerPos);
      const toPx   = hexToPixel(event.targetPos);
      const anim   = createWeaponFireAnimation(event, fromPx, toPx);
      layersRef.current.animations!.addChild(anim.gfx);
      activeAnimationsRef.current.set(event.id, anim);
      // Remove from queue so we don't re-spawn on the next render cycle
      useUIStore.getState().consumeFireAnimation(event.id);
    });
  }, [pendingFireAnimations]);

  // ─── Redraw on state change ──────────────────────────
  useEffect(() => {
    if (!layersRef.current.entities || !layersRef.current.terrain || !layersRef.current.overlays) return;

    // ── TERRAIN ──
    layersRef.current.terrain.removeChildren();
    const terrainGfx = new PIXI.Graphics();
    
    // Determine visible area for infinite grid
    const screenWidth = appRef.current?.screen.width || 800;
    const screenHeight = appRef.current?.screen.height || 600;
    const left = -cameraX / cameraZoom;
    const right = (screenWidth - cameraX) / cameraZoom;
    const top = -cameraY / cameraZoom;
    const bottom = (screenHeight - cameraY) / cameraZoom;
    
    const centerHex = pixelToHex((left + right) / 2, (top + bottom) / 2);
    const radiusX = Math.ceil((right - left) / 80);
    const radiusY = Math.ceil((bottom - top) / 80);
    const radius = Math.max(radiusX, radiusY) + 2;

    for (let q = centerHex.q - radius; q <= centerHex.q + radius; q++) {
      for (let r = centerHex.r - radius; r <= centerHex.r + radius; r++) {
        const center = hexToPixel({ q, r });
        if (center.x >= left - 60 && center.x <= right + 60 && center.y >= top - 60 && center.y <= bottom + 60) {
          const key = hexKey({ q, r });
          const type = terrainMap.get(key) || 'open';
          drawHexPolygon(terrainGfx, center.x, center.y, type);
        }
      }
    }
    layersRef.current.terrain.addChild(terrainGfx);

    // ── ENTITIES ──
    const { ships, enemies, fighters, torpedoes } = entitiesRef.current;

    const syncEntities = <T extends { id: string, isDestroyed: boolean }>(
      sourceList: T[], 
      trackMap: Map<string, TrackedEntity>,
      drawFn: (item: T, g: PIXI.Graphics, getTargetPos: () => {x: number, y: number, rot: number}, isNew: boolean) => void
    ) => {
      const toRemove = new Set(trackMap.keys());

      sourceList.forEach(item => {
        if (item.isDestroyed) return;
        toRemove.delete(item.id);

        let ent = trackMap.get(item.id);
        let targetParams = { x: 0, y: 0, rot: 0 };

        if (!ent) {
          const gfx = new PIXI.Graphics();
          layersRef.current.entities!.addChild(gfx);
          ent = { gfx, targetX: 0, targetY: 0, targetRot: 0 };
          trackMap.set(item.id, ent);
          
          drawFn(item, gfx, () => targetParams, true);
          gfx.x = targetParams.x;
          gfx.y = targetParams.y;
          gfx.rotation = targetParams.rot;
        }

        drawFn(item, ent.gfx, () => targetParams, false);
        ent.targetX = targetParams.x;
        ent.targetY = targetParams.y;
        ent.targetRot = targetParams.rot;
      });

      toRemove.forEach(id => {
        const ent = trackMap.get(id);
        if (ent) {
          layersRef.current.entities!.removeChild(ent.gfx);
          ent.gfx.destroy();
          trackMap.delete(id);
        }
      });
    };

    // Draw player ships
    syncEntities(playerShips, ships, (ship, g, getParams, isNew) => {
      g.clear();
      const hasSprite = attachOrUpdateSprite(g, ship.chassisId, isNew, 'player');
      if (!hasSprite) {
        drawShipTriangle(g, 0, 0, 0, 'player');
      } else {
        drawFacingIndicator(g, 'player');
      }
      drawShipShields(g, 0, 0, 0, ship.shields as any, ship.maxShieldsPerSector, 'player');
      
      let unrotatable = g.getChildByName('unrotatable') as PIXI.Graphics | null;
      if (!unrotatable) {
        unrotatable = new PIXI.Graphics();
        unrotatable.name = 'unrotatable';
        g.addChild(unrotatable);
      }
      unrotatable.clear();
      drawShipHull(unrotatable, 0, 0, ship.currentHull, ship.maxHull);
      
      const center = hexToPixel(ship.position);
      const rot = ((ship.facing * 60) - 30) * (Math.PI / 180);
      const p = getParams();
      p.x = center.x; p.y = center.y; p.rot = rot;
      if (deploymentMode && deploymentSelectedShipId === ship.id) {
        g.lineStyle(3, 0x00FF88, 0.95);
        g.drawCircle(0, 0, 24);
      }
    });

    // Draw enemy/allied ships
    const visibleEnemyShips = deploymentMode ? [] : enemyShips;
    syncEntities(visibleEnemyShips, enemies, (ship, g, getParams, isNew) => {
      g.clear();
      const allegiance = ship.isAllied ? 'allied' : 'enemy';
      const hasSprite = attachOrUpdateSprite(g, ship.adversaryId, isNew, allegiance);
      if (!hasSprite) {
        drawShipTriangle(g, 0, 0, 0, allegiance);
      } else {
        drawFacingIndicator(g, allegiance);
      }
      const adv = getAdversaryById(ship.adversaryId);
      drawShipShields(g, 0, 0, 0, ship.shields as any, adv?.shieldsPerSector || 0, allegiance);

      let unrotatable = g.getChildByName('unrotatable') as PIXI.Graphics | null;
      if (!unrotatable) {
        unrotatable = new PIXI.Graphics();
        unrotatable.name = 'unrotatable';
        g.addChild(unrotatable);
      }
      unrotatable.clear();
      drawShipHull(unrotatable, 0, 0, ship.currentHull, ship.maxHull);

      const center = hexToPixel(ship.position);
      const rot = ((ship.facing * 60) - 30) * (Math.PI / 180);
      const p = getParams();
      p.x = center.x; p.y = center.y; p.rot = rot;
    });

    // Draw fighter tokens
    const fighterGroups = new Map<string, string[]>();
    fighterTokens.filter(f => !f.isDestroyed).forEach(f => {
      const k = hexKey(f.position);
      if (!fighterGroups.has(k)) fighterGroups.set(k, []);
      fighterGroups.get(k)!.push(f.id);
    });

    const activeFighters = fighterTokens.filter(f => !f.isDestroyed);
    syncEntities(activeFighters, fighters, (f, g, getParams, isNew) => {
      g.clear();
      const fc = getFighterClassById(f.classId);
      const spriteKey = fc?.imageKey || (f.allegiance === 'enemy' ? 'strike-fighter' : 'allied-fighter');
      const hasSprite = attachOrUpdateSprite(g, spriteKey, isNew, f.allegiance === 'enemy' ? 'enemy' : 'allied');
      if (!hasSprite) {
        const color = f.allegiance === 'allied' ? 0x7CFFB2 : 0xFF6B6B;
        const glowColor = f.allegiance === 'allied' ? 0x7CFFB2 : 0xFF8A8A;

        g.lineStyle(1.5, color, 0.9);
        g.beginFill(glowColor, 0.5);
        // Small right-pointing triangle (container rotation handles facing)
        g.moveTo(8, 0);
        g.lineTo(-5, 5);
        g.lineTo(-5, -5);
        g.closePath();
        g.endFill();
      } else {
        const color = f.allegiance === 'allied' ? 0x7CFFB2 : 0xFF6B6B;
        g.lineStyle(1.5, color, 0.9);
        g.beginFill(color, 0.7);
        // Small chevron pointing right, just ahead of the sprite nose
        g.moveTo(18, 0);
        g.lineTo(12, 4);
        g.lineTo(14, 0);
        g.lineTo(12, -4);
        g.closePath();
        g.endFill();
      }

      const key = hexKey(f.position);
      const group = fighterGroups.get(key) || [];
      const index = group.indexOf(f.id);
      const count = group.length;

      const baseCenter = hexToPixel(f.position);
      const angleOffset = (index / count) * Math.PI * 2;
      const spreadR = count > 1 ? 10 : 0;
      const fx = baseCenter.x + Math.cos(angleOffset) * spreadR;
      const fy = baseCenter.y + Math.sin(angleOffset) * spreadR;

      const rot = ((f.facing * 60) - 30) * (Math.PI / 180);
      const p = getParams();
      p.x = fx; p.y = fy; p.rot = rot;
    });

    // Draw Stations
    const activeStations = stations.filter(s => !s.isDestroyed);
    syncEntities(activeStations, entitiesRef.current.stations, (station, g, getParams, isNew) => {
      g.clear();
      const stationData = getStationById(station.stationId);
      
      const spriteKey = stationData?.imageKey;
      const hasSprite = attachOrUpdateSprite(g, spriteKey, isNew, 'enemy');

      if (!hasSprite) {
        const isTurret = stationData?.type === 'turret';
        const color = 0xFF6633; // orange-red for stations
        const fillColor = 0xAA3311;

        if (isTurret) {
          // Turret: smaller square-ish shape
          g.lineStyle(2, color, 1);
          g.beginFill(fillColor, 0.7);
          g.drawRect(-10, -10, 20, 20);
          g.endFill();
          // Turret barrel pointing in facing direction
          const barrelLen = 14;
          const rot = ((station.facing * 60) - 30) * (Math.PI / 180);
          g.lineStyle(2.5, 0xFFAA44, 1);
          g.moveTo(0, 0);
          g.lineTo(Math.cos(rot) * barrelLen, Math.sin(rot) * barrelLen);
        } else {
          // Station: larger hexagonal shape
          g.lineStyle(2.5, color, 1);
          g.beginFill(fillColor, 0.6);
          const corners = hexCorners({ x: 0, y: 0 }, 16);
          g.moveTo(corners[0].x, corners[0].y);
          for (let i = 1; i < 6; i++) {
            g.lineTo(corners[i].x, corners[i].y);
          }
          g.closePath();
          g.endFill();
          // Forward arc indicator
          const rot = ((station.facing * 60) - 30) * (Math.PI / 180);
          g.lineStyle(2, 0xFFAA44, 0.8);
          g.moveTo(0, 0);
          g.lineTo(Math.cos(rot) * 18, Math.sin(rot) * 18);
        }
      }

      // Draw shields at facing 0 — the container is rotated, same as ships.
      drawShipShields(g, 0, 0, 0, station.shields as any, station.maxShieldsPerSector, 'enemy');

      // Hull bar (must stay world-aligned, so put it in the unrotatable child)
      let unrotatable = g.getChildByName('unrotatable') as PIXI.Graphics | null;
      if (!unrotatable) {
        unrotatable = new PIXI.Graphics();
        unrotatable.name = 'unrotatable';
        g.addChild(unrotatable);
      }
      unrotatable.clear();
      drawShipHull(unrotatable, 0, 0, station.currentHull, station.maxHull);

      const center = hexToPixel(station.position);
      const rot = ((station.facing * 60) - 30) * (Math.PI / 180);
      const p = getParams();
      p.x = center.x; p.y = center.y; p.rot = rot;
    });

    // Draw Torpedo tokens
    const activeTorpedoes = torpedoTokens.filter(t => !t.isDestroyed);
    syncEntities(activeTorpedoes, torpedoes, (t, g, getParams, isNew) => {
      g.clear();
      g.lineStyle(2, 0xFFD700, 1);
      g.beginFill(0xFF8800, 0.6);
      
      g.moveTo(12, 0);
      g.lineTo(-8, 6);
      g.lineTo(-4, 0);
      g.lineTo(-8, -6);
      g.closePath();
      g.endFill();

      const center = hexToPixel(t.position);
      let rot = 0;
      const tShip = playerShips.find(s => s.id === t.targetShipId) || enemyShips.find(s => s.id === t.targetShipId);
      if (tShip) {
        const targetCenter = hexToPixel(tShip.position);
        rot = Math.atan2(targetCenter.y - center.y, targetCenter.x - center.x);
      }

      const p = getParams();
      p.x = center.x; p.y = center.y; p.rot = rot;
    });

    // ── OVERLAYS ──
    layersRef.current.overlays.removeChildren();

    // Mandatory drift preview for all capital ships.
    if (!deploymentMode) {
      const driftPreviewGfx = new PIXI.Graphics();
      const playerCapitalShips = playerShips.filter(ship => !ship.isDestroyed && ship.currentSpeed > 0);
      const capitalShips = [...playerCapitalShips, ...enemyShips].filter(ship => !ship.isDestroyed && ship.currentSpeed > 0);
      const occupiedHexes = new Set(capitalShips.map(ship => hexKey(ship.position)));
      const enemyMovementPreviews = new Map<string, AIMovementPreview>();
      const simulatedEnemyShips = enemyShips.map(ship => ({ ...ship, position: { ...ship.position } }));

      for (const step of EXECUTION_STEP_ORDER) {
        const stepSize = getShipSizeForStep(step);
        const stepAllied = isAlliedStep(step);
        const actingEnemies = simulatedEnemyShips.filter(enemy => {
          if (enemy.isDestroyed || enemy.hasDrifted) return false;
          const adversary = getAdversaryById(enemy.adversaryId);
          return !!adversary && adversary.size === stepSize && !!enemy.isAllied === stepAllied;
        });

        if (actingEnemies.length === 0) continue;

        const tierPreview = previewAITierMovement(
          actingEnemies,
          playerShips,
          simulatedEnemyShips,
          currentTactic,
          occupiedHexes,
          terrainMap,
          players,
        );

        tierPreview.forEach((preview, shipId) => {
          enemyMovementPreviews.set(shipId, preview);
          const simulatedShip = simulatedEnemyShips.find(ship => ship.id === shipId);
          if (simulatedShip) {
            simulatedShip.position = preview.targetHex;
            simulatedShip.facing = preview.newFacing;
            simulatedShip.hasDrifted = true;
          }
        });
      }

      playerCapitalShips.forEach(ship => {
        occupiedHexes.delete(hexKey(ship.position));
        const preview = projectDriftPreview(ship, occupiedHexes, terrainMap);
        occupiedHexes.add(hexKey(ship.position));

        if (preview.path.length === 0 && !preview.collision) return;

        const isSelected = ship.id === selectedShipId;
        const lineColor = isSelected ? 0xB8FFF6 : 0x69EBD8;
        const endpointColor = preview.collision
          ? 0xFF5C7A
          : preview.haltedByAsteroids
            ? 0xF6D365
            : lineColor;
        const lineAlpha = isSelected ? 0.72 : 0.34;
        const lineWidth = isSelected ? 3 : 1.5;

        driftPreviewGfx.lineStyle(lineWidth, lineColor, lineAlpha);

        const startPx = hexToPixel(ship.position);
        driftPreviewGfx.moveTo(startPx.x, startPx.y);
        preview.path.forEach(step => {
          const stepPx = hexToPixel(step);
          driftPreviewGfx.lineTo(stepPx.x, stepPx.y);
        });

        const finalPx = hexToPixel(preview.finalPosition);
        const markerRadius = isSelected ? 17 : 13;
        driftPreviewGfx.lineStyle(isSelected ? 3 : 2, endpointColor, isSelected ? 0.95 : 0.7);
        driftPreviewGfx.beginFill(endpointColor, isSelected ? 0.18 : 0.08);
        const corners = hexCorners({ x: finalPx.x, y: finalPx.y }, markerRadius);
        driftPreviewGfx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          driftPreviewGfx.lineTo(corners[i].x, corners[i].y);
        }
        driftPreviewGfx.closePath();
        driftPreviewGfx.endFill();

        if (preview.path.length > 0) {
          const previousHex = preview.path.length > 1 ? preview.path[preview.path.length - 2] : ship.position;
          const previousPx = hexToPixel(previousHex);
          const dx = finalPx.x - previousPx.x;
          const dy = finalPx.y - previousPx.y;
          const length = Math.hypot(dx, dy);
          if (length > 0.001) {
            const ux = dx / length;
            const uy = dy / length;
            const arrowSize = isSelected ? 11 : 8;
            const baseX = finalPx.x - ux * (markerRadius + 2);
            const baseY = finalPx.y - uy * (markerRadius + 2);
            const leftX = baseX - ux * arrowSize - uy * (arrowSize * 0.55);
            const leftY = baseY - uy * arrowSize + ux * (arrowSize * 0.55);
            const rightX = baseX - ux * arrowSize + uy * (arrowSize * 0.55);
            const rightY = baseY - uy * arrowSize - ux * (arrowSize * 0.55);

            driftPreviewGfx.beginFill(endpointColor, isSelected ? 0.9 : 0.72);
            driftPreviewGfx.moveTo(finalPx.x, finalPx.y);
            driftPreviewGfx.lineTo(leftX, leftY);
            driftPreviewGfx.lineTo(rightX, rightY);
            driftPreviewGfx.closePath();
            driftPreviewGfx.endFill();
          }
        }

        if (preview.collision && preview.collidedWithHex) {
          const blockedPx = hexToPixel(preview.collidedWithHex);
          driftPreviewGfx.lineStyle(2, 0xFF5C7A, 0.85);
          driftPreviewGfx.moveTo(blockedPx.x - 8, blockedPx.y - 8);
          driftPreviewGfx.lineTo(blockedPx.x + 8, blockedPx.y + 8);
          driftPreviewGfx.moveTo(blockedPx.x + 8, blockedPx.y - 8);
          driftPreviewGfx.lineTo(blockedPx.x - 8, blockedPx.y + 8);
        }
      });

      enemyShips
        .filter(ship => !ship.isDestroyed && !ship.hasDrifted)
        .forEach(ship => {
          const preview = enemyMovementPreviews.get(ship.id);
          if (!preview) return;

          const isSelected = ship.id === selectedShipId;
          const lineColor = isSelected ? 0xFFD5BF : ship.isAllied ? 0x69EBD8 : 0xFF9D6E;
          const endpointColor = preview.noMovement ? 0xF6D365 : lineColor;
          const lineAlpha = isSelected ? 0.78 : 0.4;
          const lineWidth = isSelected ? 3 : 1.5;

          driftPreviewGfx.lineStyle(lineWidth, lineColor, lineAlpha);

          const startPx = hexToPixel(ship.position);
          driftPreviewGfx.moveTo(startPx.x, startPx.y);
          preview.path.forEach(step => {
            const stepPx = hexToPixel(step);
            driftPreviewGfx.lineTo(stepPx.x, stepPx.y);
          });

          const finalPx = hexToPixel(preview.targetHex);
          const markerRadius = isSelected ? 17 : 13;
          driftPreviewGfx.lineStyle(isSelected ? 3 : 2, endpointColor, isSelected ? 0.95 : 0.7);
          driftPreviewGfx.beginFill(endpointColor, preview.noMovement ? 0.14 : isSelected ? 0.18 : 0.08);
          const corners = hexCorners({ x: finalPx.x, y: finalPx.y }, markerRadius);
          driftPreviewGfx.moveTo(corners[0].x, corners[0].y);
          for (let i = 1; i < corners.length; i++) {
            driftPreviewGfx.lineTo(corners[i].x, corners[i].y);
          }
          driftPreviewGfx.closePath();
          driftPreviewGfx.endFill();

          if (preview.path.length > 0) {
            const previousHex = preview.path.length > 1 ? preview.path[preview.path.length - 2] : ship.position;
            const previousPx = hexToPixel(previousHex);
            const dx = finalPx.x - previousPx.x;
            const dy = finalPx.y - previousPx.y;
            const length = Math.hypot(dx, dy);
            if (length > 0.001) {
              const ux = dx / length;
              const uy = dy / length;
              const arrowSize = isSelected ? 11 : 8;
              const baseX = finalPx.x - ux * (markerRadius + 2);
              const baseY = finalPx.y - uy * (markerRadius + 2);
              const leftX = baseX - ux * arrowSize - uy * (arrowSize * 0.55);
              const leftY = baseY - uy * arrowSize + ux * (arrowSize * 0.55);
              const rightX = baseX - ux * arrowSize + uy * (arrowSize * 0.55);
              const rightY = baseY - uy * arrowSize - ux * (arrowSize * 0.55);

              driftPreviewGfx.beginFill(endpointColor, isSelected ? 0.9 : 0.72);
              driftPreviewGfx.moveTo(finalPx.x, finalPx.y);
              driftPreviewGfx.lineTo(leftX, leftY);
              driftPreviewGfx.lineTo(rightX, rightY);
              driftPreviewGfx.closePath();
              driftPreviewGfx.endFill();
            }
          }
        });

      layersRef.current.overlays!.addChild(driftPreviewGfx);
    }

    // Fighter movement previews
    if (!deploymentMode) {
      const fighterPreviewGfx = new PIXI.Graphics();
      const activeFighterTokens = fighterTokens.filter(f => !f.isDestroyed && !f.hasDrifted);
      let simulatedFighters = [...fighterTokens];

      activeFighterTokens.forEach(fighter => {
        const moveResult = resolveFighterMovement(
          fighter,
          playerShips,
          enemyShips,
          simulatedFighters,
          terrainMap,
          torpedoTokens,
          stations,
        );

        const fIdx = simulatedFighters.findIndex(sf => sf.id === fighter.id);
        if (fIdx !== -1) {
          simulatedFighters[fIdx] = { 
            ...simulatedFighters[fIdx], 
            position: moveResult.newPosition,
            facing: moveResult.newFacing 
          };
        }

        if (!moveResult.moved || moveResult.traversedHexes.length === 0) {
          if (moveResult.intentionalHold) {
            const isAllied = fighter.allegiance === 'allied';
            const lineColor = isAllied ? 0x7CFFB2 : 0xFF6B6B;
            const markerRadius = 10;
            const startPx = hexToPixel(fighter.position);
            
            fighterPreviewGfx.lineStyle(1.5, lineColor, 0.65);
            fighterPreviewGfx.beginFill(lineColor, 0.1);
            const corners = hexCorners({ x: startPx.x, y: startPx.y }, markerRadius);
            fighterPreviewGfx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < 6; i++) {
              fighterPreviewGfx.lineTo(corners[i].x, corners[i].y);
            }
            fighterPreviewGfx.closePath();
            fighterPreviewGfx.endFill();
          }
          return;
        }

        const isAllied = fighter.allegiance === 'allied';
        const lineColor = isAllied ? 0x7CFFB2 : 0xFF6B6B;
        const lineAlpha = 0.45;
        const markerRadius = 10;

        fighterPreviewGfx.lineStyle(1.5, lineColor, lineAlpha);
        const startPx = hexToPixel(fighter.position);
        fighterPreviewGfx.moveTo(startPx.x, startPx.y);
        moveResult.traversedHexes.forEach(step => {
          const stepPx = hexToPixel(step);
          fighterPreviewGfx.lineTo(stepPx.x, stepPx.y);
        });

        const finalPx = hexToPixel(moveResult.newPosition);
        // Destination hexagon marker
        fighterPreviewGfx.lineStyle(1.5, lineColor, 0.65);
        fighterPreviewGfx.beginFill(lineColor, 0.1);
        const corners = hexCorners({ x: finalPx.x, y: finalPx.y }, markerRadius);
        fighterPreviewGfx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
          fighterPreviewGfx.lineTo(corners[i].x, corners[i].y);
        }
        fighterPreviewGfx.closePath();
        fighterPreviewGfx.endFill();

        // Arrowhead
        const prevHex = moveResult.traversedHexes.length > 1
          ? moveResult.traversedHexes[moveResult.traversedHexes.length - 2]
          : fighter.position;
        const prevPx = hexToPixel(prevHex);
        const dx = finalPx.x - prevPx.x;
        const dy = finalPx.y - prevPx.y;
        const length = Math.hypot(dx, dy);
        if (length > 0.001) {
          const ux = dx / length;
          const uy = dy / length;
          const arrowSize = 6;
          const baseX = finalPx.x - ux * (markerRadius + 1);
          const baseY = finalPx.y - uy * (markerRadius + 1);
          const leftX = baseX - ux * arrowSize - uy * (arrowSize * 0.55);
          const leftY = baseY - uy * arrowSize + ux * (arrowSize * 0.55);
          const rightX = baseX - ux * arrowSize + uy * (arrowSize * 0.55);
          const rightY = baseY - uy * arrowSize - ux * (arrowSize * 0.55);
          fighterPreviewGfx.beginFill(lineColor, 0.72);
          fighterPreviewGfx.moveTo(finalPx.x, finalPx.y);
          fighterPreviewGfx.lineTo(leftX, leftY);
          fighterPreviewGfx.lineTo(rightX, rightY);
          fighterPreviewGfx.closePath();
          fighterPreviewGfx.endFill();
        }
      });

      layersRef.current.overlays!.addChild(fighterPreviewGfx);
    }
    
    // Fighter count badges
    fighterGroups.forEach((group, key) => {
      if (group.length > 1) {
        const f = fighterTokens.find(ft => ft.id === group[0]);
        if (f) {
          const center = hexToPixel(f.position);
          const badge = new PIXI.Text(`×${group.length}`, {
            fontSize: 9, fill: 0xFFFFFF, fontFamily: 'monospace',
          });
          badge.x = center.x - badge.width / 2;
          badge.y = center.y + 12;
          layersRef.current.overlays!.addChild(badge);
        }
      }
    });

    // ── OBJECTIVE ZONE HIGHLIGHTS ──
    const zoneGfx = new PIXI.Graphics();
    
    // 1. Breakout Escape Zone (Upper-Right)
    if (objectiveType === 'Breakout') {
      zoneGfx.lineStyle(1, 0x00FF88, 0.4);
      zoneGfx.beginFill(0x00FF88, 0.1);
      for (let q = -8; q <= 8; q++) {
        for (let r = -8; r <= 8; r++) {
          if (Math.abs(q) + Math.abs(q + r) + Math.abs(r) <= 16) {
            if (isInBreakoutZone({ q, r })) {
              const center = hexToPixel({ q, r });
              const corners = hexCorners({ x: 0, y: 0 });
              zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
              for (let ci = 1; ci < 6; ci++) {
                zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
              }
              zoneGfx.closePath();
            }
          }
        }
      }
      zoneGfx.endFill();
    }

    // 2. Data Siphon Capture Zones (Relay + Neighbors)
    if (objectiveType === 'Data Siphon') {
      zoneGfx.lineStyle(2, 0x00FFFF, 0.5);
      zoneGfx.beginFill(0x00FFFF, 0.05);
      objectiveMarkers.forEach(m => {
        if (m.isCollected || !m.name.includes('Relay')) return;
        const neighborhood = [m.position, ...hexNeighbors(m.position)];
        neighborhood.forEach(h => {
          const center = hexToPixel(h);
          const corners = hexCorners({ x: 0, y: 0 });
          zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
          for (let ci = 1; ci < 6; ci++) {
            zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
          }
          zoneGfx.closePath();
        });
      });
      zoneGfx.endFill();
    }

    // 3. Salvage Run / Crate Highlights
    if (objectiveType === 'Salvage Run') {
      zoneGfx.lineStyle(2, 0xFFCC00, 0.5);
      zoneGfx.beginFill(0xFFCC00, 0.1);
      objectiveMarkers.forEach(m => {
        if (m.isCollected || !m.name.includes('Crate')) return;
        const center = hexToPixel(m.position);
        const corners = hexCorners({ x: 0, y: 0 });
        zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
        for (let ci = 1; ci < 6; ci++) {
          zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
        }
        zoneGfx.closePath();
      });
      zoneGfx.endFill();
    }

    // 4. Deployment Zone Highlight (players choose their launch box)
    if (deploymentMode && deploymentBounds) {
      const deploymentHexes = deploymentBounds.hexes && deploymentBounds.hexes.length > 0
        ? deploymentBounds.hexes
        : (() => {
            const hexes = [];
            for (let q = deploymentBounds.minQ; q <= deploymentBounds.maxQ; q++) {
              for (let r = deploymentBounds.minR; r <= deploymentBounds.maxR; r++) {
                if (Math.abs(q) + Math.abs(q + r) + Math.abs(r) <= 16) {
                  const type = terrainMap.get(hexKey({ q, r })) ?? 'open';
                  if (type === 'open') {
                    hexes.push({ q, r });
                  }
                }
              }
            }
            return hexes;
          })();

      zoneGfx.lineStyle(2, 0xFFB547, 0.75);
      zoneGfx.beginFill(0xFFB547, 0.16);
      for (const hex of deploymentHexes) {
        const center = hexToPixel(hex);
        const corners = hexCorners({ x: 0, y: 0 });
        zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
        for (let ci = 1; ci < 6; ci++) {
          zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
        }
        zoneGfx.closePath();
      }
      zoneGfx.endFill();

      const labelStyle = new PIXI.TextStyle({
        fontSize: 11,
        fill: 0xFFE3A3,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        letterSpacing: 1.2,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 2,
        dropShadowDistance: 1,
      });
      const deploymentLabel = new PIXI.Text('DEPLOYMENT ZONE', labelStyle);
      const anchorHex = deploymentHexes[0] ?? { q: deploymentBounds.minQ, r: deploymentBounds.minR };
      const anchorPos = hexToPixel(anchorHex);
      deploymentLabel.x = anchorPos.x - deploymentLabel.width / 2;
      deploymentLabel.y = anchorPos.y - 34;
      layersRef.current.overlays!.addChild(deploymentLabel);
    }

    // 5. Assassination Target Highlight (Flagship Hex)
    if (objectiveType === 'Assassination' && !deploymentMode) {
      zoneGfx.lineStyle(3, 0xFF0000, 0.6);
      zoneGfx.beginFill(0xFF0000, 0.15);
      const flagship = enemyShips.find(s => s.name.includes('(Flagship)'));
      if (flagship && !flagship.isDestroyed) {
        const center = hexToPixel(flagship.position);
        const corners = hexCorners({ x: 0, y: 0 });
        zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
        for (let ci = 1; ci < 6; ci++) {
          zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
        }
        zoneGfx.closePath();
      }
      zoneGfx.endFill();
    }

    // 6. Ambush at Kaelen-IV Highlight (Comms Array)
    if (scenarioId === 'ambush-kaelen-iv') {
      zoneGfx.lineStyle(3, 0xFFCC00, 0.7);
      zoneGfx.beginFill(0xFFCC00, 0.1);
      const array = objectiveMarkers.find(m => m.name === 'Hegemony Comms Array');
      if (array && !array.isDestroyed) {
        const center = hexToPixel(array.position);
        const corners = hexCorners({ x: 0, y: 0 });
        zoneGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
        for (let ci = 1; ci < 6; ci++) {
          zoneGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
        }
        zoneGfx.closePath();
      }
      zoneGfx.endFill();
    }

    layersRef.current.overlays!.addChild(zoneGfx);

    // Objective Marker Entities (Structures/Crates)
    objectiveMarkers.forEach(marker => {
      if (marker.isDestroyed || marker.isCollected) return;

      const center = hexToPixel(marker.position);
      const mGfx = new PIXI.Graphics();
      
      if (marker.name.includes('Crate')) {
        // Supply Crate — Teal box
        mGfx.lineStyle(2, 0x00FFFF, 1);
        mGfx.beginFill(0x0088AA, 0.6);
        mGfx.drawRect(-8, -8, 16, 16);
        mGfx.endFill();
      } else {
        // Comms Array / Relay — Gold hexagon + HP bar if it has hull
        mGfx.lineStyle(2, 0xFFCC00, 1);
        mGfx.beginFill(0x886600, 0.6);
        const corners = hexCorners({ x: 0, y: 0 }, 12);
        mGfx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 6; i++) {
          mGfx.lineTo(corners[i].x, corners[i].y);
        }
        mGfx.closePath();
        mGfx.endFill();

        if (marker.hull > 0 && marker.maxHull > 0) {
          const pct = Math.max(0, marker.hull / marker.maxHull);
          mGfx.beginFill(0x333333);
          mGfx.drawRect(-10, -16, 20, 3);
          mGfx.endFill();
          mGfx.beginFill(pct > 0.5 ? 0x00FF00 : pct > 0.25 ? 0xFFFF00 : 0xFF0000);
          mGfx.drawRect(-10, -16, 20 * pct, 3);
          mGfx.endFill();
        }
      }

      // Floating label
      const label = new PIXI.Text(marker.name, {
        fontSize: 10, fill: 0xFFFFFF, fontFamily: 'monospace', dropShadow: true, dropShadowDistance: 1,
      });
      label.x = -label.width / 2;
      label.y = 12;
      mGfx.addChild(label);

      mGfx.x = center.x;
      mGfx.y = center.y;
      layersRef.current.overlays!.addChild(mGfx);
    });

    tacticHazards.forEach((hazard: TacticHazardState) => {
      const center = hexToPixel(hazard.position);
      const mineGfx = new PIXI.Graphics();
      mineGfx.lineStyle(2, 0xFF5555, 1);
      mineGfx.beginFill(0x661111, 0.85);
      mineGfx.moveTo(0, -10);
      mineGfx.lineTo(2, -2);
      mineGfx.lineTo(10, 0);
      mineGfx.lineTo(2, 2);
      mineGfx.lineTo(0, 10);
      mineGfx.lineTo(-2, 2);
      mineGfx.lineTo(-10, 0);
      mineGfx.lineTo(-2, -2);
      mineGfx.closePath();
      mineGfx.endFill();

      const label = new PIXI.Text('MINE', {
        fontSize: 9,
        fill: 0xFFAAAA,
        fontFamily: 'monospace',
        fontWeight: 'bold',
      });
      label.x = -label.width / 2;
      label.y = 11;
      mineGfx.addChild(label);

      mineGfx.x = center.x;
      mineGfx.y = center.y;
      layersRef.current.overlays!.addChild(mineGfx);
    });

    // Weapon Arc & Blast Radius Overlay
    if (targetingMode && activeTargetingAction && activeTargetingContext?.weaponId) {
      const attackerShip = playerShips.find(s => s.id === activeTargetingAction.shipId);
      const weapon = getWeaponById(activeTargetingContext.weaponId as string);
      if (attackerShip && weapon) {
        const origin = attackerShip.position;
        const facing = attackerShip.facing;
        const maxRange = weapon.rangeMax === Infinity ? 8 : weapon.rangeMax;
        const minRange = weapon.rangeMin || 0;
        const isAoE = weapon.tags?.includes('areaOfEffect');

        const arcGfx = new PIXI.Graphics();
        
        // 1. Draw Firing Arc
        arcGfx.lineStyle(1, 0x00CCFF, 0.4);
        arcGfx.beginFill(0x00CCFF, 0.08);

        for (let dq = -maxRange; dq <= maxRange; dq++) {
          for (let dr = -maxRange; dr <= maxRange; dr++) {
            const target = { q: origin.q + dq, r: origin.r + dr };
            if (target.q === origin.q && target.r === origin.r) continue;
            const dist = hexDistance(origin, target);
            if (dist < minRange || dist > maxRange) continue;
            if (!isInFiringArc(origin, facing, target, weapon.arcs as any)) continue;

            const center = hexToPixel(target);
            const corners = hexCorners({ x: 0, y: 0 });
            arcGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
            for (let ci = 1; ci < 6; ci++) {
              arcGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
            }
            arcGfx.closePath();
          }
        }
        arcGfx.endFill();

        // 2. Draw Blast Radius if AoE and hovering
        if (isAoE && hoveredHex) {
            // Check if hoveredHex is in arc and range
            const distToHover = hexDistance(origin, hoveredHex);
            const inRange = distToHover >= minRange && distToHover <= maxRange;
            const inArc = isInFiringArc(origin, facing, hoveredHex, weapon.arcs as any);
            
            if (inRange && inArc) {
                const blastHexes = [hoveredHex, ...hexNeighbors(hoveredHex)];
                arcGfx.lineStyle(2, 0xFF6600, 0.8);
                arcGfx.beginFill(0xFF6600, 0.2);
                
                blastHexes.forEach(h => {
                    const center = hexToPixel(h);
                    const corners = hexCorners({ x: 0, y: 0 });
                    arcGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
                    for (let ci = 1; ci < 6; ci++) {
                        arcGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
                    }
                    arcGfx.closePath();
                });
                arcGfx.endFill();
            }
        }

        layersRef.current.overlays.addChild(arcGfx);
      }
    }

    // Subsystem Range Overlay
    if (targetingMode === 'ship' && activeTargetingAction && !activeTargetingContext?.weaponId) {
        const attackerShip = playerShips.find(s => s.id === activeTargetingAction.shipId);
        const player = players.find(p => p.shipId === activeTargetingAction.shipId);
        const assignedAction = player?.assignedActions.find(a => a.id === activeTargetingAction.actionId);
        const subsystem = assignedAction?.actionId ? getSubsystemById(assignedAction.actionId) : null;
        
        if (attackerShip && subsystem?.rangeMax) {
            const origin = attackerShip.position;
            const maxRange = subsystem.rangeMax;
            const subGfx = new PIXI.Graphics();
            
            subGfx.lineStyle(1, 0x00FF99, 0.4);
            subGfx.beginFill(0x00FF99, 0.08);

            for (let dq = -maxRange; dq <= maxRange; dq++) {
                for (let dr = -maxRange; dr <= maxRange; dr++) {
                    const target = { q: origin.q + dq, r: origin.r + dr };
                    const dist = hexDistance(origin, target);
                    if (dist > maxRange) continue;

                    const center = hexToPixel(target);
                    const corners = hexCorners({ x: 0, y: 0 });
                    subGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
                    for (let ci = 1; ci < 6; ci++) {
                        subGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
                    }
                    subGfx.closePath();
                }
            }
            subGfx.endFill();
            layersRef.current.overlays!.addChild(subGfx);
        }
    }
    // Fighter Hangar — Phase 1 Deployment Hex Highlights
    if (targetingMode === 'hex' && activeTargetingAction) {
      const ctx = activeTargetingContext;
      const launchingShipId = activeTargetingAction.shipId;
      const launchingShip = playerShips.find(s => s.id === launchingShipId);
      const isHangarAction = ctx?.classId != null; // classId in context means it's a fighter launch

      if (launchingShip && isHangarAction) {
        const deployGfx = new PIXI.Graphics();
        const adjacentHexes = hexNeighbors(launchingShip.position);

        adjacentHexes.forEach(hex => {
          const terrain = terrainMap.get(hexKey(hex));
          if (terrain === 'debrisField') return;
          const stackCount = fighterTokens.filter(f => !f.isDestroyed && hexKey(f.position) === hexKey(hex)).length;
          if (stackCount >= 3) return;

          const center = hexToPixel(hex);
          const corners = hexCorners({ x: 0, y: 0 });

          deployGfx.lineStyle(2, 0x48C78E, 0.9);
          deployGfx.beginFill(0x48C78E, 0.18);
          deployGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
          for (let ci = 1; ci < 6; ci++) deployGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
          deployGfx.closePath();
          deployGfx.endFill();

          // Pulsing label
          const label = new PIXI.Text('LAUNCH', { fontSize: 9, fill: 0x48C78E, fontFamily: 'monospace', fontWeight: 'bold' });
          label.x = center.x - label.width / 2;
          label.y = center.y - label.height / 2;
          deployGfx.addChild(label);
        });

        layersRef.current.overlays!.addChild(deployGfx);
      }
    }

    // Fighter Hangar — Phase 2 Target Ship Highlights
    if (targetingMode === 'ship' && activeTargetingContext?.phase === 'pickTarget') {
      const behavior = activeTargetingContext?.behavior as string | undefined;
      const isDefensive = behavior === 'escort' || behavior === 'screen';
      const targetGfx = new PIXI.Graphics();

      if (isDefensive) {
        // Highlight allied ships in blue/teal
        playerShips.filter(s => !s.isDestroyed).forEach(s => {
          const center = hexToPixel(s.position);
          const corners = hexCorners({ x: 0, y: 0 });
          targetGfx.lineStyle(2, 0x4FC3F7, 0.9);
          targetGfx.beginFill(0x4FC3F7, 0.14);
          targetGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
          for (let ci = 1; ci < 6; ci++) targetGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
          targetGfx.closePath();
          targetGfx.endFill();
        });
      } else {
        // Highlight enemy ships, stations, and enemy fighters in red
        const targetEntities = [
          ...enemyShips.filter(s => !s.isDestroyed),
          ...stations.filter(s => !s.isDestroyed),
          ...fighterTokens.filter(f => !f.isDestroyed && f.allegiance === 'enemy')
        ];
        
        targetEntities.forEach(s => {
          const center = hexToPixel(s.position);
          const corners = hexCorners({ x: 0, y: 0 });
          targetGfx.lineStyle(2, 0xFF5C7A, 0.9);
          targetGfx.beginFill(0xFF5C7A, 0.14);
          targetGfx.moveTo(center.x + corners[0].x, center.y + corners[0].y);
          for (let ci = 1; ci < 6; ci++) targetGfx.lineTo(center.x + corners[ci].x, center.y + corners[ci].y);
          targetGfx.closePath();
          targetGfx.endFill();
        });
      }

      layersRef.current.overlays!.addChild(targetGfx);
    }

  }, [terrainMap, playerShips, enemyShips, fighterTokens, torpedoTokens, stations, objectiveMarkers, tacticHazards, objectiveType, scenarioId, deploymentMode, selectedShipId, targetingMode, activeTargetingAction, activeTargetingContext, hoveredHex, currentTactic, players, cameraX, cameraY, cameraZoom]);

  // ─── Update camera ──────────────────────────────────
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    world.position.set(cameraX, cameraY);
    world.scale.set(cameraZoom, cameraZoom);
  }, [cameraX, cameraY, cameraZoom]);

  // ─── Mouse handlers ─────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoomCamera(e.deltaY > 0 ? -0.1 : 0.1);
  }, [zoomCamera]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPanning(true);
    setPointerDown({ x: e.clientX, y: e.clientY });
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const hoverState = getHoverTarget(e.clientX, e.clientY);

    if (!isLockedRef.current) {
      useUIStore.getState().hoverHex(hoverState?.hex ?? null);
      useUIStore.getState().hoverShip(hoverState?.target?.kind === 'ship' ? hoverState.target.ship.id : null);

      if (hoverState?.target && hoverState.position) {
        setHoverTooltip({ target: hoverState.target, position: hoverState.position });
      } else {
        setHoverTooltip(null);
      }
    }

    if (!isPanning) return;
    panCamera(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    
    // If we barely moved, it's a click
    const dx = e.clientX - pointerDown.x;
    const dy = e.clientY - pointerDown.y;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        
        // Convert screen coordinates to world coordinates
        const screenX = e.clientX - bounds.left;
        const screenY = e.clientY - bounds.top;
        
        const worldX = (screenX - cameraX) / cameraZoom;
        const worldY = (screenY - cameraY) / cameraZoom;
        
        // Identify clicked hex
        const clickedHex = pixelToHex(worldX, worldY);
        const clickedKey = hexKey(clickedHex);

        if (deploymentMode) {
          const selectedShip = deploymentSelectedShipId
            ? playerShips.find(ship => ship.id === deploymentSelectedShipId && !ship.isDestroyed)
            : null;
          const clickedShip = playerShips.find(ship => !ship.isDestroyed && hexKey(ship.position) === clickedKey);

          if (clickedShip) {
            if (clickedShip.id === deploymentSelectedShipId) {
              rotateDeploymentShip(clickedShip.id, 1);
            } else {
              selectDeploymentShip(clickedShip.id);
            }
            return;
          }

          if (!selectedShip) return;

          const placed = setDeploymentShipPosition(selectedShip.id, clickedHex);
          if (!placed) {
            useGameStore.getState().addLog(
              'system',
              `Unable to place ${selectedShip.name} at ${clickedKey}. Choose an open hex inside the deployment zone.`,
            );
          }
          return;
        }
        
        // If we are in targeting mode, process the target
        const targetingModeState = useUIStore.getState().targetingMode;
        const key = hexKey(clickedHex);

        const collectHexTargets = (): SelectionTarget[] => {
          const state = useGameStore.getState();
          const t: SelectionTarget[] = [];
          state.playerShips.filter(s => !s.isDestroyed && hexKey(s.position) === key).forEach(s => t.push({ kind: 'ship', ship: s, isEnemy: false }));
          state.enemyShips.filter(s => !s.isDestroyed && hexKey(s.position) === key).forEach(s => t.push({ kind: 'ship', ship: s, isEnemy: true }));
          state.fighterTokens.filter(f => !f.isDestroyed && hexKey(f.position) === key).forEach(f => t.push({ kind: 'fighter', fighter: f }));
          state.stations.filter(s => !s.isDestroyed && hexKey(s.position) === key).forEach(s => t.push({ kind: 'station', station: s }));
          state.objectiveMarkers.filter(m => !m.isDestroyed && !m.isCollected && hexKey(m.position) === key).forEach(m => t.push({ kind: 'objective', marker: m }));
          state.torpedoTokens.filter(t_ => !t_.isDestroyed && hexKey(t_.position) === key).forEach(t_ => t.push({ kind: 'torpedo', torpedo: t_ }));
          state.tacticHazards.filter(h => hexKey(h.position) === key).forEach(h => t.push({ kind: 'hazard', hazard: h }));
          return t;
        };

        if (targetingModeState) {
          const actionData = useUIStore.getState().activeTargetingAction;
          if (actionData) {
            if (targetingModeState === 'ship') {
              const hexTargets = collectHexTargets();

              // If multiple potential targets, open picker
              if (hexTargets.length > 1) {
                const ctx = useUIStore.getState().activeTargetingContext || {};
                useUIStore.getState().openSelectionPicker(clickedHex, hexTargets, { x: screenX, y: screenY }, actionData, ctx);
                return;
              }

              // Otherwise proceed with single target logic (or none)
              const pShipTarget = hexTargets.find(t => t.kind === 'ship' && !t.isEnemy);
              const pShip = pShipTarget?.kind === 'ship' ? pShipTarget.ship as ShipState : undefined;
              
              const eShipTarget = hexTargets.find(t => t.kind === 'ship' && t.isEnemy);
              const eShip = eShipTarget?.kind === 'ship' ? eShipTarget.ship as EnemyShipState : undefined;
              
              const fighterTarget = hexTargets.find(t => t.kind === 'fighter');
              const eFighter = fighterTarget?.kind === 'fighter' ? fighterTarget.fighter : undefined;
              
              const objectiveTarget = hexTargets.find(t => t.kind === 'objective');
              const objectiveMarker = objectiveTarget?.kind === 'objective' ? objectiveTarget.marker : undefined;
              
              const stationTg = hexTargets.find(t => t.kind === 'station');
              const stationTarget = stationTg?.kind === 'station' ? stationTg.station : undefined;
              
              const hazardTarget = hexTargets.find(t => t.kind === 'hazard');
              const hazard = hazardTarget?.kind === 'hazard' ? hazardTarget.hazard : undefined;
              
              const torpedoTarget = hexTargets.find(t => t.kind === 'torpedo');
              const torpedo = torpedoTarget?.kind === 'torpedo' ? torpedoTarget.torpedo : undefined;

              const target = pShip || eShip || 
                             (eFighter ? { id: eFighter.id } : null) || 
                             (objectiveMarker ? { id: objectiveMarker.name } : null) ||
                             (stationTarget ? { id: stationTarget.id } : null) ||
                             (hazard ? { id: hazard.id } : null) ||
                             (torpedo ? { id: torpedo.id } : null);

              if (target) {
                const playersList = useGameStore.getState().players;
                const player = playersList.find(p => p.shipId === actionData.shipId);
                const ctx = useUIStore.getState().activeTargetingContext || {};

                // --- Behavior-aware filter for fighter-hangar Phase 2 ---
                if (ctx.phase === 'pickTarget') {
                  const behavior = ctx.behavior as string | undefined;
                  const isDefensive = behavior === 'escort' || behavior === 'screen';
                  if (isDefensive) {
                    // Only allow allied (player) ships
                    if (!pShip) return;
                  } else {
                    // Only allow enemy ships/fighters/stations
                    if (!eShip && !eFighter && !stationTarget) return;
                  }
                }

                // Validate if it's a primary fire attack
                const assignedAction = player?.assignedActions.find(a => a.id === actionData.actionId);
                if (assignedAction?.actionId === 'fire-primary' && ctx.weaponId) {
                  const weapon = getWeaponById(ctx.weaponId as string);
                  const attackerShip = useGameStore.getState().playerShips.find(s => s.id === actionData.shipId);
                  if (weapon && attackerShip) {
                    const effectiveWeapon = {
                      ...weapon,
                      rangeMax: applyPlasmaAccelerators(
                        weapon.rangeMax,
                        weapon.tags.includes('ordnance'),
                        useGameStore.getState().experimentalTech,
                      ),
                    };
                    const allShips = [...useGameStore.getState().playerShips, ...useGameStore.getState().enemyShips];
                    const validStationIds = useGameStore.getState().stations
                      .filter(s => !s.isDestroyed)
                      .map(s => s.id);
                    const validIds = getValidTargetsForWeapon(attackerShip.position, attackerShip.facing, effectiveWeapon, allShips, useGameStore.getState().terrainMap);
                    validIds.push(...validStationIds);
                    
                    if (!validIds.includes(target.id)) {
                      useGameStore.getState().addLog('system', `🚫 Invalid target: unit is out of range or firing arc.`);
                      return; // Block execution
                    }
                  }
                }

                // Validate subsystem range
                const subsystemId = assignedAction?.actionId;
                const attackerShip = useGameStore.getState().playerShips.find(s => s.id === actionData.shipId);
                const subsystem = (subsystemId && attackerShip?.equippedSubsystems.includes(subsystemId)) ? getSubsystemById(subsystemId) : null;
                
                if (subsystem?.rangeMax) {
                  const attackerShip = useGameStore.getState().playerShips.find(s => s.id === actionData.shipId);
                  if (attackerShip) {
                    const allEntities = [
                      ...useGameStore.getState().playerShips,
                      ...useGameStore.getState().enemyShips,
                      ...useGameStore.getState().fighterTokens,
                      ...useGameStore.getState().torpedoTokens,
                      ...useGameStore.getState().tacticHazards,
                      ...useGameStore.getState().objectiveMarkers.map(m => ({ ...m, id: m.name })),
                    ];
                    const targetEntity = allEntities.find((e: any) => (e.id || e.name) === target.id);
                    if (targetEntity) {
                      const dist = hexDistance(attackerShip.position, targetEntity.position);
                      if (dist > subsystem.rangeMax) {
                        useGameStore.getState().addLog('system', `🚫 Target out of range (max ${subsystem.rangeMax} hexes).`);
                        return;
                      }
                    }
                  }
                }

                useGameStore.getState().resolveAction(player!.id, actionData.shipId, actionData.actionId, {
                  ...ctx,
                  targetShipId: target.id,
                });
                useUIStore.getState().clearTargeting();
              }
            } else if (targetingModeState === 'hex') {
              const actionData2 = useUIStore.getState().activeTargetingAction!;
              const ctx = useUIStore.getState().activeTargetingContext || {};
              const ship = useGameStore.getState().playerShips.find(s => s.id === actionData2.shipId);
              const playersList = useGameStore.getState().players;
              const player = playersList.find(p => p.shipId === actionData2.shipId);

              // 1. AoE Weapon Firing
              const assignedAction = player?.assignedActions.find(a => a.id === actionData2.actionId);
              if (assignedAction?.actionId === 'fire-primary') {
                useGameStore.getState().resolveAction(player!.id, actionData2.shipId, actionData2.actionId, {
                  ...ctx,
                  targetHex: clickedHex,
                });
                useUIStore.getState().clearTargeting();
                return;
              }

              // 2. Fighter Hangar Deployment (Existing Logic)
              if (ship) {
                if (assignedAction?.actionId === 'fighter-hangar') {
                  // Validate: must be adjacent
                  if (hexDistance(ship.position, clickedHex) !== 1) return;
                  // Validate: not debris
                  const terrain = useGameStore.getState().terrainMap.get(hexKey(clickedHex));
                  if (terrain === 'debrisField') return;
                  // Validate: stacking cap
                  const fighterCount = useGameStore.getState().fighterTokens.filter(
                    f => !f.isDestroyed && hexKey(f.position) === hexKey(clickedHex)
                  ).length;
                  if (fighterCount >= 3) return;

                  // Phase 1 done — transition to Phase 2: pick a target enemy ship
                  useUIStore.getState().startTargeting('ship', actionData2, {
                    ...ctx,
                    deployHex: clickedHex,
                    phase: 'pickTarget',
                  });
                } else if (assignedAction?.actionId === 'alien-phase-vanes') {
                  // Validate: must be adjacent
                  if (hexDistance(ship.position, clickedHex) !== 1) {
                    useGameStore.getState().addLog('system', `🚫 Invalid Phase Slip: must target an adjacent hex.`);
                    return;
                  }
                  // Validate: not occupied by capital ship
                  const occupiedKey = hexKey(clickedHex);
                  const isOccupied = [...useGameStore.getState().playerShips, ...useGameStore.getState().enemyShips]
                    .some(s => !s.isDestroyed && hexKey(s.position) === occupiedKey);
                  
                  if (isOccupied) {
                    useGameStore.getState().addLog('system', `🚫 Invalid Phase Slip: target hex is occupied by a capital ship.`);
                    return;
                  }

                  useGameStore.getState().resolveAction(player!.id, actionData2.shipId, actionData2.actionId, {
                    ...ctx,
                    targetHex: clickedHex,
                  });
                  useUIStore.getState().clearTargeting();
                } else {
                  useUIStore.getState().clearTargeting();
                }
              } else {
                useUIStore.getState().clearTargeting();
              }
            }
            return;
          }
        }
        
        // Non-targeting selection
        const hexTargets = collectHexTargets();
        if (hexTargets.length > 1) {
          useUIStore.getState().openSelectionPicker(clickedHex, hexTargets, { x: screenX, y: screenY });
        } else if (hexTargets.length === 1 && hexTargets[0].kind === 'ship') {
          useUIStore.getState().selectShip(hexTargets[0].ship.id);
        } else {
          useUIStore.getState().selectShip(null);
        }
      }
    }
  };

  const getHoverTarget = (clientX: number, clientY: number) => {
    if (!containerRef.current) return null;

    const bounds = containerRef.current.getBoundingClientRect();
    const screenX = clientX - bounds.left;
    const screenY = clientY - bounds.top;
    const worldX = (screenX - cameraX) / cameraZoom;
    const worldY = (screenY - cameraY) / cameraZoom;
    const hoveredHexCoord = pixelToHex(worldX, worldY);
    const hoveredKey = hexKey(hoveredHexCoord);

    const allShips = [
      ...playerShips.filter(ship => !ship.isDestroyed).map(ship => ({ ship, isEnemy: false })),
      ...enemyShips.filter(ship => !ship.isDestroyed).map(ship => ({ ship, isEnemy: true })),
    ];

    for (const entry of allShips) {
      const center = hexToPixel(entry.ship.position);
      if (Math.hypot(worldX - center.x, worldY - center.y) <= 26) {
        return {
          hex: hoveredHexCoord,
          target: { kind: 'ship', ship: entry.ship, isEnemy: entry.isEnemy } satisfies MapHoverTarget,
          position: getTooltipPosition(screenX, screenY, bounds),
        };
      }
    }

    for (const station of stations) {
      if (station.isDestroyed) continue;
      const center = hexToPixel(station.position);
      if (Math.hypot(worldX - center.x, worldY - center.y) <= 24) {
        return {
          hex: hoveredHexCoord,
          target: { kind: 'station', station } satisfies MapHoverTarget,
          position: getTooltipPosition(screenX, screenY, bounds),
        };
      }
    }

    for (const marker of objectiveMarkers) {
      if (marker.isDestroyed || marker.isCollected) continue;
      const center = hexToPixel(marker.position);
      if (Math.hypot(worldX - center.x, worldY - center.y) <= 16) {
        return {
          hex: hoveredHexCoord,
          target: { kind: 'objective', marker } satisfies MapHoverTarget,
          position: getTooltipPosition(screenX, screenY, bounds),
        };
      }
    }

    for (const hazard of tacticHazards) {
      const center = hexToPixel(hazard.position);
      if (Math.hypot(worldX - center.x, worldY - center.y) <= 18) {
        return {
          hex: hoveredHexCoord,
          target: { kind: 'hazard', hazard } satisfies MapHoverTarget,
          position: getTooltipPosition(screenX, screenY, bounds),
        };
      }
    }

    const hoveredFighters = fighterTokens.filter(token => !token.isDestroyed && hexKey(token.position) === hoveredKey);
    if (hoveredFighters.length > 0) {
      return {
        hex: hoveredHexCoord,
        target: { kind: 'fighter', fighter: hoveredFighters[0], stackCount: hoveredFighters.length } satisfies MapHoverTarget,
        position: getTooltipPosition(screenX, screenY, bounds),
      };
    }

    const hoveredTorpedo = torpedoTokens.find(token => !token.isDestroyed && hexKey(token.position) === hoveredKey);
    if (hoveredTorpedo) {
      return {
        hex: hoveredHexCoord,
        target: { kind: 'torpedo', torpedo: hoveredTorpedo } satisfies MapHoverTarget,
        position: getTooltipPosition(screenX, screenY, bounds),
      };
    }

    const terrainType = terrainMap.get(hoveredKey);
    if (terrainType && terrainType !== 'open') {
      return {
        hex: hoveredHexCoord,
        target: { kind: 'terrain', terrainType, coord: hoveredHexCoord } satisfies MapHoverTarget,
        position: getTooltipPosition(screenX, screenY, bounds),
      };
    }

    return {
      hex: hoveredHexCoord,
      target: null,
      position: null,
    };
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={(e) => {
        handlePointerUp(e);
        setHoverTooltip(null);
        useUIStore.getState().hoverHex(null);
        useUIStore.getState().hoverShip(null);
      }}
    >
      <div className="scanline-overlay" />
      <TerrainLegend />
      <ShipInfoPanel 
        key={getMapHoverTargetId(hoverTooltip?.target ?? null)}
        target={hoverTooltip?.target ?? null} 
        position={hoverTooltip?.position ?? null} 
        onLock={() => {
          isLockedRef.current = true;
          setIsTooltipLocked(true);
        }}
        onClose={() => {
          setHoverTooltip(null);
          isLockedRef.current = false;
          setIsTooltipLocked(false);
        }}
      />
      <SelectionPicker />
    </div>
  );
}

function getTooltipPosition(screenX: number, screenY: number, bounds: DOMRect) {
  const desiredX = screenX + 18;
  const desiredY = screenY - 18;
  const maxX = Math.max(12, bounds.width - 332);
  const maxY = Math.max(12, bounds.height - 24);

  return {
    x: Math.min(desiredX, maxX),
    y: Math.max(12, Math.min(desiredY, maxY)),
  };
}
