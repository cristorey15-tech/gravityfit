const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// The bodyOutline calls have: bodyOutline('...Z")
// They should be:            bodyOutline('...Z')
// The " (code 34) before ) should be ' (code 39)
// We find all bodyOutline calls ending with Z") and fix them

const pattern = /bodyOutline\('([^']+)Z"\)/g;
const matches = [...c.matchAll(pattern)];
console.log('Found', matches.length, 'bodyOutline calls to fix');

c = c.replace(pattern, "bodyOutline('$1Z')");

fs.writeFileSync('js/screens/home.js', c);
console.log('Fixed and saved');
