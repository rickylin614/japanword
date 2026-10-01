const fs=require('node:fs'),path=require('node:path');
for(const level of ['n3','n4','n5']){
 const file=path.join(__dirname,level+'.html');
 const old=fs.readFileSync(file,'utf8');
 const options=[...old.matchAll(/<label><input type="radio" name="questionType"[^>]+>[^<]+<\/label>/g)].map(m=>m[0].replaceAll(' -> ',' → ').replaceAll('原型','原形').replaceAll('型','形'));
 if(options.length!==(level==='n3'?10:9))throw Error('Missing legacy question types');
 fs.writeFileSync(file,`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${level.toUpperCase()} 動詞測驗｜日語練習室</title><link rel="stylesheet" href="learning.css"></head>
<body data-level="${level}"><a class="skip" href="#main">跳到主要內容</a>
<main id="main" class="page"><div class="container practice"><p class="eyebrow">VERB PRACTICE / ${level.toUpperCase()}</p><h1>${level.toUpperCase()} 動詞測驗</h1><p class="subtitle">練習讀音、動詞變化與情境辨析。輸入答案後按 Enter；留空可看答案。</p>
<fieldset class="panel legacy-modes"><legend>選擇題型</legend><div class="options-area">${options.join('\n')}</div></fieldset>
<section class="question-area panel"><p id="status" class="muted" role="status">題庫載入中…</p><h2 id="question" class="question" lang="ja">題目載入中...</h2><label for="answer">你的答案</label><input type="text" id="answer" placeholder="輸入答案；留空按 Enter 看答案" onkeydown="handleKeyPress(event)" autocomplete="off"><div class="actions"><button class="primary primary-btn" onclick="checkAnswer()">提交</button><button onclick="loadQuestion()">下一題</button><button onclick="speakText()">🔊 發音</button></div></section>
<section class="result-area panel"><p id="feedback" aria-live="polite"></p><p id="explanation" aria-live="polite"></p><div class="last-correct-box"><strong>上一次正確的題目和答案</strong><p id="last-correct">尚無記錄</p></div></section></div></main>
<footer class="footer">每天一點，讓日文成為日常。<br><a href="layout.html">學習總覽</a> · <a href="sources.html">N2 題庫來源</a></footer>
<script src="quiz.js"></script><script src="legacy-navigation.js"></script></body></html>\n`);
}
