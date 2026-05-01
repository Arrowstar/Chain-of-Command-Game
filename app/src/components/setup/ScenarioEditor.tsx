import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { hexToPixel, hexCorners, pixelToHex, hexKey } from '../../engine/hexGrid';
import { getTerrainColor, drawHexPolygon, drawShipTriangle, attachOrUpdateSprite, drawFacingIndicator } from '../../engine/pixiGraphics';
import type { TerrainType, HexCoord } from '../../types/game';
import { HexFacing } from '../../types/game';
import { ADVERSARIES } from '../../data/adversaries';
import { ROE_DECK } from '../../data/roeDeck';
import { STATIONS } from '../../data/stations';
import { ENEMY_FIGHTER_CLASSES } from '../../data/fighters';
import { generateSkirmishConfig } from '../../utils/skirmishGeneratorUtils';

export interface CustomScenarioConfig {
  terrain: { coord: HexCoord; type: TerrainType }[];
  enemies: { id: string; coord: HexCoord; facing: HexFacing; adversaryId: string }[];
  allies: { id: string; coord: HexCoord; facing: HexFacing; adversaryId: string }[];
  playerSpawns: { id: string; coord: HexCoord; facing: HexFacing }[];
  startingRoEId?: string;
  stationSpawns?: { id: string; coord: HexCoord; facing: HexFacing; stationId: string; name?: string }[];
  fighterSpawns?: { id: string; coord: HexCoord; facing: HexFacing; classId: string; allegiance: 'enemy' | 'allied' }[];
}

interface ScenarioEditorProps {
  onConfirm: (config: CustomScenarioConfig) => void;
  onCancel: () => void;
}

type BrushMode = 'terrain' | 'enemy' | 'allied' | 'playerSpawn' | 'erase' | 'station' | 'fighter';

