(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const labels = { nouns: '名詞', adjectives: '形容詞', others: '其餘詞性' };
  const page = document.body.dataset.page || 'home';
  const level = ['n3','n4','n5'].includes(document.body.dataset.level) ? document.body.dataset.level : 'n3';
  const category = document.body.dataset.category;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let persistent = true;
  let state = { favorites: [], answers: {}, sessions: {} };
  try {
    const saved = JSON.parse(localStorage.getItem('jp-learning-v1') || 'null');
    if (saved && Array.isArray(saved.favorites) && saved.answers && typeof saved.answers === 'object' && saved.sessions && typeof saved.sessions === 'object') state = saved;
    document.documentElement.dataset.theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  } catch { persistent = false; }
  function save() {
    try { localStorage.setItem('jp-learning-v1', JSON.stringify(state)); }
    catch { persistent = false; }
    if (!persistent && $('storage-note')) $('storage-note').textContent = '瀏覽器未開放儲存空間，本次進度只能保留到離開頁面。';
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) { $('audio-note').textContent = '此瀏覽器不支援語音朗讀。'; return; }
    $('audio-note').textContent = '';
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = window.speechSynthesis.getVoices().find(voice => /^ja(?:-|_)/i.test(voice.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = 'ja-JP'; utterance.rate = .85;
    utterance.onerror = event => { if (!['canceled','interrupted'].includes(event.error)) $('audio-note').textContent = '無法播放日文語音，請確認裝置有可用的日文語音。'; };
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
  }
  const allGrammar = Object.values(window.JP_GRAMMAR).flat();
  document.body.innerHTML = `<a class="skip" href="#main">跳到主要內容</a><header class="site-header"><div class="header-inner"><a class="brand" href="layout.html">日語練習室<small>JAPANESE STUDY / N3 – N5</small></a><nav class="nav-links" aria-label="主要導覽"><a href="layout.html" ${page==='home'?'aria-current="page"':''}>學習總覽</a><a href="n3-nouns.html" ${page==='vocabulary'?'aria-current="page"':''}>詞彙練習</a><a href="grammar.html" ${page==='grammar'?'aria-current="page"':''}>文法題庫</a><button id="theme" aria-label="切換深淺主題">切換主題</button></nav></div></header><p id="audio-note" class="audio-note" role="status"></p><main id="main" class="page"></main><footer class="footer">每天一點，讓日文成為日常。<br>原創學習教材；分級為練習安排，非官方 JLPT 試題。<p id="storage-note" role="status"></p></footer>`;
  $('theme').onclick = () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { persistent = false; save(); }
  };
  save();
  function stats(bank) {
    const done = bank.filter(q => state.answers[q.id]);
    return { done: done.length, correct: done.filter(q => state.answers[q.id].correct).length, wrong: done.filter(q => !state.answers[q.id].correct).length };
  }
  function home() {
    const total = stats(allGrammar);
    $('main').innerHTML = `<section class="hero"><div><p class="eyebrow">YOUR DAILY JAPANESE PRACTICE</p><h1>一步一步，把日文練熟。</h1><p class="subtitle">從詞彙到句型，依照自己的步調練習。選擇等級開始，或回到錯題，把不熟悉的地方再練一次。</p><div class="stats"><div class="stat"><strong>315</strong><span>文法情境題</span></div><div class="stat"><strong>${Object.values(window.JP_VOCABULARY).flatMap(categories=>Object.values(categories)).reduce((total,bank)=>total+bank.length,0)}</strong><span>分類詞彙條目</span></div><div class="stat"><strong>${total.done}</strong><span>已練文法題</span></div><div class="stat"><strong>${total.wrong}</strong><span>待複習錯題</span></div></div></div><div class="hero-mark" lang="ja" aria-hidden="true">学</div></section><div class="section-head"><h2>選擇學習等級</h2><span class="muted">基礎 → 進階</span></div><div class="grid">${['n5','n4','n3'].map(l=>`<section class="card"><span class="tag">${l==='n5'?'建立基礎':l==='n4'?'累積實力':'活用表達'}</span><h2>${l.toUpperCase()}</h2><p class="muted">${l==='n5'?'助詞、基本句型與日常表達':l==='n4'?'經驗、計畫、建議與複句':'語意辨析、推論與進階句型'}</p><div class="links"><a class="button primary" href="grammar.html?level=${l}">文法練習 · ${window.JP_GRAMMAR[l].length} 題</a><a class="button" href="${l}.html">動詞變化與情境測驗</a>${l!=='n5'?Object.entries(labels).map(([c,t])=>`<a class="button" href="${l}-${c}.html">${t} · ${window.JP_VOCABULARY[l][c].length} 詞</a>`).join(''): '<p class="muted">N5 先從既有動詞與基礎文法開始。</p>'}</div></section>`).join('')}</div><section class="panel" style="margin-top:24px"><h2>練習方式</h2><p>詞彙頁可搜尋、收藏、練讀音或中文。文法以 10 題、20 題或全題練習；答題後顯示解析，錯題可另外重練。</p><p class="muted">完成狀態、收藏與未完成的文法練習保存在此瀏覽器；切換頁面後仍可繼續。文法統計以每題最近一次作答為準。</p></section>`;
  }
  function vocabulary() {
    const bank = window.JP_VOCABULARY[level]?.[category] || [];
    $('main').innerHTML = `<p class="eyebrow">VOCABULARY / ${level.toUpperCase()}</p><h1>${level.toUpperCase()} ${labels[category]}</h1><p class="subtitle">共 ${bank.length} 詞 · 看讀音、記意思，建立自己的收藏清單。其餘詞性收錄副詞、接續詞與常用表現；N4 包含基礎複習，N3 包含進階與易混淆詞。</p><nav class="inline-nav" aria-label="詞彙分類">${['n3','n4'].flatMap(l=>Object.entries(labels).map(([c,t])=>`<a href="${l}-${c}.html" ${l===level&&c===category?'aria-current="page"':''}>${l.toUpperCase()} ${t}</a>`)).join('')}</nav><div class="toolbar"><label class="grow">搜尋詞彙<input id="search" type="search" placeholder="日文、假名、中文或詞性"></label><label>顯示範圍<select id="scope"><option value="all">全部詞彙</option><option value="favorites">只看收藏</option></select></label><label>練習題型<select id="word-mode"><option value="reading">漢字 → 假名</option><option value="meaning">日文 → 中文</option></select></label><button id="word-start" class="primary">練習目前詞彙</button></div><p id="word-count" role="status"></p><div id="word-list" class="word-grid"></div><section id="word-practice" class="panel practice" hidden></section>`;
    let filtered = [], session = null;
    function draw() {
      const term = $('search').value.normalize('NFKC').trim().toLowerCase();
      filtered = bank.filter(w => ($('scope').value !== 'favorites' || state.favorites.includes(w.id)) && [w.word,w.reading,w.meaning,w.pos].some(t=>t.normalize('NFKC').toLowerCase().includes(term)));
      $('word-count').textContent = `顯示 ${filtered.length} / ${bank.length} 詞`;
      $('word-start').disabled = !filtered.length;
      $('word-list').innerHTML = filtered.length ? filtered.map(w=>`<article class="word-card"><span class="tag">${w.pos}</span><h2 lang="ja">${w.word}</h2><p class="muted" lang="ja">${w.reading}</p><p>${w.meaning}</p><div class="word-actions"><button class="favorite" data-favorite="${w.id}" aria-pressed="${state.favorites.includes(w.id)}">${state.favorites.includes(w.id)?'★ 已收藏':'☆ 收藏'}<span class="sr-label" hidden>${w.word}</span></button><button data-speak="${w.id}" aria-label="朗讀 ${w.word}">朗讀</button></div></article>`).join('') : '<p class="empty">沒有符合條件的詞彙，試試其他搜尋字或切回全部。</p>';
    }
    $('word-list').onclick = event => {
      const button = event.target.closest('button'); if (!button) return;
      const id = button.dataset.favorite || button.dataset.speak;
      const word = bank.find(w=>w.id===id); if (!word) return;
      if (button.dataset.speak) speak(word.reading);
      else { state.favorites = state.favorites.includes(id) ? state.favorites.filter(x=>x!==id) : [...state.favorites,id]; save(); draw(); const replacement = document.querySelector(`[data-favorite="${id}"]`); if (replacement) replacement.focus(); }
    };
    function stop() { session = null; $('word-practice').hidden = true; $('word-list').hidden = false; $('word-start').focus(); }
    $('search').oninput = () => { if (session) stop(); draw(); };
    $('scope').onchange = () => { if (session) stop(); draw(); };
    $('word-mode').onchange = () => { if (session) stop(); };
    $('word-start').onclick = () => { session = { items: shuffle(filtered), index:0, correct:0, mode:$('word-mode').value }; $('word-list').hidden = true; $('word-practice').hidden = false; wordQuestion(); };
    function wordQuestion() {
      const panel = $('word-practice');
      if (session.index === session.items.length) { panel.innerHTML = `<h2>詞彙練習完成</h2><p>答對 ${session.correct} / ${session.items.length} 題。</p><button id="word-close">返回詞彙清單</button>`; $('word-close').onclick = stop; $('word-close').focus(); return; }
      const word = session.items[session.index];
      const meaning = session.mode === 'meaning';
      const options = shuffle([word.meaning,...shuffle([...new Set(bank.filter(w=>w.meaning!==word.meaning).map(w=>w.meaning))]).slice(0,3)]);
      panel.innerHTML = `<div class="quiz-top"><span class="tag">${session.index+1} / ${session.items.length}</span><button id="word-close">返回清單</button></div><h2 class="question" lang="ja">${word.word}</h2><button id="word-prompt-speech" type="button">🔊 聽單字發音</button><p>${meaning?'選出正確中文意思。':'請輸入假名讀音（平假名或片假名皆可）。'}</p>${meaning?`<div class="options">${options.map((x,i)=>`<button class="option" data-meaning="${i}">${x}</button>`).join('')}</div>`:'<form id="reading-form"><label for="reading-answer">假名讀音</label><input id="reading-answer" type="text" autocomplete="off"><div class="actions"><button class="primary" type="submit">提交答案</button><button id="reveal" type="button">看答案</button></div></form>'}<div id="word-feedback" role="status"></div><button id="word-next" hidden class="primary" style="margin-top:16px">下一題</button>`;
      let answered = false;
      function answer(correct, revealed) {
        if (answered) return; answered = true; if (correct) session.correct++;
        panel.querySelectorAll('.option, #reading-form button, #reading-answer').forEach(el=>el.disabled=true);
        $('word-feedback').innerHTML = `<div class="feedback"><strong>${revealed?'已顯示答案':correct?'答對了！':'再記一次'}</strong><p lang="ja">${word.word}（${word.reading}）</p><p>${word.meaning}</p><button id="word-speech">朗讀答案</button></div>`;
        $('word-speech').onclick = () => speak(word.reading); $('word-next').hidden = false; $('word-next').focus();
      }
      $('word-prompt-speech').onclick = () => speak(word.reading);
      $('word-close').onclick = stop;
      if (meaning) panel.querySelectorAll('[data-meaning]').forEach(button=>button.onclick=()=>answer(options[button.dataset.meaning]===word.meaning,false));
      else {
        const input = $('reading-answer');
        input.onkeydown = event => { if(event.key==='Enter'&&(event.isComposing||event.keyCode===229||event.repeat))event.preventDefault(); };
        $('reading-form').onsubmit = event => { event.preventDefault(); if (!input.value.trim()) { input.focus(); return; } answer(normalizeReading(input.value)===normalizeReading(word.reading),false); };
        $('reveal').onclick = () => answer(false,true); input.focus();
      }
      $('word-next').onclick = () => { session.index++; wordQuestion(); };
      if (meaning) panel.querySelector('.option').focus();
    }
    draw();
  }
  function shuffle(items) { const array = [...items]; for(let i=array.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } return array; }
  function normalizeReading(value) { return value.normalize('NFKC').trim().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)); }
  function grammar() {
    const param = new URLSearchParams(location.search).get('level');
    let currentLevel = ['n3','n4','n5'].includes(param) ? param : 'n5';
    let session = null;
    function menu() {
      session = null;
      const bank = window.JP_GRAMMAR[currentLevel], progress = stats(bank);
      const saved = state.sessions[currentLevel];
      const canResume = saved && Array.isArray(saved.ids) && saved.ids.length && saved.ids.every(id=>bank.some(q=>q.id===id)) && Number.isInteger(saved.index) && saved.index>=0 && saved.index<saved.ids.length && Array.isArray(saved.results) && saved.results.length===saved.index;
      $('main').innerHTML = `<div class="practice"><p class="eyebrow">GRAMMAR PRACTICE</p><h1>文法練習題庫</h1><p class="subtitle">每級 105 道不同情境，包含選項、句型提示與解析。請依提示選擇最符合語意的答案。</p><section class="panel"><div class="toolbar"><label>學習等級<select id="grammar-level">${['n5','n4','n3'].map(l=>`<option value="${l}" ${l===currentLevel?'selected':''}>${l.toUpperCase()} · 105 題</option>`).join('')}</select></label><label>每輪題數<select id="size"><option value="10">10 題</option><option value="20">20 題</option><option value="105">全部 105 題</option></select></label><label>出題範圍<select id="grammar-scope"><option value="all">全部題目</option><option value="new">尚未練習</option><option value="wrong">錯題重練（${progress.wrong} 題）</option></select></label></div><div class="stats"><div class="stat"><strong>${progress.done} / 105</strong><span>已練題數</span></div><div class="stat"><strong>${progress.correct}</strong><span>最近一次答對</span></div><div class="stat"><strong>${progress.wrong}</strong><span>待複習</span></div></div><div class="actions"><button id="start" class="primary">開始練習</button>${canResume?`<button id="resume">繼續上次 · 已完成 ${saved.index} / ${saved.ids.length} 題</button>`:''}</div><p id="empty-pool" role="status"></p><p class="muted">開始新的一輪會取代此等級尚未完成的練習；累積答題紀錄保留。</p></section><div class="section-head"><h2>這個等級練什麼？</h2></div><p class="muted">${[...new Set(bank.map(q=>q.hint))].map(esc).join(' · ')}</p></div>`;
      $('grammar-level').onchange = event => { currentLevel = event.target.value; try { history.replaceState(null,'',`?level=${currentLevel}`); } catch {} menu(); };
      $('start').onclick = () => {
        const scope = $('grammar-scope').value;
        const pool = bank.filter(q=>scope==='all'||(scope==='new'?!state.answers[q.id]:state.answers[q.id]&&!state.answers[q.id].correct));
        if (!pool.length) { $('empty-pool').textContent = scope==='wrong'?'目前沒有錯題，可以選擇全部題目繼續練習。':'這個等級已全部練過，可選擇全部題目再次練習。'; return; }
        session = { ids:shuffle(pool).slice(0,Number($('size').value)).map(q=>q.id), index:0, results:[] };
        state.sessions[currentLevel] = session; save(); question();
      };
      if (canResume) $('resume').onclick = () => { session = saved; question(); };
    }
    function question() {
      if (session.index >= session.ids.length) { summary(); return; }
      const q = window.JP_GRAMMAR[currentLevel].find(item=>item.id===session.ids[session.index]);
      const options = shuffle(q.options);
      $('main').innerHTML = `<div class="practice"><div class="quiz-top"><span class="tag">${currentLevel.toUpperCase()} 文法 · ${session.index+1} / ${session.ids.length}</span><button id="exit">儲存並返回</button></div><progress class="progress" value="${session.index}" max="${session.ids.length}" aria-label="本輪完成進度"></progress><section class="panel"><p class="muted">${esc(q.hint)}</p><h1 class="question" id="sentence" lang="ja" tabindex="-1">${esc(q.sentence)}</h1><button id="question-speech">🔊 聽題目（空格不揭答）</button><div class="options" style="margin-top:16px">${options.map((x,i)=>`<div class="audio-choice"><button class="option" data-choice="${i}" lang="ja"><span>${i+1}</span>${esc(x)}</button><button class="listen-option" data-listen="${i}" aria-label="朗讀選項 ${i+1}：${esc(x)}">🔊</button></div>`).join('')}</div><div class="actions"><button id="reveal">看答案（列入待複習）</button></div><div id="feedback" role="status"></div><div class="actions"><button id="next" class="primary" hidden>${session.index+1===session.ids.length?'查看本輪結果':'下一題'}</button></div></section></div>`;
      let answered = false;
      $('exit').onclick = () => { save(); menu(); };
      $('question-speech').onclick = () => speak(q.sentence.replace('【　】','、空欄、'));
      document.querySelectorAll('[data-listen]').forEach(button => button.onclick = () => speak(options[button.dataset.listen]));
      function answer(choice) {
        if (answered) return; answered = true;
        const correct = choice === q.answer;
        session.results.push({id:q.id,correct}); session.index++;
        state.answers[q.id] = {correct}; save();
        document.querySelectorAll('[data-choice]').forEach(button=>{
          const text = options[button.dataset.choice]; button.disabled = true;
          if(text===q.answer) button.classList.add('correct');
          else if(text===choice) button.classList.add('incorrect');
        });
        $('reveal').disabled = true;
        $('feedback').innerHTML = `<div class="feedback ${correct?'':'bad'}"><strong>${choice===null?'已顯示答案 · 已加入待複習':correct?'答對了！':'答錯了 · 已加入待複習'}</strong><p>正確答案：<b lang="ja">${esc(q.answer)}</b></p><p lang="ja">${esc(q.sentence.replace('【　】',q.answer))}</p><p>${esc(q.explanation)}</p><button id="speech">朗讀完整句子</button></div>`;
        $('speech').onclick = () => speak(q.sentence.replace('【　】',q.answer));
        $('next').hidden=false; $('next').focus();
      }
      document.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>answer(options[button.dataset.choice]));
      $('reveal').onclick=()=>answer(null);
      $('next').onclick=question;
      $('sentence').focus();
    }
    function summary() {
      const results = session.results, wrong = results.filter(r=>!r.correct);
      delete state.sessions[currentLevel]; save();
      const review = wrong.length ? '<h2>本輪複習清單</h2>' + wrong.map(r => {
        const q = window.JP_GRAMMAR[currentLevel].find(q => q.id === r.id);
        return `<div class="feedback"><p lang="ja">${esc(q.sentence.replace('【　】',q.answer))}</p><p>${esc(q.explanation)}</p><button data-review-speech="${q.id}">🔊 朗讀完整句子</button></div>`;
      }).join('') : '<p>全部答對！可以挑戰更多題目或另一個等級。</p>';
      $('main').innerHTML = `<div class="practice panel"><p class="eyebrow">SESSION COMPLETE / ${currentLevel.toUpperCase()}</p><h1 tabindex="-1" id="complete">這一輪，完成了。</h1><div class="summary-number">${results.length-wrong.length} / ${results.length}</div><p>本輪答對 ${Math.round((results.length-wrong.length)/results.length*100)}% · ${wrong.length} 題需要再複習</p><div class="actions"><button class="primary" id="again">返回練習設定</button>${wrong.length?'<button id="retry">重練本輪錯題</button>':''}<a class="button" href="layout.html">學習總覽</a></div>${review}</div>`;
      document.querySelectorAll('[data-review-speech]').forEach(button=>button.onclick=()=>{const q=window.JP_GRAMMAR[currentLevel].find(q=>q.id===button.dataset.reviewSpeech);speak(q.sentence.replace('【　】',q.answer));});
      $('again').onclick=menu;
      if(wrong.length) $('retry').onclick=()=>{session={ids:shuffle(wrong.map(r=>r.id)),index:0,results:[]};state.sessions[currentLevel]=session;save();question();};
      $('complete').focus();
    }
    menu();
  }
  if(page==='vocabulary') vocabulary(); else if(page==='grammar') grammar(); else home();
})();

