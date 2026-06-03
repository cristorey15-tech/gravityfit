const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Show lines 492-501 with exact char codes for any special chars
for (let i = 491; i < 502 && i < lines.length; i++) {
  const line = lines[i];
  const hasBackslash = line.split('').some(ch => ch === '\\');
  const hasBacktick = line.split('').some(ch => ch === '`');
  console.log(`L${i+1} [len=${line.length}] backslash=${hasBackslash} backtick=${hasBacktick}`);
  if (hasBackslash || hasBacktick) {
    // Show the exact chars around backslashes/backticks
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '\\' || line[j] === '`') {
        console.log(`  [${j}] code=${line.charCodeAt(j)} char=${JSON.stringify(line[j])} context=${JSON.stringify(line.slice(Math.max(0,j-3), j+4))}`);
      }
    }
  }
}
