const fs = require('fs');
const glob = require('fs').readdirSync('src/store').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

function replaceInFile(path, search, replace) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(search, replace);
  fs.writeFileSync(path, content);
}

replaceInFile('src/engine/ai/fighterAI.ts', /faction === 'enemy'/g, "faction === 'hegemony'");
replaceInFile('src/engine/ai/fighterAI.ts', /faction:\s*'enemy'/g, "faction: 'hegemony'");

for(const f of glob) {
  let p = 'src/store/' + f;
  replaceInFile(p, /kind: 'ship',\s*faction: 'player',\s*kind: 'ship',\s*faction: 'player',/g, "kind: 'ship', faction: 'player',");
  replaceInFile(p, /kind: 'ship',\s*faction: 'hegemony',\s*kind: 'ship',\s*faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
  replaceInFile(p, /kind: 'ship',\r?\n\s*faction: 'player',\r?\n\s*kind: 'ship',\s*faction: 'player',/g, "kind: 'ship', faction: 'player',");
  replaceInFile(p, /kind: 'ship',\r?\n\s*faction: 'hegemony',\r?\n\s*kind: 'ship',\s*faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
  
  // weaponBypass.test.ts specific
  replaceInFile(p, /kind: 'ship', faction: 'player',\s*kind: 'ship', faction: 'player',/g, "kind: 'ship', faction: 'player',");
  
  // actionTargeting.test.ts specific
  replaceInFile(p, /kind: 'ship', faction: 'player',\s*kind: 'ship', faction: 'player',/g, "kind: 'ship', faction: 'player',");
  replaceInFile(p, /kind: 'ship', faction: 'hegemony',\s*kind: 'ship', faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
}

replaceInFile('src/engine/ai/fighterPiercing.test.ts', /kind: 'ship', faction: 'hegemony',\s*kind: 'ship', faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
