const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('Build succeeded!');
} catch (e) {
  const output = e.stdout.toString();
  const lines = output.split('\n');
  const edits = {};
  
  for (const line of lines) {
    const match = line.match(/^src\/(?:store|engine)\/.*?\.test\.tsx?\((\d+),\d+\): error (TS\d+): (.*)/);
    if (match) {
      const file = line.split('(')[0];
      const lineNum = parseInt(match[1]) - 1; // 0-indexed
      const errorMsg = match[3];
      if (!edits[file]) edits[file] = [];
      edits[file].push({ line: lineNum, errorMsg });
    }
  }
  
  for (const file of Object.keys(edits)) {
    if (!fs.existsSync(file)) continue;
    let contentLines = fs.readFileSync(file, 'utf8').split('\n');
    let modified = false;
    
    // Reverse sort to not mess up line numbers if we added lines (though we are modifying in place)
    const sortedEdits = edits[file].sort((a,b) => b.line - a.line);
    
    for (const edit of sortedEdits) {
      const l = edit.line;
      if (l >= 0 && l < contentLines.length) {
        if (edit.errorMsg.includes("missing the following properties from type 'ShipState': kind, faction")) {
           contentLines[l] = contentLines[l].replace('{', "{ kind: 'ship', faction: 'player',");
           modified = true;
        } else if (edit.errorMsg.includes("missing the following properties from type 'EnemyShipState': kind, faction")) {
           contentLines[l] = contentLines[l].replace('{', "{ kind: 'ship', faction: 'hegemony',");
           modified = true;
        } else if (edit.errorMsg.includes("'allegiance' does not exist")) {
           contentLines[l] = contentLines[l].replace(/allegiance:\s*'[^']+',/g, "");
           modified = true;
        } else if (edit.errorMsg.includes("missing in type") && edit.errorMsg.includes("but required in type 'FighterToken'")) {
           contentLines[l] = contentLines[l].replace('{', "{ kind: 'fighter', faction: 'player',");
           modified = true;
        } else if (edit.errorMsg.includes("An object literal cannot have multiple properties with the same name")) {
           contentLines[l] = contentLines[l].replace(/kind:\s*'[^']+',\s*kind:\s*'[^']+',/g, "kind: 'ship',");
           contentLines[l] = contentLines[l].replace(/faction:\s*'[^']+',\s*faction:\s*'[^']+',/g, "faction: 'player',");
           modified = true;
        } else if (edit.errorMsg.includes("'kind' is specified more than once")) {
           contentLines[l] = contentLines[l].replace(/kind:\s*'[^']+',\s*kind:\s*'[^']+',/g, "kind: 'ship',");
           modified = true;
        } else if (edit.errorMsg.includes("'faction' is specified more than once")) {
           contentLines[l] = contentLines[l].replace(/faction:\s*'[^']+',\s*faction:\s*'[^']+',/g, "faction: 'player',");
           modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, contentLines.join('\n'));
      console.log('Fixed ' + file);
    }
  }
}
