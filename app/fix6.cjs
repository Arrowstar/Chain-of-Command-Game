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

  // Clean up duplicate kinds/factions specifically
  content = content.replace(/kind:\s*'ship',\s*faction:\s*'player',\s*kind:\s*'ship',\s*faction:\s*'player',/g, "kind: 'ship', faction: 'player',");
  content = content.replace(/kind:\s*'ship',\s*faction:\s*'hegemony',\s*kind:\s*'ship',\s*faction:\s*'hegemony',/g, "kind: 'ship', faction: 'hegemony',");
  
  // Clean up multiple identical lines if they were added on separate lines
  content = content.replace(/kind: 'ship', faction: 'player',\n\s*kind: 'ship', faction: 'player',/g, "kind: 'ship', faction: 'player',");
  content = content.replace(/kind: 'ship', faction: 'hegemony',\n\s*kind: 'ship', faction: 'hegemony',/g, "kind: 'ship', faction: 'hegemony',");

  // Fix torpedo token allegiance
  if (content.includes("allegiance: 'player',")) {
     content = content.replace(/allegiance:\s*'player',/g, "faction: 'player', kind: 'torpedo',");
  }

  // FighterTokens missing properties in tests
  content = content.replace(/as FighterToken/g, "as unknown as FighterToken");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
  }
});
