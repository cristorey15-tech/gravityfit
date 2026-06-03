const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');
const lines = c.split('\n');

// Show exact chars around line 523
const line = lines[522];
console.log('Line 523 length:', line.length);

// Show last 5 chars as char codes
for (let i = line.length - 5; i < line.length; i++) {
  console.log(`  [${i}] code=${line.charCodeAt(i)} char=${JSON.stringify(line[i])}`);
}

// Show what bodyOutline calls look like now
const boIdx = line.indexOf('bodyOutline');
if (boIdx >= 0) {
  console.log('\nbodyOutline call starts at:', boIdx);
  console.log('Ends with:', JSON.stringify(line.slice(-10)));
}

// Also check: are there any stray backslashes in the file?
const backslashLines = [];
lines.forEach((l, i) => {
  if (l.includes('\\') && l.includes('renderFatigueWidget') || 
      (i >= 488 && i <= 620 && l.includes('\\'))) {
    backslashLines.push(i + 1);
  }
});
console.log('\nLines with backslashes in fatigue widget:', backslashLines);
