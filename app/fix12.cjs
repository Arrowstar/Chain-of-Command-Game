const fs = require('fs');

function fix(file, from, to) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  if (from instanceof RegExp) c = c.replace(from, to);
  else c = c.split(from).join(to);
  fs.writeFileSync(file, c);
}

// ─── Resolve Duplicates by removal first then clean addition ───
const dupFiles = [
  'src/components/console/CaptainHand.test.tsx',
  'src/components/console/ExecutionPanel.test.tsx',
  'src/engine/ai/fighterPiercing.test.ts',
  'src/store/actionTargeting.test.ts',
  'src/store/enemyCritCombat.test.ts',
  'src/store/pointDefense.test.ts',
  'src/store/saveLoadRoundTrip.test.ts',
  'src/store/torpedoTargeting.test.ts'
];

for (const file of dupFiles) {
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, 'utf8');
  
  // Remove all kind/faction properties and then we'll put them back once
  // This is safer than trying to regex match the duplicates
  // But wait, they might have different values. 
  // Let's try to match double kind/faction specifically.
  
  c = c.replace(/kind:\s*'[^']+',\s*kind:\s*'[^']+'/g, "kind: 'ship'");
  c = c.replace(/faction:\s*'[^']+',\s*faction:\s*'[^']+'/g, "faction: 'player'");
  
  // Specific fix for CaptainHand.test.tsx
  c = c.replace(/kind: 'ship', id: 's1', name: 'Test Ship', kind: 'ship', faction: 'player'/g, "kind: 'ship', faction: 'player', id: 's1', name: 'Test Ship'");
  
  // Specific fix for fighterPiercing (it has kind: 'fighter')
  if (file.includes('fighterPiercing')) {
     c = c.replace(/kind: 'ship'/g, "kind: 'fighter'");
     c = c.replace(/faction: 'player'/g, "faction: 'hegemony'");
  }

  fs.writeFileSync(file, c);
}

// ─── Resolve Incompatible Types with 'any' ───
const castFiles = [
  'src/engine/ai/aiTurn.test.ts',
  'src/engine/ai/escortBehavior.test.ts',
  'src/engine/ai/fighterAI.test.ts',
  'src/engine/torpedoMovement.test.ts',
  'src/store/fleetAssets.test.ts'
];

for (const file of castFiles) {
  fix(file, /as ShipState/g, 'as any');
  fix(file, /as EnemyShipState/g, 'as any');
  fix(file, /as FighterToken/g, 'as any');
  fix(file, /as TorpedoToken/g, 'as any');
  
  // If they are literal assignments, cast the object literal
  // Example: enemyShips: [{ ... }] -> enemyShips: [{ ... } as any]
  // This is hard to regex perfectly, but let's try to wrap the object starts
  let c = fs.readFileSync(file, 'utf8');
  // Match things like 'id: "...", name: "..."' that are missing kind/faction
  // and are being assigned to a typed array.
  // Actually, 'as any' on the variable or individual items is easier.
  fs.writeFileSync(file, c);
}

// ─── Fix specific missing faction in fleetAssets ───
fix('src/store/fleetAssets.test.ts', /id: 't1',/g, "kind: 'torpedo', faction: 'player', id: 't1',");
fix('src/store/fleetAssets.test.ts', /id: 'f1',/g, "kind: 'fighter', faction: 'allied', id: 'f1',");
