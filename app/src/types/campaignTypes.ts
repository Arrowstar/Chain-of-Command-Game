import type { OfficerStation, SkillDieTier } from './game';

export type CampaignDifficulty = 'easy' | 'normal' | 'hard';

export type CampaignLogType =
  | 'navigation'
  | 'event'
  | 'combat'
  | 'resource'
  | 'repair'
  | 'market'
  | 'officer'
  | 'system';

// ─── Score Ledger ──────────────────────────────────────────────────

export type ScoreSource =
  | 'combat'    // enemy destroyed, flawless bonus, ship destroyed penalty
  | 'attrition' // post-combat: scars, traumas
  | 'event'     // event rewards/penalties
  | 'economy'   // tech acquired, FF conversion
  | 'sector'    // sector clear bonus
  | 'victory';  // final difficulty multiplier

export interface ScoreLedgerEntry {
  id: string;
  timestamp: number;
  /** Sector the entry was recorded in */
  sector: number;
  source: ScoreSource;
  /** Human-readable description of what caused this change */
  reason: string;
  /** Positive = score gained, negative = score lost */
  amount: number;
  /** Running total AFTER this entry was applied */
  runningTotal: number;
}

// ─── High Score Record ─────────────────────────────────────────────

export interface HighScoreShipSnapshot {
  shipId: string;
  shipName: string;
  chassisId: string;
  equippedWeapons: (string | null)[];
  equippedSubsystems: (string | null)[];
  officers: { officerId: string; station: string; tier: string }[];
}

export interface HighScoreRecord {
  id: string;
  /** Display-friendly run label, e.g. "Sector 3 – Hard" */
  runLabel: string;
  completedAt: number; // Unix ms timestamp
  difficulty: CampaignDifficulty;
  /** Pre-multiplier score */
  rawScore: number;
  /** Score after difficulty multiplier */
  finalScore: number;
  difficultyMultiplier: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  /** Was the campaign won? */
  victory: boolean;
  /** How many sectors were cleared */
  sectorsCleared: number;
  shipSnapshots: HighScoreShipSnapshot[];
  scoreLedger: ScoreLedgerEntry[];
}

// ─── Campaign Phase ───────────────────────────────────────────────

export type CampaignPhase =
  | 'story'          // Cinematic story beat (intro, sector transitions, campaign end)
  | 'sectorMap'      // Players are choosing the next node
  | 'nodeResolution' // A node is being resolved (combat launched, event shown, etc.)
  | 'postCombat'     // At-Ease Phase: payout, trauma, damage consolidation
  | 'eliteReward'    // Elite/Boss node victory rewards selection
  | 'drydock'        // Haven node: spending RP on repairs/upgrades
  | 'gameOver';      // Run complete (victory or total wipe)

export type StoryBeatId = 'sector-1' | 'sector-2' | 'sector-3' | 'victory';

// ─── Combat Modifier Passthrough ─────────────────────────────────
// Carries bonuses/penalties from Events/Elites into the next combat scenario.

export interface CombatModifiers {
  /** Extra points added to AI Threat Budget when spawning enemies */
  threatBudgetBonus?: number;
  /** Elite node: AI fleet guaranteed to spawn a ship one tier higher */
  guaranteedEliteSpawn?: boolean;
  /** Event 21 (Blind Spot): all Hegemony ships start with 0 Shields in Round 1 */
  enemyShieldsZeroRound1?: boolean;
  /** Event 21 (Blind Spot): player fleet acts first in all Initiative steps in Round 1 */
  playerActsFirst?: boolean;
  /** Event 23 (Solar Flare Option A): all player ships start Round 1 at Speed 3 */
  playerStartSpeed3?: boolean;
  /** Event 20 (Mutated Contagion Option A): all players generate -1 CT during the Briefing Phase for entire scenario */
  playerCTRound1Modifier?: number;
  /** Event 16 (Failing Reactor Option B): max speed of all player ships reduced by 1 */
  playerMaxSpeedReduction?: number;
  /** Event 12 (Micro-Meteoroid Option A): all player ships start Round 1 with 0 CT */
  playerCTZeroRound1?: boolean;
  /** Event 07 (The Zealous Inquisitor Option A): enemy flagship gets bonus stats */
  flagshipBonus?: { evasion: number; hull: number };
  /** Event 25 (The Negotiator Option B): extra threat from high-priority bounty */
  highPriorityBounty?: boolean;
  /** Event 13 (Propaganda Broadcast Option C): enemy threat budget boosted by 4 */
  propagandaExposedBonus?: number;
}

