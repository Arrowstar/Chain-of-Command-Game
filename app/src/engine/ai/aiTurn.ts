import type { EnemyShipState, ShipState, TacticCard, TerrainType, HexFacing, ShipArc, PlayerState, VolleyDieInput, TacticHazardState } from '../../types/game';
import { isSmallCraftSize } from '../../types/game';
import { getAdversaryById } from '../../data/adversaries';
import { getChassisById } from '../../data/shipChassis';
import { getOfficerById } from '../../data/officers';
import { calculateAggroScores } from './aggroScore';
import { planAIMovement } from './behaviors';
import { hexDistance, hexKey, determineStruckShieldSector } from '../hexGrid';
import { rollVolley, rollDie } from '../../utils/diceRoller';
import { calculateTN } from '../combat';

// ═══════════════════════════════════════════════════════════════════
// AI Turn Orchestration
// ═══════════════════════════════════════════════════════════════════

export interface AIAction {
  shipId: string;
  type: 'move' | 'attack' | 'spawn';
  details: Record<string, unknown>;
}

export interface AITurnResult {
  actions: AIAction[];
  shipUpdates: Map<string, Partial<EnemyShipState>>;
  playerDamage: { targetId: string; hullDamage: number; shieldDamage: number; sector: ShipArc; officerStress?: number }[];
  consumedHazardIds: string[];
}

export interface AIMovementPreview {
  targetHex: EnemyShipState['position'];
  newFacing: HexFacing;
  path: EnemyShipState['position'][];
  noMovement: boolean;
}

function sortActingShips(
  actingShips: EnemyShipState[],
  allPlayerShips: ShipState[],
  allEnemyShips: EnemyShipState[],
): EnemyShipState[] {
  return [...actingShips].sort((a, b) => {
    const aTargets = a.isAllied ? allEnemyShips.filter(e => !e.isAllied && !e.isDestroyed) : [...allPlayerShips, ...allEnemyShips.filter(e => e.isAllied && !e.isDestroyed)];
    const bTargets = b.isAllied ? allEnemyShips.filter(e => !e.isAllied && !e.isDestroyed) : [...allPlayerShips, ...allEnemyShips.filter(e => e.isAllied && !e.isDestroyed)];

    const aDist = aTargets.length > 0 ? Math.min(...aTargets.map(p => hexDistance(a.position, p.position))) : Infinity;
    const bDist = bTargets.length > 0 ? Math.min(...bTargets.map(p => hexDistance(b.position, p.position))) : Infinity;
    return aDist - bDist;
  });
}

function getTacticMovementBonus(
  aiShip: EnemyShipState,
  target: ShipState | EnemyShipState,
  adversarySize: string,
  tacticCard: TacticCard | null,
): number {
  const effect = tacticCard?.mechanicalEffect;
  let total = effect?.extraMovement ?? 0;
  if (effect?.smallCraftExtraMovement && isSmallCraftSize(adversarySize as any)) {
    total += effect.smallCraftExtraMovement;
  }
  if (effect?.extraMovementVsDamagedTargets && target.currentHull < target.maxHull) {
    total += effect.extraMovementVsDamagedTargets;
  }
  return total;
}

export function previewAITierMovement(
  actingShips: EnemyShipState[],
  allPlayerShips: ShipState[],
  allEnemyShips: EnemyShipState[],
  tacticCard: TacticCard | null,
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  players: PlayerState[] = [],
): Map<string, AIMovementPreview> {
  const previews = new Map<string, AIMovementPreview>();
  const simulatedEnemies = allEnemyShips.map(ship => ({ ...ship, position: { ...ship.position } }));
  const simulatedActors = sortActingShips(
    actingShips.map(ship => ({ ...ship, position: { ...ship.position } })),
    allPlayerShips,
    simulatedEnemies,
  );

  for (const aiShip of simulatedActors) {
    if (aiShip.isDestroyed) continue;
    const adversary = getAdversaryById(aiShip.adversaryId);
    if (!adversary) continue;

    const possibleTargets = aiShip.isAllied
      ? simulatedEnemies.filter(e => !e.isAllied && !e.isDestroyed)
      : [...allPlayerShips, ...simulatedEnemies.filter(e => e.isAllied && !e.isDestroyed)];

    const aggroEntries = calculateAggroScores(aiShip, possibleTargets, tacticCard, [], players);
    if (aggroEntries.length === 0) continue;
    const primaryTarget = aggroEntries[0];
    const target = possibleTargets.find(p => p.id === primaryTarget.targetId);
    if (!target) continue;

    const noMovement = tacticCard?.id === 'overwhelming-firepower';
    const extraMove = getTacticMovementBonus(aiShip, target, adversary.size, tacticCard);

    if (noMovement) {
      previews.set(aiShip.id, {
        targetHex: aiShip.position,
        newFacing: aiShip.facing,
        path: [],
        noMovement: true,
      });
      continue;
    }

    const isFighter = isSmallCraftSize(adversary.size);
    const movePlan = planAIMovement(
      aiShip.position, aiShip.facing, adversary.speed,
      target.position, adversary.aiTag, adversary.weaponRangeMax,
      occupiedHexes, terrainMap, extraMove > 0 ? extraMove : 0,
      isFighter,
    );

    occupiedHexes.delete(hexKey(aiShip.position));
    occupiedHexes.add(hexKey(movePlan.targetHex));

    previews.set(aiShip.id, {
      targetHex: movePlan.targetHex,
      newFacing: movePlan.newFacing,
      path: movePlan.path,
      noMovement: false,
    });

    const simulatedShip = simulatedEnemies.find(ship => ship.id === aiShip.id);
    if (simulatedShip) {
      simulatedShip.position = movePlan.targetHex;
      simulatedShip.facing = movePlan.newFacing;
    }
  }

  return previews;
}

