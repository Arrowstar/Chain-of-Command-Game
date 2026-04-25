const fs = require('fs');

const path = 'c:/Users/Adam/Dropbox/Documents/homework/Personal Projects/Chain of Command Game/app/src/store/useGameStore.ts';
let t = fs.readFileSync(path, 'utf8');

// The original file is UTF-8 but the contents got double encoded.
// Let's decode it by converting string -> buffer (latin1, which preserves the bytes) -> string (utf8)
const buf = Buffer.from(t, 'latin1');
const decoded = buf.toString('utf8');

fs.writeFileSync(path, decoded, 'utf8');

console.log("Decoded successfully!");
