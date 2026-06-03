const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find renderFatigueWidget more precisely
const marker = 'renderFatigueWidget() {';
const start = c.indexOf(marker);
const showMuscle = c.indexOf('showMuscleDetail(muscleName)');
if (start === -1) { console.log('renderFatigueWidget not found'); process.exit(1); }
if (showMuscle === -1) { console.log('showMuscleDetail not found'); process.exit(1); }

// Extract from renderFatigueWidget to just before showMuscleDetail
const func = c.slice(start, showMuscle);
// Find the last '},' before showMuscleDetail
const lastBrace = func.lastIndexOf('},');
const extracted = func.slice(0, lastBrace + 2);

// Wrap for syntax check
const wrapped = `const Obj = { ${extracted} };`;
fs.writeFileSync('_check.mjs', wrapped);
console.log('Written', wrapped.length, 'chars');
