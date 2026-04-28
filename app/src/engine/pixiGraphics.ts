import * as PIXI from 'pixi.js';
import { hexCorners } from './hexGrid';
import type { TerrainType, ShipArc } from '../types/game';

export type ShipAllegianceColor = 'player' | 'enemy' | 'allied';

export function getShipColor(allegiance: ShipAllegianceColor): number {
  switch (allegiance) {
    case 'enemy':
      return 0xFF6B6B;
    case 'allied':
      return 0x7CFFB2;
    case 'player':
    default:
      return 0x4DA3FF;
  }
}

export function getTerrainColor(type: TerrainType): { fill: number; fillAlpha: number; stroke: number; strokeAlpha: number } {
  switch (type) {
    case 'asteroids':   return { fill: 0x718096, fillAlpha: 0.6, stroke: 0x2C7A7B, strokeAlpha: 0.3 };
    case 'ionNebula':   return { fill: 0xD6BCFA, fillAlpha: 0.3, stroke: 0x9F7AEA, strokeAlpha: 0.5 };
    case 'debrisField': return { fill: 0xA0AEC0, fillAlpha: 0.4, stroke: 0x2C7A7B, strokeAlpha: 0.3 };
    case 'gravityWell': return { fill: 0x000000, fillAlpha: 0.8, stroke: 0xE53E3E, strokeAlpha: 0.7 };
    default:            return { fill: 0x1A202C, fillAlpha: 0.5, stroke: 0x2C7A7B, strokeAlpha: 0.3 };
  }
}

export function drawHexPolygon(g: PIXI.Graphics, cx: number, cy: number, type: TerrainType) {
  const colors = getTerrainColor(type);
  const corners = hexCorners({ x: 0, y: 0 });
  g.lineStyle(2, colors.stroke, colors.strokeAlpha);
  g.beginFill(colors.fill, colors.fillAlpha);
  g.moveTo(cx + corners[0].x, cy + corners[0].y);
  for (let i = 1; i < 6; i++) {
    g.lineTo(cx + corners[i].x, cy + corners[i].y);
  }
  g.closePath();
  g.endFill();

  if (type === 'asteroids') {
    g.beginFill(0x4A5568, 0.8);
    g.lineStyle(1, 0x2D3748, 0.8);
    g.drawPolygon([cx-10, cy-15, cx+5, cy-20, cx+15, cy-5, cx+10, cy+10, cx-5, cy+15, cx-15, cy+5]);
    g.drawPolygon([cx+15, cy+15, cx+25, cy+10, cx+20, cy+25]);
    g.endFill();
  } else if (type === 'debrisField') {
    g.lineStyle(2, 0xCBD5E0, 0.6);
    g.moveTo(cx-15, cy-10); g.lineTo(cx-5, cy+5);
    g.moveTo(cx+10, cy-15); g.lineTo(cx+20, cy-5);
    g.moveTo(cx-10, cy+15); g.lineTo(cx+15, cy+10);
    g.beginFill(0x718096, 0.8);
    g.drawRect(cx, cy, 8, 8);
    g.endFill();
  } else if (type === 'gravityWell') {
    g.lineStyle(2, 0xE53E3E, 0.4);
    g.drawCircle(cx, cy, 25);
    g.lineStyle(2, 0xE53E3E, 0.6);
    g.drawCircle(cx, cy, 15);
    g.lineStyle(2, 0xE53E3E, 0.8);
    g.drawCircle(cx, cy, 5);
  } else if (type === 'ionNebula') {
    g.beginFill(0xB794F4, 0.2);
    g.lineStyle(0);
    g.drawCircle(cx-10, cy-10, 15);
    g.drawCircle(cx+15, cy-5, 20);
    g.drawCircle(cx, cy+15, 18);
    g.drawCircle(cx-15, cy+10, 12);
    g.endFill();
  }
}

