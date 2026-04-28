const fs = require('fs');
const file = 'src/components/setup/FleetBuilder.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Build the new handleFinish function
const newHandleFinish = `  const handleFinish = () => {
    // Save current draft
    saveCurrentDraft();

    // Find if there is any incomplete draft
    const allDrafts = [...drafts];
    allDrafts[currentPlayerIndex] = {
      chassisId: selectedChassisId,
      officers: selectedOfficers,
      weapons: selectedWeapons,
      subsystems: selectedSubsystems,
      shipName: customShipName,
    };

    const firstIncompleteIdx = allDrafts.findIndex(d => {
      const _c = d.chassisId ? getChassisById(d.chassisId) : null;
      const hasOffs = ['helm', 'tactical', 'engineering', 'sensors'].every(st => d.officers[st]);
      const hasMods = d.weapons.length >= 1 && (!_c || d.weapons.length + d.subsystems.length === _c.weaponSlots + _c.internalSlots);
      return !(d.chassisId && hasOffs && hasMods);
    });

    if (firstIncompleteIdx !== -1) {
      // Jump to the incomplete player
      handleTabClick(firstIncompleteIdx);
      return;
    }

    // All complete, build final players and ships
    const finalPlayers: any[] = [];
    const finalShips: any[] = [];

    allDrafts.forEach((draft, idx) => {
      const chassis = getChassisById(draft.chassisId as string)!;
      const pId = \`p\${idx + 1}\`;
      const sId = \`s\${idx + 1}\`;

      const stations: ('helm'|'tactical'|'engineering'|'sensors')[] = ['helm', 'tactical', 'engineering', 'sensors'];
      const officers = stations.map(station => ({
        officerId: draft.officers[station],
        station,
        currentStress: 0,
        currentTier: 'rookie',
        isLocked: false,
        lockDuration: 0,
        traumas: [],
        hasFumbledThisRound: false,
        actionsPerformedThisRound: 0,
      }));

      let startPos = { q: 0, r: 0 };
      let startFacing = 0; // HexFacing.Fore is 0
      
      if (scenarioConfig && scenarioConfig.playerSpawns[idx]) {
          const spawn = scenarioConfig.playerSpawns[idx];
          startPos = spawn.coord;
          startFacing = spawn.facing;
      }

      finalShips.push({
        id: sId,
        name: draft.shipName || \`ISS \${chassis.name} \${idx > 0 ? idx + 1 : ''}\`.trim(),
        chassisId: chassis.id,
        ownerId: pId,
        position: startPos,
        facing: startFacing,
        currentSpeed: 1,
        currentHull: chassis.baseHull,
        maxHull: chassis.baseHull,
        shields: {
          fore: chassis.shieldsPerSector, foreStarboard: chassis.shieldsPerSector, aftStarboard: chassis.shieldsPerSector,
          aft: chassis.shieldsPerSector, aftPort: chassis.shieldsPerSector, forePort: chassis.shieldsPerSector,
        },
        maxShieldsPerSector: chassis.shieldsPerSector,
        equippedWeapons: draft.weapons,
        equippedSubsystems: draft.subsystems,
        criticalDamage: [],
        scars: [],
        armorDie: chassis.armorDie,
        baseEvasion: chassis.baseEvasion,
        evasionModifiers: 0,
        isDestroyed: false,
        hasDroppedBelow50: false,
        hasDrifted: false,
        targetLocks: [],
      });

      finalPlayers.push({
          id: pId,
          name: \`Player \${idx + 1}\`,
          shipId: sId,
          commandTokens: chassis.ctGeneration,
          maxCommandTokens: chassis.ctGeneration,
          assignedActions: [],
          officers,
      });
    });

    if (isCampaignSetup && onCampaignStart) {
        onCampaignStart(finalPlayers[0].id, finalPlayers, finalShips, campaignDifficulty, campaignBudget);
        return;
    }

    let config: any;
    if (scenarioConfig) {
        const combinedSpawns = [
            ...(scenarioConfig.enemies || []).map(e => ({ ...e, isAllied: false })),
            ...(scenarioConfig.allies || []).map(a => ({ ...a, isAllied: true }))
        ];

        const mappedEnemies = combinedSpawns.map((e, idx) => {
            // Need to require ADVERSARIES or assume it's imported.
            // In the file it's ADVERSARIES
            const adv = ADVERSARIES.find(a => a.id === e.adversaryId) || ADVERSARIES[0];
            return {
                id: \`e\${idx + 1}\`,
                name: adv.name,
                adversaryId: adv.id,
                position: e.coord,
                facing: e.facing,
                currentSpeed: adv.speed,
                currentHull: adv.hull,
                maxHull: adv.hull,
                baseEvasion: adv.baseEvasion,
                armorDie: adv.armorDie,
                shields: {
                    fore: adv.shieldsPerSector, foreStarboard: adv.shieldsPerSector,
                    aftStarboard: adv.shieldsPerSector, aft: adv.shieldsPerSector,
                    aftPort: adv.shieldsPerSector, forePort: adv.shieldsPerSector,
                },
                maxShieldsPerSector: adv.shieldsPerSector,
                criticalDamage: [],
                isDestroyed: false,
                hasDroppedBelow50: false,
                hasDrifted: false,
                targetLocks: [],
                isAllied: e.isAllied,
            };
        });

        config = {
            scenarioId: 'custom-scenario',
            maxRounds: 8,
            terrain: scenarioConfig.terrain,
            players: finalPlayers,
            playerShips: finalShips,
            enemyShips: mappedEnemies,
        };
    } else {
        // Default Skirmish
        const enemy = ADVERSARIES[0];
        const enemyShip = {
          id: 'e1',
          name: enemy.name,
          adversaryId: enemy.id,
          position: { q: 9, r: -9 },
          facing: 3, // HexFacing.Aft
          currentSpeed: enemy.speed,
          currentHull: enemy.hull,
          maxHull: enemy.hull,
          baseEvasion: enemy.baseEvasion,
          armorDie: enemy.armorDie,
          shields: {
            fore: enemy.shieldsPerSector, foreStarboard: enemy.shieldsPerSector,
            aftStarboard: enemy.shieldsPerSector, aft: enemy.shieldsPerSector,
            aftPort: enemy.shieldsPerSector, forePort: enemy.shieldsPerSector,
          },
          maxShieldsPerSector: enemy.shieldsPerSector,
          criticalDamage: [],
          isDestroyed: false,
          hasDroppedBelow50: false,
          hasDrifted: false,
          targetLocks: [],
        };

        config = {
          scenarioId: 'skirmish-1',
          maxRounds: 8,
          terrain: [],
          players: finalPlayers,
          playerShips: finalShips,
          enemyShips: [enemyShip],
        };
    }

    initializeGame(config);
    if (onSkirmishStart) onSkirmishStart();
  };`;