// ─── Experimental Tech (Relics) ──────────────────────────────────

export type TechCategory = 'tactical' | 'engineering' | 'command' | 'crew';
export type TechRarity = 'common' | 'uncommon' | 'rare';

export interface ExperimentalTech {
  id: string;
  name: string;
  category: TechCategory;
  effect: string;
  flavorText: string;
  isConsumable: boolean;  // true only for Auto-Doc Override
  isConsumed: boolean;    // runtime state
  rarity: TechRarity;
  imagePath: string;      // path to the tech's icon image, e.g. /assets/experimental_tech/...
}

// ─── Event Node Types ─────────────────────────────────────────────

export type EventEffectType =
  | 'rp'                     // Change requisition points (value = delta, can be negative)
  | 'ff'                     // Change fleet favor (value = delta, can be negative)
  | 'stress'                 // Apply stress to officers (value = amount)
  | 'stressRecover'          // Remove stress from officers (value = amount)
  | 'trauma'                 // Inflict a permanent Trauma Trait
  | 'hull'                   // Unblockable hull damage (value = amount per ship)
  | 'tech'                   // Gain Experimental Tech (value = count, default 1)
  | 'scar'                   // Apply a random Ship Scar to affected ships
  | 'clearScar'              // Remove one Ship Scar (for free)
  | 'transformToCombat'      // This event node becomes a Combat node
  | 'skipNode'               // Advance 2 nodes forward (skip 1)
  | 'hullPatch'              // Free hull patch: restore 1 hull to each affected ship
  | 'officerUpgrade'         // Upgrade one officer's skill tier by one step (free)
  | 'destroyWeapon'          // Permanently destroy a random equipped Weapon Module
  | 'grantWeapon'            // Add a specific weapon to the fleet stash
  | 'grantSubsystem'         // Add a specific subsystem to the fleet stash
  | 'nextStoreDiscount'      // Discount applied to the next drydock market purchase
  | 'freeRepairAtNextStation' // One free repair service at the next drydock
  | 'maxHullReduction'       // Permanently reduce a ship's max hull (value = reduction)
  | 'subsystemSlotReduction' // Permanently remove 1 internal subsystem slot
  | 'maxCTReduction'         // Permanently reduce a player's max CT generation (value)
  | 'nextCombatModifier'     // Apply CombatModifiers to the NEXT combat encounter
  | 'nothing';               // No effect (proceed to next node)

export type EventEffectTarget =
  | 'all'        // All player ships / all bridge officers
  | 'random'     // One randomly selected ship/officer
  | 'fleet'      // Fleet-level (shared pool: RP, FF)
  | 'station'    // Officers of a specific station
  | 'helm'       // Helm officers specifically
  | 'tactical'   // Tactical officers specifically
  | 'engineering' // Engineering officers specifically
  | 'sensors';   // Sensors officers specifically

export interface EventEffect {
  type: EventEffectType;
  value?: number;
  target?: EventEffectTarget;
  combatModifiers?: CombatModifiers;
  weaponId?: string;
  subsystemId?: string;
}

export type EventRequirementType =
  | 'officerPresent'
  | 'officerStationPresent'
  | 'techOwned'
  | 'minFleetFavor'
  | 'minRequisitionPoints';

export interface EventRequirement {
  type: EventRequirementType;
  officerId?: string;
  officerStation?: OfficerStation;
  techId?: string;
  value?: number;
  description?: string;
}

export interface EventRequirementContext {
  ownedOfficerIds: string[];
  ownedOfficerStations: OfficerStation[];
  ownedTechIds: string[];
  requisitionPoints: number;
  fleetFavor: number;
}

export interface EventOptionAvailability {
  visible: boolean;
  enabled: boolean;
  requirementsMet: boolean;
  autoSuccess: boolean;
  unmetRequirementText: string[];
}

