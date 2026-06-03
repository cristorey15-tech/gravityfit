const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Find the problematic pattern: bodyOutline('...Z')"} 
// The " after ) is inside ${} expression and is invalid JS
// We need to change it to just )}

// The actual file has: bodyOutline('...Z')"} 
// We need:           bodyOutline('...Z')}
// i.e., remove the stray " before }

const count1 = (c.match(/Z'\)\\"}/g) || []).length;
console.log('Pattern Z\')\\"} found:', count1);

// Replace pattern: ')"} -> ')}
c = c.replace(/Z'\)\\"}/g, "Z')}");

const count2 = (c.match(/Z'\)\\"}/g) || []).length;
console.log('Pattern Z\')\\"} after fix:', count2);

fs.writeFileSync('js/screens/home.js', c);
console.log('File saved');
