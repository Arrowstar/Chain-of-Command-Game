const fs = require('fs');
const glob = require('fs').readdirSync('src/store').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const f of glob) {
  const file = 'src/store/' + f;
  let content = fs.readFileSync(file, 'utf8');
  
  // Find objects that look like ships
  content = content.replace(/(\{\s*id:\s*['"]([seps\d]+)['"],\s*name:\s*['"].*?['"],\s*(?:chassisId|ownerId):)/g, "{ kind: 'ship', faction: 'player', $1".replace('$1', "$1"));
  content = content.replace(/(\{\s*id:\s*['"]([seps\d]+)['"],\s*name:\s*['"].*?['"],\s*adversaryId:)/g, "{ kind: 'ship', faction: 'hegemony', $1".replace('$1', "$1"));

  // There are some 'as ShipState' objects that don't match exactly. Let's do a general pass for 'ShipState = {'
  content = content.replace(/ShipState\s*=\s*\{\s*id:/g, "ShipState = { kind: 'ship', faction: 'player', id:");
  content = content.replace(/EnemyShipState\s*=\s*\{\s*id:/g, "EnemyShipState = { kind: 'ship', faction: 'hegemony', id:");
  content = content.replace(/as ShipState/g, "as unknown as ShipState");
  content = content.replace(/as EnemyShipState/g, "as unknown as EnemyShipState");

  // Clean up duplicate kinds
  content = content.replace(/kind: 'ship',\s*faction: 'player',\s*kind: 'ship',\s*faction: 'player',/g, "kind: 'ship', faction: 'player',");
  content = content.replace(/kind: 'ship',\s*faction: 'hegemony',\s*kind: 'ship',\s*faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
  
  // Specific fix for combatEdgeCases.test.ts
  if (file.includes('combatEdgeCases')) {
    content = content.replace(/armorDie: 'none'/g, "armorDie: 'd4'");
    content = content.replace(/usedMethodicalThisRound: false, traumas: \[\] \}/g, "usedMethodicalThisRound: false, traumas: [], currentTier: 'veteran', isLocked: false, lockDuration: 0, hasFumbledThisRound: false }");
  }

  // specific fix for tacticEffects.test.ts
  if (file.includes('tacticEffects')) {
    content = content.replace(/kind: 'ship' as const,\s*faction: 'player' as const,\s*\.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'player'");
    content = content.replace(/kind: 'ship' as const,\s*faction: 'hegemony' as const,\s*\.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'hegemony'");
  }

  // specific fix for fleetAssets.test.ts torpedo
  if (file.includes('fleetAssets')) {
    content = content.replace(/allegiance: 'player',/g, "faction: 'player', kind: 'torpedo',");
  }

  fs.writeFileSync(file, content);
  console.log('Fixed ' + file);
}
