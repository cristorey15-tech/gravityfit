const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Show lines 518-530 with exact content
for (let i = 517; i < 535 && i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trimEnd();
  console.log(`L${i+1} [${trimmed.length}]: ${JSON.stringify(trimmed)}`);
}
