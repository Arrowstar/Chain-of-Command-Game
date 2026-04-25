import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { getHullPatchCost, PSYCH_EVAL_COST, DEEP_REPAIR_COST, OFFICER_TRAINING_COSTS } from '../../data/drydock';
import { SHIP_CHASSIS } from '../../data/shipChassis';
import { getWeaponById } from '../../data/weapons';
import { getSubsystemById } from '../../data/subsystems';
import { getTechById } from '../../data/experimentalTech';
import { getScarTooltip } from '../console/scarStatus';
import ArmoryItemCard from './ArmoryItemCard';

type Tab = 'ships' | 'officers' | 'shipyard' | 'armory';

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
  // For stash equip: which ship + slot to equip into
  const [stashEquipTarget, setStashEquipTarget] = useState<Record<string, { shipId: string; slotIndex: number }>>({});

  if (!campaign) return null;

  const hasSmugglerManifest = hasTech('smugglers-manifest');
  const hullPatchCost = getHullPatchCost(hasSmugglerManifest);
  const discountPercent = campaign.pendingEconomicBuffs.nextStoreDiscountPercent;
  const hasFreeRepair = campaign.pendingEconomicBuffs.freeRepairAtNextStation && !campaign.pendingEconomicBuffs.freeRepairConsumed;
  const discountedCost = (baseCost: number) => discountPercent > 0
    ? Math.max(0, Math.floor(baseCost * (100 - discountPercent) / 100))
    : baseCost;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'ships', label: 'SHIP MAINTENANCE' },
    { id: 'officers', label: 'OFFICER MANAGEMENT' },
    { id: 'shipyard', label: '⬆ SHIPYARD' },
    { id: 'armory', label: '⚙ ARMORY' },
  ];

  const panelStyle: React.CSSProperties = { padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' };
  const dimText: React.CSSProperties = { fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: 'var(--space-xl) 0' }}>
      <div className="panel panel--glow" style={{ margin: '0 auto', width: '900px', maxWidth: '94vw', padding: 'var(--space-lg)', position: 'relative' }}>

        <div style={{ position: 'absolute', top: 'var(--space-lg)', right: 'var(--space-lg)', textAlign: 'right' }}>
          <div className="label">AVAILABLE FUNDS</div>
          <div className="mono" style={{ fontSize: '2rem', color: 'var(--color-alert-amber)' }}>{campaign.requisitionPoints} RP</div>
        </div>

        <h2 style={{ color: 'var(--color-holo-green)', marginTop: 0, fontSize: '2rem' }}>WAR COUNCIL / DRYDOCK</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>
          Spend Requisition Points to repair ships, upgrade chassis, treat officers, and purchase new equipment.
        </p>
        {(discountPercent > 0 || campaign.pendingEconomicBuffs.freeRepairAtNextStation) && (
          <div className="panel panel--raised" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderLeft: '3px solid var(--color-holo-cyan)' }}>
            {discountPercent > 0 && (
              <div style={{ color: 'var(--color-holo-cyan)', fontSize: '0.9rem' }}>
                Haven discount active: all market purchases at this drydock cost {discountPercent}% less.
              </div>
            )}
            {campaign.pendingEconomicBuffs.freeRepairAtNextStation && (
              <div style={{ color: hasFreeRepair ? 'var(--color-holo-green)' : 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                {hasFreeRepair ? 'One free repair service is available at this haven.' : 'The free repair benefit for this haven has already been used.'}
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`btn ${activeTab === t.id ? '' : 'btn--outline'}`}
              onClick={() => setActiveTab(t.id)}
              style={{ flex: '1 1 auto', padding: 'var(--space-sm)', fontSize: '0.85rem' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── SHIP MAINTENANCE TAB ───────────────────────────────── */}
        {activeTab === 'ships' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {persistedShips.map(ship => (
              <div key={ship.id} className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
                <h3 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                  {ship.name} <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>({ship.currentHull}/{ship.maxHull} HULL)</span>
                </h3>
                <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                  {/* Hull Patch */}
                  <div className="panel" style={{ flex: '1 1 280px', ...panelStyle }}>
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
                    <div key={scar.id} className="panel" title={getScarTooltip(scar)} style={{ flex: '1 1 280px', ...panelStyle, borderLeft: '4px solid var(--color-alert-amber)', borderRadius: '0 4px 4px 0' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-alert-amber)' }}>{scar.name}</div>
                      <div style={dimText}>{scar.effect}</div>
                      <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
                        Hover card for compact impact and station details.
                      </div>
                      <button
                        className="btn"
                        disabled={!hasFreeRepair && campaign.requisitionPoints < DEEP_REPAIR_COST}
                        onClick={() => purchaseDeepRepair(ship.id, scar.id)}
                      >
                        {hasFreeRepair ? 'USE FREE REPAIR' : campaign.requisitionPoints < DEEP_REPAIR_COST ? `INSUFFICIENT RP (${DEEP_REPAIR_COST})` : `DEEP REPAIR (${DEEP_REPAIR_COST} RP)`}
                      </button>
                    </div>
                  )) : (
                    <div className="panel" style={{ flex: '1 1 280px', padding: 'var(--space-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-dim)' }}>
                      No Ship Scars
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── OFFICER MANAGEMENT TAB ────────────────────────────── */}
        {activeTab === 'officers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {persistedPlayers.map(player => {
              const ship = persistedShips.find(s => s.id === player.shipId);
              return (
                <div key={player.id} className="panel panel--raised" style={{ padding: 'var(--space-md)' }}>
                  <h3 style={{ margin: '0 0 var(--space-md) 0', color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)' }}>
                    {player.name} <span style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>({ship?.name || 'Unknown Ship'})</span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
                    {player.officers.map(officer => {
                      const costKey = `${officer.currentTier}-to-${officer.currentTier === 'rookie' ? 'veteran' : 'elite'}`;
                      const upgradeCost = OFFICER_TRAINING_COSTS[costKey];
                      return (
                        <div key={officer.officerId} className="panel" style={{ ...panelStyle }}>
                          <div style={{ fontWeight: 'bold' }}>{officer.station.toUpperCase()} <span style={{ color: 'var(--color-holo-cyan)', fontSize: '0.8rem' }}>[{officer.currentTier.toUpperCase()}]</span></div>
                          {officer.traumas.length > 0 && (
                            <div style={{ padding: '4px', borderLeft: '2px solid #E53E3E', fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>
                              <div style={{ color: '#E53E3E' }}>{officer.traumas[officer.traumas.length - 1].name}</div>
                              <button
                                className="btn"
                                style={{ width: '100%', fontSize: '0.8rem', padding: '4px', marginTop: '4px' }}
                                disabled={!hasFreeRepair && campaign.requisitionPoints < PSYCH_EVAL_COST}
                                onClick={() => purchasePsychEval(officer.officerId, player.shipId)}
                              >
                                {hasFreeRepair ? 'USE FREE REPAIR' : campaign.requisitionPoints < PSYCH_EVAL_COST ? `NEEDS ${PSYCH_EVAL_COST} RP` : `PSYCH EVAL (${PSYCH_EVAL_COST} RP)`}
                              </button>
                            </div>
                          )}
                          {upgradeCost ? (
                            <button
                              className="btn btn--outline"
                              style={{ width: '100%', fontSize: '0.9rem', padding: '6px' }}
                              disabled={campaign.requisitionPoints < upgradeCost}
                              onClick={() => purchaseOfficerTraining(officer.officerId, player.shipId)}
                            >
                              {campaign.requisitionPoints < upgradeCost ? `UPGRADE (${upgradeCost} RP)` : `OFFICER TRAINING (${upgradeCost} RP)`}
                            </button>
                          ) : (
                            <div style={{ textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>MAX TIER REACHED</div>
                          )}
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
                  <h3 style={{ margin: '0 0 var(--space-xs) 0', color: 'var(--color-text-primary)' }}>{ship.name}</h3>
                  <div style={{ ...dimText, marginBottom: 'var(--space-md)' }}>
                    Current: <strong style={{ color: 'var(--color-holo-cyan)' }}>{currentChassis?.className ?? ship.chassisId}</strong>
                    {' · '}Hull {currentChassis?.baseHull} · Shields {currentChassis?.shieldsPerSector}/sector
                    {' · '}{currentChassis?.weaponSlots}W / {currentChassis?.internalSlots}I slots
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                    {upgradable.map(chassis => {
                      const canAfford = campaign.requisitionPoints >= chassis.rpCost;
                      const excessW = Math.max(0, ship.equippedWeapons.filter(Boolean).length - chassis.weaponSlots);
                      const excessS = Math.max(0, ship.equippedSubsystems.filter(Boolean).length - chassis.internalSlots);
                      const hasExcess = excessW + excessS > 0;

                      return (
                        <div key={chassis.id} className="panel" style={{ ...panelStyle, opacity: canAfford ? 1 : 0.6 }}>
                          <div style={{ fontWeight: 'bold', color: 'var(--color-text-primary)' }}>{chassis.className}</div>
                          <div style={{ ...dimText }}>
                            Hull {chassis.baseHull} · Shields {chassis.shieldsPerSector}/sec · Spd {chassis.maxSpeed}
                            <br />
                            {chassis.weaponSlots}W / {chassis.internalSlots}I slots · EVA {chassis.baseEvasion}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-holo-cyan)', fontStyle: 'italic' }}>
                            {chassis.uniqueTraitName}: {chassis.uniqueTraitEffect}
                          </div>
                          {hasExcess && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-alert-amber)' }}>
                              ⚠ {excessW + excessS} item(s) will move to fleet stash
                            </div>
                          )}
                          <button
                            className="btn"
                            disabled={!canAfford}
                            onClick={() => purchaseChassisUpgrade(ship.id, chassis.id)}
                          >
                            {canAfford ? `UPGRADE (${chassis.rpCost} RP)` : `INSUFFICIENT RP (${chassis.rpCost})`}
                          </button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

            {/* Market */}
            <div>
              <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: 'var(--space-sm)' }}>⚙ MARKET INVENTORY</div>
              {campaign.drydockMarket ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                  {campaign.drydockMarket.techOffer && (() => {
                    const tech = getTechById(campaign.drydockMarket!.techOffer!);
                    if (!tech) return null;
                    const techCost = discountedCost(tech.rarity === 'rare' ? 45 : 30);
                    const canAffordTech = campaign.requisitionPoints >= techCost;
                    return (
                      <div key={tech.id} className="panel" style={{ ...panelStyle, opacity: canAffordTech ? 1 : 0.6, borderLeft: '3px solid var(--color-holo-cyan)' }}>
                        <div style={{ fontWeight: 'bold' }}>{tech.name}</div>
                        <div style={{ ...dimText, color: 'var(--color-holo-cyan)' }}>
                          Experimental Tech · {tech.rarity.toUpperCase()}
                        </div>
                        <div style={{ ...dimText, flex: 1 }}>{tech.effect}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>{tech.flavorText}</div>
                        <div style={{ ...dimText }}>Cost: <strong style={{ color: 'var(--color-alert-amber)' }}>{techCost} RP</strong></div>
                        <button
                          className="btn"
                          disabled={!canAffordTech}
                          onClick={() => purchaseMarketTech(tech.id)}
                        >
                          {canAffordTech ? `BUY TECH (${techCost} RP)` : `INSUFFICIENT RP (${techCost})`}
                        </button>
                      </div>
                    );
                  })()}
                  {[
                    ...campaign.drydockMarket.weapons.map(id => ({ id, isWeapon: true })),
                    ...campaign.drydockMarket.subsystems.map(id => ({ id, isWeapon: false })),
                  ].map(({ id, isWeapon }) => {
                    const item = isWeapon ? getWeaponById(id) : getSubsystemById(id);
                    if (!item) return null;
                    const cost = discountedCost(item.rpCost);
                    const canAfford = campaign.requisitionPoints >= cost;
                    return (
                      <ArmoryItemCard key={id} item={item} isWeapon={isWeapon}>
                        <div style={{ ...dimText }}>Cost: <strong style={{ color: 'var(--color-alert-amber)' }}>{cost} RP</strong></div>

                        {persistedShips.map(ship => {
                          const slots = isWeapon ? ship.equippedWeapons : ship.equippedSubsystems;
                          return (
                            <div key={ship.id} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', minWidth: '60px' }}>{ship.name.split(' ')[0]}:</span>
                              <select
                                style={{ flex: 1, fontSize: '0.8rem', background: 'var(--color-bg-raised)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px' }}
                                value={stashEquipTarget[`market-${id}-${ship.id}`]?.slotIndex ?? 0}
                                onChange={e => setStashEquipTarget(prev => ({ ...prev, [`market-${id}-${ship.id}`]: { shipId: ship.id, slotIndex: Number(e.target.value) } }))}
                              >
                                {slots.map((slot, i) => (
                                  <option key={i} value={i}>Slot {i + 1}: {slot ?? '(empty)'}</option>
                                ))}
                              </select>
                              <button
                                className="btn"
                                style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                                disabled={!canAfford}
                                onClick={() => {
                                  const tgt = stashEquipTarget[`market-${id}-${ship.id}`];
                                  purchaseMarketItem(id, ship.id, isWeapon, tgt?.slotIndex ?? 0);
                                }}
                              >
                                BUY
                              </button>
                            </div>
                          );
                        })}
                      </ArmoryItemCard>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-dim)' }}>No market available at this drydock.</div>
              )}
            </div>

            {/* Stash */}
            <div>
              <div className="label" style={{ color: 'var(--color-holo-cyan)', marginBottom: 'var(--space-sm)' }}>📦 FLEET STASH</div>
              {campaign.stashedWeapons.length === 0 && campaign.stashedSubsystems.length === 0 ? (
                <div style={{ color: 'var(--color-text-dim)' }}>No items in the fleet stash.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-md)' }}>
                  {[
                    ...campaign.stashedWeapons.map(id => ({ id, isWeapon: true })),
                    ...campaign.stashedSubsystems.map(id => ({ id, isWeapon: false })),
                  ].map(({ id, isWeapon }, idx) => {
                    const item = isWeapon ? getWeaponById(id) : getSubsystemById(id);
                    if (!item) return null;
                    const stashKey = `stash-${idx}-${id}`;

                    return (
                      <ArmoryItemCard key={stashKey} item={item} isWeapon={isWeapon}>
                        {persistedShips.map(ship => {
                          const slots = isWeapon ? ship.equippedWeapons : ship.equippedSubsystems;
                          return (
                            <div key={ship.id} style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', minWidth: '60px' }}>{ship.name.split(' ')[0]}:</span>
                              <select
                                style={{ flex: 1, fontSize: '0.8rem', background: 'var(--color-bg-raised)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '2px' }}
                                value={stashEquipTarget[stashKey]?.slotIndex ?? 0}
                                onChange={e => setStashEquipTarget(prev => ({ ...prev, [stashKey]: { shipId: ship.id, slotIndex: Number(e.target.value) } }))}
                              >
                                {slots.map((slot, i) => (
                                  <option key={i} value={i}>Slot {i + 1}: {slot ?? '(empty)'}</option>
                                ))}
                              </select>
                              <button
                                className="btn btn--outline"
                                style={{ fontSize: '0.78rem', padding: '2px 8px' }}
                                onClick={() => {
                                  const tgt = stashEquipTarget[stashKey];
                                  swapStashItem(ship.id, tgt?.slotIndex ?? 0, id, isWeapon, 'equip');
                                }}
                              >
                                EQUIP
                              </button>
                            </div>
                          );
                        })}
                        <button
                          className="btn btn--outline"
                          style={{ fontSize: '0.78rem', padding: '4px', marginTop: 'var(--space-xs)', color: 'var(--color-alert-amber)', borderColor: 'rgba(230,160,0,0.3)' }}
                          onClick={() => {
                            if (window.confirm(`Scrap ${item.name} for 15 RP? This cannot be undone.`)) {
                              scrapStashedItem(id, isWeapon);
                            }
                          }}
                        >
                          SCRAP (+15 RP)
                        </button>
                      </ArmoryItemCard>
                    );
                  })}
                </div>
              )}

              {/* Current loadout → stash */}
              <div className="label" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                EQUIPPED LOADOUT (click → STASH to unequip)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {persistedShips.map(ship => (
                  <div key={ship.id} className="panel" style={{ padding: 'var(--space-sm)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 'var(--space-xs)' }}>{ship.name}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-sm)' }}>
                      {ship.equippedWeapons.map((wId, i) => {
                        if (!wId) return <span key={i} style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', padding: '2px 6px', border: '1px dashed var(--color-border)', borderRadius: '4px' }}>W{i + 1}: empty</span>;
                        const w = getWeaponById(wId);
                        if (!w) return null;
                        return (
                          <ArmoryItemCard key={i} item={w} isWeapon={true}>
                            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>Equipped in W{i + 1}</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button className="btn btn--outline" style={{ fontSize: '0.75rem', padding: '2px 8px', flex: 1 }}
                                onClick={() => swapStashItem(ship.id, i, wId, true, 'stash')}>
                                MOVE TO STASH
                              </button>
                              <button className="btn btn--outline" style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--color-alert-amber)', borderColor: 'rgba(230,160,0,0.3)' }}
                                onClick={() => {
                                  if (window.confirm(`Scrap ${w.name} for 15 RP? This cannot be undone.`)) {
                                    scrapItem(ship.id, i, true);
                                  }
                                }}>
                                SCRAP
                              </button>
                            </div>
                          </ArmoryItemCard>
                        );
                      })}
                      {ship.equippedSubsystems.map((sId, i) => {
                        if (!sId) return <span key={i} style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)', padding: '2px 6px', border: '1px dashed var(--color-border)', borderRadius: '4px' }}>I{i + 1}: empty</span>;
                        const sub = getSubsystemById(sId);
                        if (!sub) return null;
                        return (
                          <ArmoryItemCard key={`sub-${i}`} item={sub} isWeapon={false}>
                            <div className="mono" style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>Equipped in I{i + 1}</div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button className="btn btn--outline" style={{ fontSize: '0.75rem', padding: '2px 8px', flex: 1 }}
                                onClick={() => swapStashItem(ship.id, i, sId, false, 'stash')}>
                                MOVE TO STASH
                              </button>
                              <button className="btn btn--outline" style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--color-alert-amber)', borderColor: 'rgba(230,160,0,0.3)' }}
                                onClick={() => {
                                  if (window.confirm(`Scrap ${sub.name} for 15 RP? This cannot be undone.`)) {
                                    scrapItem(ship.id, i, false);
                                  }
                                }}>
                                SCRAP
                              </button>
                            </div>
                          </ArmoryItemCard>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          className="btn"
          style={{ width: '100%', padding: 'var(--space-md)', fontSize: '1.2rem', marginTop: 'var(--space-lg)' }}
          onClick={completeDrydock}
        >
          CONCLUDE WAR COUNCIL
        </button>
      </div>
    </div>
  );
}
