import React from 'react';
import type { ShipArc } from '../../types/game';
import { HexFacing } from '../../types/game';
import { SHIP_CHASSIS } from '../../data/shipChassis';
import { WEAPONS, TAG_LABELS } from '../../data/weapons';
import { ADVERSARIES } from '../../data/adversaries';
import { isInFiringArc, hexDistance } from '../../engine/hexGrid';

// ── Palette ──────────────────────────────────────────────────────
export const WEAPON_COLORS = ['#4FD1C5', '#F6E05E', '#F6AD55', '#FC8181', '#B794F4', '#63B3ED'];

export const STATION_COLORS: Record<string, string> = {
  helm: 'hsl(45, 90%, 60%)',
  tactical: 'hsl(0, 80%, 62%)',
  engineering: 'hsl(130, 70%, 50%)',
  sensors: 'var(--color-holo-cyan)',
};
export const STATION_BG: Record<string, string> = {
  helm: 'hsla(45, 90%, 60%, 0.1)',
  tactical: 'hsla(0, 80%, 62%, 0.1)',
  engineering: 'hsla(130, 70%, 50%, 0.1)',
  sensors: 'rgba(0, 204, 255, 0.08)',
};
export const STATION_ICONS: Record<string, string> = {
  helm: '✦', tactical: '⚔', engineering: '⚙', sensors: '◉',
};

// ── Weapon categories ────────────────────────────────────────────
export const WEAPON_CATEGORY_TAGS: Record<string, string[]> = {
  ENERGY: ['shieldBreaker'],
  KINETIC: ['armorPiercing', 'broadside', 'standard'],
  MISSILE: ['torpedo', 'ordnance'],
  SUPPORT: ['pointDefense', 'areaOfEffect'],
};
export function getWeaponCategory(weapon: { tags: string[] }): string {
  for (const [cat, tags] of Object.entries(WEAPON_CATEGORY_TAGS)) {
    if (weapon.tags.some(t => tags.includes(t))) return cat;
  }
  return 'KINETIC';
}

// ── Chassis stat maxes for stat bars ────────────────────────────
export const CHASSIS_MAX = {
  hull: Math.max(...SHIP_CHASSIS.map(c => c.baseHull)),
  shields: Math.max(...SHIP_CHASSIS.map(c => c.shieldsPerSector)),
  speed: Math.max(...SHIP_CHASSIS.map(c => c.maxSpeed)),
  evasion: Math.max(...SHIP_CHASSIS.map(c => c.baseEvasion)),
};

// ── Hex geometry helpers ─────────────────────────────────────────
const ARC_INDEX: Record<string, number> = { fore:0, foreStarboard:1, aftStarboard:2, aft:3, aftPort:4, forePort:5 };

function arcBandPath(cx:number, cy:number, ir:number, or_:number, sa:number, ea:number) {
  if (ea-sa>=360) ea=sa+359.99;
  const r=(d:number)=>(d-90)*Math.PI/180;
  const [x1o,y1o]=[cx+or_*Math.cos(r(sa)),cy+or_*Math.sin(r(sa))];
  const [x2o,y2o]=[cx+or_*Math.cos(r(ea)),cy+or_*Math.sin(r(ea))];
  const lg=ea-sa>180?1:0;
  if(ir<=0) return `M ${cx} ${cy} L ${x1o} ${y1o} A ${or_} ${or_} 0 ${lg} 1 ${x2o} ${y2o} Z`;
  const [x1i,y1i]=[cx+ir*Math.cos(r(ea)),cy+ir*Math.sin(r(ea))];
  const [x2i,y2i]=[cx+ir*Math.cos(r(sa)),cy+ir*Math.sin(r(sa))];
  return `M ${x1o} ${y1o} A ${or_} ${or_} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${ir} ${ir} 0 ${lg} 0 ${x2i} ${y2i} Z`;
}
function hexPath(cx:number, cy:number, s:number, q:number, r:number) {
  const hx=cx+s*(3/2*q), hy=cy+s*(Math.sqrt(3)/2*q+Math.sqrt(3)*r);
  const pts=Array.from({length:6},(_,i)=>`${hx+s*Math.cos(Math.PI/180*(60*i))},${hy+s*Math.sin(Math.PI/180*(60*i))}`);
  return `M ${pts.join(' L ')} Z`;
}

