const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
function page(file, title, data) {
  fs.writeFileSync(path.join(root,file), `<!DOCTYPE html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="N3、N4、N5 日語詞彙與文法練習，附繁體中文解析與錯題複習。"><title>${title}｜日語練習室</title><link rel="stylesheet" href="learning.css"><script defer src="grammar-data.js"></script><script defer src="vocabulary-data.js"></script><script defer src="learning.js"></script></head><body ${data}><main><h1>${title}</h1><p>載入練習內容中…</p><noscript>請啟用 JavaScript 使用互動練習。</noscript></main></body></html>\n`);
}
page('index.html','學習總覽','data-page="home"');
page('layout.html','學習總覽','data-page="home"');
page('grammar.html','文法練習題庫','data-page="grammar"');
for (const level of ['n3','n4']) for(const [category,label] of Object.entries({nouns:'名詞',adjectives:'形容詞',others:'其餘詞性'})) page(`${level}-${category}.html`,`${level.toUpperCase()} ${label}`,`data-page="vocabulary" data-level="${level}" data-category="${category}"`);
for (const level of ['n3','n4','n5']) {
  const file = path.join(root,`${level}.html`);
  let html = fs.readFileSync(file,'utf8');
  if(!html.includes('legacy-navigation.js')) html=html.replace('</body>','<script src="legacy-navigation.js"></script>\n</body>');
  fs.writeFileSync(file,html);
}
