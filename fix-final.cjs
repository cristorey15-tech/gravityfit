const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Fix: bodyOutline('...Z") should be bodyOutline('...Z')
// The " (code 34) before ) should be ' (code 39)
// Only fix inside bodyOutline calls

let count = 0;
// Find bodyOutline('...Z") and fix to bodyOutline('...Z')
c = c.replace(/bodyOutline\('([^)]+)Z"\)/g, (match, path) => {
  count++;
  return `bodyOutline('${path}Z')`;
});

console.log('Fixed', count, 'bodyOutline calls');
fs.writeFileSync('js/screens/home.js', c);

// Verify
const check = fs.readFileSync('js/screens/home.js', 'utf8');
const checkCount = (check.match(/bodyOutline\('/g) || []).length;
console.log('Total bodyOutline calls:', checkCount);