export interface EventOption {
  id: string;
  label: string;
  flavorText: string;
  /** If true, outcome depends on a D6 roll */
  requiresRoll?: boolean;
  /** D6 result >= this threshold = good outcome (defaults to 4 if requiresRoll=true) */
  rollThreshold?: number;
  /** Effects applied when NO roll is required (immediate effects) */
  effects?: EventEffect[];
  /** Effects when roll succeeds (roll >= threshold) */
  goodEffects?: EventEffect[];
  /** Effects when roll fails (roll < threshold) */
  badEffects?: EventEffect[];
  /** Optional requirements used to show, enable, or auto-resolve narrative options */
  requirements?: EventRequirement[];
  requirementMode?: 'all' | 'any';
  visibility?: 'always' | 'hiddenWhenUnmet' | 'disabledWhenUnmet';
  autoSuccessWhenMet?: boolean;
}

export interface EventNode {
  id: string;         // 'event-01' through 'event-25'
  title: string;
  narrative: string;
  options: EventOption[];
}

// ─── Event Resolution Result ──────────────────────────────────────

export interface EventResolution {
  eventId: string;
  optionId: string;
  roll?: number;       // The D6 roll result if applicable
  rolledGood?: boolean;
  effectsApplied: EventEffect[];
  techAwarded?: string[];   // IDs of Experimental Tech gained
  grantedWeapons?: string[];
  grantedSubsystems?: string[];
  transformsToCombat: boolean;
  combatModifiers?: CombatModifiers;
  narrativeResult: string; // Human-readable summary for the log
}

export interface PendingEconomicBuffs {
  nextStoreDiscountPercent: number;
  freeRepairAtNextStation: boolean;
  freeRepairConsumed: boolean;
  freePsychEvalAtNextStation?: boolean;
  freeDeepRepairAtNextStation?: boolean;
}

export interface EliteRewardOption {
  id: string;
  icon: string;
  label: string;
  description: string;
  type: 'rp' | 'ff' | 'tech' | 'repair' | 'psych' | 'officerUp' | 'stashWeapon';
  value?: number;
  itemId?: string;
  imagePath?: string;
  tooltip?: string;
}

// ─── Drydock ─────────────────────────────────────────────────────

export interface DrydockService {
  id: string;
  name: string;
  rpCost: number;    // 0 if free
  rpGain?: number;   // for scrap actions
  description: string;
}

export interface MarketInventory {
  weapons: (string | null)[];    // weapon IDs available to purchase
  subsystems: (string | null)[]; // subsystem IDs available to purchase
  techOffer: string | null; // optional Experimental Tech offer for this drydock
}

export interface DrydockResult {
  success: boolean;
  failureReason?: string;
  rpDelta: number;       // negative for purchases, positive for scraps
  mutations: DrydockMutation[];
}

export interface DrydockMutation {
  type:
    | 'hullRestore'
    | 'scarRemoved'
    | 'traumaRemoved'
    | 'officerUpgraded'
    | 'weaponEquipped'
    | 'subsystemEquipped'
    | 'subsystemScrapped'
    | 'weaponScrapped'
    | 'chassisUpgraded'   // ship chassis replaced; stats rebuilt from new chassis
    | 'itemStashed'       // item moved from ship slot → fleet stash
    | 'itemUnstashed';    // item moved from fleet stash → ship slot
  shipId?: string;
  officerId?: string;
  slotIndex?: number;
  itemId?: string;
  newChassisId?: string;
  itemType?: 'weapon' | 'subsystem';
  fromTier?: SkillDieTier;
  toTier?: SkillDieTier;
  amount?: number;
}

// ─── Post-Combat Loop ─────────────────────────────────────────────

export interface PostCombatResult {
  victory: boolean;
  reason: string;
  rpGained: number;         // From FF → RP conversion
  ffConverted: number;      // How much FF was converted (only positive)
  traumasGained: TraumaGained[];
  scarsGained: ScarGained[];
  officerStressResets: string[]; // officerIds that reset to 0
}

export interface TraumaGained {
  officerId: string;
  shipId: string;
  traumaId: string;
  traumaName: string;
  traumaEffect: string;
}

export interface FleetFavorConversionResult {
  ffSpent: number;
  rpGained: number;
  remainingFleetFavor: number;
}

