/**
 * Authoritative data for all Ship Scar types.
 *
 * Each scar is keyed by the CriticalDamageCard.id that can generate it.
 * `spritePos` maps to a cell in public/images/scars/ship_scars.png,
 * which is a 4-column × 3-row transparent-background spritesheet.
 *
 * Grid layout:
 *   Row 0: Scorched Thrusters (0,0) | Coolant Leak (1,0) | Bridge Hit (2,0) | Shield Generator (3,0)
 *   Row 1: Targeting Array   (0,1) | Sensor Mast  (1,1) | Weapon Mount (2,1) | Structural Spine (3,1)
 *   Row 2: Power Bus Leak    (0,2) | Command Spine (1,2) | [empty] | [empty]
 */
export interface ScarTemplate {
  name: string;
  effect: string;
  spritePos: { col: number; row: number };
}

export const SCAR_TEMPLATES: Record<string, ScarTemplate> = {
  'thrusters-offline': {
    name: 'Scorched Thrusters',
    effect: 'This ship\'s Maximum Speed is permanently reduced by 1.',
    spritePos: { col: 0, row: 0 },
  },
  'coolant-leak': {
    name: 'Leaking Coolant Lines',
    effect: 'Every time the Engineering station is used, the Engineering officer takes +1 additional Stress.',
    spritePos: { col: 1, row: 0 },
  },
  'bridge-hit': {
    name: 'Scarred Bridge',
    effect: 'Maximum Command Tokens generated during the Briefing Phase is permanently reduced by 1.',
    spritePos: { col: 2, row: 0 },
  },
  'shield-generator-offline': {
    name: 'Fused Shield Emitters',
    effect: 'Shields no longer naturally regenerate 1 point during the Cleanup Phase.',
    spritePos: { col: 3, row: 0 },
  },
  'targeting-array-damaged': {
    name: 'Warped Targeting Array',
    effect: 'Tactical Volley Pools permanently lose their Skill Die.',
    spritePos: { col: 0, row: 1 },
  },
  'sensor-mast-damaged': {
    name: 'Sheared Sensor Mast',
    effect: 'All Sensors station actions cost +1 Stress.',
    spritePos: { col: 1, row: 1 },
  },
  'weapon-mount-warped': {
    name: 'Warped Weapon Mount',
    effect: 'The first primary weapon fired each round permanently loses 1 weapon die.',
    spritePos: { col: 2, row: 1 },
  },
  'structural-spine-buckled': {
    name: 'Buckled Structural Spine',
    effect: 'This ship\'s Maximum Speed is permanently capped at 2.',
    spritePos: { col: 3, row: 1 },
  },
  'power-bus-leak': {
    name: 'Power Bus Leak',
    effect: 'The first assigned station action each round costs +1 additional CT.',
    spritePos: { col: 0, row: 2 },
  },
  'command-spine-exposed': {
    name: 'Exposed Command Spine',
    effect: 'The Helm officer gains +1 Stress at the start of each round.',
    spritePos: { col: 1, row: 2 },
  },
};
