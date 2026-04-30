import type { StationState, ShipState, EnemyShipState, TacticCard, ShipArc, FighterToken, TerrainType } from '../../types/game';
import { getStationById } from '../../data/stations';
import { hexDistance, determineStruckShieldSector, isInFiringArc, hexNeighbors, hexKey } from '../hexGrid';
import { calculateTN } from '../combat';
import { rollVolley, rollDie } from '../../utils/diceRoller';
import { pickEnemyFighterClass } from '../../data/fighters';


// ═══════════════════════════════════════════════════════════════════
// Station AI — Static defenses that fire but do not move
// ═══════════════════════════════════════════════════════════════════

export interface StationAction {
  stationId: string;
  type: 'attack' | 'launch';
  details: Record<string, unknown>;
}

export interface StationTurnResult {
  actions: StationAction[];
  stationUpdates: Map<string, Partial<StationState>>;
  playerDamage: { targetId: string; hullDamage: number; shieldDamage: number; sector: ShipArc }[];
  spawnedFighters: FighterToken[];
}

const FORWARD_ARCS: ShipArc[] = ['fore', 'foreStarboard', 'forePort'];
const MAX_FIGHTERS_PER_HEX = 3;

/**
 * Simple aggro scoring for stations. Prioritizes closest player targets.
 */
function calculateStationAggroScores(
  station: StationState,
  targets: (ShipState | EnemyShipState)[],
): { targetId: string; score: number; distance: number }[] {
  const entries: { targetId: string; score: number; distance: number }[] = [];

  for (const target of targets) {
    if (target.isDestroyed) continue;
    const distance = hexDistance(station.position, target.position);

    let score = 0;
    // Distance scoring
    if (distance <= 2) { score += 3; }
    else if (distance <= 4) { score += 2; }
    else { score += 1; }

    // Vulnerability: 0 shields in any facing
    const shieldValues = Object.values(target.shields);
    if (shieldValues.some(s => s === 0)) {
      score += 3;
    }

    // Vulnerability: critical hull damage
    if (target.criticalDamage?.length > 0) {
      score += 2;
    }

    // Player ships are higher priority than allied AI ships
    if ('chassisId' in target) {
      score += 2;
    } else {
      score += 1;
    }

    entries.push({ targetId: target.id, score, distance });
  }

  entries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.distance - b.distance;
  });

  return entries;
}

/**
 * Execute the turn for all stations of a given size tier.
 * Stations do not move; they only fire weapons and optionally launch fighters.
 */
