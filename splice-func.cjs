const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find old renderFatigueWidget boundaries
const startMarker = '  renderFatigueWidget() {';
const start = c.indexOf(startMarker);
if (start === -1) { console.log('renderFatigueWidget not found'); process.exit(1); }

// Find the matching closing: look for the next method definition
const afterStart = c.slice(start);
// Find the next method: showMuscleDetail or renderActiveProgram
const nextMethod1 = afterStart.indexOf('\n  showMuscleDetail(');
const nextMethod2 = afterStart.indexOf('\n  renderActiveProgram(');
const nextMethod = Math.min(
  nextMethod1 > 0 ? nextMethod1 : Infinity,
  nextMethod2 > 0 ? nextMethod2 : Infinity
);
if (nextMethod === Infinity) { console.log('Next method not found'); process.exit(1); }

const oldFunc = c.slice(start, start + nextMethod);
const oldLen = oldFunc.length;
console.log('Old function length:', oldLen);

// Read the new function (extract from the Obj wrapper)
const newFuncCode = fs.readFileSync('_new-fatigue.cjs', 'utf8');
// Extract just the renderFatigueWidget method (from 'renderFatigueWidget' to the closing '}')
const newStart = newFuncCode.indexOf('renderFatigueWidget');
const newFunc = newFuncCode.slice(newStart, -2); // Remove trailing '};\n'

// Replace in file
c = c.slice(0, start) + newFunc + c.slice(start + oldLen);

fs.writeFileSync('js/screens/home.js', c);
console.log('Replaced. New function length:', newFunc.length);
