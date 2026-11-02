const {spawnSync}=require('node:child_process');
const path=require('node:path');
const steps=[['build-grammar.cjs'],['build-verbs.cjs'],...['n5','n4','n3','n2','n1'].map(l=>['build-vocabulary-examples.cjs',l]),['build-pages.cjs'],['create-sources.cjs'],['write-example-audit.cjs']];
for(const [name,...args] of steps){const r=spawnSync(process.execPath,[path.join(__dirname,name),...args],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
