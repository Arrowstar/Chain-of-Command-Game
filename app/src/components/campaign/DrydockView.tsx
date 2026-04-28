import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getHullPatchCost, PSYCH_EVAL_COST, DEEP_REPAIR_COST, OFFICER_TRAINING_COSTS } from '../../data/drydock';
import { SHIP_CHASSIS } from '../../data/shipChassis';
import { getWeaponById } from '../../data/weapons';
import { getSubsystemById } from '../../data/subsystems';
import { getTechById } from '../../data/experimentalTech';
import { getOfficerById } from '../../data/officers';
import { getScarTooltip } from '../console/scarStatus';
import ArmoryItemCard from './ArmoryItemCard';
import type { WeaponModule, Subsystem } from '../../types/game';

type Tab = 'ships' | 'officers' | 'shipyard' | 'armory';

type SelectedItem = {
  id: string;
  isWeapon: boolean;
  source: 'market' | 'stash';
  cost?: number; // only if market
} | null;

export default function DrydockView() {
  const campaign = useCampaignStore(s => s.campaign);
  const persistedShips = useCampaignStore(s => s.persistedShips);
  const persistedPlayers = useCampaignStore(s => s.persistedPlayers);

  const purchaseHullPatch = useCampaignStore(s => s.purchaseHullPatch);
  const purchaseDeepRepair = useCampaignStore(s => s.purchaseDeepRepair);
  const purchasePsychEval = useCampaignStore(s => s.purchasePsychEval);
  const purchaseOfficerTraining = useCampaignStore(s => s.purchaseOfficerTraining);
  const purchaseChassisUpgrade = useCampaignStore(s => s.purchaseChassisUpgrade);
  const purchaseMarketItem = useCampaignStore(s => s.purchaseMarketItem);
  const purchaseMarketTech = useCampaignStore(s => s.purchaseMarketTech);
  const swapStashItem = useCampaignStore(s => s.swapStashItem);
  const scrapItem = useCampaignStore(s => s.scrapItem);
  const scrapStashedItem = useCampaignStore(s => s.scrapStashedItem);
  const completeDrydock = useCampaignStore(s => s.completeDrydock);
  const hasTech = useCampaignStore(s => s.hasTech);

  const [activeTab, setActiveTab] = useState<Tab>('ships');
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  if (!campaign) return null;

  const hasSmugglerManifest = hasTech('smugglers-manifest');
  const hullPatchCost = getHullPatchCost(hasSmugglerManifest);
  const discountPercent = campaign.pendingEconomicBuffs.nextStoreDiscountPercent;
  const hasFreeRepair = campaign.pendingEconomicBuffs.freeRepairAtNextStation && !campaign.pendingEconomicBuffs.freeRepairConsumed;
  const discountedCost = (baseCost: number) => discountPercent > 0
    ? Math.max(0, Math.floor(baseCost * (100 - discountPercent) / 100))
    : baseCost;

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'ships', label: 'SHIP MAINTENANCE', icon: '🔧' },
    { id: 'officers', label: 'OFFICER MANAGEMENT', icon: '👥' },
    { id: 'shipyard', label: 'SHIPYARD', icon: '⬆️' },
    { id: 'armory', label: 'ARMORY & LOADOUTS', icon: '⚙️' },
  ];

  const panelStyle: React.CSSProperties = { padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' };
  const dimText: React.CSSProperties = { fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 };

  const renderHealthBar = (current: number, max: number, previewHeal: boolean = false) => {
    const segments = [];
    for (let i = 0; i < max; i++) {
      const isFilled = i < current;
      const isPreview = previewHeal && i === current; // the next block to be healed
      segments.push(
        <div key={i} style={{
          flex: 1,
          height: '12px',
          background: isFilled ? 'var(--color-holo-green)' : (isPreview ? 'rgba(100, 255, 180, 0.4)' : 'var(--color-bg-raised)'),
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          boxShadow: isFilled ? '0 0 4px var(--color-holo-green)' : (isPreview ? '0 0 4px var(--color-holo-green)' : 'none')
        }} />
      );
    }
    return (
      <div style={{ display: 'flex', gap: '2px', width: '100%', maxWidth: '200px' }}>
        {segments}
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', background: '#080a0f' }}>
      
      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <div style={{ width: '280px', borderRight: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', padding: 'var(--space-md)' }}>
        <h2 style={{ color: 'var(--color-holo-green)', margin: '0 0 var(--space-xl) 0', fontSize: '1.5rem', lineHeight: 1.2 }}>
          WAR COUNCIL<br/>
          <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)' }}>DRYDOCK COMMAND</span>
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flex: 1 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`btn ${activeTab === t.id ? '' : 'btn--outline'}`}
              onClick={() => { setActiveTab(t.id); setSelectedItem(null); }}
              style={{ padding: 'var(--space-md) var(--space-sm)', fontSize: '0.9rem', textAlign: 'left', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 'var(--space-sm)' }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <button
          className="btn"
          style={{ width: '100%', padding: 'var(--space-md)', fontSize: '1.1rem', marginTop: 'var(--space-lg)' }}
          onClick={completeDrydock}
        >
          CONCLUDE
        </button>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header Bar */}
        <div style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            {(discountPercent > 0 || campaign.pendingEconomicBuffs.freeRepairAtNextStation) && (
              <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                {discountPercent > 0 && (
                  <span style={{ color: 'var(--color-holo-cyan)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ padding: '2px 6px', background: 'rgba(0,204,255,0.2)', borderRadius: '4px' }}>{discountPercent}% OFF</span> Market Purchases
                  </span>
                )}
                {campaign.pendingEconomicBuffs.freeRepairAtNextStation && (
                  <span style={{ color: hasFreeRepair ? 'var(--color-holo-green)' : 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                    {hasFreeRepair ? '1 Free Repair Available' : 'Free Repair Consumed'}
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="label" style={{ color: 'var(--color-text-secondary)', fontSize: '0.7rem' }}>AVAILABLE FUNDS</div>
            <div className="mono" style={{ fontSize: '2.5rem', color: 'var(--color-alert-amber)', textShadow: '0 0 10px rgba(230,160,0,0.3)', lineHeight: 1 }}>
              {campaign.requisitionPoints} <span style={{ fontSize: '1.2rem' }}>RP</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-xl)', position: 'relative' }}>
          
          {/* ── SHIP MAINTENANCE TAB ───────────────────────────────── */}
          {activeTab === 'ships' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {persistedShips.map(ship => {
                const currentChassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId);
                return (
                  <div key={ship.id} className="panel panel--raised" style={{ padding: 'var(--space-md)', display: 'flex', gap: 'var(--space-lg)' }}>
                    {/* Visuals */}
                    <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', flexShrink: 0 }}>
                      {currentChassis?.image ? (
                        <img src={currentChassis.image} alt={currentChassis.name} style={{ width: '100%', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(0,255,100,0.2))' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100px', background: 'var(--color-bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>{ship.name}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', marginBottom: '4px' }}>{ship.currentHull}/{ship.maxHull} HULL</div>
                        {renderHealthBar(ship.currentHull, ship.maxHull)}
                      </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-md)' }}>
                      {/* Hull Patch */}
                      <div className="panel" style={{ flex: '1 1 240px', ...panelStyle }}>
                        <div style={{ fontWeight: 'bold' }}>Hull Patch</div>
                        <div style={dimText}>Restore 1 point of Hull.</div>
                        <button
                          className="btn"
                          disabled={ship.currentHull >= ship.maxHull || (!hasFreeRepair && campaign.requisitionPoints < hullPatchCost)}
                          onClick={() => purchaseHullPatch(ship.id)}
                        >
                          {hasFreeRepair ? 'USE FREE REPAIR' : campaign.requisitionPoints < hullPatchCost ? `INSUFFICIENT RP (${hullPatchCost})` : `PURCHASE (${hullPatchCost} RP)`}
                        </button>
                      </div>

                      {/* Scars */}
                      {ship.scars.length > 0 ? ship.scars.map(scar => (
                        <div key={scar.id} className="panel" title={getScarTooltip(scar)} style={{ flex: '1 1 240px', ...panelStyle, borderLeft: '4px solid var(--color-alert-amber)', borderRadius: '0 4px 4px 0' }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--color-alert-amber)' }}>{scar.name}</div>
                          <div style={dimText}>{scar.effect}</div>
                          <button
                            className="btn"
                            disabled={!hasFreeRepair && campaign.requisitionPoints < DEEP_REPAIR_COST}
                            onClick={() => purchaseDeepRepair(ship.id, scar.id)}
                          >
                            {hasFreeRepair ? 'USE FREE REPAIR' : campaign.requisitionPoints < DEEP_REPAIR_COST ? `INSUFFICIENT RP (${DEEP_REPAIR_COST})` : `DEEP REPAIR (${DEEP_REPAIR_COST} RP)`}
                          </button>
                        </div>
                      )) : (
                        <div className="panel" style={{ flex: '1 1 240px', padding: 'var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)' }}>
                          No Ship Scars
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── OFFICER MANAGEMENT TAB ────────────────────────────── */}
          {activeTab === 'officers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              {persistedPlayers.map(player => {
                const ship = persistedShips.find(s => s.id === player.shipId);
                return (
                  <div key={player.id}>
                    <h3 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                      {player.name} <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>({ship?.name || 'Unknown Ship'})</span>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                      {player.officers.map(officerState => {
                        const officerDef = getOfficerById(officerState.officerId);
                        const costKey = `${officerState.currentTier}-to-${officerState.currentTier === 'rookie' ? 'veteran' : 'elite'}`;
                        const upgradeCost = OFFICER_TRAINING_COSTS[costKey];
                        const isMaxTier = !upgradeCost;
                        
                        return (
                          <div key={officerState.officerId} className={`panel ${officerState.traumas.length > 0 ? 'panel--glow' : ''}`} style={{ ...panelStyle, padding: 0, overflow: 'hidden', borderColor: officerState.traumas.length > 0 ? '#E53E3E' : undefined }}>
                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', padding: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                              {officerDef?.avatar ? (
                                <img src={officerDef.avatar} alt={officerDef.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--color-border)', marginRight: 'var(--space-sm)' }} />
                              ) : (
                                <div style={{ width: '60px', height: '60px', background: '#333', borderRadius: '4px', marginRight: 'var(--space-sm)' }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{officerDef?.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{officerState.station.toUpperCase()}</div>
                                <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                  {['rookie', 'veteran', 'elite', 'legendary'].map((tier, i) => {
                                    const tiers = ['rookie', 'veteran', 'elite', 'legendary'];
                                    const currentIndex = tiers.indexOf(officerState.currentTier);
                                    const isFilled = i <= currentIndex;
                                    return (
                                      <div key={tier} title={tier.toUpperCase()} style={{ width: '12px', height: '12px', borderRadius: '50%', background: isFilled ? 'var(--color-holo-cyan)' : 'var(--color-bg-raised)', border: `1px solid ${isFilled ? 'var(--color-holo-cyan)' : 'var(--color-border)'}` }} />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                              {officerState.traumas.length > 0 && (
                                <div style={{ padding: 'var(--space-xs) var(--space-sm)', background: 'rgba(229, 62, 62, 0.1)', borderLeft: '3px solid #E53E3E', fontSize: '0.85rem' }}>
                                  <div style={{ color: '#E53E3E', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ⚠️ {officerState.traumas[officerState.traumas.length - 1].name}
                                  </div>
                                  <button
                                    className="btn btn--outline"
                                    style={{ width: '100%', fontSize: '0.8rem', padding: '4px', marginTop: 'var(--space-xs)', color: '#E53E3E', borderColor: '#E53E3E' }}
                                    disabled={!hasFreeRepair && campaign.requisitionPoints < PSYCH_EVAL_COST}
                                    onClick={() => purchasePsychEval(officerState.officerId, player.shipId)}
                                  >
                                    {hasFreeRepair ? 'USE FREE REPAIR' : campaign.requisitionPoints < PSYCH_EVAL_COST ? `NEEDS ${PSYCH_EVAL_COST} RP` : `PSYCH EVAL (${PSYCH_EVAL_COST} RP)`}
                                  </button>
                                </div>
                              )}
                              
                              <button
                                className="btn btn--outline"
                                style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }}
                                disabled={isMaxTier || campaign.requisitionPoints < upgradeCost!}
                                onClick={() => {
                                  if (!isMaxTier) purchaseOfficerTraining(officerState.officerId, player.shipId);
                                }}
                              >
                                {isMaxTier ? 'MAX TIER REACHED' : (campaign.requisitionPoints < upgradeCost! ? `TRAINING (${upgradeCost} RP)` : `OFFICER TRAINING (${upgradeCost} RP)`)}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── SHIPYARD TAB ──────────────────────────────────────── */}
          {activeTab === 'shipyard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {persistedShips.map(ship => {
                const currentChassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId);
                const upgradable = SHIP_CHASSIS.filter(c => c.id !== ship.chassisId);
                return (
                  <div key={ship.id} className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                      {currentChassis?.image && <img src={currentChassis.image} alt={currentChassis.name} style={{ width: '120px', objectFit: 'contain' }} />}
                      <div>
                        <h3 style={{ margin: '0 0 var(--space-xs) 0', color: 'var(--color-text-primary)' }}>{ship.name}</h3>
                        <div style={{ ...dimText }}>
                          Current: <strong style={{ color: 'var(--color-holo-cyan)' }}>{currentChassis?.className ?? ship.chassisId}</strong>
                          <br/>Hull {currentChassis?.baseHull} · Shields {currentChassis?.shieldsPerSector}/sector
                          <br/>{currentChassis?.weaponSlots}W / {currentChassis?.internalSlots}I slots
                          {currentChassis && (
                            <div>
                              Trait: <strong title={currentChassis.uniqueTraitEffect} style={{ color: 'var(--color-holo-cyan)', cursor: 'help', borderBottom: '1px dotted var(--color-holo-cyan)' }}>{currentChassis.uniqueTraitName}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
                      {upgradable.map(chassis => {
                        const canAfford = campaign.requisitionPoints >= chassis.rpCost;
                        const excessW = Math.max(0, ship.equippedWeapons.filter(Boolean).length - chassis.weaponSlots);
                        const excessS = Math.max(0, ship.equippedSubsystems.filter(Boolean).length - chassis.internalSlots);
                        const hasExcess = excessW + excessS > 0;

                        return (
                          <div key={chassis.id} className="panel" style={{ ...panelStyle, opacity: canAfford ? 1 : 0.6, display: 'flex', flexDirection: 'row', gap: 'var(--space-sm)' }}>
                            {chassis.image && <img src={chassis.image} alt={chassis.name} style={{ width: '80px', objectFit: 'contain' }} />}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)', fontSize: '0.9rem' }}>{chassis.className}</div>
                              <div style={{ ...dimText, fontSize: '0.75rem' }}>
                                Hull {chassis.baseHull} · Shld {chassis.shieldsPerSector} · Spd {chassis.maxSpeed}
                                <br />
                                {chassis.weaponSlots}W / {chassis.internalSlots}I slots
                              </div>
                              <div title={chassis.uniqueTraitEffect} style={{ fontSize: '0.7rem', color: 'var(--color-holo-cyan)', fontStyle: 'italic', marginTop: '4px', flex: 1, cursor: 'help' }}>
                                ✦ {chassis.uniqueTraitName}
                              </div>
                              {hasExcess && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--color-alert-amber)', marginTop: '4px' }}>
                                  ⚠ {excessW + excessS} item(s) will stash
                                </div>
                              )}
                              <button
                                className="btn"
                                style={{ padding: '4px', fontSize: '0.8rem', marginTop: 'var(--space-xs)' }}
                                disabled={!canAfford}
                                onClick={() => purchaseChassisUpgrade(ship.id, chassis.id)}
                              >
                                {canAfford ? `UPGRADE (${chassis.rpCost} RP)` : `NEEDS ${chassis.rpCost} RP`}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── ARMORY TAB ────────────────────────────────────────── */}
          {activeTab === 'armory' && (
            <div style={{ display: 'flex', gap: 'var(--space-xl)', height: '100%' }}>
              
              {/* Left Pane: Inventory (Market + Stash) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflowY: 'auto', paddingRight: 'var(--space-sm)' }}>
                <h3 style={{ margin: 0, color: 'var(--color-holo-cyan)', position: 'sticky', top: 0, background: '#080a0f', zIndex: 1, paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                  MARKET & STASH
                </h3>
                
                <div className="label" style={{ marginTop: 'var(--space-sm)' }}>MARKET</div>

                {campaign.drydockMarket?.techOffer && (() => {
                  const tech = getTechById(campaign.drydockMarket!.techOffer!);
                  if (!tech) return null;
                  const techCost = discountedCost(tech.rarity === 'rare' ? 50 : tech.rarity === 'uncommon' ? 40 : 30);
                  const canAffordTech = campaign.requisitionPoints >= techCost;
                  return (
                    <div key={tech.id} className="panel" style={{ ...panelStyle, opacity: canAffordTech ? 1 : 0.6, borderLeft: '3px solid var(--color-holo-cyan)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        {tech.imagePath && <img src={tech.imagePath} alt={tech.name} style={{ width: '60px', height: '60px', objectFit: 'contain' }} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold' }}>{tech.name}</div>
                          <div style={{ ...dimText, color: 'var(--color-holo-cyan)' }}>Experimental Tech · {tech.rarity.toUpperCase()}</div>
                          <div style={{ ...dimText }}>{tech.effect}</div>
                        </div>
                      </div>
                      <button className="btn" disabled={!canAffordTech} onClick={() => purchaseMarketTech(tech.id)}>
                        {canAffordTech ? `BUY TECH (${techCost} RP)` : `INSUFFICIENT RP (${techCost})`}
                      </button>
                    </div>
                  );
                })()}

                {/* Market Items */}
                {campaign.drydockMarket && [...campaign.drydockMarket.weapons.map(id => ({ id, isWeapon: true })), ...campaign.drydockMarket.subsystems.map(id => ({ id, isWeapon: false }))].map(({ id, isWeapon }) => {
                  const item = isWeapon ? getWeaponById(id) : getSubsystemById(id);
                  if (!item) return null;
                  const cost = discountedCost(item.rpCost);
                  const isSelected = selectedItem?.id === id && selectedItem?.source === 'market';
                  return (
                    <ArmoryItemCard key={`market-${id}`} item={item} isWeapon={isWeapon} isSelected={isSelected} onClick={() => setSelectedItem({ id, isWeapon, source: 'market', cost })}>
                      <div style={{ ...dimText }}>Cost: <strong style={{ color: 'var(--color-alert-amber)' }}>{cost} RP</strong></div>
                    </ArmoryItemCard>
                  );
                })}

                {/* Stash Items */}
                <div className="label" style={{ marginTop: 'var(--space-sm)' }}>FLEET STASH</div>
                {campaign.stashedWeapons.length === 0 && campaign.stashedSubsystems.length === 0 ? (
                  <div style={{ color: 'var(--color-text-dim)', fontStyle: 'italic', padding: 'var(--space-sm)', textAlign: 'center' }}>
                    Your fleet stash is currently empty.
                  </div>
                ) : (
                  [...campaign.stashedWeapons.map((id, idx) => ({ id, isWeapon: true, idx })), ...campaign.stashedSubsystems.map((id, idx) => ({ id, isWeapon: false, idx }))].map(({ id, isWeapon, idx }) => {
                    const item = isWeapon ? getWeaponById(id) : getSubsystemById(id);
                    if (!item) return null;
                    // Use a unique ID for stash selection since duplicates can exist
                    const uniqueId = `${id}-${idx}`;
                    const isSelected = selectedItem?.id === uniqueId && selectedItem?.source === 'stash';
                    return (
                      <ArmoryItemCard key={`stash-${uniqueId}`} item={item} isWeapon={isWeapon} isSelected={isSelected} onClick={() => setSelectedItem({ id: uniqueId, isWeapon, source: 'stash' })}>
                        {isSelected && (
                          <button
                            className="btn btn--outline"
                            style={{ fontSize: '0.78rem', padding: '4px', marginTop: 'var(--space-xs)', color: 'var(--color-alert-amber)', borderColor: 'rgba(230,160,0,0.3)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Scrap ${item.name} for 15 RP? This cannot be undone.`)) {
                                scrapStashedItem(id, isWeapon);
                                setSelectedItem(null);
                              }
                            }}
                          >
                            SCRAP (+15 RP)
                          </button>
                        )}
                      </ArmoryItemCard>
                    );
                  })
                )}
              </div>

              {/* Right Pane: Active Loadout */}
              <div style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', overflowY: 'auto', borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-lg)' }}>
                <h3 style={{ margin: 0, color: 'var(--color-text-primary)', position: 'sticky', top: 0, background: '#080a0f', zIndex: 1, paddingBottom: 'var(--space-sm)', borderBottom: '1px solid var(--color-border)' }}>
                  ACTIVE LOADOUTS
                </h3>
                
                {selectedItem ? (
                  <div style={{ padding: 'var(--space-sm)', background: 'rgba(0,204,255,0.1)', border: '1px solid var(--color-holo-cyan)', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--color-holo-cyan)' }}>
                    Click an empty or filled slot below to equip the selected item.
                  </div>
                ) : (
                  <div style={{ padding: 'var(--space-sm)', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
                    Select an item from the Market or Stash to equip it, or click a filled slot below to unequip it.
                  </div>
                )}

                {persistedShips.map(ship => {
                  const chassis = SHIP_CHASSIS.find(c => c.id === ship.chassisId);
                  if (!chassis) return null;

                  return (
                    <div key={ship.id} className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        {chassis.image && <img src={chassis.image} alt={chassis.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />}
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{ship.name}</div>
                      </div>

                      {/* Weapons */}
                      <div className="label" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>WEAPON SLOTS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: 'var(--space-md)' }}>
                        {ship.equippedWeapons.map((wId, i) => {
                          const w = wId ? getWeaponById(wId) : null;
                          const isTargetable = selectedItem && selectedItem.isWeapon;
                          const canAfford = selectedItem?.source === 'market' ? campaign.requisitionPoints >= (selectedItem.cost ?? 0) : true;
                          return (
                            <div 
                              key={`w-${i}`} 
                              className={`panel ${isTargetable ? 'panel--glow' : ''}`}
                              style={{ 
                                padding: 'var(--space-xs) var(--space-sm)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 'var(--space-sm)', 
                                cursor: isTargetable && canAfford ? 'pointer' : 'default',
                                background: w ? 'var(--color-bg-raised)' : 'rgba(0,0,0,0.3)',
                                borderStyle: w ? 'solid' : 'dashed'
                              }}
                              onClick={() => {
                                if (isTargetable && canAfford) {
                                  const baseItemId = selectedItem.source === 'stash' ? selectedItem.id.split('-')[0] : selectedItem.id;
                                  if (selectedItem.source === 'market') {
                                    purchaseMarketItem(baseItemId, ship.id, true, i);
                                  } else {
                                    swapStashItem(ship.id, i, baseItemId, true, 'equip');
                                  }
                                  setSelectedItem(null);
                                }
                              }}
                            >
                              <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--color-holo-cyan)', width: '24px' }}>W{i+1}</div>
                              {w ? (
                                <>
                                  <div style={{ flex: 1, fontSize: '0.85rem' }}>{w.name}</div>
                                  <button 
                                    className="btn btn--outline" 
                                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                    onClick={(e) => { e.stopPropagation(); swapStashItem(ship.id, i, wId!, true, 'stash'); }}
                                  >
                                    UNEQUIP
                                  </button>
                                </>
                              ) : (
                                <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>Empty</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Subsystems */}
                      <div className="label" style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>INTERNAL SLOTS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {ship.equippedSubsystems.map((sId, i) => {
                          const sub = sId ? getSubsystemById(sId) : null;
                          const isTargetable = selectedItem && !selectedItem.isWeapon;
                          const canAfford = selectedItem?.source === 'market' ? campaign.requisitionPoints >= (selectedItem.cost ?? 0) : true;
                          return (
                            <div 
                              key={`s-${i}`} 
                              className={`panel ${isTargetable ? 'panel--glow' : ''}`}
                              style={{ 
                                padding: 'var(--space-xs) var(--space-sm)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 'var(--space-sm)', 
                                cursor: isTargetable && canAfford ? 'pointer' : 'default',
                                background: sub ? 'var(--color-bg-raised)' : 'rgba(0,0,0,0.3)',
                                borderStyle: sub ? 'solid' : 'dashed'
                              }}
                              onClick={() => {
                                if (isTargetable && canAfford) {
                                  const baseItemId = selectedItem.source === 'stash' ? selectedItem.id.split('-')[0] : selectedItem.id;
                                  if (selectedItem.source === 'market') {
                                    purchaseMarketItem(baseItemId, ship.id, false, i);
                                  } else {
                                    swapStashItem(ship.id, i, baseItemId, false, 'equip');
                                  }
                                  setSelectedItem(null);
                                }
                              }}
                            >
                              <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--color-holo-green)', width: '24px' }}>I{i+1}</div>
                              {sub ? (
                                <>
                                  <div style={{ flex: 1, fontSize: '0.85rem' }}>{sub.name}</div>
                                  <button 
                                    className="btn btn--outline" 
                                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                    onClick={(e) => { e.stopPropagation(); swapStashItem(ship.id, i, sId!, false, 'stash'); }}
                                  >
                                    UNEQUIP
                                  </button>
                                </>
                              ) : (
                                <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>Empty</div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
