const {PUBLIC_DIR, resolveFile, assetUrl} = require('../lib/paths.cjs');
const fs = require('node:fs');
function attachShell() {
  for (const name of fs.readdirSync(PUBLIC_DIR).filter(n=>n.endsWith('.html'))) {
    const file = resolveFile(name);
    let html = fs.readFileSync(file, 'utf8').replaceAll('JAPANESE STUDY / N2 – N5', 'JAPANESE STUDY / N1 – N5');
    if (!html.includes('rel="icon"')) html = html.replace('</head>', '<link rel="icon" href="favicon.ico" type="image/x-icon"></head>');
    if (!html.includes('shared-shell.css')) html = html.replace('</head>', '<link rel="stylesheet" href="shared-shell.css"></head>');
    if (!html.includes('interface.css')) html = html.replace('</head>', '<link rel="stylesheet" href="interface.css"></head>');
    if (!html.includes('shared-shell.js')) html = html.replace('</body>', '<script defer src="shared-shell.js"></script></body>');
    html = html.replace(/(src|href)=(["'])([^"'/]+\.(?:js|css|ico|png))\2/g, (full,attr,q,name)=>attr+'='+q+assetUrl(name)+q);
    fs.writeFileSync(file, html);
  }
}
module.exports = attachShell;
if (require.main === module) attachShell();