// ── StatBar ──────────────────────────────────────────────────────
export function StatBar({ label, value, max, color='var(--color-holo-cyan)' }:{ label:string; value:number; max:number; color?:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
      <span className="mono" style={{ fontSize:'0.58rem', color:'var(--color-text-dim)', width:'58px', flexShrink:0 }}>{label}</span>
      <div style={{ flex:1, height:'3px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden' }}>
        <div style={{ width:`${Math.min((value/max)*100,100)}%`, height:'100%', background:color, borderRadius:'2px', transition:'width 0.3s' }} />
      </div>
      <span className="mono" style={{ fontSize:'0.6rem', color:'var(--color-text-secondary)', width:'20px', textAlign:'right' }}>{value}</span>
    </div>
  );
}

// ── StressPips ───────────────────────────────────────────────────
export function StressPips({ limit }:{ limit:number|null }) {
  if (limit===null) return <span className="mono" style={{ fontSize:'0.6rem', padding:'1px 5px', borderRadius:'3px', background:'rgba(246,173,85,0.15)', color:'var(--color-alert-amber)', border:'1px solid var(--color-alert-amber)' }}>IMMUNE</span>;
  return (
    <div style={{ display:'flex', gap:'2px' }}>
      {Array.from({length:7}).map((_,i)=>(
        <div key={i} style={{ width:'7px', height:'7px', borderRadius:'50%', background:i<limit?'var(--color-alert-amber)':'rgba(255,255,255,0.1)', border:`1px solid ${i<limit?'var(--color-alert-amber)':'rgba(255,255,255,0.2)'}` }} />
      ))}
    </div>
  );
}

// ── SlotPips ─────────────────────────────────────────────────────
export function SlotPips({ used, total, color='var(--color-holo-cyan)' }:{ used:number; total:number; color?:string }) {
  return (
    <div style={{ display:'flex', gap:'3px' }}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{ width:'10px', height:'10px', borderRadius:'2px', background:i<used?color:'rgba(255,255,255,0.08)', border:`1px solid ${i<used?color:'rgba(255,255,255,0.2)'}`, transition:'all 0.2s' }} />
      ))}
    </div>
  );
}

