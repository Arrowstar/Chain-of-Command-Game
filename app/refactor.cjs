const fs = require('fs');
const file = 'src/components/setup/FleetBuilder.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Interface
const interfaceStr = `export interface PlayerDraft {
  chassisId: string | null;
  officers: Record<string, string>;
  weapons: string[];
  subsystems: string[];
  shipName: string;
}

export default function FleetBuilder`;

if (!c.includes('export interface PlayerDraft')) {
  c = c.replace('export default function FleetBuilder', interfaceStr);
}

// 2. Draft state
const oldState = `  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [completedPlayers, setCompletedPlayers] = useState<{ player: any, ship: any }[]>([]);

  // In campaign mode, players always start with the Vanguard chassis.
  const defaultChassisId = isCampaignSetup ? 'vanguard' : null;`;

const newState = `  const totalPlayers = isCampaignSetup ? campaignPlayerCount : (scenarioConfig ? scenarioConfig.playerSpawns.length : 1);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  // In campaign mode, players always start with the Vanguard chassis.
  const defaultChassisId = isCampaignSetup ? 'vanguard' : null;

  const [drafts, setDrafts] = useState<PlayerDraft[]>(() =>
    Array.from({ length: Math.max(1, totalPlayers) }).map(() => ({
      chassisId: defaultChassisId,
      officers: {},
      weapons: [],
      subsystems: [],
      shipName: '',
    }))
  );

  useEffect(() => {
    setDrafts(prev => {
      if (prev.length === totalPlayers) return prev;
      const newDrafts = [...prev];
      if (newDrafts.length < totalPlayers) {
        for (let i = newDrafts.length; i < totalPlayers; i++) {
          newDrafts.push({
            chassisId: defaultChassisId,
            officers: {},
            weapons: [],
            subsystems: [],
            shipName: ''
          });
        }
      } else {
        newDrafts.length = totalPlayers;
      }
      return newDrafts;
    });
  }, [totalPlayers, defaultChassisId]);`;

c = c.replace(oldState, newState);

// 3. Officers & Tab Logic
const oldOfficers = `  // Officer state: station -> officerId
  const [selectedOfficers, setSelectedOfficers] = useState<Record<string, string>>({});`;

const newOfficers = `  // Officer state: station -> officerId
  const [selectedOfficers, setSelectedOfficers] = useState<Record<string, string>>({});

  const saveCurrentDraft = () => {
    setDrafts(prev => {
      const newDrafts = [...prev];
      newDrafts[currentPlayerIndex] = {
        chassisId: selectedChassisId,
        officers: selectedOfficers,
        weapons: selectedWeapons,
        subsystems: selectedSubsystems,
        shipName: customShipName,
      };
      return newDrafts;
    });
  };

  const handleTabClick = (idx: number) => {
    if (idx === currentPlayerIndex) return;
    saveCurrentDraft();
    
    // Defer reading the new draft using the state update loop, or just read from existing drafts
    setDrafts(prev => {
      const targetDraft = prev[idx];
      if (targetDraft) {
        setSelectedChassisId(targetDraft.chassisId);
        setSelectedOfficers(targetDraft.officers);
        setSelectedWeapons(targetDraft.weapons);
        setSelectedSubsystems(targetDraft.subsystems);
        setCustomShipName(targetDraft.shipName);
        setCurrentPlayerIndex(idx);
        
        if (!targetDraft.chassisId) setStep(1);
        else if (['helm', 'tactical', 'engineering', 'sensors'].some(st => !targetDraft.officers[st])) setStep(2);
        else setStep(3);
      }
      return prev; // drafts themselves didn't change from this read
    });
  };`;

c = c.replace(oldOfficers, newOfficers);

// 4. Update claimedOfficerMap
const oldClaimed = `  // Build a map of officerId -> ship name for officers already claimed by previous players
  const claimedOfficerMap: Record<string, string> = {};
  completedPlayers.forEach(cp => {
    cp.player.officers.forEach((o: any) => {
      if (o.officerId) claimedOfficerMap[o.officerId] = cp.ship.name;
    });
  });`;

const newClaimed = `  // Build a map of officerId -> ship name for officers already claimed by previous players
  const claimedOfficerMap: Record<string, string> = {};
  drafts.forEach((draft, idx) => {
    if (idx === currentPlayerIndex) return; // Don't block current player's own claims
    Object.values(draft.officers).forEach(offId => {
      if (offId) claimedOfficerMap[offId] = \`Player \${idx + 1}\`;
    });
  });`;

c = c.replace(oldClaimed, newClaimed);

// Remove duplicate totalPlayers
c = c.replace(`  const totalPlayers = isCampaignSetup ? campaignPlayerCount : (scenarioConfig ? scenarioConfig.playerSpawns.length : 1);`, '');

// 5. Update UI Tabs
const tabsCode = `      {/* Player Progress Tracker */}
      {totalPlayers > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)' }}>
          {Array.from({ length: totalPlayers }).map((_, idx) => {
            const isActive = idx === currentPlayerIndex;
            
            // Check completeness
            const draft = isActive ? { chassisId: selectedChassisId, officers: selectedOfficers, weapons: selectedWeapons, subsystems: selectedSubsystems, shipName: customShipName } : drafts[idx];
            const _chassis = draft?.chassisId ? getChassisById(draft.chassisId) : null;
            const hasAllOffs = ['helm', 'tactical', 'engineering', 'sensors'].every(st => draft?.officers[st]);
            const hasAllMods = draft?.weapons.length >= 1 && (!_chassis || draft.weapons.length + draft.subsystems.length === _chassis.weaponSlots + _chassis.internalSlots);
            const isDone = !!(draft?.chassisId && hasAllOffs && hasAllMods);
            
            const shipNameForIdx = isCampaignSetup
              ? (campaignShipNames[idx]?.trim() || \`ISS Vanguard \${idx + 1}\`)
              : (draft?.shipName || \`Player \${idx + 1}\`);
              
            return (
              <div
                key={idx}
                onClick={() => handleTabClick(idx)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRight: idx < totalPlayers - 1 ? '1px solid var(--color-border)' : 'none',
                  background: isActive ? 'rgba(0, 204, 255, 0.08)' : 'transparent',
                  borderBottom: isActive ? '2px solid var(--color-holo-cyan)' : '2px solid transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
              >
                <div className="mono" style={{ fontSize: '0.65rem', color: isDone ? 'var(--color-holo-green)' : isActive ? 'var(--color-holo-cyan)' : 'var(--color-text-dim)' }}>
                  {isDone ? '✓ ' : isActive ? '▶ ' : ''}{\`PLAYER \${idx + 1}\`}
                </div>
                <div className="mono" style={{ fontSize: '0.8rem', color: isDone ? 'var(--color-holo-green)' : isActive ? 'var(--color-text-bright)' : 'var(--color-text-dim)', fontWeight: isActive ? 'bold' : 'normal' }}>
                  {shipNameForIdx}
                </div>
              </div>
            );
          })}
        </div>
      )}`;

// Find the start of old tabs and end of old tabs
const lines = c.split('\\n');
let tabStart = lines.findIndex(l => l.includes('Player Progress Tracker'));
let tabEnd = -1;
for (let i = tabStart; i < lines.length; i++) {
  if (lines[i].includes('</div>')) { 
    if (lines[i-1].includes(');') && lines[i-2].includes('})}')) {
      tabEnd = i + 1;
      break;
    }
  }
}

if (tabStart !== -1 && tabEnd !== -1) {
  lines.splice(tabStart, tabEnd - tabStart + 1, tabsCode);
  c = lines.join('\\n');
}

fs.writeFileSync(file, c);
