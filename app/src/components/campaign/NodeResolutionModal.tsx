import React, { useState } from 'react';
import { useCampaignStore } from '../../store/useCampaignStore';
import { useGameStore } from '../../store/useGameStore';
import { NodeType } from '../../engine/mapGenerator';
import { getEventById } from '../../data/eventNodes';
import type { CombatModifiers, EventEffect } from '../../types/campaignTypes';
import { generateProceduralScenario } from '../../engine/campaign/scenarioGenerator';
import { getAdmiralBlackBoxFF } from '../../engine/techEffects';
import { buildEventRequirementContext, getEventOptionAvailability } from '../../engine/campaignEngine';
import { getWeaponById } from '../../data/weapons';
import { getSubsystemById } from '../../data/subsystems';
import { getOfficerById } from '../../data/officers';

interface Props {
  onStartCombat: () => void;
}

export default function NodeResolutionModal({ onStartCombat }: Props) {
  const campaign = useCampaignStore(s => s.campaign);
  const sectorMap = useCampaignStore(s => s.sectorMap);
  const resolveEvent = useCampaignStore(s => s.resolveEvent);
  const enterDrydock = useCampaignStore(s => s.enterDrydock);
  const completeBossNode = useCampaignStore(s => s.completeBossNode);
  const pushCampaignLog = useCampaignStore(s => s.pushCampaignLog);
  const initializeGame = useGameStore(s => s.initializeGame);
  
  const [resolutionNarrative, setResolutionNarrative] = useState<string | null>(null);

  if (!campaign || !sectorMap) return null;

  const currentNode = sectorMap.nodes.find(n => n.id === campaign.currentNodeId);
  if (!currentNode) return null;

  const handleStartCombat = () => {
    const { persistedPlayers, persistedShips, campaign } = useCampaignStore.getState();
    if (!campaign) return;

    const isElite = currentNode.type === NodeType.Elite || currentNode.type === NodeType.Boss;

    // Generate the full procedural scenario using the 4-step algorithm
    const generated = generateProceduralScenario(
      campaign.currentSector,
      persistedShips.length,
      campaign.nextCombatModifiers
    );

    const deploymentRevealLogs = generated.generationReport.filter(line =>
      line.startsWith('[PROCGEN] Enemy Spawn:') || line.startsWith('[PROCGEN] Step 4 - Enemy Deployment Pattern:')
    );
    const scenarioGenerationReport = generated.generationReport.filter(line =>
      !deploymentRevealLogs.includes(line)
    );

    // For elite/boss nodes, boost enemy hull values
    const enemies = isElite
      ? generated.enemyShips.map(e => ({
          ...e,
          currentHull: Math.round(e.currentHull * 1.25),
          maxHull: Math.round(e.maxHull * 1.25),
        }))
      : generated.enemyShips;

    if (isElite) {
      scenarioGenerationReport.push(`[PROCGEN] Node Difficulty Override: ${currentNode.type} node detected. All generated enemy hull values increased by 25% after roster creation.`);
      enemies.forEach(enemy => {
        scenarioGenerationReport.push(`[PROCGEN] Elite Hull Pass: ${enemy.name} now enters combat at Hull ${enemy.currentHull}/${enemy.maxHull}.`);
      });
    }

    initializeGame({
      scenarioId: `campaign-${currentNode.id}`,
      maxRounds: 8,
      terrain: generated.terrain,
      players: persistedPlayers,
      playerShips: persistedShips,
      enemyShips: enemies,
      objectiveMarkers: generated.objectiveMarkers,
      objectiveType: generated.objectiveType,
      scenarioRules: generated.scenarioRules,
      scenarioGenerationReport,
      deploymentMode: true,
      deploymentBounds: generated.deploymentBounds,
      deploymentRevealLogs,
      fleetFavor: campaign.fleetFavor + getAdmiralBlackBoxFF(campaign.experimentalTech),
      experimentalTech: campaign.experimentalTech,
      combatModifiers: campaign.nextCombatModifiers,
    });

    useCampaignStore.setState(state => ({
      campaign: state.campaign
        ? { ...state.campaign, nextCombatModifiers: null }
        : null,
    }));

    pushCampaignLog({
      type: 'combat',
      message: `Committed to ${currentNode.type === NodeType.Boss ? 'sector command assault' : isElite ? 'elite engagement' : 'combat patrol intercept'}`,
      outcome: `Combat scenario generated with ${enemies.length} enemy ship${enemies.length === 1 ? '' : 's'}. Fleet Favor entering battle: ${campaign.fleetFavor + getAdmiralBlackBoxFF(campaign.experimentalTech)}.`,
      details: {
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        enemyCount: enemies.length,
        fleetFavor: campaign.fleetFavor + getAdmiralBlackBoxFF(campaign.experimentalTech),
      },
    });

    onStartCombat();
  };

  const handleEnterDrydock = () => {
    enterDrydock();
  };

  const handleCompleteBoss = () => {
    completeBossNode();
  };

  // ── Event Node Rendering ──
  if (currentNode.type === NodeType.Event) {
    // Use the event ID pre-assigned to the node during map generation
    const eventId = currentNode.eventId!;
    const event = getEventById(eventId);

    if (resolutionNarrative) {
      return (
        <div className="panel panel--glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', maxWidth: '90vw', padding: 'var(--space-lg)', zIndex: 100 }}>
          <h2 style={{ color: 'var(--color-holo-cyan)', marginTop: 0 }}>EVENT RESOLVED</h2>
          <p style={{ color: 'var(--color-text-primary)' }}>{resolutionNarrative}</p>
          <button className="btn" style={{ width: '100%', marginTop: 'var(--space-md)' }} onClick={() => useCampaignStore.setState({ campaign: { ...useCampaignStore.getState().campaign!, campaignPhase: 'sectorMap' } })}>
            CONTINUE
          </button>
        </div>
      );
    }

    if (!event) return null;

    const requirementContext = buildEventRequirementContext({
      players: useCampaignStore.getState().persistedPlayers,
      ownedTechIds: campaign.experimentalTech.map(tech => tech.id),
      requisitionPoints: campaign.requisitionPoints,
      fleetFavor: campaign.fleetFavor,
    });
    const visibleOptions = event.options
      .map(option => ({
        option,
        availability: getEventOptionAvailability(option, requirementContext),
      }))
      .filter(entry => entry.availability.visible);

    const getTriggeringOfficerText = (option: typeof event.options[number]) => {
      const requirements = option.requirements ?? [];
      const ownedOfficerIds = new Set(requirementContext.ownedOfficerIds);
      const ownedOfficerStations = new Set(requirementContext.ownedOfficerStations);

      const matchedOfficerNames = requirements
        .filter(requirement => requirement.type === 'officerPresent' && requirement.officerId && ownedOfficerIds.has(requirement.officerId))
        .map(requirement => getOfficerById(requirement.officerId!)?.name ?? requirement.officerId!)
        .filter((name, index, arr) => arr.indexOf(name) === index);

      const matchedStationNames = requirements
        .filter(requirement => requirement.type === 'officerStationPresent' && requirement.officerStation && ownedOfficerStations.has(requirement.officerStation))
        .map(requirement => `${requirement.officerStation} officer`)
        .filter((name, index, arr) => arr.indexOf(name) === index);

      const matches = [...matchedOfficerNames, ...matchedStationNames];
      return matches.length > 0 ? `Triggered by: ${matches.join(' / ')}` : null;
    };

    return (
      <div className="panel panel--glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', maxWidth: '90vw', padding: 'var(--space-lg)', zIndex: 100 }}>
        <h2 style={{ color: 'var(--color-alert-amber)', marginTop: 0 }}>{event.title.toUpperCase()}</h2>
        
        {/* EVENT ART */}
        <div style={{
          width: '100%',
          aspectRatio: '2 / 1',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 'var(--space-md)',
          backgroundImage: `url(/assets/events/${event.id}.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 0 15px rgba(0,0,0,0.5) inset'
        }} />

        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>{event.narrative}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {visibleOptions.map(({ option: opt, availability }) => {
            const triggeringOfficerText = availability.requirementsMet ? getTriggeringOfficerText(opt) : null;
            const renderEffectBadge = (effect: EventEffect) => {
              let text = '';
              let tooltip = '';
              let isGood = true;

              const formatCombatModifiers = (mods?: CombatModifiers) => {
                if (!mods) return '';
                const lines: string[] = [];
                if (mods.threatBudgetBonus) lines.push(`Enemy fleet gains +${mods.threatBudgetBonus} Threat Budget.`);
                if (mods.guaranteedEliteSpawn) lines.push(`Enemy fleet spawns at least one tier-higher elite ship.`);
                if (mods.enemyShieldsZeroRound1) lines.push(`All enemy ships start Round 1 with 0 Shields.`);
                if (mods.playerActsFirst) lines.push(`Player fleet acts first in all Initiative steps during Round 1.`);
                if (mods.playerStartSpeed3) lines.push(`All player ships begin Round 1 at Speed 3.`);
                if (mods.playerCTRound1Modifier) lines.push(`All players generate ${mods.playerCTRound1Modifier} Command Tokens during Phase 1 for the entire scenario.`);
                if (mods.playerMaxSpeedReduction) lines.push(`Max speed of all player ships is permanently reduced by ${mods.playerMaxSpeedReduction} for this scenario.`);
                if (mods.playerCTZeroRound1) lines.push(`All player ships start Round 1 with 0 Command Tokens.`);
                if (mods.flagshipBonus) lines.push(`Enemy flagship gains +${mods.flagshipBonus.evasion} Evasion and +${mods.flagshipBonus.hull} Max Hull.`);
                if (mods.highPriorityBounty) lines.push(`High priority bounty: increases overall threat budget and enemy aggression.`);
                if (mods.propagandaExposedBonus) lines.push(`Enemy threat budget is boosted by +${mods.propagandaExposedBonus} due to exposed propaganda.`);
                return lines.join(' ');
              };

              const targetText = effect.target === 'all' || effect.target === 'fleet' ? 'all ships' 
                : effect.target === 'random' ? 'a random ship' 
                : `ships targeted by this event`;
                
              const officerTargetText = effect.target === 'all' || effect.target === 'fleet' ? 'all officers' 
                : effect.target === 'random' ? 'a random officer' 
                : `all ${effect.target} officers`;

              switch (effect.type) {
                case 'rp': 
                  text = `${effect.value! > 0 ? '+' : ''}${effect.value} RP`; 
                  tooltip = `${effect.value! > 0 ? 'Adds' : 'Removes'} ${Math.abs(effect.value!)} Requisition Points ${effect.value! > 0 ? 'to' : 'from'} the fleet.`;
                  isGood = effect.value! > 0; 
                  break;
                case 'ff': 
                  text = `${effect.value! > 0 ? '+' : ''}${effect.value} FF`; 
                  tooltip = `${effect.value! > 0 ? 'Adds' : 'Removes'} ${Math.abs(effect.value!)} Fleet Favor ${effect.value! > 0 ? 'to' : 'from'} the fleet.`;
                  isGood = effect.value! > 0; 
                  break;
                case 'stress': 
                  text = `+${effect.value} Stress (${effect.target})`; 
                  tooltip = `Adds ${effect.value} Stress to ${officerTargetText}.`;
                  isGood = false; 
                  break;
                case 'stressRecover': 
                  text = `-${effect.value === 999 ? 'All' : effect.value} Stress (${effect.target})`; 
                  tooltip = effect.value === 999 
                    ? `Removes all Stress from ${officerTargetText}.`
                    : `Removes ${effect.value} Stress from ${officerTargetText}.`;
                  isGood = true; 
                  break;
                case 'trauma': 
                  text = `Trauma (${effect.target})`; 
                  tooltip = `Inflicts a random, permanent Trauma Trait on ${officerTargetText}.`;
                  isGood = false; 
                  break;
                case 'hull': 
                  text = `-${effect.value} Hull (${effect.target})`; 
                  tooltip = `Deals ${effect.value} unblockable Hull damage directly to ${targetText}.`;
                  isGood = false; 
                  break;
                case 'tech': 
                  text = `+${effect.value || 1} Tech`; 
                  tooltip = `Grants the fleet ${effect.value || 1} random Experimental Tech Relic${(effect.value || 1) > 1 ? 's' : ''}.`;
                  isGood = true; 
                  break;
                case 'scar': 
                  text = `Scar (${effect.target})`; 
                  tooltip = `Inflicts a random, permanent Ship Scar on ${targetText}.`;
                  isGood = false; 
                  break;
                case 'clearScar': 
                  text = `Clear Scar (${effect.target})`; 
                  tooltip = `Removes 1 random Ship Scar from ${targetText}.`;
                  isGood = true; 
                  break;
                case 'transformToCombat': 
                  text = `Combat!`; 
                  tooltip = `Immediately triggers a Combat Scenario. ${effect.combatModifiers ? formatCombatModifiers(effect.combatModifiers) : ''}`;
                  isGood = false; 
                  break;
                case 'skipNode': 
                  text = `Skip Node`; 
                  tooltip = `Allows the fleet to bypass the next node on the Sector Map and jump directly to the following layer.`;
                  isGood = true; 
                  break;
                case 'hullPatch': 
                  text = `+1 Hull (${effect.target})`; 
                  tooltip = `Restores 1 Hull point to ${targetText} (up to their Max Hull).`;
                  isGood = true; 
                  break;
                case 'officerUpgrade': 
                  text = `Officer Up (${effect.target})`; 
                  tooltip = `Upgrades the skill tier (e.g. Rookie to Veteran) of ${officerTargetText}.`;
                  isGood = true; 
                  break;
                case 'destroyWeapon': 
                  text = `Lose Weapon (${effect.target})`; 
                  tooltip = `Permanently destroys a random equipped weapon on ${targetText}.`;
                  isGood = false; 
                  break;
                case 'grantWeapon': {
                  const weapon = effect.weaponId ? getWeaponById(effect.weaponId) : undefined;
                  text = `Weapon: ${weapon?.name ?? effect.weaponId ?? 'Unknown'}`;
                  tooltip = `Adds ${weapon?.name ?? effect.weaponId ?? 'a weapon'} to the fleet stash.`;
                  isGood = true;
                  break;
                }
                case 'grantSubsystem': {
                  const subsystem = effect.subsystemId ? getSubsystemById(effect.subsystemId) : undefined;
                  text = `Subsystem: ${subsystem?.name ?? effect.subsystemId ?? 'Unknown'}`;
                  tooltip = `Adds ${subsystem?.name ?? effect.subsystemId ?? 'a subsystem'} to the fleet stash.`;
                  isGood = true;
                  break;
                }
                case 'nextStoreDiscount':
                  text = `${effect.value}% Haven Discount`;
                  tooltip = `Applies a ${effect.value}% discount to market purchases at the next friendly haven.`;
                  isGood = true;
                  break;
                case 'freeRepairAtNextStation':
                  text = 'Free Repair';
                  tooltip = 'Grants one free repair service at the next haven.';
                  isGood = true;
                  break;
                case 'maxHullReduction': 
                  text = `-${effect.value} Max Hull (${effect.target})`; 
                  tooltip = `Permanently reduces Max Hull by ${effect.value} on ${targetText}.`;
                  isGood = false; 
                  break;
                case 'subsystemSlotReduction': 
                  text = `-1 Sub Slot (${effect.target})`; 
                  tooltip = `Permanently destroys 1 Internal Subsystem slot from ${targetText}, unequipping any item in that slot.`;
                  isGood = false; 
                  break;
                case 'maxCTReduction': 
                  text = `-${effect.value} Max CT (${effect.target})`; 
                  tooltip = `Permanently reduces Maximum Command Tokens generated per round by ${effect.value} for ${effect.target === 'all' ? 'all players' : effect.target === 'random' ? 'a random player' : 'targeted players'}.`;
                  isGood = false; 
                  break;
                case 'nextCombatModifier': 
                  text = `Combat Mod`; 
                  tooltip = `Applies rules to the next Combat: ${formatCombatModifiers(effect.combatModifiers)}`;
                  isGood = false; 
                  break;
                case 'nothing': 
                  text = `No Effect`; 
                  tooltip = `No mechanical effect.`;
                  isGood = true; 
                  break;
                default: 
                  text = `Effect`; 
                  tooltip = `Unknown effect.`;
                  isGood = true; 
                  break;
              }

              if (effect.type === 'nothing') {
                return <span key="nothing" title={tooltip.trim()} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--color-surface-raised)', color: 'var(--color-text-dim)', whiteSpace: 'nowrap', cursor: 'help' }}>No Effect</span>;
              }

              const finalColor = isGood ? 'var(--color-holo-green)' : 'var(--color-hostile-red)';

              return (
                <span key={`${effect.type}-${effect.value}-${effect.target}`} title={tooltip.trim()} style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${finalColor}`, color: finalColor, whiteSpace: 'nowrap', cursor: 'help' }}>
                  {text}
                </span>
              );
            };

            return (
              <button 
                key={opt.id} 
                className="btn" 
                style={{ textAlign: 'left', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: '4px' }}
                disabled={!availability.enabled}
                onClick={() => {
                  let roll: number | undefined;
                  if (opt.requiresRoll) {
                    roll = Math.ceil(Math.random() * 6);
                  }
                  const resolution = resolveEvent(opt.id, roll);
                  if (resolution?.transformsToCombat) {
                    handleStartCombat();
                    return;
                  }
                  if (resolution?.narrativeResult) {
                    setResolutionNarrative(resolution.narrativeResult);
                  } else {
                    setResolutionNarrative(roll ? `You rolled a ${roll}. The event has been resolved.` : `The event has been resolved.`);
                  }
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{opt.label}</div>
                {opt.flavorText && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{opt.flavorText}</div>}
                {triggeringOfficerText && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-holo-cyan)' }}>[{triggeringOfficerText}]</div>
                )}
                {opt.requiresRoll && <div style={{ fontSize: '0.8rem', color: 'var(--color-alert-amber)' }}>[Requires D6 Roll: {opt.rollThreshold ?? 4}+]</div>}
                {availability.autoSuccess && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-holo-green)' }}>[Auto-success because requirements are met]</div>
                )}
                {!availability.requirementsMet && availability.unmetRequirementText.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                    {availability.unmetRequirementText.join(' ')}
                  </div>
                )}
                
                {/* Effects Display */}
                {opt.effects && opt.effects.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {opt.effects.map(renderEffectBadge)}
                  </div>
                )}
                
                {opt.requiresRoll && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid var(--color-surface-raised)' }}>
                    {opt.goodEffects && opt.goodEffects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px' }}>Success:</span>
                        {opt.goodEffects.map(renderEffectBadge)}
                      </div>
                    )}
                    {opt.badEffects && opt.badEffects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginRight: '4px' }}>Failure:</span>
                        {opt.badEffects.map(renderEffectBadge)}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Non-Event Node Rendering ──
  
  let title = 'UNKNOWN NODE';
  let description = '';
  let actionLabel = 'PROCEED';
  let onAction = () => {};

  if (currentNode.type === NodeType.Combat) {
    title = 'HOSTILE CONTACT';
    description = 'Hegemony patrols detected in the area. Prepare for combat.';
    actionLabel = 'START COMBAT';
    onAction = handleStartCombat;
  } else if (currentNode.type === NodeType.Elite) {
    title = 'ELITE SQUADRON';
    description = 'High-value Hegemony targets detected. Expect heavy resistance.';
    actionLabel = 'START ELITE COMBAT';
    onAction = handleStartCombat;
  } else if (currentNode.type === NodeType.Boss) {
    title = 'SECTOR COMMAND';
    description = 'A Hegemony Sector Command ship is blocking the jump gate. We must break through.';
    actionLabel = 'ASSAULT COMMAND SHIP';
    onAction = handleStartCombat;
    // Actually, after boss combat, it should trigger completeBossNode. 
    // We'll wire that in PostCombatSummary or GameOverScreen.
  } else if (currentNode.type === NodeType.Haven) {
    title = 'HIDDEN DRYDOCK';
    description = 'A smuggler outpost or abandoned facility. Safe to drop anchor and spend Requisition Points.';
    actionLabel = 'ENTER DRYDOCK';
    onAction = handleEnterDrydock;
  }

  return (
    <div className="panel panel--glow" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', maxWidth: '90vw', padding: 'var(--space-lg)', zIndex: 100, textAlign: 'center' }}>
      <h2 style={{ color: currentNode.type === NodeType.Haven ? 'var(--color-holo-green)' : 'var(--color-hostile-red)', marginTop: 0 }}>
        {title}
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-lg)' }}>{description}</p>
      
      <button 
        className="btn" 
        style={{ width: '100%', fontSize: '1.2rem', padding: 'var(--space-md)' }}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}
