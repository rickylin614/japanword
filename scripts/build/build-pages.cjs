const { ROOT_DIR: PROJECT_ROOT, PUBLIC_DIR, resolveFile } = require('../lib/paths.cjs');
const fs = require('node:fs');
const path = require('node:path');
const root=PROJECT_ROOT;
function page(file, title, data) {
  fs.writeFileSync(resolveFile(file), `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="N1、N2、N3、N4、N5 日語詞彙與文法練習，附繁體中文解析與錯題複習。"><title>${title}｜日語練習室</title><link rel="stylesheet" href="learning.css"><script defer src="grammar-data.js"></script><script defer src="vocabulary-data.js"></script><script defer src="n1-data.js"></script><script defer src="n2-data.js"></script><script defer src="n3-data.js"></script><script defer src="n4-data.js"></script><script defer src="n5-data.js"></script><script defer src="learning.js"></script></head><body ${data}><main><h1>${title}</h1><p>載入練習內容中…</p><noscript>請啟用 JavaScript 使用互動練習。</noscript></main></body></html>\n`);
  const vocabularyLevel = data.includes('data-page="vocabulary"') && data.match(/data-level="(n[12345])"/)?.[1];
  const favoritePage=data.includes('data-page="favorites"');
  const examplesFiles=(favoritePage?['n5','n4','n3','n2','n1']:vocabularyLevel?[vocabularyLevel]:[]).map(l=>l+'-examples.js').filter(file=>fs.existsSync(resolveFile(file)));
  if (examplesFiles.length) {
    const target = resolveFile( file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('<script defer src="learning.js">', examplesFiles.map(file=>`<script defer src="${file}"></script>`).join('')+'<script defer src="learning.js">'));
  }
  const audioLevels=vocabularyLevel?[vocabularyLevel]:favoritePage||/data-page="grammar(?:-overview)?"/.test(data)?['n5','n4','n3','n2','n1']:[];
  const audioTags=audioLevels.map(level=>level+'-example-audio.js').filter(file=>fs.existsSync(resolveFile(file))).map(file=>`<script defer src="${file}"></script>`).join('');
  if(audioTags){const target=resolveFile(file);fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('<script defer src="learning.js">',audioTags+'<script defer src="learning.js">'));}
  if(fs.existsSync(resolveFile('word-audio.js'))){const target=resolveFile(file);fs.writeFileSync(target,fs.readFileSync(target,'utf8').replace('<script defer src="learning.js">','<script defer src="word-audio.js"></script><script defer src="learning.js">'));}
}
// Conversation data is loaded before the shared page renderer only where needed.
function conversationPage(file, title, category) {
  page(file, title, `data-page="conversation" data-category="${category}"`);
  const target = resolveFile( file);
  fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('<script defer src="learning.js">', '<script defer src="conversation-data.js"></script>'+(category==='aizuchi'?'<script defer src="aizuchi-audio.js"></script>':'')+'<script defer src="learning.js">'));
}
conversationPage('aizuchi.html', '相づち・常用回應 100 句', 'aizuchi');
conversationPage('gitaigo.html', '擬態語・常用詞彙與例句 100 組', 'gitaigo');
page('index.html','學習總覽','data-page="home"');
page('layout.html','學習總覽','data-page="home"');
page('favorites.html','已收藏單字','data-page="favorites"');
page('grammar.html','文法練習題庫','data-page="grammar"');
for (const level of ['n3','n4']) for(const [category,label] of Object.entries({nouns:'名詞',verbs:'動詞',i_adjectives:'い形容詞',na_adjectives:'な形容詞',adjectives:'形容詞（合併瀏覽）',others:'其餘詞性'})) page(`${level}-${category}.html`,`${level.toUpperCase()} ${label}`,`data-page="vocabulary" data-level="${level}" data-category="${category}"`);
for (const level of ['n3','n4','n5']) {
  const file = resolveFile(`${level}.html`);
  let html = fs.readFileSync(file,'utf8');
  if(!html.includes('legacy-navigation.js')) html=html.replace('</body>','<script src="legacy-navigation.js"></script>\n</body>');
  if(fs.existsSync(resolveFile('word-audio.js'))&&!html.includes('word-audio.js'))html=html.replace('</head>','<script defer src="word-audio.js"></script></head>');
  html=html.replace('<script src="legacy-navigation.js">','<script defer src="legacy-navigation.js">');
  fs.writeFileSync(file,html);
}

for(const [category,label] of Object.entries({nouns:"名詞",verbs:"動詞",i_adjectives:"い形容詞",na_adjectives:"な形容詞",others:"副詞等其他詞彙"})) page(`n2-${category}.html`,`N2 ${label}`,`data-page="vocabulary" data-level="n2" data-category="${category}"`);

for(const [category,label] of Object.entries({nouns:'名詞',verbs:'動詞',i_adjectives:'い形容詞',na_adjectives:'な形容詞',others:'其餘詞性'})) page('n5-'+category+'.html','N5 '+label,'data-page="vocabulary" data-level="n5" data-category="'+category+'"');

for(const [category,label] of Object.entries({nouns:'名詞',verbs:'動詞',i_adjectives:'い形容詞',na_adjectives:'な形容詞',others:'其餘詞性'})) page('n1-'+category+'.html','N1 '+label,'data-page="vocabulary" data-level="n1" data-category="'+category+'"');

page('grammar-overview.html','文法彙整','data-page="grammar-overview"');

require('./build-shell.cjs')();
