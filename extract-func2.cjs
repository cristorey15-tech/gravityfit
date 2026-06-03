const fs = require('fs');
const c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find renderFatigueWidget boundaries
const startMarker = '  renderFatigueWidget() {';
const start = c.indexOf(startMarker);
const endMarker = '\n  showMuscleDetail(';
const end = c.indexOf(endMarker, start);

if (start === -1 || end === -1) {
  console.log('Could not find boundaries:', start, end);
  process.exit(1);
}

const func = c.slice(start, end);

// Create a test file (as .mjs to use ESM import syntax check)
const testCode = `
const Storage = { getUser: () => ({}), getWorkouts: () => [] };
const AICoach = { getMuscleFatigue: () => ({}), getMuscleExercises: () => [] };
const Modal = { show: () => {} };
const HomeScreen = {};
${func}
HomeScreen.renderFatigueWidget();
`;

fs.writeFileSync('_test-func.mjs', testCode);
console.log('Written _test-func.mjs (' + testCode.length + ' chars)');
