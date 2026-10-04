const fs=require('node:fs'),path=require('node:path');
function attachShell(){
  for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.html'))){
    const file=path.join(__dirname,name);let html=fs.readFileSync(file,'utf8');
    if(!html.includes('href="shared-shell.css"'))html=html.replace('</head>','<link rel="stylesheet" href="shared-shell.css"></head>');
    if(!html.includes('src="shared-shell.js"'))html=html.replace('</body>','<script defer src="shared-shell.js"></script></body>');
    fs.writeFileSync(file,html);
  }
}
module.exports=attachShell;
if(require.main===module)attachShell();
