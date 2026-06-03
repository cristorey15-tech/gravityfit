const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Show exact char codes for line 523, last 10 chars
const line = lines[522]; // 0-indexed
console.log('Line 523 length:', line.length);
console.log('Last 10 chars:');
for (let i = line.length - 10; i < line.length; i++) {
  console.log(`  [${i}] code=${line.charCodeAt(i)} char=${JSON.stringify(line[i])}`);
}

// Also check line 520 which has the SVG open tag
const line520 = lines[519];
console.log('\nLine 520:');
for (let i = line520.length - 5; i < line520.length; i++) {
  console.log(`  [${i}] code=${line520.charCodeAt(i)} char=${JSON.stringify(line520[i])}`);
}

// Check if the backView has the same issue
const line575 = lines[574];
console.log('\nLine 575 last 10 chars:');
for (let i = line575.length - 10; i < line575.length; i++) {
  console.log(`  [${i}] code=${line575.charCodeAt(i)} char=${JSON.stringify(line575[i])}`);
}
