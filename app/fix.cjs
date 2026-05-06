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
  content = content.replace(/const (\w+):\s*ShipState\s*=\s*\{/g, "const $1: ShipState = {\n    kind: 'ship', faction: 'player',");
  content = content.replace(/const (\w+):\s*EnemyShipState\s*=\s*\{/g, "const $1: EnemyShipState = {\n    kind: 'ship', faction: 'hegemony',");
  content = content.replace(/let (\w+):\s*ShipState\s*=\s*\{/g, "let $1: ShipState = {\n    kind: 'ship', faction: 'player',");
  content = content.replace(/let (\w+):\s*EnemyShipState\s*=\s*\{/g, "let $1: EnemyShipState = {\n    kind: 'ship', faction: 'hegemony',");
  // Also match variable without let/const if it has type annotation (like playerShip: ShipState = {) inside objects/arrays
  content = content.replace(/(\w+):\s*ShipState\s*=\s*\{/g, "$1: ShipState = {\n    kind: 'ship', faction: 'player',");
  
  // Specific fix for EnemyShipState without let/const
  content = content.replace(/(\w+):\s*EnemyShipState\s*=\s*\{/g, "$1: EnemyShipState = {\n    kind: 'ship', faction: 'hegemony',");
  
  // Clean up potential duplicate kind/factions if ran multiple times
  content = content.replace(/kind: 'ship', faction: 'player',\n\s*kind: 'ship', faction: 'player',/g, "kind: 'ship', faction: 'player',");
  
  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
