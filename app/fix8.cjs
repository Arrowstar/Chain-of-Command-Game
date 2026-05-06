const fs = require('fs');

const testFiles = require('fs').readdirSync('src/store').filter(f => f.endsWith('.test.ts'));
for(const f of testFiles) {
  let file = 'src/store/' + f;
  let c = fs.readFileSync(file, 'utf8');
  let orig = c;
  
  c = c.replace(/\{\s*id:\s*['"]s1['"],\s*name:/g, "{ kind: 'ship', faction: 'player', id: 's1', name:");
  c = c.replace(/\{\s*id:\s*['"]e1['"],\s*name:/g, "{ kind: 'ship', faction: 'hegemony', id: 'e1', name:");
  c = c.replace(/\{\s*id:\s*['"]t1['"],\s*name:/g, "{ kind: 'ship', faction: 'player', id: 't1', name:");
  c = c.replace(/\{\s*id:\s*['"]t2['"],\s*name:/g, "{ kind: 'ship', faction: 'player', id: 't2', name:");
  
  // Specific for massiveStoreEdgeCases
  c = c.replace(/playerShips:\s*\[\s*\{\s*id:\s*['"]s2['"]/g, "playerShips: [{ kind: 'ship', faction: 'player', id: 's2'");

  if (c !== orig) fs.writeFileSync(file, c);
}

const aiDir = require('fs').readdirSync('src/engine/ai').filter(f => f.endsWith('.test.ts'));
for (const f of aiDir) {
  let file = 'src/engine/ai/' + f;
  let c = fs.readFileSync(file, 'utf8');
  let orig = c;
  
  c = c.replace(/as ShipState/g, "as any");
  c = c.replace(/as EnemyShipState/g, "as any");
  
  if (c !== orig) fs.writeFileSync(file, c);
}
