const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app-final.js', 'utf8');
const enh = fs.readFileSync('enhancement.js', 'utf8');

console.log("HTML has destWordCloud?", html.includes('id="destWordCloud"'));
console.log("enhancement.js has renderDestWordCloud?", enh.includes('renderDestWordCloud'));

// test if syntax is ok
