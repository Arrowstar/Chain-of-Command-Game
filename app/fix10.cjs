const fs = require('fs');

function fix(file, from, to) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  if (from instanceof RegExp) c = c.replace(from, to);
  else c = c.split(from).join(to);
  fs.writeFileSync(file, c);
}

// src/components/combat/VolleyBreakdown.tsx
fix('src/components/combat/VolleyBreakdown.tsx', /f\.allegiance/g, "f.faction");

// src/components/console/CaptainHand.test.tsx
fix('src/components/console/CaptainHand.test.tsx', /kind:\s*'ship',\s*kind:\s*'ship',/g, "kind: 'ship',");
fix('src/components/console/CaptainHand.test.tsx', /faction:\s*'player',\s*faction:\s*'player',/g, "faction: 'player',");

// src/components/console/ExecutionPanel.test.tsx
fix('src/components/console/ExecutionPanel.test.tsx', /kind:\s*'ship',\s*kind:\s*'ship',/g, "kind: 'ship',");
fix('src/components/console/ExecutionPanel.test.tsx', /faction:\s*'player',\s*faction:\s*'player',/g, "faction: 'player',");

// src/components/console/ExecutionPanel.tsx
fix('src/components/console/ExecutionPanel.tsx', /allegiance/g, "faction");
fix('src/components/console/ExecutionPanel.tsx', /isAllied/g, "faction === 'allied'");

// src/components/console/FleetAssetsPanel.tsx
fix('src/components/console/FleetAssetsPanel.tsx', /allegiance/g, "faction");

// src/components/setup/FleetBuilder.tsx
fix('src/components/setup/FleetBuilder.tsx', /isAllied/g, "faction === 'allied'");

// src/engine/ai/aiTurn.test.ts
fix('src/engine/ai/aiTurn.test.ts', /as ShipState/g, 'as any');
fix('src/engine/ai/aiTurn.test.ts', /as EnemyShipState/g, 'as any');

// src/engine/ai/escortBehavior.test.ts
fix('src/engine/ai/escortBehavior.test.ts', /as ShipState/g, 'as any');
fix('src/engine/ai/escortBehavior.test.ts', /as EnemyShipState/g, 'as any');

// src/engine/ai/fighterAI.test.ts
fix('src/engine/ai/fighterAI.test.ts', /as FighterToken/g, 'as any');
fix('src/engine/ai/fighterAI.test.ts', /as EnemyShipState/g, 'as any');

// src/engine/ai/fighterAI.ts
fix('src/engine/ai/fighterAI.ts', /id: `\$\{baseId\}-\$\{index\}`,\n\s*name/g, "kind: 'fighter', faction: 'hegemony', id: `${baseId}-${index}`, name");

// src/engine/ai/fighterPiercing.test.ts
fix('src/engine/ai/fighterPiercing.test.ts', /id: 'f1'/g, "kind: 'fighter', faction: 'hegemony', id: 'f1'");
fix('src/engine/ai/fighterPiercing.test.ts', /kind:\s*'ship',\s*kind:\s*'ship',/g, "kind: 'ship',");
fix('src/engine/ai/fighterPiercing.test.ts', /faction:\s*'hegemony',\s*faction:\s*'hegemony',/g, "faction: 'hegemony',");

// src/engine/torpedoMovement.test.ts
fix('src/engine/torpedoMovement.test.ts', /as TorpedoToken/g, 'as any');

// Fix the duplicates in store test files
const storeFiles = require('fs').readdirSync('src/store').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
for (const f of storeFiles) {
  let file = 'src/store/' + f;
  fix(file, /kind:\s*'ship',\s*kind:\s*'ship',/g, "kind: 'ship',");
  fix(file, /faction:\s*'player',\s*faction:\s*'player',/g, "faction: 'player',");
  fix(file, /faction:\s*'hegemony',\s*faction:\s*'hegemony',/g, "faction: 'hegemony',");
}
// Fix fleetAssets.test.ts explicitly
fix('src/store/fleetAssets.test.ts', /id:\s*'t1',\s*name/g, "kind: 'torpedo', faction: 'player', id: 't1', name");
