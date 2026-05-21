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
              <li><strong>Defeat:</strong> The campaign is lost if all player ships are destroyed simultaneously, or if a destroyed ship cannot be replaced due to insufficient Requisition Points (RP).</li>
            </ul>
          </div>
        );
      case 'setup':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Setup & Deployment</h2>
            <p>Before launching into the campaign, the War Council must outfit their ship.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>1. Choose a Chassis</h3>
            <p>Select a Ship Chassis (for custom scenarios only; in the main Campaign, all players start in Vanguard-class cruisers). This determines your Hull, Shields, Speed, Base Evasion, Armor Die, and how many Weapon and Internal Subsystem slots you have available. It also dictates your starting Command Token (CT) generation.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>2. Assign Officers</h3>
            <p>Assign one officer to each of the four Bridge Stations: <strong>Helm</strong>, <strong>Tactical</strong>, <strong>Engineering</strong>, and <strong>Sensors</strong>. Officers dictate your Skill Dice, Stress limits, and provide unique passive or active abilities.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>3. Equip Modules</h3>
            <p>Spend your Deployment Points (DP) budget to equip Weapons and Subsystems to your ship's empty slots.</p>
            <ul>
              <li><strong>DP Budget:</strong> Varies by difficulty. Choose carefully, as everything costs DP.</li>
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
              <li><strong>Haven (Drydock) Nodes:</strong> Safe zones where you can spend RP to repair Hull, clear Traumas/Scars, upgrade Officers, and buy new weapons or subsystems.</li>
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Resources</h3>
            <ul>
              <li><strong>Requisition Points (RP):</strong> The fleet's currency, used exclusively at Drydocks.</li>
              <li><strong>Fleet Favor (FF):</strong> Represents your standing with High Command. Earned in combat, it is converted to RP after battles. Can also be spent to call in powerful Fleet Assets mid-battle.</li>
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
              <li><strong>Shields:</strong> Divided into 6 directional sectors. Shields absorb damage before Hull. They regenerate 1 point per sector at the end of each round (unless disabled).</li>
              <li><strong>Armor Die:</strong> When you take Hull damage from a standard attack, roll this die. The result reduces the incoming Hull damage.</li>
              <li><strong>Base Evasion (TN):</strong> The base difficulty for enemies trying to hit you. Higher is better.</li>
              <li><strong>Speed:</strong> How many hexes your ship *must* drift forward during the Execution Phase. Can be adjusted by the Helm.</li>
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
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Stress & Fatigue</h3>
            <p>Using officer abilities costs Stress. If an officer exceeds their Stress Limit, they trigger a <strong>Fumble</strong>—drawing a Fumble Card and prompting an immediate <strong>Trauma Check</strong>. Furthermore, assigning multiple actions to the same officer in one round incurs a compounding <strong>Fatigue Penalty</strong> (+1 Stress cost per prior action).</p>
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
              <li><strong>Execution Phase:</strong> All ships activate in initiative order (Small, then Medium, then Large).
                <br/><em>When your ship activates:</em> It must first drift forward a number of hexes equal to its Speed. Then, you may resolve your queued actions in any order.
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
            </ul>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Hits vs. Crits</h3>
            <p>A die that meets the TN is a <strong>Standard Hit</strong> (1 damage to the facing shield, overflowing to hull). A die that meets the TN AND rolls its maximum face value is a <strong>Critical Hit</strong>. Critical Hits deal 1 damage AND bypass shields completely, striking the Hull directly.</p>
            <p><em>Exploding Dice:</em> Critical hits "explode", allowing you to roll that same die again for each crit. Additional max rolls continue to explode!</p>
            <p><em>Critical Damage:</em> If a ship takes 3 or more Hull damage from a single volley, it suffers a <strong>Critical Damage</strong> effect.</p>
            <h3 style={{ color: 'var(--color-text-bright)', marginTop: 'var(--space-md)' }}>Ramming</h3>
            <p>If a ship enters a hex occupied by another capital ship, a collision occurs. Both ships immediately suffer 1D4 unblockable Hull damage, and the moving ship stops in the adjacent hex.</p>
          </div>
        );
      case 'hazards':
        return (
          <div className="animate-fadeIn">
            <h2 style={{ color: 'var(--color-holo-cyan)' }}>Hazards & Effects</h2>
            <p>Space combat is dangerous. You will suffer lasting consequences.</p>
            <ul>
              <li><strong>Fumbles:</strong> Occur when an officer exceeds their Stress limit. This triggers a random, immediate negative effect (often locking out the station or failing the action) and forces a <strong>Trauma Check</strong>.</li>
              <li><strong>Critical Damage:</strong> When your Hull takes a Critical Hit (a die rolling its max face value), you draw a Critical Damage card. These apply severe, ongoing penalties until repaired by Engineering.</li>
              <li><strong>Traumas:</strong> When an officer fumbles, they must roll a **D6 Trauma Check**. On a roll of **1 or 2**, they gain a permanent psychological **Trauma Trait**, hampering their abilities in future battles. Gaining a trauma can be intercepted by the *Auto-Doc Override* experimental tech.</li>
              <li><strong>Ship Scars:</strong> If your ship survives with unresolved Critical Damage cards, they solidify into permanent Ship Scars that cannot be repaired mid-battle, only at a Drydock.</li>
              <li><strong>Rules of Engagement (RoE):</strong> A doctrine card drawn at the start of the campaign that applies a global rule to every battle. You can spend Fleet Favor to override it for a single battle.</li>
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
