import type { OfficerStation, ScarEffect } from '../../types/game';

export interface ScarStatusMeta {
  shortImpact: string;
  station?: OfficerStation;
}

export function getScarStatusMeta(fromCriticalId: string): ScarStatusMeta {
  switch (fromCriticalId) {
    case 'thrusters-offline':
      return { shortImpact: '-1 MAX SPD', station: 'helm' };
    case 'coolant-leak':
      return { shortImpact: '+1 ENG STR', station: 'engineering' };
    case 'bridge-hit':
      return { shortImpact: '-1 CT', station: 'helm' };
    case 'shield-generator-offline':
      return { shortImpact: '-1 RNG', station: 'tactical' };
    case 'targeting-array-damaged':
      return { shortImpact: '-1 VOLLEY DIE', station: 'tactical' };
    case 'sensor-mast-damaged':
      return { shortImpact: '+1 SEN STR', station: 'sensors' };
    case 'weapon-mount-warped':
      return { shortImpact: '-1 1ST SHOT DIE', station: 'tactical' };
    case 'structural-spine-buckled':
      return { shortImpact: 'SPD CAP 2', station: 'helm' };
    case 'power-bus-leak':
      return { shortImpact: '+1 1ST ACT CT' };
    case 'command-spine-exposed':
      return { shortImpact: 'HELM +1 STR', station: 'helm' };
    default:
      return { shortImpact: 'SCAR' };
  }
}

export function getStationScars(scars: ScarEffect[], station: OfficerStation): ScarEffect[] {
  return scars.filter(scar => getScarStatusMeta(scar.fromCriticalId).station === station);
}

export function getScarTooltip(scar: Pick<ScarEffect, 'name' | 'effect' | 'fromCriticalId'>): string {
  const meta = getScarStatusMeta(scar.fromCriticalId);
  const stationText = meta.station ? ` | Station: ${meta.station.toUpperCase()}` : '';
  return `${scar.name} | Impact: ${meta.shortImpact}${stationText} | ${scar.effect}`;
}

export function getScarImpactLegendText(): string {
  return 'Scar impact shorthand: MAX SPD = maximum speed, ENG STR = Engineering stress, SEN STR = Sensors stress, RNG = primary weapon range, VOLLEY DIE = one die removed from tactical volley, 1ST SHOT DIE = first primary shot each round loses one die, SPD CAP 2 = actual speed cannot exceed 2, 1ST ACT CT = first assigned action each round costs +1 CT, HELM +1 STR = Helm gains +1 stress each round.';
}
