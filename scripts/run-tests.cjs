const {spawnSync}=require('node:child_process');
const path=require('node:path');
const browser=process.argv[2]==='browser';
if(browser&&!process.env.PLAYWRIGHT_PATH){console.error('Set PLAYWRIGHT_PATH to the installed Playwright module before browser tests.');process.exit(1);}
const files=['test-verified.cjs','test-grammar.cjs','test-verbs.cjs','test-vocabulary-examples.cjs','test-n1-editorial.cjs','test-speech-inflections.cjs','test-conversation.cjs','test-example-audio.cjs','test-word-audio.cjs','test-learning.cjs',...(browser?['test-favorites.cjs']:[])];
const env={...process.env};if(!browser)delete env.PLAYWRIGHT_PATH;
for(const file of files){const r=spawnSync(process.execPath,[path.join(__dirname,'../tests',file)],{stdio:'inherit',env});if(r.status!==0)process.exit(r.status||1);}