export function executeStationTurn(
  actingStations: StationState[],
  allPlayerShips: ShipState[],
  allEnemyShips: EnemyShipState[],
  tacticCard: TacticCard | null,
  terrainMap: Map<string, TerrainType>,
  fighterTokens: FighterToken[],
  round: number,
): StationTurnResult {
  const actions: StationAction[] = [];
  const stationUpdates = new Map<string, Partial<StationState>>();
  const playerDamage: StationTurnResult['playerDamage'] = [];
  const spawnedFighters: FighterToken[] = [];

  const occupiedFighterHexes = new Map<string, number>();
  fighterTokens.filter(f => !f.isDestroyed).forEach(f => {
    const k = hexKey(f.position);
    occupiedFighterHexes.set(k, (occupiedFighterHexes.get(k) ?? 0) + 1);
  });

  for (const station of actingStations) {
    if (station.isDestroyed || station.hasActed) continue;
    const stationData = getStationById(station.stationId);
    if (!stationData) continue;

    // ── Weapon Attacks (only if a valid target exists in range) ──
    const possibleTargets = [...allPlayerShips, ...allEnemyShips.filter(e => e.isAllied && !e.isDestroyed)];
    const aggroEntries = calculateStationAggroScores(station, possibleTargets);
    const primaryTarget = aggroEntries[0];
    const target = primaryTarget ? possibleTargets.find(p => p.id === primaryTarget.targetId) : undefined;

    if (target) {
      const dist = hexDistance(station.position, target.position);

      // ── Primary Weapons (all arcs) ────────────────────────────
      if (dist >= stationData.weaponRangeMin && dist <= stationData.weaponRangeMax) {
        const pool: import('../../types/game').VolleyDieInput[] = stationData.volleyPool.map(dt => ({ type: dt, source: 'weapon' }));
        // Tactic card extra dice
        if (tacticCard?.mechanicalEffect.extraDice) {
          pool.push(...tacticCard.mechanicalEffect.extraDice.map(dt => ({ type: dt, source: 'tactic' })));
        }

        const defTerrain = terrainMap.get(hexKey(target.position));
        const targetEvasion = target.baseEvasion + (target.evasionModifiers ?? 0);

        const tn = calculateTN(targetEvasion, dist, defTerrain, 0, 0, 0, 0, false, false);
        const volley = rollVolley(pool, tn.total);
        const sector = determineStruckShieldSector(station.position, target.position, target.facing);

        const piercingHits = volley.totalCriticalHits;
        const standardHits = volley.totalStandardHits;

        const targetInIonNebula = defTerrain === 'ionNebula';
        const shieldVal = targetInIonNebula ? 0 : target.shields[sector];

        const shieldDmg = Math.min(standardHits, shieldVal);
        const overflow = standardHits - shieldDmg;

        let armorRoll = 0;
        let hullDmg = 0;
        if (overflow > 0) {
          const armorDisabled = target.criticalDamage?.some(c => c.id === 'armor-compromised');
          if (!armorDisabled) {
            armorRoll = rollDie(target.armorDie);
          }
          hullDmg = Math.max(1, overflow - armorRoll);
        }

        hullDmg += piercingHits;

        playerDamage.push({
          targetId: target.id,
          hullDamage: hullDmg,
          shieldDamage: shieldDmg,
          sector,
        });

        actions.push({
          stationId: station.id,
          type: 'attack',
          details: {
            target: target.id,
            hits: volley.totalHits,
            hullDmg,
            shieldDmg,
            sector,
            isHeavy: false,
            damageResult: {
              tnBreakdown: tn,
              volleyResult: volley,
              shieldHits: shieldDmg,
              struckSector: sector,
              hullDamage: hullDmg,
              overflowHits: overflow,
              armorRoll,
              criticalTriggered: piercingHits > 0,
            },
          },
        });
      }

      // ── Heavy Weapons (forward arc only) ──────────────────────
      if (
        stationData.heavyVolleyPool &&
        stationData.heavyVolleyPool.length > 0 &&
        stationData.heavyWeaponRangeMin !== undefined &&
        stationData.heavyWeaponRangeMax !== undefined &&
        dist >= stationData.heavyWeaponRangeMin &&
        dist <= stationData.heavyWeaponRangeMax &&
        isInFiringArc(station.position, station.facing, target.position, FORWARD_ARCS)
      ) {
        const pool: import('../../types/game').VolleyDieInput[] = stationData.heavyVolleyPool.map(dt => ({ type: dt, source: 'weapon' }));
        if (tacticCard?.mechanicalEffect.extraDice) {
          pool.push(...tacticCard.mechanicalEffect.extraDice.map(dt => ({ type: dt, source: 'tactic' })));
        }

        const defTerrain2 = terrainMap.get(hexKey(target.position));
        const targetEvasion2 = target.baseEvasion + (target.evasionModifiers ?? 0);

        const tn = calculateTN(targetEvasion2, dist, defTerrain2, 0, 0, 0, 0, false, false);
        const volley = rollVolley(pool, tn.total);
        const sector = determineStruckShieldSector(station.position, target.position, target.facing);

        const piercingHits = volley.totalCriticalHits;
        const standardHits = volley.totalStandardHits;

        const targetInIonNebula = defTerrain2 === 'ionNebula';
        const shieldVal = targetInIonNebula ? 0 : target.shields[sector];

        const shieldDmg = Math.min(standardHits, shieldVal);
        const overflow = standardHits - shieldDmg;

        let armorRoll = 0;
        let hullDmg = 0;
        if (overflow > 0) {
          const armorDisabled = target.criticalDamage?.some(c => c.id === 'armor-compromised');
          if (!armorDisabled) {
            armorRoll = rollDie(target.armorDie);
          }
          hullDmg = Math.max(1, overflow - armorRoll);
        }

        hullDmg += piercingHits;

        playerDamage.push({
          targetId: target.id,
          hullDamage: hullDmg,
          shieldDamage: shieldDmg,
          sector,
        });

        actions.push({
          stationId: station.id,
          type: 'attack',
          details: {
            target: target.id,
            hits: volley.totalHits,
            hullDmg,
            shieldDmg,
            sector,
            isHeavy: true,
            damageResult: {
              tnBreakdown: tn,
              volleyResult: volley,
              shieldHits: shieldDmg,
              struckSector: sector,
              hullDamage: hullDmg,
              overflowHits: overflow,
              armorRoll,
              criticalTriggered: piercingHits > 0,
            },
          },
        });
      }
    }

    // ── Fighter Launch (independent of weapon attack target) ────
    // Stations with a fighter hangar launch every round regardless of
    // whether they could fire their weapons at a target this step.
    if (
      stationData.fighterHangar &&
      station.remainingFighters > 0
    ) {
      const toLaunch = Math.min(stationData.fighterHangar.fightersPerLaunch, station.remainingFighters);
      const neighbors = hexNeighbors(station.position);
      const validHexes = neighbors.filter(h => {
        const key = hexKey(h);
        const terrain = terrainMap.get(key);
        if (terrain === 'debrisField') return false;
        return (occupiedFighterHexes.get(key) ?? 0) < MAX_FIGHTERS_PER_HEX;
      });

      let launchedCount = 0;

      // Pick a random class for this launch wave — all fighters share the same class
      const { fighterClass: stationFighterClass, behavior: stationBehavior } = pickEnemyFighterClass();

      for (let i = 0; i < toLaunch && i < validHexes.length; i++) {
        const hex = validHexes[i];
        const key = hexKey(hex);
        occupiedFighterHexes.set(key, (occupiedFighterHexes.get(key) ?? 0) + 1);
        launchedCount++;

        spawnedFighters.push({
          id: `station-fighter-${station.id}-r${round}-${Date.now()}-${i}`,
          name: `${stationFighterClass.name} ${station.name.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'STN'}${i + 1}`,
          classId: stationFighterClass.id,
          allegiance: 'enemy',
          sourceShipId: station.id,
          position: hex,
          facing: station.facing,
          currentHull: stationFighterClass.hull,
          maxHull: stationFighterClass.hull,
          speed: stationFighterClass.speed,
          baseEvasion: stationFighterClass.baseEvasion,
          volleyPool: stationFighterClass.volleyPool,
          weaponRangeMax: stationFighterClass.weaponRangeMax,
          behavior: stationBehavior,
          isDestroyed: false,
          hasDrifted: false,
          hasActed: false,
          assignedTargetId: null,
        });
      }

      if (launchedCount > 0) {
        actions.push({
          stationId: station.id,
          type: 'launch',
          details: { count: launchedCount },
        });
        stationUpdates.set(station.id, {
          ...stationUpdates.get(station.id),
          remainingFighters: station.remainingFighters - launchedCount,
        });
      }
    }

    // Mark as acted
    stationUpdates.set(station.id, {
      ...stationUpdates.get(station.id),
      hasActed: true,
    });
  }

  return { actions, stationUpdates, playerDamage, spawnedFighters };
}