// ── ShipLoadoutPreview ───────────────────────────────────────────
export function ShipLoadoutPreview({ chassis, selectedWeaponIds, hoveredWeaponId }:{ chassis:any; selectedWeaponIds:string[]; hoveredWeaponId?:string|null }) {
  const cx=150, cy=150, hs=16, br=26;
  const weapons=selectedWeaponIds.map(id=>WEAPONS.find(w=>w.id===id)).filter(Boolean) as any[];
  const origin={q:0,r:0};
  const allHex:{q:number;r:number}[]=[];
  for(let q=-6;q<=6;q++) for(let r=-6;r<=6;r++) if(hexDistance(origin,{q,r})<=6) allHex.push({q,r});
  const bgD=allHex.map(h=>hexPath(cx,cy,hs,h.q,h.r)).join(' ');
  const avgDie:Record<string,number>={d4:2.5,d6:3.5,d8:4.5,d10:5.5,d12:6.5,d20:10.5};
  const totalAvg=weapons.reduce((s,w)=>s+w.volleyPool.reduce((a:number,d:string)=>a+(avgDie[d]||0),0),0);
  const arcAbbr:Record<string,string>={fore:'F',foreStarboard:'F-S',aftStarboard:'A-S',aft:'A',aftPort:'A-P',forePort:'F-P'};
  return (
    <div className="panel panel--raised" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'var(--space-sm)' }}>
      <div className="label" style={{ color:'var(--color-holo-cyan)', alignSelf:'flex-start' }}>LOADOUT PREVIEW</div>
      <svg width="280" height="280" viewBox="0 0 300 300" style={{ background:'var(--color-bg-deep)', borderRadius:'50%', border:'1px solid var(--color-border)' }}>
        <path d={bgD} fill="none" stroke="var(--color-border)" strokeWidth="0.8" opacity="0.4" />
        {weapons.map((w,i)=>{
          const col=WEAPON_COLORS[i%WEAPON_COLORS.length];
          const hov=hoveredWeaponId===w.id;
          const maxR=w.rangeMax===Infinity?6:w.rangeMax;
          const hexes=allHex.filter(h=>{
            if(h.q===0&&h.r===0) return false;
            const d=hexDistance(origin,h);
            return d>=(w.rangeMin||0)&&d<=maxR&&isInFiringArc(origin,HexFacing.Fore,h,w.arcs as ShipArc[]);
          });
          if(!hexes.length) return null;
          return <path key={`${w.id}-${i}`} d={hexes.map(h=>hexPath(cx,cy,hs,h.q,h.r)).join(' ')} fill={col} opacity={hov?0.55:0.25} stroke={col} strokeWidth={hov?2:1.5} strokeLinejoin="round" style={{transition:'opacity 0.2s'}} />;
        })}
        {Object.keys(ARC_INDEX).map((_,i)=>{
          const sa=i*60-30, ea=sa+60, tr=br-8;
          const tx=cx+tr*Math.cos((sa+30-90)*Math.PI/180), ty=cy+tr*Math.sin((sa+30-90)*Math.PI/180);
          return (<g key={i}><path d={arcBandPath(cx,cy,br-16,br,sa+2,ea-2)} fill="rgba(0,204,255,0.1)" stroke="var(--color-holo-cyan)" strokeWidth="2" opacity="0.9"/><text x={tx} y={ty} fill="white" fontSize="9" textAnchor="middle" alignmentBaseline="middle" className="mono">{chassis.shieldsPerSector}</text></g>);
        })}
        <path d={`M ${cx+12*Math.cos(-30*Math.PI/180)},${cy+12*Math.sin(-30*Math.PI/180)} L ${cx+10*Math.cos(105*Math.PI/180)},${cy+10*Math.sin(105*Math.PI/180)} L ${cx+4*Math.cos(150*Math.PI/180)},${cy+4*Math.sin(150*Math.PI/180)} L ${cx+10*Math.cos(195*Math.PI/180)},${cy+10*Math.sin(195*Math.PI/180)} Z`} fill="var(--color-bg-panel)" stroke="#A0AEC0" strokeWidth="1.5"/>
      </svg>
      <div className="mono" style={{ fontSize:'0.65rem', color:'var(--color-text-dim)' }}>SHIELD SECTORS &amp; WEAPON ARCS</div>
      {weapons.length>0&&(
        <div style={{ alignSelf:'stretch', borderTop:'1px solid var(--color-border)', paddingTop:'var(--space-sm)', display:'flex', flexDirection:'column', gap:'4px' }}>
          <div className="label" style={{ fontSize:'0.58rem', color:'var(--color-text-dim)' }}>SELECTED WEAPONS</div>
          {weapons.map((w,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'2px', background:WEAPON_COLORS[i%WEAPON_COLORS.length], flexShrink:0 }}/>
                <span className="mono" style={{ fontSize:'0.6rem', color:'var(--color-text-secondary)' }}>{w.name}</span>
              </div>
              <span className="mono" style={{ fontSize:'0.58rem', color:'var(--color-text-dim)' }}>{w.volleyPool.join('+')} | {(w.arcs as string[]).map((a:string)=>arcAbbr[a]||a).join('/')}</span>
            </div>
          ))}
          <div style={{ marginTop:'4px', paddingTop:'4px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', justifyContent:'space-between' }}>
            <span className="mono" style={{ fontSize:'0.58rem', color:'var(--color-text-dim)' }}>AVG TOTAL DMG</span>
            <span className="mono" style={{ fontSize:'0.65rem', color:'var(--color-holo-cyan)', fontWeight:'bold' }}>{totalAvg.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── OfficerDetailPanel ───────────────────────────────────────────
export function OfficerDetailPanel({ officer, stationColor, isWide, onClose }:{ officer:any; stationColor:string; isWide:boolean; onClose:()=>void }) {
  const panelStyle:React.CSSProperties = isWide
    ? { position:'fixed', top:'50%', right:'24px', transform:'translateY(-50%)', width:'300px', zIndex:200, maxHeight:'80vh', overflowY:'auto' }
    : { position:'fixed', bottom:0, left:0, right:0, zIndex:200, maxHeight:'60vh', overflowY:'auto' };
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:199, background:'rgba(0,0,0,0.45)' }} onClick={onClose}/>
      <div className="panel panel--raised" style={{ ...panelStyle, background:'var(--color-bg-panel)', border:`1px solid ${stationColor}`, boxShadow:`0 0 28px ${stationColor}50`, padding:'var(--space-md)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-md)' }}>
          <div>
            <div className="label" style={{ fontSize:'0.62rem', color:stationColor, marginBottom:'2px' }}>{officer.station.toUpperCase()} OFFICER</div>
            <div style={{ fontWeight:'bold', fontSize:'1rem', color:'var(--color-text-bright)' }}>{officer.name}</div>
          </div>
          <button className="btn" onClick={onClose} style={{ padding:'2px 8px', fontSize:'0.75rem' }}>✕</button>
        </div>
        <img src={officer.avatar} alt={officer.name} style={{ width:'100%', maxHeight:'160px', objectFit:'cover', objectPosition:'top', borderRadius:'6px', border:`1px solid ${stationColor}40`, marginBottom:'var(--space-md)' }}/>
        {officer.bio&&<div className="mono" style={{ fontSize:'0.72rem', color:'var(--color-text-dim)', fontStyle:'italic', marginBottom:'var(--space-md)', lineHeight:'1.4', padding:'8px', background:'rgba(0,0,0,0.2)', borderRadius:'4px', borderLeft:`2px solid ${stationColor}` }}>{officer.bio}</div>}
        <div style={{ marginBottom:'var(--space-sm)' }}>
          <div className="label" style={{ fontSize:'0.6rem', color:'var(--color-text-dim)', marginBottom:'4px' }}>STRESS LIMIT</div>
          <StressPips limit={officer.stressLimit}/>
        </div>
        <div style={{ padding:'10px', background:'rgba(0,0,0,0.2)', borderRadius:'6px', borderLeft:`2px solid ${stationColor}` }}>
          <div className="label" style={{ fontSize:'0.65rem', color:stationColor, marginBottom:'4px' }}>{officer.traitName}</div>
          <div className="mono" style={{ fontSize:'0.7rem', color:'var(--color-text-secondary)', lineHeight:'1.4' }}>{officer.traitEffect}</div>
        </div>
        <div style={{ marginTop:'var(--space-sm)', display:'flex', justifyContent:'flex-end' }}>
          <span className="mono" style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:'3px', background:'rgba(0,204,255,0.12)', border:'1px solid var(--color-holo-cyan)', color:'var(--color-holo-cyan)', fontWeight:'bold' }}>{officer.dpCost} DP</span>
        </div>
      </div>
    </>
  );
}

