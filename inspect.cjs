const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Get the exact bytes of line 523 (index 522)
const line = lines[522];
const last40 = line.slice(-40);
console.log('Last 40 chars of line 523:');
for (let i = 0; i < last40.length; i++) {
  console.log(`  [${i}] char=${JSON.stringify(last40[i])} code=${last40.charCodeAt(i)}`);
}
