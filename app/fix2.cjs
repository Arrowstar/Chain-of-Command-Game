const fs = require('fs');

const files = [
  'src/store/massiveStoreEdgeCases.test.ts',
  'src/store/ordnance.test.ts',
  'src/store/phaseSlip.e2e.test.ts',
  'src/store/phaseSlip.test.ts',
  'src/store/pointDefense.test.ts',
  'src/store/roeEffects.test.ts',
  'src/store/roeRemoval.test.ts',
  'src/store/spoof_effects.test.ts',
  'src/store/subsystemEffects.test.ts',
  'src/store/tacticEffects.test.ts',
  'src/store/traumaEffects.test.ts',
  'src/store/useCampaignStore.test.ts',
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/playerShips:\s*\[\s*\{/g, "playerShips: [{ kind: 'ship', faction: 'player', ");
  content = content.replace(/enemyShips:\s*\[\s*\{/g, "enemyShips: [{ kind: 'ship', faction: 'hegemony', ");
  fs.writeFileSync(file, content);
  console.log('Fixed arrays in ' + file);
}
