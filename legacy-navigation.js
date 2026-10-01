/* Shared visual shell for existing quizzes. CSV loading and grading stay in quiz.js. */
(function () {
  const current=document.body.dataset.level;
  const header=document.createElement('header');header.className='site-header';
  header.innerHTML=`<div class="header-inner"><a class="brand" href="layout.html">日語練習室<small>JAPANESE STUDY / N2 – N5</small></a><nav class="nav-links" aria-label="主要導覽"><a href="layout.html">學習總覽</a><a href="n2-nouns.html">N2 詞彙</a><a href="grammar.html?level=${current}">文法題庫</a><button id="legacy-theme" aria-label="切換深淺主題">切換主題</button></nav></div>`;
  document.body.prepend(header);
  const nav=document.createElement('nav');nav.className='inline-nav';nav.setAttribute('aria-label','動詞等級與分類');
  nav.innerHTML=`${['n5','n4','n3'].map(l=>`<a href="${l}.html" ${l===current?'aria-current="page"':''}>${l.toUpperCase()} 動詞</a>`).join('')}<a href="n2-verbs.html">N2 動詞詞彙</a>${current!=='n5'?`<a href="${current}-nouns.html">${current.toUpperCase()} 名詞</a><a href="${current}-adjectives.html">形容詞</a><a href="${current}-others.html">其餘詞性</a>`:''}`;
  document.querySelector('.legacy-modes').before(nav);
  const syncTheme=()=>{document.documentElement.dataset.theme=document.body.dataset.theme==='dark'?'dark':'light';};
  document.getElementById('legacy-theme').onclick=()=>{toggleTheme();syncTheme();};
  syncTheme();new MutationObserver(syncTheme).observe(document.body,{attributes:true,attributeFilter:['data-theme']});
  const answerAudio=document.createElement('button');answerAudio.type='button';answerAudio.textContent='🔊 聽答案發音';answerAudio.hidden=true;
  document.querySelector('.result-area').appendChild(answerAudio);
  const feedback=document.getElementById('feedback');
  new MutationObserver(()=>{answerAudio.hidden=!feedback.textContent;}).observe(feedback,{childList:true,characterData:true,subtree:true});
  function say(text){
    if(!('speechSynthesis' in window)){document.getElementById('status').textContent='此瀏覽器不支援語音朗讀。';return;}
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang='ja-JP';utterance.rate=.85;
    const voice=window.speechSynthesis.getVoices().find(v=>/^ja(?:-|_)/i.test(v.lang));if(voice)utterance.voice=voice;
    utterance.onerror=e=>{if(!['canceled','interrupted'].includes(e.error))document.getElementById('status').textContent='無法播放日文語音，請確認裝置有可用的日文語音。';};
    window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
  }
  answerAudio.onclick=()=>{if(currentQuestion)say(currentQuestion.answers[0]);};
})();