export default function ScenarioEditor({ onConfirm, onCancel }: ScenarioEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [brushMode, setBrushMode] = useState<BrushMode>('terrain');
  const [brushSelection, setBrushSelection] = useState<string>('asteroids');
  
  // Scene State
  const [terrainMap, setTerrainMap] = useState<Record<string, TerrainType>>({});
  const [enemies, setEnemies] = useState<{ id: string; hex: string; adversaryId: string; facing: number }[]>([]);
  const [allies, setAllies] = useState<{ id: string; hex: string; adversaryId: string; facing: number }[]>([]);
  const [spawns, setSpawns] = useState<{ id: string; hex: string; facing: number }[]>([]);
  const [stationSpawns, setStationSpawns] = useState<{ id: string; hex: string; stationId: string; facing: number }[]>([]);
  const [fighterSpawns, setFighterSpawns] = useState<{ id: string; hex: string; classId: string; facing: number; allegiance: 'enemy' | 'allied' }[]>([]);

  // Auto-Gen State
  const [autoGenThreatLevel, setAutoGenThreatLevel] = useState<number>(1);
  const [autoGenPlayerCount, setAutoGenPlayerCount] = useState<number>(1);

  // Scenario Options
  const [selectedRoEId, setSelectedRoEId] = useState<string>('');

  // Camera State
  const [cameraX, setCameraX] = useState(0);
  const [cameraY, setCameraY] = useState(0);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(null);
  const graphicsRef = useRef<{ terrain: PIXI.Graphics; entities: PIXI.Graphics; overlay: PIXI.Graphics } | null>(null);

  // Initialize Canvas & Camera
  useEffect(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    
    setCameraX(w / 2);
    setCameraY(h / 2);

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
    
    const terrainGfx = new PIXI.Graphics();
    const entitiesGfx = new PIXI.Graphics();
    const overlayGfx = new PIXI.Graphics();
    
    world.addChild(terrainGfx);
    world.addChild(entitiesGfx);
    world.addChild(overlayGfx);
    
    appRef.current = app;
    worldRef.current = world;
    graphicsRef.current = { terrain: terrainGfx, entities: entitiesGfx, overlay: overlayGfx };

    setTerrainMap({});

    return () => {
      app.destroy(true, { children: true });
    };
  }, []);

  // Update Camera
  useEffect(() => {
    if (worldRef.current) {
      worldRef.current.position.set(cameraX, cameraY);
      worldRef.current.scale.set(cameraZoom, cameraZoom);
    }
  }, [cameraX, cameraY, cameraZoom]);

  // Render Scene
  useEffect(() => {
    if (!graphicsRef.current) return;
    const { terrain: tGfx, entities: eGfx } = graphicsRef.current;
    
    // Draw Infinite Background Terrain
    tGfx.clear();
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
          const type = terrainMap[key] || 'open';
          drawHexPolygon(tGfx, center.x, center.y, type);
        }
      }
    }

    // Draw Entities
    eGfx.clear();
    eGfx.removeChildren().forEach(c => c.destroy());
    
    // Draw Spawns
    spawns.forEach(s => {
      const [q, r] = s.hex.split(',').map(Number);
      const center = hexToPixel({ q, r });
      const rot = ((s.facing * 60) - 30) * (Math.PI / 180);
      
      const tempGfx = new PIXI.Graphics();
      tempGfx.x = center.x;
      tempGfx.y = center.y;
      tempGfx.rotation = rot;
      drawShipTriangle(tempGfx, 0, 0, 0, 'player');
      
      // Add a distinct marker for spawn points (e.g. green circle)
      tempGfx.lineStyle(2, 0x00FF00, 0.8);
      tempGfx.drawCircle(0, 0, 15);
      eGfx.addChild(tempGfx);
    });

    // Draw Enemies
    enemies.forEach(e => {
      const [q, r] = e.hex.split(',').map(Number);
      const center = hexToPixel({ q, r });
      const rot = ((e.facing * 60) - 30) * (Math.PI / 180);
      
      const tempGfx = new PIXI.Graphics();
      tempGfx.x = center.x;
      tempGfx.y = center.y;
      tempGfx.rotation = rot;
      const hasSprite = attachOrUpdateSprite(tempGfx, e.adversaryId, true);
      if (!hasSprite) {
        drawShipTriangle(tempGfx, 0, 0, 0, 'enemy');
      } else {
        drawFacingIndicator(tempGfx, 'enemy');
      }
      eGfx.addChild(tempGfx);
    });

    // Draw Allies
    allies.forEach(a => {
      const [q, r] = a.hex.split(',').map(Number);
      const center = hexToPixel({ q, r });
      const rot = ((a.facing * 60) - 30) * (Math.PI / 180);
      
      const tempGfx = new PIXI.Graphics();
      tempGfx.x = center.x;
      tempGfx.y = center.y;
      tempGfx.rotation = rot;
      const hasSprite = attachOrUpdateSprite(tempGfx, a.adversaryId, true);
      if (!hasSprite) {
        drawShipTriangle(tempGfx, 0, 0, 0, 'allied');
      } else {
        drawFacingIndicator(tempGfx, 'allied');
      }
      eGfx.addChild(tempGfx);
    });

    // Draw Stations
    stationSpawns.forEach(s => {
      const [q, r] = s.hex.split(',').map(Number);
      const center = hexToPixel({ q, r });
      const rot = ((s.facing * 60) - 30) * (Math.PI / 180);
      
      const tempGfx = new PIXI.Graphics();
      tempGfx.x = center.x;
      tempGfx.y = center.y;
      tempGfx.rotation = rot;
      
      const stationData = STATIONS.find(st => st.id === s.stationId);
      const hasSprite = attachOrUpdateSprite(tempGfx, stationData?.imageKey, true, 'enemy');
      if (!hasSprite) {
        tempGfx.lineStyle(2, 0xFF4444);
        tempGfx.beginFill(0x220000, 0.8);
        tempGfx.drawRect(-15, -15, 30, 30);
        tempGfx.endFill();
      } else {
        drawFacingIndicator(tempGfx, 'enemy');
      }
      eGfx.addChild(tempGfx);
    });

    // Draw Fighters
    fighterSpawns.forEach(f => {
      const [q, r] = f.hex.split(',').map(Number);
      const center = hexToPixel({ q, r });
      const rot = ((f.facing * 60) - 30) * (Math.PI / 180);
      
      const tempGfx = new PIXI.Graphics();
      tempGfx.x = center.x;
      tempGfx.y = center.y;
      tempGfx.rotation = rot;
      
      const fighterClass = ENEMY_FIGHTER_CLASSES[f.classId];
      const hasSprite = attachOrUpdateSprite(tempGfx, fighterClass?.imageKey, true, f.allegiance === 'enemy' ? 'enemy' : 'allied');
      if (!hasSprite) {
        tempGfx.lineStyle(1, f.allegiance === 'enemy' ? 0xFF4444 : 0x4444FF);
        tempGfx.beginFill(f.allegiance === 'enemy' ? 0x880000 : 0x000088, 0.8);
        tempGfx.moveTo(0, -6);
        tempGfx.lineTo(4, 6);
        tempGfx.lineTo(-4, 6);
        tempGfx.closePath();
        tempGfx.endFill();
      } else {
        const color = f.allegiance === 'allied' ? 0x7CFFB2 : 0xFF6B6B;
        tempGfx.lineStyle(1.5, color, 0.9);
        tempGfx.beginFill(color, 0.7);
        tempGfx.moveTo(18, 0);
        tempGfx.lineTo(12, 4);
        tempGfx.lineTo(14, 0);
        tempGfx.lineTo(12, -4);
        tempGfx.closePath();
        tempGfx.endFill();
      }
      eGfx.addChild(tempGfx);
    });

  }, [terrainMap, enemies, allies, spawns, stationSpawns, fighterSpawns, cameraX, cameraY, cameraZoom]);

  // Input Handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCameraZoom(z => Math.max(0.2, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || e.button === 2 || e.altKey) {
      setIsPanning(true);
      setLastMouse({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Left click handling
    if (containerRef.current) {
      const bounds = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - bounds.left;
      const screenY = e.clientY - bounds.top;
      const worldX = (screenX - cameraX) / cameraZoom;
      const worldY = (screenY - cameraY) / cameraZoom;
      const clickedHex = pixelToHex(worldX, worldY);
      const key = hexKey(clickedHex);

      if (brushMode === 'erase') {
        setEnemies(prev => prev.filter(e => e.hex !== key));
        setAllies(prev => prev.filter(a => a.hex !== key));
        setSpawns(prev => prev.filter(s => s.hex !== key));
        setStationSpawns(prev => prev.filter(s => s.hex !== key));
        setFighterSpawns(prev => prev.filter(f => f.hex !== key));
        setTerrainMap(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return;
      }

      if (brushMode === 'terrain') {
        setTerrainMap(prev => ({ ...prev, [key]: brushSelection as TerrainType }));
        return;
      }

      // Check if entity already exists here
      const existingEnemyIdx = enemies.findIndex(e => e.hex === key);
      const existingAllyIdx = allies.findIndex(a => a.hex === key);
      const existingSpawnIdx = spawns.findIndex(s => s.hex === key);
      const existingStationIdx = stationSpawns.findIndex(s => s.hex === key);
      const existingFighterIdx = fighterSpawns.findIndex(f => f.hex === key);

      // If clicking same hex with same brush mode, rotate it!
      if (brushMode === 'enemy' && existingEnemyIdx !== -1) {
        setEnemies(prev => prev.map((e, i) =>
          i === existingEnemyIdx ? { ...e, facing: (e.facing + 1) % 6 } : e
        ));
        return;
      }
      if (brushMode === 'allied' && existingAllyIdx !== -1) {
        setAllies(prev => prev.map((a, i) =>
          i === existingAllyIdx ? { ...a, facing: (a.facing + 1) % 6 } : a
        ));
        return;
      }
      if (brushMode === 'playerSpawn' && existingSpawnIdx !== -1) {
        setSpawns(prev => prev.map((s, i) =>
          i === existingSpawnIdx ? { ...s, facing: (s.facing + 1) % 6 } : s
        ));
        return;
      }
      if (brushMode === 'station' && existingStationIdx !== -1) {
        setStationSpawns(prev => prev.map((s, i) =>
          i === existingStationIdx ? { ...s, facing: (s.facing + 1) % 6 } : s
        ));
        return;
      }
      if (brushMode === 'fighter' && existingFighterIdx !== -1) {
        setFighterSpawns(prev => prev.map((f, i) =>
          i === existingFighterIdx ? { ...f, facing: (f.facing + 1) % 6 } : f
        ));
        return;
      }

      // Otherwise place new
      const newId = Math.random().toString(36).substring(7);
      if (brushMode === 'enemy') {
        setEnemies(prev => [...prev.filter(e => e.hex !== key), { id: newId, hex: key, adversaryId: brushSelection, facing: HexFacing.Fore }]);
      } else if (brushMode === 'allied') {
        setAllies(prev => [...prev.filter(a => a.hex !== key), { id: newId, hex: key, adversaryId: brushSelection, facing: HexFacing.Fore }]);
      } else if (brushMode === 'playerSpawn') {
        setSpawns(prev => [...prev.filter(s => s.hex !== key), { id: newId, hex: key, facing: HexFacing.Fore }]);
      } else if (brushMode === 'station') {
        setStationSpawns(prev => [...prev.filter(s => s.hex !== key), { id: newId, hex: key, stationId: brushSelection, facing: HexFacing.Fore }]);
      } else if (brushMode === 'fighter') {
        // Simple logic to set allegiance based on brush selection id or hardcode
        setFighterSpawns(prev => [...prev.filter(f => f.hex !== key), { id: newId, hex: key, classId: brushSelection, facing: HexFacing.Fore, allegiance: 'enemy' }]);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setCameraX(x => x + (e.clientX - lastMouse.x));
      setCameraY(y => y + (e.clientY - lastMouse.y));
      setLastMouse({ x: e.clientX, y: e.clientY });
    } else if (e.buttons === 1 && brushMode === 'terrain') {
        // Continuous painting for terrain
        if (containerRef.current) {
            const bounds = containerRef.current.getBoundingClientRect();
            const worldX = ((e.clientX - bounds.left) - cameraX) / cameraZoom;
            const worldY = ((e.clientY - bounds.top) - cameraY) / cameraZoom;
            const clickedHex = pixelToHex(worldX, worldY);
            setTerrainMap(prev => ({ ...prev, [hexKey(clickedHex)]: brushSelection as TerrainType }));
        }
    }
  };

  const handlePointerUp = () => setIsPanning(false);

  const handleAutoGenerate = () => {
    const config = generateSkirmishConfig(autoGenThreatLevel, autoGenPlayerCount);
    
    if (config.terrain) {
      const newTerrainMap: Record<string, TerrainType> = {};
      config.terrain.forEach(t => {
        newTerrainMap[hexKey(t.coord)] = t.type;
      });
      setTerrainMap(newTerrainMap);
    }
    
    if (config.enemies) {
      setEnemies(config.enemies.map(e => ({
        id: e.id,
        hex: hexKey(e.coord),
        adversaryId: e.adversaryId,
        facing: e.facing
      })));
    }
    
    setAllies([]);
    
    if (config.playerSpawns) {
      setSpawns(config.playerSpawns.map(s => ({
        id: s.id,
        hex: hexKey(s.coord),
        facing: s.facing
      })));
    }
    
    setStationSpawns([]);
    setFighterSpawns([]);
  };

  const handleConfirm = () => {
    const config: CustomScenarioConfig = {
      terrain: Object.entries(terrainMap).filter(([_, t]) => t !== 'open').map(([key, type]) => {
        const [q, r] = key.split(',').map(Number);
        return { coord: { q, r }, type };
      }),
      enemies: enemies.map(e => {
        const [q, r] = e.hex.split(',').map(Number);
        return { id: e.id, coord: { q, r }, facing: e.facing as HexFacing, adversaryId: e.adversaryId };
      }),
      allies: allies.map(a => {
        const [q, r] = a.hex.split(',').map(Number);
        return { id: a.id, coord: { q, r }, facing: a.facing as HexFacing, adversaryId: a.adversaryId };
      }),
      playerSpawns: spawns.map(s => {
        const [q, r] = s.hex.split(',').map(Number);
        return { id: s.id, coord: { q, r }, facing: s.facing as HexFacing };
      }),
      startingRoEId: selectedRoEId || undefined,
      stationSpawns: stationSpawns.map(s => {
        const [q, r] = s.hex.split(',').map(Number);
        return { id: s.id, coord: { q, r }, facing: s.facing as HexFacing, stationId: s.stationId };
      }),
      fighterSpawns: fighterSpawns.map(f => {
        const [q, r] = f.hex.split(',').map(Number);
        return { id: f.id, coord: { q, r }, facing: f.facing as HexFacing, classId: f.classId, allegiance: f.allegiance };
      }),
    };
    onConfirm(config);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: 'var(--color-bg-deep)' }}>
      {/* TOOLBAR */}
      <div className="panel" style={{ width: '300px', height: '100%', borderRadius: 0, borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ color: 'var(--color-holo-cyan)', margin: 0 }}>SCENARIO EDITOR</h2>
        </div>

        <div style={{ padding: 'var(--space-md)', flex: 1, overflowY: 'auto' }}>
          
          <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ color: 'var(--color-holo-cyan)', fontSize: '0.85rem', marginBottom: '8px' }}>AUTO GENERATE</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Threat Level</span>
              <select 
                value={autoGenThreatLevel} 
                onChange={(e) => setAutoGenThreatLevel(Number(e.target.value))}
                style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
              >
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              <span>Player Ships</span>
              <select 
                value={autoGenPlayerCount} 
                onChange={(e) => setAutoGenPlayerCount(Number(e.target.value))}
                style={{ background: 'var(--color-bg-deep)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
            
            <button className="btn" style={{ width: '100%', fontSize: '0.8rem' }} onClick={handleAutoGenerate}>
              GENERATE MAP
            </button>
          </div>

          <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'rgba(0, 0, 0, 0.2)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>RULES OF ENGAGEMENT</h3>
            <select 
              value={selectedRoEId} 
              onChange={(e) => setSelectedRoEId(e.target.value)}
              style={{ width: '100%', padding: '8px', background: 'var(--color-bg-deep)', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}
            >
              <option value="">Random (Draw from Deck)</option>
              {ROE_DECK.map(roe => (
                <option key={roe.id} value={roe.id}>{roe.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>TOOLS</h3>
            <button className={`btn ${brushMode === 'playerSpawn' ? 'active' : ''}`} style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start' }} onClick={() => setBrushMode('playerSpawn')}>
              <span style={{ color: '#00FF00', marginRight: '8px' }}>●</span> Player Spawn
            </button>
            <button className={`btn ${brushMode === 'erase' ? 'active' : ''}`} style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => setBrushMode('erase')}>
              <span style={{ color: 'var(--color-alert-amber)', marginRight: '8px' }}>✖</span> Erase
            </button>
            <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '4px', fontStyle: 'italic' }}>
              Tip: Click an existing placed ship/spawn to rotate it. Alt+Drag to pan map.
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>TERRAIN</h3>
            {['open', 'asteroids', 'ionNebula', 'debrisField', 'gravityWell'].map(t => (
              <button 
                key={t}
                className={`btn ${brushMode === 'terrain' && brushSelection === t ? 'active' : ''}`} 
                style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textTransform: 'capitalize' }}
                onClick={() => { setBrushMode('terrain'); setBrushSelection(t); }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>ENEMIES (AI)</h3>
            {ADVERSARIES.filter(a => !a.id.startsWith('ai-')).map(a => (
              <button 
                key={a.id}
                className={`btn ${brushMode === 'enemy' && brushSelection === a.id ? 'active' : ''}`} 
                style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textAlign: 'left', minHeight: '40px' }}
                onClick={() => { setBrushMode('enemy'); setBrushSelection(a.id); }}
              >
                {a.name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>ALLIES (AI)</h3>
            {ADVERSARIES.filter(a => a.id.startsWith('ai-')).map(a => (
              <button 
                key={a.id}
                className={`btn ${brushMode === 'allied' && brushSelection === a.id ? 'active' : ''}`} 
                style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textAlign: 'left', minHeight: '40px' }}
                onClick={() => { setBrushMode('allied'); setBrushSelection(a.id); }}
              >
                {a.name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>STATIONS & TURRETS</h3>
            {STATIONS.map(s => (
              <button 
                key={s.id}
                className={`btn ${brushMode === 'station' && brushSelection === s.id ? 'active' : ''}`} 
                style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textAlign: 'left', minHeight: '40px' }}
                onClick={() => { setBrushMode('station'); setBrushSelection(s.id); }}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>FIGHTERS</h3>
            {Object.values(ENEMY_FIGHTER_CLASSES).map(f => (
              <button 
                key={f.id}
                className={`btn ${brushMode === 'fighter' && brushSelection === f.id ? 'active' : ''}`} 
                style={{ width: '100%', marginBottom: '4px', justifyContent: 'flex-start', textAlign: 'left', minHeight: '40px' }}
                onClick={() => { setBrushMode('fighter'); setBrushSelection(f.id); }}
              >
                {f.name}
              </button>
            ))}
          </div>

        </div>

        <div style={{ padding: 'var(--space-md)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn" style={{ flex: 1, padding: 'var(--space-sm)' }} onClick={onCancel}>CANCEL</button>
          <button className="btn btn--execute" style={{ flex: 1.5, padding: 'var(--space-sm)', whiteSpace: 'normal' }} onClick={handleConfirm} disabled={spawns.length === 0}>
            CONFIRM ({spawns.length})
          </button>
        </div>
      </div>

      {/* HEX MAP VIEWPORT */}
      <div 
        ref={containerRef} 
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isPanning ? 'grabbing' : (brushMode === 'erase' ? 'crosshair' : 'crosshair') }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="scanline-overlay" style={{ pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
