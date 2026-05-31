const fs = require('fs');
const html = fs.readFileSync('n3.html', 'utf8');

const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
    console.log("Could not find script");
    process.exit(1);
}

fs.writeFileSync('test_script.js', match[1]);
