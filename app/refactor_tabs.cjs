const fs = require('fs');
const file = 'src/components/setup/FleetBuilder.tsx';
let c = fs.readFileSync(file, 'utf8');

const regex = /\{\/\*.*Player Progress Tracker.*\*\/\}[\\s\\S]*?\{\/\*.*Active Player Banner.*\*\/\}/;
const tabsCode = `      {/* ─ Player Progress Tracker ─ */}
      {totalPlayers > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.3)' }}>
          {Array.from({ length: totalPlayers }).map((_, idx) => {
            const isActive = idx === currentPlayerIndex;
            
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
      )}

      {/* ─ Active Player Banner (only shown during officer/module steps) ─ */}`;

c = c.replace(regex, tabsCode);
fs.writeFileSync(file, c);