// ── EnemyFleetPreview ────────────────────────────────────────────
export function EnemyFleetPreview() {
  const enemy=ADVERSARIES[0];
  const aiColors:Record<string,string>={ aggressive:'var(--color-hostile-red)', artillery:'var(--color-alert-amber)', hunter:'#B794F4', swarm:'#FC8181', support:'var(--color-holo-green)' };
  const col=aiColors[enemy.aiTag]||'var(--color-text-dim)';
  return (
    <div className="panel panel--raised" style={{ marginTop:'var(--space-md)', padding:'var(--space-md)', borderColor:'rgba(255,80,80,0.3)' }}>
      <div className="label" style={{ fontSize:'0.65rem', color:'var(--color-text-dim)', marginBottom:'var(--space-sm)' }}>YOUR OPPONENT</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'var(--space-sm)' }}>
        <div>
          <div style={{ fontWeight:'bold', color:'var(--color-hostile-red)', marginBottom:'2px' }}>{enemy.name}</div>
          <div className="mono" style={{ fontSize:'0.7rem', color:'var(--color-text-secondary)' }}>Size: {enemy.size.toUpperCase()} | Hull: {enemy.hull} | Shields: {enemy.shieldsPerSector}/sector</div>
          <div className="mono" style={{ fontSize:'0.7rem', color:'var(--color-text-secondary)' }}>Speed: {enemy.speed} | Evasion: {enemy.baseEvasion} | Armor: {enemy.armorDie}</div>
        </div>
        <span className="mono" style={{ fontSize:'0.62rem', padding:'2px 7px', borderRadius:'3px', background:`${col}20`, border:`1px solid ${col}`, color:col, whiteSpace:'nowrap' }}>{enemy.aiTag.toUpperCase()}</span>
      </div>
      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginBottom:'var(--space-sm)' }}>
        <span className="mono" style={{ fontSize:'0.6rem', color:'var(--color-text-dim)' }}>VOLLEY:</span>
        {enemy.volleyPool.map((d,i)=>(
          <span key={i} className="mono" style={{ fontSize:'0.6rem', padding:'1px 5px', borderRadius:'3px', background:'rgba(255,80,80,0.1)', border:'1px solid rgba(255,80,80,0.3)', color:'var(--color-hostile-red)' }}>{d.toUpperCase()}</span>
        ))}
        <span className="mono" style={{ fontSize:'0.6rem', color:'var(--color-text-dim)' }}>| Range {enemy.weaponRangeMin}–{enemy.weaponRangeMax}</span>
      </div>
      {enemy.special&&<div className="mono" style={{ fontSize:'0.65rem', color:'var(--color-text-dim)', fontStyle:'italic', padding:'6px 8px', background:'rgba(0,0,0,0.2)', borderRadius:'4px', borderLeft:'2px solid rgba(255,80,80,0.4)' }}>{enemy.special}</div>}
    </div>
  );
}

