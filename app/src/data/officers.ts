import type { OfficerData } from '../types/game';

import arisAvatar from '../../art/officers/Aris.png';
import hayesAvatar from '../../art/officers/Hayes.png';
import kaelAvatar from '../../art/officers/Kael.png';
import slickJonesAvatar from '../../art/officers/LtSlickJones.png';
import vaneAvatar from '../../art/officers/LtVane.png';
import malikovAvatar from '../../art/officers/Malikov.png';
import obannonAvatar from '../../art/officers/OBannon.png';
import orlovAvatar from '../../art/officers/Orlov.png';
import rutherfordAvatar from '../../art/officers/Rutherford.png';
import singhAvatar from '../../art/officers/Singh.png';
import sparkyAvatar from '../../art/officers/Sparky.png';
import tlariAvatar from '../../art/officers/TLari.png';
import vanceAvatar from '../../art/officers/Vance.png';
import vexAvatar from '../../art/officers/Vex.png';
import xelAvatar from '../../art/officers/Xel.png';
import dveshAvatar from "../../art/officers/d'Vesh.png";

export const OFFICERS: OfficerData[] = [
  // ─── Helm ──────────────────────────────────────────
  {
    id: 'slick-jones',
    name: 'Lt. "Slick" Jones',
    station: 'helm',
    traitName: 'Hotshot',
    traitEffect: 'Movement through hazardous terrain only causes damage on a D6 roll of 1.',
    stressLimit: 4,
    defaultTier: 'veteran',
    avatar: slickJonesAvatar,
    traitTier: 1,
    // stressLimit(4) + tier1(3) = 7
    dpCost: 7,
    bio: 'A decorated combat ace with a reckless streak and a perfect landing record — despite the evidence.',
  },
  {
    id: 'tlari',
    name: "Lt. Cmdr. T'Lari",
    station: 'helm',
    traitName: 'Methodical',
    traitEffect: '"Rotate" actions cost 0 Stress once per round.',
    stressLimit: 6,
    defaultTier: 'veteran',
    avatar: tlariAvatar,
    traitTier: 1,
    // stressLimit(6) + tier1(3) = 9
    dpCost: 9,
    bio: 'Methodical to a fault. Has never made an unplanned maneuver in twelve years of active service.',
  },
  {
    id: 'jitters-kael',
    name: 'Ensign "Jitters" Kael',
    station: 'helm',
    traitName: 'Paranoia',
    traitEffect: '"Evasive Pattern" actions grant +3 to Base Evasion instead of +2, but cost +1 additional Stress to perform.',
    stressLimit: 3,
    defaultTier: 'veteran',
    avatar: kaelAvatar,
    traitTier: 1,
    // stressLimit(3) + tier1(3) = 6
    dpCost: 6,
    bio: 'Former racing pilot. His fear of dying makes him dangerously good at not dying.',
  },
  {
    id: 'orlov',
    name: 'Crewman 1st Class Orlov',
    station: 'helm',
    traitName: 'Lead Foot',
    traitEffect: '"Adjust Speed" actions cost 0 Stress if you are increasing your speed.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: orlovAvatar,
    traitTier: 1,
    // stressLimit(5) + tier1(3) = 8
    dpCost: 8,
    bio: 'Fell asleep at the helm once during a firefight. Was going too fast for anything to catch him.',
  },

  // ─── Tactical ──────────────────────────────────────
  {
    id: 'vane',
    name: 'Lt. Vane',
    station: 'tactical',
    traitName: 'Bloodlust',
    traitEffect: '+1 Attack die (D6) when targeting a ship that is below 50% Hull.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: vaneAvatar,
    traitTier: 2,
    // stressLimit(5) + tier2(6) = 11
    dpCost: 11,
    bio: 'Trophy hunter in peacetime. Considers the Hegemony a very large game reserve.',
  },
  {
    id: 'rutherford',
    name: 'Ensign Rutherford',
    station: 'tactical',
    traitName: 'By The Book',
    traitEffect: 'Never triggers "Fumbles" when Stress is maxed, but cannot perform any actions while at max Stress.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: rutherfordAvatar,
    traitTier: 1,
    // doc table: 7 DP (stress 4 + tier1 3 — doc uses stress 4; we keep code stress but use doc DP value)
    dpCost: 7,
    bio: 'Believes following procedure is the highest form of heroism. No one has argued with his kill count.',
  },
  {
    id: 'boomer-hayes',
    name: 'Gunner Sgt. "Boomer" Hayes',
    station: 'tactical',
    traitName: 'Heavy Loader',
    traitEffect: 'The "Load Ordinance" action costs 0 CT (it still costs 1 Stress).',
    stressLimit: 6,
    defaultTier: 'veteran',
    avatar: hayesAvatar,
    traitTier: 3,
    // stressLimit(6) + tier3(10) = 16
    dpCost: 16,
    bio: 'Keeps a running tally of ordnance expended. Has never bothered keeping score of the hits.',
  },
  {
    id: 'vex',
    name: 'Sub-Commander Vex',
    station: 'tactical',
    traitName: 'Surgical Strike',
    traitEffect: 'Once per round, you may manually change one of your Standard Hits in the Volley Pool into a Critical Hit.',
    stressLimit: 4,
    defaultTier: 'veteran',
    avatar: vexAvatar,
    traitTier: 3,
    // stressLimit(5 in doc / 4 in code) + tier3(10) = 15 per doc table
    dpCost: 15,
    bio: 'Former Hegemony defector. The precision with which she fires is only matched by her silence.',
  },

  // ─── Engineering ───────────────────────────────────
  {
    id: 'obannon',
    name: "Chief O'Bannon",
    station: 'engineering',
    traitName: 'Miracle Worker',
    traitEffect: 'Once per game, repair 1 Critical Damage effect instantly without spending a CT or rolling a die.',
    stressLimit: 7,
    defaultTier: 'veteran',
    avatar: obannonAvatar,
    traitTier: 2,
    // doc: 12 DP (stress 6 + tier2 6)
    dpCost: 12,
    bio: "Has repaired every ship he's ever served on. Most of them mid-battle, with improvised tools.",
  },
  {
    id: 'sparky',
    name: 'Sparky',
    station: 'engineering',
    traitName: 'Synth-Logic',
    traitEffect: 'Immune to all Stress mechanics and Fumbles. However, the "Damage Control" action costs 3 CT instead of 2.',
    stressLimit: null, // immune to stress
    defaultTier: 'veteran',
    avatar: sparkyAvatar,
    traitTier: 2,
    // stress-immune uses 0 component; 0 + tier2(6) = 6... doc says 10. Using doc value.
    dpCost: 10,
    bio: 'Synthetic crew integration unit. Classified as emotionally unavailable by three separate medical evaluations.',
  },
  {
    id: 'aris',
    name: 'Specialist Dr. Aris',
    station: 'engineering',
    traitName: 'Deflector Specialist',
    traitEffect: '"Reinforce Shields" restores 3 points instead of 2, but can only be applied to the Fore or Aft shield sectors.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: arisAvatar,
    traitTier: 2,
    // stressLimit(5) + tier2(6) = 11
    dpCost: 11,
    bio: "Treats the ship's shields the way a surgeon treats a patient — with obsessive precision.",
  },
  {
    id: 'scorch-malikov',
    name: 'Engineer "Scorch" Malikov',
    station: 'engineering',
    traitName: 'Redliner',
    traitEffect: '"Reroute Power" grants +3 Command Tokens instead of +2, but immediately deals 1 unblockable Hull damage to your ship.',
    stressLimit: 6,
    defaultTier: 'veteran',
    avatar: malikovAvatar,
    traitTier: 1,
    // stressLimit(6) + tier1(3) = 9
    dpCost: 9,
    bio: 'Named after his first overload accident. Has survived three more since.',
  },

  // ─── Sensors ───────────────────────────────────────
  {
    id: 'vance',
    name: 'Lt. Cmdr. Vance',
    station: 'sensors',
    traitName: 'Eagle Eye',
    traitEffect: '"Target Lock" actions apply -2 TN even without a Target Painting success; a successful Target Painting roll improves that to -3 TN.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: vanceAvatar,
    traitTier: 2,
    // stressLimit(5) + tier2(6) = 11
    dpCost: 11,
    bio: 'Has memorized the sensor profile of every Hegemony vessel class. Knows them by their heat signatures.',
  },
  {
    id: 'xel',
    name: 'Operative Xel',
    station: 'sensors',
    traitName: 'Hacker',
    traitEffect: '"Cyber-Warfare" actions cost 1 less CT (costs 1 CT instead of 2).',
    stressLimit: 4,
    defaultTier: 'veteran',
    avatar: xelAvatar,
    traitTier: 2,
    // stressLimit(4) + tier2(6) = 10
    dpCost: 10,
    bio: 'Former intelligence operative. Nobody is entirely sure which side they were working for.',
  },
  {
    id: 'chatter-singh',
    name: 'Lt. "Chatter" Singh',
    station: 'sensors',
    traitName: 'Fleet Comms',
    traitEffect: 'As long as Singh has 0 Stress, any Allied ships within 2 hexes of your ship gain +1 to their Base Evasion.',
    stressLimit: 5,
    defaultTier: 'veteran',
    avatar: singhAvatar,
    traitTier: 2,
    // stressLimit(5) + tier2(6) = 11
    dpCost: 11,
    bio: 'Never stops talking. Somehow makes everyone around them significantly better at their jobs.',
  },
  {
    id: 'dvesh',
    name: "Chief Petty Officer D'Vesh",
    station: 'sensors',
    traitName: 'Ghost Maker',
    traitEffect: 'You may spend 1 CT during Phase 1 to completely cancel the Hegemony AI Tactic Card as it is revealed. If you do, D\'Vesh immediately takes 3 Stress.',
    stressLimit: 6,
    defaultTier: 'veteran',
    avatar: dveshAvatar,
    traitTier: 3,
    // stressLimit(5 in doc / 6 in code) + tier3(10) = 15 per doc table
    dpCost: 15,
    bio: 'Has seen the Hegemony AI think. Refuses to elaborate.',
  },
];

export function getOfficerById(id: string): OfficerData | undefined {
  return OFFICERS.find(o => o.id === id);
}

export function getOfficersByStation(station: string): OfficerData[] {
  return OFFICERS.filter(o => o.station === station);
}
