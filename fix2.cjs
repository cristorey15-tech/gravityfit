const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Fix: change bodyOutline('...Z\")") to bodyOutline('...Z')
// The issue is a stray \" that should be ' to close the single-quoted string
const fixed = c.replace(/Z\\\"\)\\"/g, "Z')}");
const count = (c.match(/Z\\\\"\)\\"/g) || []).length;
console.log('Fixed', count, 'occurrences');
console.log('Changes made:', c !== fixed);
fs.writeFileSync('js/screens/home.js', fixed);
