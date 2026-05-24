import React, { useState } from 'react';
import { useUIStore } from '../store/useUIStore';
import { useViewport } from '../utils/useViewport';

type TabId = 
  | 'overview' 
  | 'setup' 
  | 'campaign' 
  | 'ship' 
  | 'officers' 
  | 'sequence' 
  | 'mechanics' 
  | 'terrain'
  | 'hazards';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'setup', label: 'Setup & Deploy' },
  { id: 'campaign', label: 'The Campaign' },
  { id: 'ship', label: 'The Ship' },
  { id: 'officers', label: 'Officers' },
  { id: 'sequence', label: 'Combat Sequence' },
  { id: 'mechanics', label: 'Combat Mechanics' },
  { id: 'terrain', label: 'Terrain & Environment' },
  { id: 'hazards', label: 'Hazards & Effects' },
];

export default function HowToPlayModal() {
  const isHowToPlayOpen = useUIStore(s => s.isHowToPlayOpen);
  const toggleHowToPlay = useUIStore(s => s.toggleHowToPlay);
  const { isPhone, isTablet } = useViewport();
  
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (!isHowToPlayOpen) return null;

  const isMobile = isPhone || isTablet;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Overview</h2>
            <p>Welcome to <strong>Chain of Command</strong>, a cooperative starship bridge simulator campaign.</p>
            <p>You and your fellow players represent the War Council, defectors from the Hegemony. Every player acts as the captain of their own ship, managing a crew of officers across different stations to survive a branching campaign of hostile sectors.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Victory & Defeat</h3>
            <ul>
              <li><strong>Victory:</strong> Survive all three sectors and defeat the Sector 3 Boss.</li>
              <li>
                <strong>Defeat:</strong> The campaign is immediately lost if:
                <ul style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                  <li>All player ships are destroyed simultaneously in combat.</li>
                  <li>You are defeated by a Sector Boss.</li>
                  <li>Your Fleet Favor drops to -5 or lower (High Command revokes your commission).</li>
                </ul>
                <span style={{ fontSize: '0.9em', color: 'var(--color-text-dim)' }}>
                  <em>(Note: Destroyed ships can be replaced for free after combat, but the destroyed captain will be issued a basic Vanguard-class cruiser equipped with only starter gear and a Rookie crew.)</em>
                </span>
              </li>
            </ul>
          </div>
        );
      case 'setup':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Setup & Deployment</h2>
            <p>Before launching into the campaign, the War Council must outfit their ship.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>1. Choose a Chassis</h3>
            <p>Select a Ship Chassis (for custom scenarios only; in the main Campaign, all players start in Vanguard-class cruisers). This determines your Hull, Shields, Speed, Base Evasion, Armor Die, and how many Weapon and Internal Subsystem slots you have available. It also dictates your starting Command Token (CT) generation. <em>(Note: Your chosen chassis consumes a portion of your starting DP).</em></p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>2. Assign Officers</h3>
            <p>Assign one officer to each of the four Bridge Stations: <strong>Helm</strong>, <strong>Tactical</strong>, <strong>Engineering</strong>, and <strong>Sensors</strong>. Officers dictate your Skill Dice, Stress limits, and provide unique passive or active abilities. <em>(Note: Higher tier officers cost more DP to deploy).</em></p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>3. Equip Modules</h3>
            <p>Equip Weapons and Subsystems to your ship's empty slots.</p>
            <ul>
              <li><strong>DP Budget:</strong> Your fleet has a global Deployment Points (DP) budget determined by your selected difficulty. Your Chassis, Officers, and Modules all cost DP. Spend it carefully!</li>
              <li>You may also keep unequipped items in the Fleet Stash for later use.</li>
            </ul>
          </div>
        );
      case 'campaign':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>The Campaign</h2>
            <p>The campaign is structured as a branching web of nodes across 3 Sectors.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Node Types</h3>
            <ul>
              <li><strong>Combat Nodes:</strong> Engage Hegemony forces. Winning earns Fleet Favor and RP.</li>
              <li><strong>Elite & Boss Nodes:</strong> Engage superior Hegemony forces or sector commanders. Winning earns the standard rewards plus a choice from 3 randomized Elite Rewards (bonus RP, Fleet Favor, Tech, or free Drydock vouchers).</li>
              <li><strong>Event Nodes:</strong> Narrative choices that can provide rewards, inflict penalties, or offer unique Experimental Tech.</li>
              <li><strong>Haven (Drydock) Nodes:</strong> Safe zones where you can spend RP to repair Hull, clear Traumas/Scars, upgrade Officers, buy new weapons/subsystems, or scrap unneeded gear.</li>
              <li><strong>Mystery Nodes:</strong> Unknown signals that reveal their true nature only upon arrival. They could disguise any of the other node types.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Resources</h3>
            <ul>
              <li><strong>Requisition Points (RP):</strong> The fleet's currency, used exclusively at Drydocks.</li>
              <li><strong>Fleet Favor (FF):</strong> Represents your standing with High Command. Earned in combat, it can be voluntarily converted to RP (1 FF = 10 RP) after battles. It can also be spent to call in powerful Fleet Assets mid-battle, or used to bypass strict Rules of Engagement.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Scoring</h3>
            <ul>
              <li><strong>Earning Commendations:</strong> The fleet earns a collective score throughout the campaign. Points are awarded for combat victories, earning Fleet Favor, securing flawless victories, and acquiring Experimental Tech.</li>
              <li><strong>Penalties:</strong> Points are deducted for losing Fleet Favor, having ships destroyed, and when officers sustain Traumas or ships gain Scars.</li>
              <li><strong>Final Grade:</strong> At the end of the campaign, your raw score is modified by a Difficulty Multiplier to calculate your Final Grade.</li>
            </ul>
          </div>
        );
      case 'ship':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>The Ship</h2>
            <p>Your flagship has several key stats that you must manage to survive.</p>
            <ul>
              <li><strong>Hull:</strong> Your ship's health. If this reaches 0, the ship is destroyed.</li>
              <li><strong>Shields:</strong> Divided into 6 directional sectors. Shields absorb damage before Hull. They regenerate 1 point per sector at the end of each round (up to their maximum capacity), unless disabled.</li>
              <li><strong>Armor Die:</strong> When standard hits overflow past your shields, roll this die. The result reduces the incoming Hull damage (to a minimum of 1). Critical hits and Armor-Piercing weapons bypass this completely.</li>
              <li><strong>Base Evasion (TN):</strong> The base difficulty for enemies trying to hit you. This combines with range and terrain to create the final Target Number (TN). Higher is better.</li>
              <li><strong>Speed:</strong> How many hexes your ship *must* move straight forward during its Execution Phase activation. This value can be adjusted by the Helm officer.</li>
            </ul>
          </div>
        );
      case 'officers':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Officers</h2>
            <p>Bridge Officers are the heart of your ship, organized into 4 stations.</p>
            <ul>
              <li><strong>Helm:</strong> Controls speed, rotation, and evasive maneuvers.</li>
              <li><strong>Tactical:</strong> Fires weapons, manages shields, and commands fighters.</li>
              <li><strong>Engineering:</strong> Repairs hull, reinforces shields, and manages power (CT).</li>
              <li><strong>Sensors:</strong> Applies Target Locks, hacks enemies, and manages intel.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Ranks & Traits</h3>
            <p>Each officer possesses a unique <strong>Trait</strong> that provides specialized passive or active benefits. Additionally, every officer has a Rank (Rookie, Veteran, Elite, or Legendary) that determines their <strong>Skill Die</strong> (D4, D6, D8, or D10).</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Skill Procs</h3>
            <p>The Skill Die isn't just for combat — every station rolls it automatically when resolving most actions. Rolling a <strong>4+</strong> is a <strong>Success</strong>, and rolling the die's <strong>maximum face</strong> is a <strong>Critical</strong>, which upgrades the effect further. Higher-ranked officers (with larger dice) proc more reliably and crit more often.</p>
            <ul>
              <li><strong>Tactical (Fire Weapon):</strong> The Skill Die is added directly to the weapon's Volley Pool, providing an extra chance to hit or crit.</li>
              <li><strong>Helm (Rotate):</strong> Success = option for a free second rotation in the same direction. Critical = free rotation <em>plus</em> a +1 Evasion bonus until the ship's next turn.</li>
              <li><strong>Helm (Evasive Pattern):</strong> Success upgrades the Evasion bonus from +2 to +3 TN.</li>
              <li><strong>Engineering (Damage Control):</strong> Success repairs 2 Hull instead of 1.</li>
              <li><strong>Engineering (Reinforce Shields):</strong> Success restores 3 Shield points instead of 2. Critical also clears an eligible Critical Damage card.</li>
              <li><strong>Sensors (Target Lock):</strong> Success improves the TN penalty applied to the target. Critical also marks the target for one Armor-Piercing volley.</li>
              <li><strong>Sensors (Cyber Warfare):</strong> Success jams the target's fire control (+2 TN to their attacks). Critical also forces their Speed to 0 next round.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Stress & Fatigue</h3>
            <p>Using officer abilities costs Stress. If an officer exceeds their Stress Limit, they trigger a <strong>Fumble</strong>—drawing a Fumble Card and prompting an immediate <strong>Trauma Check</strong>. Furthermore, assigning the <strong>same action</strong> multiple times to an officer in one round incurs a compounding <strong>Fatigue Penalty</strong> (+1 Stress cost per prior assignment of that exact action).</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Command Tokens (CT)</h3>
            <p>The War Council shares a pool of Command Tokens generated each round. Every action requires assigning a CT to a station.</p>
          </div>
        );
      case 'sequence':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Combat Sequence</h2>
            <p>Every combat round follows a strict sequence of phases:</p>
            <ol>
              <li><strong>Briefing Phase:</strong> Command Tokens are generated. The enemy AI Tactic Card is revealed, detailing the enemy's special buffs and targeting rules for the round.</li>
              <li><strong>Command Phase:</strong> Players discuss strategy and assign Command Tokens to Officer Stations to queue up actions.</li>
              <li><strong>Execution Phase:</strong> All ships activate in initiative order. Within each size class, Allied forces activate before Enemy forces:
                <ul style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                  <li><em>Small Allied → Small Enemy → Medium Allied → Medium Enemy → Large Allied → Large Enemy</em></li>
                </ul>
                <strong>Capital Ships:</strong> When a capital ship activates, it must first drift forward a number of hexes equal to its Speed (unless halted early by a collision with another capital ship or by entering an Asteroid field). Then, you may resolve your queued actions in any order.
                <br/><br/>
                <strong>Small Craft (Fighters):</strong> Fighters activate automatically based on their assigned behavior (e.g., <em>Attack, Escort, Hit &amp; Run</em>). Players do not queue actions for them.
              </li>
              <li><strong>Cleanup Phase:</strong> Active effects expire, and operational shields regenerate 1 point.</li>
            </ol>
          </div>
        );
      case 'mechanics':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Combat Mechanics</h2>
            <h3 style={{ color: 'var(--color-text-bright)' }}>Target Numbers (TN) & Volley Pools</h3>
            <p>Attacks are resolved using Volley Pools—a handful of dice determined by the weapon, plus the Tactical Officer's Skill Die. To hit, a die must roll equal to or higher than the target's <strong>Target Number (TN)</strong>.</p>
            <p><strong>TN = Target's Base Evasion + Range Modifier + Terrain Modifiers + Active Maneuvers (Helm) + Target Lock (Sensors)</strong></p>
            <ul>
              <li><strong>Range Mods:</strong> Short (1-2 hexes): +0 TN. Medium (3-4 hexes): +1 TN. Long (5+ hexes): +2 TN.</li>
              <li><strong>Terrain Mods:</strong> Asteroids: +2 TN (blocks LoS). Debris Field: +1 TN. Ion Nebula: +1 TN (blocks LoS, disables all shields). Gravity Well &amp; Open Space: +0 TN.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Hits vs. Crits</h3>
            <p>A die that meets the TN is a <strong>Standard Hit</strong> (1 damage to the facing shield, overflowing to hull). If damage overflows to hull, the defender's Armor Die reduces the incoming damage (minimum 1). A die that meets the TN AND rolls its maximum face value is a <strong>Critical Hit</strong>. Critical Hits deal 1 damage AND bypass shields completely, striking the Hull directly and ignoring Armor.</p>
            <p><em>Exploding Dice:</em> Critical hits "explode", allowing you to roll that same die again for each crit. Additional max rolls continue to explode!</p>
            <p><em>Critical Damage:</em> If a ship takes 3 or more Hull damage from a single volley, it suffers a <strong>Critical Damage</strong> effect.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Enemy Point Defense Cannons (PDC)</h3>
            <p>Enemy capital ships (Medium and Large size) are equipped with Point Defense Cannons that automatically engage allied fighters and torpedoes that pass within <strong>1 hex</strong> of the ship. The PDC rolls 1d6 against a Target Number equal to the target's total Evasion (Base Evasion + terrain modifier + active maneuvers, if any) minus 4; if the roll hits, the small craft or torpedo is destroyed before reaching its destination. This PDC system can be disabled by the <em>Point Defense Offline</em> critical damage card.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Ramming</h3>
            <p>If a ship enters a hex occupied by another capital ship, a collision occurs. Both ships immediately suffer 1D4 unblockable Hull damage, and the moving ship stops in the adjacent hex.</p>
          </div>
        );
      case 'terrain':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Terrain & Environment</h2>
            <p>The hex battlefield is populated with environmental terrain that affects movement, targeting, and defense. A ship's terrain modifier is determined by the hex it currently occupies.</p>
            <p><strong>Line of Sight (LoS):</strong> A straight line is drawn from attacker to target. If any hex along that path (excluding the attacker's and target's own hexes) contains blocking terrain (Asteroids, Ion Nebula), the shot is blocked and cannot be fired. The struck shield sector is also determined by the angle of this line relative to the target's facing.</p>
            <ul>
              <li><strong>Asteroids:</strong> +2 TN for attacks against the occupant. Blocks Line of Sight. Halts momentum drift (Speed → 0) on entry. Entering requires a D6 roll; on a 1, the ship takes 1D4 unblockable Hull damage.</li>
              <li><strong>Ion Nebula:</strong> +1 TN for attacks against the occupant. Blocks Line of Sight. Electrostatic interference disables all shields while inside (treated as 0). Conceals enemy ship identity — they appear as ghost contacts (diamond "?" markers) until Identified by Target Lock or revealed by proximity (≤1 hex) or opening fire.</li>
              <li><strong>Debris Field:</strong> +1 TN for attacks against the occupant. Wreckage provides minor cover. Small Craft (Fighters) cannot enter or pass through.</li>
              <li><strong>Gravity Well:</strong> No direct TN modifier. At the start of the Cleanup Phase, any ship inside or adjacent is pulled 1 hex toward the center.</li>
              <li><strong>Open Space:</strong> No terrain effects. Standard void.</li>
            </ul>
          </div>
        );
      case 'hazards':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Hazards & Effects</h2>
            <p>Space combat is dangerous. You will suffer lasting consequences.</p>
            <ul>
              <li><strong>Fumbles:</strong> Occur when an officer exceeds their Stress limit. This triggers a random, immediate negative effect (often locking out the station or failing the action) and forces a <strong>Trauma Check</strong>. The fumbling officer's stress then resets to half their max.</li>
              <li><strong>Critical Damage:</strong> When your ship takes 3 or more Hull damage from a single volley, draw a Critical Damage card. These apply severe, ongoing penalties until repaired by Engineering.</li>
              <li><strong>Traumas:</strong> When an officer fumbles, they must roll a <strong>D6 Trauma Check</strong> (needs 3+ to resist). On a roll of <strong>1 or 2</strong>, they gain a permanent <strong>Trauma Trait</strong> that hampers their abilities — many are station-specific (Helm, Tactical, Engineering, or Sensors). Gaining a trauma can be intercepted once by the one-time-use <em>Auto-Doc Override</em> experimental tech.</li>
              <li><strong>Ship Scars:</strong> After combat, any Critical Damage cards that were NOT repaired during the battle solidify into permanent Ship Scars. Scars cannot be removed mid-battle — only at a Drydock.</li>
              <li><strong>Rules of Engagement (RoE):</strong> A doctrine card drawn at the start of the campaign that applies a global rule to every battle. You can spend -2 Fleet Favor during the Briefing or Command Phase to override it and ignore its restrictions for the rest of the battle.</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-modal-backdrop" onClick={toggleHowToPlay}>
      {/* Main modal — always uses sidebar layout; landscape forced by App.tsx orientation lock */}
      <div 
        className="settings-modal panel panel--glow animate-fadeIn" 
        style={{ 
          width: '900px', 
          maxWidth: '96vw', 
          height: '85vh',
          display: 'flex', 
          flexDirection: 'row',
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <div style={{ position: 'absolute', top: '10px', right: '15px', zIndex: 10 }}>
          <button className="settings-close-btn btn" onClick={toggleHowToPlay} aria-label="Close">×</button>
        </div>

        {/* Tab Sidebar */}
        <div 
          style={{
            width: '230px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'var(--space-md)',
            gap: 'var(--space-sm)'
          }}
        >
          <div className="label" style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--space-md)', flexShrink: 0 }}>
            RULES REFERENCE
          </div>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn--primary' : 'btn--secondary'}`}
              style={{ 
                textAlign: 'center', 
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                width: '100%',
                flexShrink: 0,
                fontSize: isMobile ? '0.8rem' : undefined,
                lineHeight: 1.3,
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div 
          className="custom-scrollbar"
          style={{ 
            flex: 1, 
            padding: 'var(--space-xl)', 
            overflowY: 'auto',
            lineHeight: 1.6,
            fontSize: isMobile ? '0.9rem' : '1.05rem',
            color: 'var(--color-text-secondary)'
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
