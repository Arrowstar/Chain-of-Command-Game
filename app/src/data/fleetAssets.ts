import type { FleetAssetDefinition } from '../types/game';

export const FLEET_ASSET_DEFINITIONS: FleetAssetDefinition[] = [
  {
    id: 'tactical-override',
    name: 'Tactical Override',
    ffCost: 1,
    timing: 'Use before a ship breaks an active RoE restriction.',
    effect: 'One ship may ignore one RoE restriction for one action this round.',
    limitations: 'Limit: once per round fleetwide.',
  },
  {
    id: 'emergency-reinforcement',
    name: 'Emergency Reinforcement',
    ffCost: 1,
    timing: 'Use during Command or Execution.',
    effect: 'One ship gains +1 CT immediately this round.',
    limitations: 'Limit: twice per round fleetwide. A ship can benefit once per round.',
  },
  {
    id: 'targeting-package',
    name: 'High Command Targeting Package',
    ffCost: 1,
    timing: 'Use before one attack is resolved.',
    effect: 'Choose one package: -1 TN, +1 reroll, or +1 bonus hit on a successful Target Lock attack.',
    limitations: 'Limit: one package per attack. No round cap beyond available FF.',
  },
  {
    id: 'damage-control-authorization',
    name: 'Damage Control Authorization',
    ffCost: 1,
    timing: 'Use on any allied turn.',
    effect: 'Restore 1 Hull, restore one shield arc to 1, or clear one temporary ship impairment.',
    limitations: 'Limit: twice per round fleetwide.',
  },
  {
    id: 'intel-feed',
    name: 'Intel Feed',
    ffCost: 1,
    timing: 'Use at round start or when the battlefield picture changes.',
    effect: 'Delay one reinforcement group, cancel the current tactic card, or expose one enemy ship for -1 TN until round end.',
    limitations: 'Limit: once per round fleetwide.',
  },
  {
    id: 'morale-discipline',
    name: 'Morale / Discipline',
    ffCost: 1,
    timing: 'Use after stress or fumble fallout.',
    effect: 'Remove 1 Stress, clear one fumble side effect, or unlock one station.',
    limitations: 'Limit: twice per round fleetwide.',
  },
  {
    id: 'escort-support-call',
    name: 'Escort / Support Call',
    ffCost: 2,
    timing: 'Use when support can intervene.',
    effect: 'Destroy one incoming enemy torpedo, grant one ship fighter immunity until round end, or call in a 1-hull off-board strike.',
    limitations: 'Limit: once per round fleetwide.',
  },
  {
    id: 'extraction-window',
    name: 'Extraction Window',
    ffCost: 2,
    timing: 'Use on an allied ship in danger.',
    effect: 'One ship gains emergency withdrawal clearance and can count as a safe warp-out from anywhere.',
    limitations: 'Limit: once per scenario.',
  },
];

export function getFleetAssetDefinition(id: FleetAssetDefinition['id']) {
  return FLEET_ASSET_DEFINITIONS.find(asset => asset.id === id);
}
