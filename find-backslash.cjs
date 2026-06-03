const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Check all lines in the renderFatigueWidget for backslash characters
// that might cause issues
for (let i = 452; i < 600 && i < lines.length; i++) {
  const line = lines[i];
  // Look for backslash chars
  const hasBackslash = line.includes('\\');
  if (hasBackslash) {
    console.log(`Line ${i+1} has backslash: ${JSON.stringify(line.slice(0, 100))}`);
  }
}
console.log('\nDone scanning');
