export function generateEliteRewards(techOwnedIds: string[], seed: number = Date.now()): EliteRewardOption[] {
  const poolRobust: EliteRewardOption[] = [
    { id: `rp-15-${Math.random()}`, icon: '💰', label: 'Requisition Cache', description: '+15 RP', type: 'rp', value: 15 },
    { id: `rp-25-${Math.random()}`, icon: '💰', label: 'Hegemony Payroll', description: '+25 RP', type: 'rp', value: 25 },
    { id: `ff-2-${Math.random()}`, icon: '⭐', label: 'Tactical Victory', description: '+2 Fleet Favor', type: 'ff', value: 2 },
    { id: `ff-4-${Math.random()}`, icon: '⭐', label: 'Major Propaganda Win', description: '+4 Fleet Favor', type: 'ff', value: 4 },
    { id: `repair-hull-${Math.random()}`, icon: '🔧', label: 'Smuggled Repair Parts', description: 'Free Hull Patch at next Haven', type: 'repair', value: 1 },
    { id: `repair-deep-${Math.random()}`, icon: '🏗️', label: 'Captured Drydock Access', description: 'Free Deep Repair at next Haven', type: 'repair', value: 2 },
    { id: `psych-eval-${Math.random()}`, icon: '🧠', label: 'Seized Med-stims', description: 'Free Psych Eval at next Haven', type: 'psych' },
    { id: `tech-draw-${Math.random()}`, icon: '🔬', label: 'Experimental Tech', description: 'Draw 1 Experimental Tech', type: 'tech' },
    { id: `officer-upgrade-${Math.random()}`, icon: '🎖️', label: 'Battlefield Promotion', description: 'Upgrade an Officer by 1 Tier', type: 'officerUp' },
  ];

  const shuffled = [...poolRobust].sort(() => Math.random() - 0.5);
  const selected: EliteRewardOption[] = [];
  const selectedTypes = new Set<string>();

  for (const option of shuffled) {
    if (!selectedTypes.has(option.type)) {
      selected.push(option);
      selectedTypes.add(option.type);
    }
    if (selected.length === 3) break;
  }

  for (const option of shuffled) {
    if (selected.length === 3) break;
    if (!selected.includes(option)) {
      selected.push(option);
    }
  }

  return selected;
}

export function applyEliteReward(
  reward: EliteRewardOption,
  currentRP: number,
  currentFF: number,
  experimentalTech: ExperimentalTech[],
  pendingBuffs: PendingEconomicBuffs,
  players: PlayerState[]
): {
  requisitionPoints: number;
  fleetFavor: number;
  experimentalTech: ExperimentalTech[];
  pendingEconomicBuffs: PendingEconomicBuffs;
  players: PlayerState[];
  narrativeSummary: string;
} {
  let rp = currentRP;
  let ff = currentFF;
  let tech = [...experimentalTech];
  const buffs = { ...pendingBuffs };
  let newPlayers = [...players];
  let narrative = '';

  switch (reward.type) {
    case 'rp':
      rp += reward.value ?? 0;
      narrative = `Gained ${reward.value} Requisition Points.`;
      break;
    case 'ff':
      ff += reward.value ?? 0;
      narrative = `Gained ${reward.value} Fleet Favor.`;
      break;
    case 'tech': {
      const drawn = drawMultipleRandomTech(1, tech.map(t => t.id));
      if (drawn.length > 0) {
        tech.push(drawn[0]);
        narrative = `Acquired Experimental Tech: ${drawn[0].name}.`;
      } else {
        narrative = `No more Experimental Tech available to acquire.`;
      }
      break;
    }
    case 'repair':
      if (reward.value === 2) {
        buffs.freeDeepRepairAtNextStation = true;
        narrative = `Secured a voucher for a Free Deep Repair at the next Haven.`;
      } else {
        buffs.freeRepairAtNextStation = true;
        buffs.freeRepairConsumed = false;
        narrative = `Secured a voucher for a Free Hull Patch at the next Haven.`;
      }
      break;
    case 'psych':
      buffs.freePsychEvalAtNextStation = true;
      narrative = `Secured a voucher for a Free Psych Eval at the next Haven.`;
      break;
    case 'officerUp': {
      const eligiblePlayers = newPlayers.filter(p => p.officers.some(o => o.currentTier !== 'legendary'));
      if (eligiblePlayers.length > 0) {
        const randomPlayer = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        const eligibleOfficers = randomPlayer.officers.filter(o => o.currentTier !== 'legendary');
        const officerToUpgrade = eligibleOfficers[Math.floor(Math.random() * eligibleOfficers.length)];
        
        newPlayers = newPlayers.map(p => {
          if (p.id === randomPlayer.id) {
            return {
              ...p,
              officers: p.officers.map(o => {
                if (o.officerId === officerToUpgrade.officerId) {
                  const tiers: ('rookie' | 'veteran' | 'elite' | 'legendary')[] = ['rookie', 'veteran', 'elite', 'legendary'];
                  const idx = tiers.indexOf(o.currentTier);
                  const nextTier = idx < tiers.length - 1 ? tiers[idx + 1] : o.currentTier;
                  return { ...o, currentTier: nextTier };
                }
                return o;
              })
            };
          }
          return p;
        });
        narrative = `Officer ${officerToUpgrade.officerId} received a battlefield promotion!`;
      } else {
        narrative = `All officers are already Legendary!`;
      }
      break;
    }
    case 'stashWeapon':
      narrative = `Gained a stashed weapon.`;
      break;
  }

  return {
    requisitionPoints: rp,
    fleetFavor: ff,
    experimentalTech: tech,
    pendingEconomicBuffs: buffs,
    players: newPlayers,
    narrativeSummary: narrative
  };
}
