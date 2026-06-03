const fs = require('fs');
let c = fs.readFileSync('js/screens/home.js', 'utf8');

// Count occurrences before
const before = c.split('\\"').length - 1;
console.log('Occurrences of \\" before:', before);

// Replace literal \" with " globally (these are inside template literals where " doesn't need escaping)
c = c.split('\\"').join('"');

const after = c.split('\\"').length - 1;
console.log('Occurrences of \\" after:', after);

fs.writeFileSync('js/screens/home.js', c);
console.log('File fixed successfully');