export function drawShipTriangle(g: PIXI.Graphics, cx: number, cy: number, rotation: number, allegiance: ShipAllegianceColor) {
  const color = getShipColor(allegiance);

  g.lineStyle(2, 0xFFFFFF, 0.8);
  g.beginFill(color, 0.8);
  // Triangle points (unrotated)
  const pts = [
    { x: 20, y: 0 },   // nose
    { x: -15, y: 15 },  // back right
    { x: -10, y: 0 },   // back indent
    { x: -15, y: -15 }, // back left
  ];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const rotated = pts.map(p => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
  g.moveTo(rotated[0].x, rotated[0].y);
  for (let i = 1; i < rotated.length; i++) {
    g.lineTo(rotated[i].x, rotated[i].y);
  }
  g.closePath();
  g.endFill();
}

export const ARC_ORDER: ShipArc[] = ['fore', 'foreStarboard', 'aftStarboard', 'aft', 'aftPort', 'forePort'];
export function drawShipShields(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  facing: number,
  shields: Record<string, number>,
  maxShields: number,
  allegiance: ShipAllegianceColor = 'player',
) {
  if (maxShields <= 0) return;
  const baseDeg = facing * 60;
  const shieldRadius = 30; // Just outside the structural triangle
  const toRad = (d: number) => d * Math.PI / 180;
  
  for (let i = 0; i < 6; i++) {
    const sectorName = ARC_ORDER[i];
    const currentVal = shields[sectorName] || 0;
    
    const startRad = toRad(baseDeg - 30 + i * 60);
    const endRad = toRad(baseDeg + 30 + i * 60);
    
    const startAngle = startRad + 0.08;
    const endAngle = endRad - 0.08;
    const startX = cx + shieldRadius * Math.cos(startAngle);
    const startY = cy + shieldRadius * Math.sin(startAngle);
    
    if (currentVal > 0) {
      const ratio = currentVal / maxShields;
      const alpha = 0.3 + 0.6 * ratio;
      const thickness = 2 + 3 * ratio;

      let color = allegiance === 'enemy'
        ? 0xFF6B6B
        : allegiance === 'allied'
          ? 0x7CFFB2
          : 0x00CCFF;
      if (ratio <= 0.33) {
        color = allegiance === 'player' ? 0xFF3333 : allegiance === 'allied' ? 0xFFD166 : 0xFF8A8A;
      } else if (ratio <= 0.66) {
        color = allegiance === 'enemy' ? 0xFF9F68 : 0xFFCC00;
      }
      
      g.lineStyle(thickness, color, alpha);
      // Leave slight gap between sectors
      g.moveTo(startX, startY);
      g.arc(cx, cy, shieldRadius, startAngle, endAngle, false);
    } else {
      // Offline/Down shield
      g.lineStyle(1.5, 0xFF3333, 0.15);
      g.moveTo(startX, startY);
      g.arc(cx, cy, shieldRadius, startAngle, endAngle, false);
    }
  }
}

import hegCorvetteImg from '../../art/ships/hegemony/HegCorvette.png';
import hegDreadnoughtImg from '../../art/ships/hegemony/HegDreadnought.png';
import hegFrigateImg from '../../art/ships/hegemony/HegFrigate.png';
import hegHeavyCruiserImg from '../../art/ships/hegemony/HegHeaveyCruiser.png';
import hegInterceptorWingImg from '../../art/ships/hegemony/HegInterceptorWing.png';

// Player / Allied Ships
import aegisCarrierImg from '../../art/ships/player/AegisCarrier.png';
import forgeTenderImg from '../../art/ships/player/ForgeTender.png';
import manticoreDestroyerImg from '../../art/ships/player/ManticoreMissileDestroyer.png';
import minotaurImg from '../../art/ships/player/Minotaur.png';
import paladinCruiserImg from '../../art/ships/player/PaladinCruiser.png';
import vanguardCruiserImg from '../../art/ships/player/VanguardCruiser.png';
import wraithCorvetteImg from '../../art/ships/player/WraithCorvette.png';
import zephyrFrigateImg from '../../art/ships/player/ZephyrFriger.png';
import playerFightersImg from '../../art/ships/player/player_fighters.png';

export const ASSET_MAP: Record<string, string> = {
  // Hegemony (Enemies)
  'hegemony-corvette': hegCorvetteImg,
  'hegemony-dreadnought': hegDreadnoughtImg,
  'hunter-killer': hegFrigateImg,
  'monitor': hegHeavyCruiserImg,
  'carrier': hegDreadnoughtImg, 
  'strike-fighter': hegInterceptorWingImg,
  'enemy-fighter': hegInterceptorWingImg,

  // Player / Allied Fighters
  // ── Strike Fighter uses the existing image ──
  'allied-fighter': playerFightersImg,   // legacy key (generic fallback)
  'fighter-strike': playerFightersImg,   // ✅ Strike Fighter — existing art

  // ── New fighter classes — wire up once artwork is in art/ships/player/fighters/ ──
  // 'fighter-heavy-bomber': heavyBomberImg,     // uncomment + add import when ready
  // 'fighter-ew':           ewFighterImg,        // uncomment + add import when ready
  // 'fighter-intercept':    interceptScreenImg,  // uncomment + add import when ready
  // 'fighter-gunship':      armoredGunshipImg,   // uncomment + add import when ready

  // Player Chassis IDs
  'vanguard': vanguardCruiserImg,
  'minotaur': minotaurImg,
  'zephyr': zephyrFrigateImg,
  'aegis': aegisCarrierImg,
  'manticore': manticoreDestroyerImg,
  'paladin': paladinCruiserImg,
  'wraith': wraithCorvetteImg,
  'forge': forgeTenderImg,

  // Allied Adversary IDs
  'ai-vanguard': vanguardCruiserImg,
  'ai-minotaur': minotaurImg,
  'ai-zephyr': zephyrFrigateImg,
  'ai-aegis': aegisCarrierImg,
  'ai-manticore': manticoreDestroyerImg,
  'ai-paladin': paladinCruiserImg,
  'ai-wraith': wraithCorvetteImg,
  'ai-forge': forgeTenderImg,
};

export function attachOrUpdateSprite(
  container: PIXI.Container,
  adversaryId: string | undefined,
  isNew: boolean,
  allegiance: ShipAllegianceColor = 'player',
): boolean {
  if (!adversaryId) return false;
  const spriteUrl = ASSET_MAP[adversaryId];
  if (!spriteUrl) return false;

  if (isNew) {
    const sprite = PIXI.Sprite.from(spriteUrl);
    sprite.name = 'shipSprite';
    sprite.anchor.set(0.5);
    sprite.width = 40;
    sprite.height = 40;
    container.addChild(sprite);
  }

  const sprite = container.getChildByName('shipSprite') as PIXI.Sprite | null;
  if (sprite) {
    sprite.tint = getShipColor(allegiance);
  }
  return true;
}

export function drawFacingIndicator(g: PIXI.Graphics, allegiance: ShipAllegianceColor) {
  const color = getShipColor(allegiance);
  g.lineStyle(1.5, color, 0.9);
  g.beginFill(color, 0.7);
  // Chevron pointing right, just ahead of the nose
  g.moveTo(28, 0);
  g.lineTo(18, 5);
  g.lineTo(21, 0);
  g.lineTo(18, -5);
  g.closePath();
  g.endFill();
}

export function drawShipHull(
  g: PIXI.Graphics,
  cx: number,
  cy: number,
  currentHull: number,
  maxHull: number
) {
  if (maxHull <= 0) return;
  const hpRatio = Math.max(0, Math.min(1, currentHull / maxHull));
  
  const barWidth = 28;
  const barHeight = 3;
  // Position it below the shields (shieldRadius is 30)
  const yOffset = 36;
  
  // Background
  g.beginFill(0x1a1a1a, 0.8);
  g.lineStyle(1, 0x000000, 0.8);
  g.drawRect(cx - barWidth / 2, cy + yOffset, barWidth, barHeight);
  g.endFill();
  
  // HP fill
  let hpColor = 0x4DA3FF; // Player blue default
  if (hpRatio <= 0.33) hpColor = 0xFF3333; // Red
  else if (hpRatio <= 0.66) hpColor = 0xFFCC00; // Yellow
  else hpColor = 0x00FF88; // Green if healthy
  
  if (hpRatio > 0) {
    g.lineStyle(0);
    g.beginFill(hpColor, 0.9);
    g.drawRect(cx - barWidth / 2, cy + yOffset, barWidth * hpRatio, barHeight);
    g.endFill();
  }
}
