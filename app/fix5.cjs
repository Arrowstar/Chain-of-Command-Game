const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
      callback(dirPath);
    }
  });
}

walkDir('src', function(file) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Add missing kinds
  content = content.replace(/(\{\s*id:\s*['"]([seps\d]+)['"],\s*name:\s*['"].*?['"],\s*(?:chassisId|ownerId):)/g, "{ kind: 'ship', faction: 'player', $1".replace('$1', "$1"));
  content = content.replace(/(\{\s*id:\s*['"]([seps\d]+)['"],\s*name:\s*['"].*?['"],\s*adversaryId:)/g, "{ kind: 'ship', faction: 'hegemony', $1".replace('$1', "$1"));
  
  content = content.replace(/ShipState\s*=\s*\{\s*id:/g, "ShipState = { kind: 'ship', faction: 'player', id:");
  content = content.replace(/EnemyShipState\s*=\s*\{\s*id:/g, "EnemyShipState = { kind: 'ship', faction: 'hegemony', id:");
  
  content = content.replace(/playerShips:\s*\[\s*\{/g, "playerShips: [{ kind: 'ship', faction: 'player', ");
  content = content.replace(/enemyShips:\s*\[\s*\{/g, "enemyShips: [{ kind: 'ship', faction: 'hegemony', ");

  content = content.replace(/as ShipState/g, "as unknown as ShipState");
  content = content.replace(/as EnemyShipState/g, "as unknown as EnemyShipState");

  // Fix allegiance -> faction, kind
  content = content.replace(/allegiance:\s*'player'/g, "faction: 'player'");
  content = content.replace(/allegiance:\s*'hegemony'/g, "faction: 'hegemony'");
  
  // Fix isAllied
  content = content.replace(/isAllied:\s*false/g, "faction: 'hegemony'");
  content = content.replace(/isAllied:\s*true/g, "faction: 'allied'");

  // Clean up duplicate kinds/factions
  content = content.replace(/kind: 'ship',\s*faction: 'player',\s*kind: 'ship',\s*faction: 'player',/g, "kind: 'ship', faction: 'player',");
  content = content.replace(/kind: 'ship',\s*faction: 'hegemony',\s*kind: 'ship',\s*faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");

  // specific fix for tacticEffects.test.ts (reverting my bad fix)
  if (file.includes('tacticEffects')) {
    content = content.replace(/kind: 'ship' as const,\s*faction: 'player' as const,\s*\.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'player'");
    content = content.replace(/kind: 'ship' as const,\s*faction: 'hegemony' as const,\s*\.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'hegemony'");
    content = content.replace(/kind: 'ship', faction: 'player', \.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'player'");
    content = content.replace(/kind: 'ship', faction: 'hegemony', \.\.\.updatedEnemy/g, "...updatedEnemy, kind: 'ship', faction: 'hegemony'");
  }

  // Double brace fix
  content = content.replace(/\{\s*kind:\s*'ship',\s*faction:\s*'player',\s*\{/g, "{ kind: 'ship', faction: 'player',");
  content = content.replace(/\{\s*kind:\s*'ship',\s*faction:\s*'hegemony',\s*\{/g, "{ kind: 'ship', faction: 'hegemony',");

  // Fix combatEdgeCases imports
  if (file.includes('combatEdgeCases')) {
    content = content.replace(/import \{.*?ShipState.*?\} from '\.\.\/types\/game';/g, "import type { PlayerState, ShipState, EnemyShipState, FighterToken } from '../types/game';");
    content = content.replace(/import type \{ PlayerState, ShipState, EnemyShipState \} from '\.\.\/types\/game';/g, "");
    content = content.replace(/players: \[\]/g, "players: [], maxRounds: null");
    content = content.replace(/commandTokens: 10/g, "commandTokens: 10, maxCommandTokens: 10");
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
  }
});
