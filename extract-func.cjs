const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find the renderFatigueWidget function and extract it
const start = c.indexOf('renderFatigueWidget() {');
const end = c.indexOf('\n  },\n  showMuscleDetail');
if (start === -1 || end === -1) { console.log('Could not find function boundaries', start, end); process.exit(1); }

const func = c.slice(start, end + 3);
// Wrap in object for syntax check
const wrapped = `const Obj = { ${func} };`;
fs.writeFileSync('_check.mjs', wrapped);
console.log('Extracted function, written to _check.mjs');