export interface ScarGained {
  shipId: string;
  scarId: string;
  fromCritId: string;
  scarName: string;
  scarEffect: string;
}

// ─── Campaign State ───────────────────────────────────────────────

export interface CampaignState {
  /** Which of the 3 Sectors (Acts) the fleet is in */
  currentSector: number;  // 1, 2, or 3

  /** ID of the currently-selected/active node */
  currentNodeId: string;

  /** The generated 15-tier web map for the current sector */
  sectorMapSeed: number;

  /** IDs of nodes already visited (breadcrumb trail) */
  visitedNodeIds: string[];

  /** IDs of nodes whose type+details are visible (revealed by Encryption Key, etc.) */
  revealedNodeIds: string[];

  /** Shared RP pool for the entire War Council */
  requisitionPoints: number;

  /** Current Fleet Favor (persists between nodes; resets to 0 after FF→RP payout) */
  fleetFavor: number;

  /** All Experimental Tech currently held by the fleet */
  experimentalTech: ExperimentalTech[];

  /** Current campaign phase */
  campaignPhase: CampaignPhase;

  /** Player ID of the Fleet Admiral (tie-breaker for votes) */
  fleetAdmiralPlayerId: string;

  /** Modifiers to apply to the NEXT combat node. Set by Events, cleared after combat starts. */
  nextCombatModifiers: CombatModifiers | null;

  /** If true, the fleet can jump 2 nodes ahead, bypassing an encounter */
  canSkipNode: boolean;

  /**
   * Market inventory for the current Haven node.
   * Null when not in a drydock.
   */
  drydockMarket: MarketInventory | null;

  /**
   * Fleet-wide stash of unequipped weapons.
   * Items here survive chassis upgrades and can be re-equipped at any drydock.
   */
  stashedWeapons: string[];

  /**
   * Fleet-wide stash of unequipped subsystems.
   * Items here survive chassis upgrades and can be re-equipped at any drydock.
   */
  stashedSubsystems: string[];

  /** One-shot route-planning buffs earned from events and consumed at the next haven. */
  pendingEconomicBuffs: PendingEconomicBuffs;

  /** Whether the campaign run is over */
  isGameOver: boolean;

  /** True = players won (cleared all 3 sectors). False = total wipe. */
  victory: boolean | null;

  /** Campaign difficulty level selected at creation */
  difficulty: CampaignDifficulty;

  /** Max allowed DP per ship for loadouts (100-150 depending on difficulty) */
  dpBudget: number;

  /** Which story beat is currently being displayed. Null when not in the 'story' phase. */
  pendingStoryId: StoryBeatId | null;

  /** Combat results to be displayed in the post-combat summary */
  lastCombatVictory?: boolean;
  lastCombatReason?: string;

  // ── Fleet Commendation Score ─────────────────────────────────
  /** Running total score for this campaign run */
  currentScore: number;
  /** Full audit log of every score change */
  scoreLedger: ScoreLedgerEntry[];

  /** Score at start of current combat (used to calculate delta for PostCombatSummary) */
  scoreAtCombatStart?: number;

  /** Unclaimed rewards from defeating an Elite/Boss node */
  pendingEliteRewards?: EliteRewardOption[];
  /** Node ID that granted the pending rewards */
  pendingEliteRewardNodeId?: string | null;
}

export interface CampaignLogEntry {
  id: string;
  sector: number;
  phase: CampaignPhase;
  timestamp: number;
  type: CampaignLogType;
  message: string;
  outcome: string;
  details?: Record<string, unknown>;
}

// ─── Sector Transition ────────────────────────────────────────────

export interface SectorTransition {
  newSector: number;
  newMapSeed: number;
  rpBonus: number;       // Massive RP payout for clearing the boss
  shieldRestored: boolean;
  epicWeaponDrop: string | null; // weapon ID, null if pool empty
  campaignVictory: boolean;      // true if cleared sector 3
}

// ─── Ship Destruction (Campaign) ─────────────────────────────────

export interface ShipReplacementConfig {
  newChassisId: 'vanguard';                  // Always replaced with starter Vanguard
  startingWeapons: string[];                 // Starter weapon loadout IDs
  startingOfficerTiers: Record<OfficerStation, SkillDieTier>; // All Rookie
}