/**
 * Execute the full AI turn for a group of enemy ships (same size tier).
 */
export function executeAITier(
  actingShips: EnemyShipState[],
  allPlayerShips: ShipState[],
  allEnemyShips: EnemyShipState[],
  tacticCard: TacticCard | null,
  occupiedHexes: Set<string>,
  terrainMap: Map<string, TerrainType>,
  players: PlayerState[],
  tacticHazards: TacticHazardState[] = [],
): AITurnResult {
  const actions: AIAction[] = [];
  const shipUpdates = new Map<string, Partial<EnemyShipState>>();
  const playerDamage: AITurnResult['playerDamage'] = [];
  const consumedHazardIds = new Set<string>();
  const sorted = sortActingShips(actingShips, allPlayerShips, allEnemyShips);

  for (const aiShip of sorted) {
    if (aiShip.isDestroyed) continue;
    const adversary = getAdversaryById(aiShip.adversaryId);
    if (!adversary) continue;

    const possibleTargets = aiShip.isAllied 
      ? allEnemyShips.filter(e => !e.isAllied && !e.isDestroyed)
      : [...allPlayerShips, ...allEnemyShips.filter(e => e.isAllied && !e.isDestroyed)];

    // 1. Acquire target
    const aggroEntries = calculateAggroScores(aiShip, possibleTargets, tacticCard, [], players);
    if (aggroEntries.length === 0) continue;
    const primaryTarget = aggroEntries[0];
    const target = possibleTargets.find(p => p.id === primaryTarget.targetId);
    if (!target) continue;

    // 2. Check if tactic card prevents movement
    const noMovement = tacticCard?.id === 'overwhelming-firepower';
    const extraMove = getTacticMovementBonus(aiShip, target, adversary.size, tacticCard);

    // 3. Move
    if (!noMovement) {
      const isFighter = isSmallCraftSize(adversary.size);
      const movePlan = planAIMovement(
        aiShip.position, aiShip.facing, adversary.speed,
        target.position, adversary.aiTag, adversary.weaponRangeMax,
        occupiedHexes, terrainMap, extraMove > 0 ? extraMove : 0,
        isFighter,
      );

      occupiedHexes.delete(hexKey(aiShip.position));
      occupiedHexes.add(hexKey(movePlan.targetHex));

      const existingUpdates = shipUpdates.get(aiShip.id) ?? {};
      const triggeredHazards = tacticHazards.filter(hazard =>
        !consumedHazardIds.has(hazard.id) &&
        movePlan.path.some(step => hexKey(step) === hexKey(hazard.position))
      );
      const mineDamage = triggeredHazards.reduce((sum, hazard) => sum + hazard.damage, 0);
      triggeredHazards.forEach(hazard => consumedHazardIds.add(hazard.id));

      shipUpdates.set(aiShip.id, {
        ...existingUpdates,
        position: movePlan.targetHex,
        facing: movePlan.newFacing,
        currentHull: Math.max(0, (existingUpdates.currentHull ?? aiShip.currentHull) - mineDamage),
        isDestroyed: Math.max(0, (existingUpdates.currentHull ?? aiShip.currentHull) - mineDamage) === 0,
      });

      actions.push({ shipId: aiShip.id, type: 'move', details: { to: movePlan.targetHex, path: movePlan.path, triggeredHazardIds: triggeredHazards.map(hazard => hazard.id) } });

      // Update local reference for attack range check
      aiShip.position = movePlan.targetHex;
      aiShip.facing = movePlan.newFacing;
      if (mineDamage > 0) {
        aiShip.currentHull = Math.max(0, aiShip.currentHull - mineDamage);
      }
      if (aiShip.currentHull <= 0) {
        aiShip.isDestroyed = true;
        continue;
      }
    }

    // 4. Attack
    const dist = hexDistance(aiShip.position, target.position);
    if (dist >= adversary.weaponRangeMin && dist <= adversary.weaponRangeMax) {
      // Check for weapons disabled crit
      const weaponsDisabled = aiShip.criticalDamage.some(c => c.id === 'enemy-weapons-disabled');
      if (!weaponsDisabled) {
        const pool: VolleyDieInput[] = adversary.volleyPool.map(dt => ({ type: dt, source: 'weapon' }));
        // Tactic card extra dice
        if (tacticCard?.mechanicalEffect.extraDice) {
          pool.push(...tacticCard.mechanicalEffect.extraDice.map(dt => ({ type: dt, source: 'tactic' })));
        }
        if (
          tacticCard?.mechanicalEffect.longRangeExtraDice &&
          tacticCard.mechanicalEffect.longRangeMin !== undefined &&
          dist >= tacticCard.mechanicalEffect.longRangeMin &&
          (adversary.aiTag === 'artillery' || adversary.aiTag === 'support')
        ) {
          pool.push(...tacticCard.mechanicalEffect.longRangeExtraDice.map(dt => ({ type: dt, source: 'tactic' })));
        }

        const defTerrain = terrainMap.get(hexKey(target.position));
        let targetEvasion = target.baseEvasion + (target.evasionModifiers ?? 0);
        
        // Apply Bulwark (only if target is playerShip)
        const isAdjacentPaladin = 'chassisId' in target && allPlayerShips.some(s => {
          if (s.id === target.id || s.isDestroyed) return false;
          if (hexDistance(s.position, target.position) === 1) {
            return getChassisById(s.chassisId)?.uniqueTraitName === 'Bulwark';
          }
          return false;
        });
        if (isAdjacentPaladin) targetEvasion += 1;

        // Apply Fleet Comms (only if target is playerShip)
        const isFleetComms = 'chassisId' in target && players.some(p => {
          const s = allPlayerShips.find(sh => sh.id === p.shipId);
          if (!s || s.isDestroyed || hexDistance(s.position, target.position) > 2) return false;
          const chatter = p.officers.find(o => o.station === 'sensors');
          if (chatter && getOfficerById(chatter.officerId)?.traitName === 'Fleet Comms' && chatter.currentStress === 0) return true;
          return false;
        });
        if (isFleetComms) targetEvasion += 1;

        const tn = calculateTN(targetEvasion, dist, defTerrain, 0, 0, 0, 0, false, aiShip.isJammed || false);
        const volley = rollVolley(pool, tn.total);
        const sector = determineStruckShieldSector(aiShip.position, target.position, target.facing);
        if (
          tacticCard?.mechanicalEffect.flankRearExtraDice &&
          (sector === 'aft' || sector === 'aftPort' || sector === 'aftStarboard')
        ) {
          const extraVolley = rollVolley(
            tacticCard.mechanicalEffect.flankRearExtraDice.map(dt => ({ type: dt, source: 'tactic' })),
            tn.total,
          );
          volley.dice.push(...extraVolley.dice);
          volley.totalHits += extraVolley.totalHits;
          volley.totalCrits += extraVolley.totalCrits;
          volley.totalStandardHits += extraVolley.totalStandardHits;
          volley.totalCriticalHits += extraVolley.totalCriticalHits;
        }
        
        // Option 2: Critical Hits Pierce
        // All Critical Hits bypass shields and armor completely.
        const piercingHits = volley.totalCriticalHits;
        const standardHits = volley.totalStandardHits;

        // ── Ion Nebula Rule: shields are 0 while inside the nebula ─────────────
        const targetInIonNebula = defTerrain === 'ionNebula';
        const shieldVal = targetInIonNebula ? 0 : target.shields[sector];
        
        // Standard hits go against shields
        const shieldDmg = Math.min(standardHits, shieldVal);
        const overflow = standardHits - shieldDmg;
        
        // Roll armor die to mitigate overflow damage
        let armorRoll = 0;
        let hullDmg = 0;
        if (overflow > 0) {
          // Check for armor disabled crit (e.g. 'armor-compromised') if applicable
          const armorDisabled = target.criticalDamage.some(c => c.id === 'armor-compromised');
          if (!armorDisabled) {
            armorRoll = rollDie(target.armorDie);
          }
          hullDmg = Math.max(1, overflow - armorRoll);
        }

        // Add piercing hits directly to hull damage
        hullDmg += piercingHits;

        playerDamage.push({
          targetId: target.id,
          hullDamage: hullDmg,
          shieldDamage: shieldDmg,
          sector,
          officerStress: piercingHits > 0 ? tacticCard?.mechanicalEffect.criticalStressBonus : undefined,
        });
        actions.push({ shipId: aiShip.id, type: 'attack', details: {
          target: target.id, hits: volley.totalHits, hullDmg, shieldDmg, sector,
          damageResult: {
            tnBreakdown: tn,
            volleyResult: volley,
            shieldHits: shieldDmg,
            struckSector: sector,
            hullDamage: hullDmg,
            overflowHits: overflow,
            armorRoll: armorRoll,
            criticalTriggered: piercingHits > 0
          }
        }});
      }
    }
  }

  return { actions, shipUpdates, playerDamage, consumedHazardIds: [...consumedHazardIds] };
}
