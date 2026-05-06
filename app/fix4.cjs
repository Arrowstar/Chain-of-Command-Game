const fs = require('fs');
const glob = require('fs').readdirSync('src/store').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const f of glob) {
  const file = 'src/store/' + f;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  content = content.replace(/\{\s*kind:\s*'ship',\s*faction:\s*'player',\s*\{/g, "{ kind: 'ship', faction: 'player',");
  content = content.replace(/\{\s*kind:\s*'ship',\s*faction:\s*'hegemony',\s*\{/g, "{ kind: 'ship', faction: 'hegemony',");
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed double brace in ' + file);
  }
}
