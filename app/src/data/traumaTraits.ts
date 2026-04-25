import type { TraumaEffect } from '../types/game';

/**
 * All 20 Trauma Traits from the Official Content Database.
 * These are persistent negative mechanical effects applied to officers who max out their stress.
 */
export const TRAUMA_POOL: TraumaEffect[] = [
  // General Traumas
  { id: 'shell-shocked', name: 'Shell-Shocked', effect: 'Whenever your ship takes Hull damage from an enemy attack, this officer immediately gains +1 Stress.' },
  { id: 'defeatist', name: 'Defeatist', effect: 'If the fleet\'s current Fleet Favor (FF) is below 0, this officer starts every combat scenario with 2 Stress.' },
  { id: 'insubordinate', name: 'Insubordinate', effect: 'If the War Council chooses not to override the Admiral\'s RoE, this officer gains +1 Stress every round during Phase 1.' },
  { id: 'pessimist', name: 'Pessimist', effect: 'This officer\'s Maximum Stress Limit is permanently reduced by 1.' },
  { id: 'flincher', name: 'Flincher', effect: 'Whenever an Enemy Capital Ship ends its movement in a hex adjacent to your ship, this officer gains +1 Stress.' },
  { id: 'lethargic', name: 'Lethargic', effect: 'If this officer repeats the same action twice in one round, they suffer a +2 Fatigue Penalty instead of +1.' },
  { id: 'micromanager', name: 'Micromanager', effect: 'The first time a CT is assigned to this officer\'s station each round, it costs +1 CT.' },

  // Helm
  { id: 'claustrophobic', name: 'Claustrophobic', effect: 'If the ship ends Phase 3 (Execution) adjacent to an Asteroid Field or Debris Field, this officer gains +2 Stress.' },
  { id: 'tunnel-vision', name: 'Tunnel Vision', effect: 'The "Rotate" action costs 2 Stress to perform instead of 1.' },
  { id: 'over-cautious', name: 'Over-Cautious', effect: 'While this officer is operating the Helm, your ship\'s Maximum Speed is permanently capped at 2.' },

  // Tactical
  { id: 'gun-shy', name: 'Gun-Shy', effect: 'This officer\'s Tactical Skill Die is permanently stepped down by one tier.' },
  { id: 'tremors', name: 'Tremors', effect: 'Cannot execute the "Load Ordnance" action. Ordnance weapons are useless.' },
  { id: 'trigger-happy', name: 'Trigger Happy', effect: 'If this officer does not execute a "Fire Primary" action during a combat round, they gain +2 Stress during Phase 4.' },

  // Engineering
  { id: 'resource-hoarder', name: 'Resource Hoarder', effect: 'The "Damage Control" action costs 3 CT instead of 2.' },
  { id: 'over-compensator', name: 'Over-Compensator', effect: 'When using "Reinforce Shields", must target Fore Sector unless maxed.' },
  { id: 'reckless-abandon', name: 'Reckless Abandon', effect: 'Whenever this officer uses "Reroute Power", the ship takes 1 unblockable Hull damage.' },

  // Sensors
  { id: 'analysis-paralysis', name: 'Analysis Paralysis', effect: 'Target Lock no longer provides -2 TN. Instead, allows reroll of exactly one failed die in Volley Pool.' },
  { id: 'hyper-vigilant', name: 'Hyper-Vigilant', effect: 'Every action on the Sensors station costs an additional +1 Stress.' },
  { id: 'comms-phobic', name: 'Comms-Phobic', effect: 'Cannot use "Cyber-Warfare". Ship cannot be target of Allied support actions.' },
  { id: 'phantom-scanners', name: 'Phantom Scanners', effect: 'At the start of Phase 1, roll a D6. On a 1 or 2, this officer gains +1 Stress immediately.' }
];

export function drawRandomTrauma(): TraumaEffect {
  return TRAUMA_POOL[Math.floor(Math.random() * TRAUMA_POOL.length)];
}
