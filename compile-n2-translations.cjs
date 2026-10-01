const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,words=JSON.parse(fs.readFileSync(path.join(root,'sources/n2-verified.json'),'utf8'));
const translations={},indexes=new Set();
for(const file of fs.readdirSync(path.join(root,'sources')).filter(f=>/^zh-\d+\.txt$/.test(f))){
 for(const line of fs.readFileSync(path.join(root,'sources',file),'utf8').trim().split(/\r?\n/)){
  const match=line.match(/^(\d+) (.+)$/);assert.ok(match,line);const index=Number(match[1]);assert.ok(words[index]);assert.ok(!indexes.has(index),'Duplicate index '+index);indexes.add(index);translations[words[index].jmdictId]=match[2];
 }
}
assert.equal(indexes.size,words.length,'Every accepted word needs a reviewed Chinese gloss');
fs.writeFileSync(path.join(root,'sources/n2-zh.json'),JSON.stringify(translations,null,2));
console.log('Chinese gloss coverage:',indexes.size,'/',words.length);