const lines = c.split('\\n');
let start = lines.findIndex(l => l.includes('const handleFinish = () => {'));
let end = lines.findIndex((l, i) => i > start && l.trim() === '};' && lines[i-1].includes('if (onSkirmishStart) onSkirmishStart();'));

if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1, newHandleFinish);
  c = lines.join('\\n');
}

// Update the Launch Mission button text and disabled state.
const launchButtonCode = `              <button
                className="btn btn--execute"
                disabled={isCampaignSetup && !!dpBreakdown?.isOverBudget}
                onClick={handleFinish}
                data-testid="launch-btn"
                title={isCampaignSetup && dpBreakdown?.isOverBudget ? \`Over DP budget by \${dpBreakdown ? dpBreakdown.total - campaignBudget : 0} DP — remove items to proceed\` : undefined}
              >
                {(() => {
                  const firstIncompleteIdx = drafts.findIndex((d, i) => {
                    const dft = i === currentPlayerIndex ? { chassisId: selectedChassisId, officers: selectedOfficers, weapons: selectedWeapons, subsystems: selectedSubsystems } : d;
                    const _c = dft.chassisId ? getChassisById(dft.chassisId) : null;
                    const hasOffs = ['helm', 'tactical', 'engineering', 'sensors'].every(st => dft.officers[st]);
                    const hasMods = dft.weapons.length >= 1 && (!_c || dft.weapons.length + dft.subsystems.length === _c.weaponSlots + _c.internalSlots);
                    return !(dft.chassisId && hasOffs && hasMods);
                  });
                  
                  return firstIncompleteIdx !== -1 ? (firstIncompleteIdx === currentPlayerIndex ? 'INCOMPLETE SETUP' : 'NEXT PLAYER') : 'LAUNCH MISSION';
                })()}
              </button>`;

const oldLaunchBtn = `              <button
                className="btn btn--execute"
                disabled={!hasAllModules || (isCampaignSetup && !!dpBreakdown?.isOverBudget)}
                onClick={handleFinish}
                data-testid="launch-btn"
                title={isCampaignSetup && dpBreakdown?.isOverBudget ? \`Over DP budget by \${dpBreakdown ? dpBreakdown.total - campaignBudget : 0} DP — remove items to proceed\` : undefined}
              >
                {scenarioConfig && currentPlayerIndex < scenarioConfig.playerSpawns.length - 1 ? 'NEXT PLAYER' : 'LAUNCH MISSION'}
              </button>`;

c = c.replace(oldLaunchBtn, launchButtonCode);

fs.writeFileSync(file, c);