// ── ChassisComparePanel ──────────────────────────────────────────
export function ChassisComparePanel({ ids, onClose }:{ ids:string[]; onClose:()=>void }) {
  const chassis=ids.map(id=>SHIP_CHASSIS.find(c=>c.id===id)).filter(Boolean) as any[];
  if(chassis.length<2) return null;
  const [a,b]=chassis;
  const rows=[
    {label:'Hull',a:a.baseHull,b:b.baseHull,max:CHASSIS_MAX.hull},
    {label:'Shields/Sector',a:a.shieldsPerSector,b:b.shieldsPerSector,max:CHASSIS_MAX.shields},
    {label:'Max Speed',a:a.maxSpeed,b:b.maxSpeed,max:CHASSIS_MAX.speed},
    {label:'Base Evasion',a:a.baseEvasion,b:b.baseEvasion,max:CHASSIS_MAX.evasion},
    {label:'Weapon Slots',a:a.weaponSlots,b:b.weaponSlots,max:6},
    {label:'Subsys Slots',a:a.internalSlots,b:b.internalSlots,max:6},
    {label:'CT Generation',a:a.ctGeneration,b:b.ctGeneration,max:8},
  ];
  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:299, background:'rgba(0,0,0,0.6)' }} onClick={onClose}/>
      <div className="panel panel--raised" style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:300, width:'min(700px, 92vw)', maxHeight:'85vh', overflowY:'auto', padding:'var(--space-lg)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'var(--space-md)' }}>
          <div className="label" style={{ color:'var(--color-holo-cyan)' }}>SIDE-BY-SIDE COMPARISON</div>
          <button className="btn" onClick={onClose} style={{ padding:'2px 8px' }}>✕ CLOSE</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-md)', marginBottom:'var(--space-md)' }}>
          {[a,b].map((c,i)=>(
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {c.image&&<img src={c.image} alt={c.className} style={{ width:'100%', height:'120px', objectFit:'cover', borderRadius:'6px', border:'1px solid var(--color-border)', opacity:0.85 }}/>}
              <div className="label" style={{ color:'var(--color-holo-cyan)', fontSize:'0.8rem' }}>{c.className}</div>
              <div className="mono" style={{ fontSize:'0.65rem', color:'var(--color-text-dim)', fontStyle:'italic' }}>{c.flavorText}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          {rows.map(row=>{
            const winA=row.a>row.b, winB=row.b>row.a;
            return (
              <div key={row.label} style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'8px', alignItems:'center' }}>
                <div style={{ textAlign:'right' }}>
                  <span className="mono" style={{ fontSize:'0.75rem', color:winA?'var(--color-holo-green)':'var(--color-text-secondary)', fontWeight:winA?'bold':'normal' }}>{row.a}</span>
                  <div style={{ height:'3px', background:winA?'var(--color-holo-green)':'rgba(255,255,255,0.1)', borderRadius:'2px', marginTop:'2px', width:`${(row.a/row.max)*100}%`, marginLeft:'auto' }}/>
                </div>
                <span className="mono" style={{ fontSize:'0.58rem', color:'var(--color-text-dim)', textAlign:'center', minWidth:'80px' }}>{row.label}</span>
                <div>
                  <span className="mono" style={{ fontSize:'0.75rem', color:winB?'var(--color-holo-green)':'var(--color-text-secondary)', fontWeight:winB?'bold':'normal' }}>{row.b}</span>
                  <div style={{ height:'3px', background:winB?'var(--color-holo-green)':'rgba(255,255,255,0.1)', borderRadius:'2px', marginTop:'2px', width:`${(row.b/row.max)*100}%` }}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--space-md)', marginTop:'var(--space-md)' }}>
          {[a,b].map((c,i)=>(
            <div key={i} style={{ padding:'8px', background:'rgba(0,0,0,0.2)', borderRadius:'6px', borderLeft:'2px solid var(--color-holo-cyan)' }}>
              <div className="label" style={{ fontSize:'0.6rem', color:'var(--color-holo-cyan)', marginBottom:'3px' }}>{c.uniqueTraitName}</div>
              <div className="mono" style={{ fontSize:'0.65rem', color:'var(--color-text-secondary)', lineHeight:'1.35' }}>{c.uniqueTraitEffect}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
