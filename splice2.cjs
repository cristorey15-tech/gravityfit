const fs = require('fs');
const c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find the start of renderFatigueWidget
const funcStart = c.indexOf('  renderFatigueWidget() {');
if (funcStart === -1) { console.log('ERROR: renderFatigueWidget not found'); process.exit(1); }

// Find the end by counting braces
let braceCount = 0;
let funcEnd = -1;
let started = false;
for (let i = funcStart; i < c.length; i++) {
  if (c[i] === '{') { braceCount++; started = true; }
  if (c[i] === '}') { braceCount--; }
  if (started && braceCount === 0) {
    funcEnd = i + 1;
    break;
  }
}
if (funcEnd === -1) { console.log('ERROR: Could not find function end'); process.exit(1); }

// Make sure we include the trailing comma
while (funcEnd < c.length && c[funcEnd] !== '\n') funcEnd++;
funcEnd++; // include the newline

console.log('Old function: chars', funcStart, '-', funcEnd, '(' + (funcEnd - funcStart) + ' chars)');

// Read new function from the file
const newFuncRaw = fs.readFileSync('_new-fatigue.cjs', 'utf8');
// Extract: from "renderFatigueWidget() {" to the matching "}"
let newBraceCount = 0;
let newStart = newFuncRaw.indexOf('renderFatigueWidget() {');
let newEnd = -1;
let newStarted = false;
for (let i = newStart; i < newFuncRaw.length; i++) {
  if (newFuncRaw[i] === '{') { newBraceCount++; newStarted = true; }
  if (newFuncRaw[i] === '}') { newBraceCount--; }
  if (newStarted && newBraceCount === 0) {
    newEnd = i + 1;
    break;
  }
}
if (newEnd === -1) { console.log('ERROR: Could not find new function end'); process.exit(1); }

const newFunc = c.slice(0, funcStart).includes('  ') ? 
  '  ' + newFuncRaw.slice(newStart, newEnd) + ',\n' :
  newFuncRaw.slice(newStart, newEnd) + ',\n';

console.log('New function:', newFunc.length, 'chars');

const result = c.slice(0, funcStart) + newFunc + c.slice(funcEnd);
fs.writeFileSync('js/screens/home.js', result);
console.log('Done. Replaced', funcEnd - funcStart, 'chars with', newFunc.length, 'chars');
