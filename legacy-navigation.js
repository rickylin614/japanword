/* 保留原有動詞測驗；只補上共用入口與窄螢幕修正。 */
(function () {
  const current = document.body.dataset.level;
  const nav = document.createElement('nav');
  nav.className = 'learning-navigation'; nav.setAttribute('aria-label','學習頁面切換');
  nav.innerHTML = `<a href="layout.html">← 學習總覽</a><a href="grammar.html?level=${current}">${current.toUpperCase()} 文法</a>${current!=='n5'?`<a href="${current}-nouns.html">名詞</a><a href="${current}-adjectives.html">形容詞</a><a href="${current}-others.html">其餘詞性</a>`:''}<label>動詞等級 <select aria-label="切換動詞等級">${['n5','n4','n3'].map(l=>`<option value="${l}.html" ${l===current?'selected':''}>${l.toUpperCase()}</option>`).join('')}</select></label>`;
  const style = document.createElement('style');
  style.textContent = `.learning-navigation{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:16px}.learning-navigation a,.learning-navigation label{box-sizing:border-box;min-height:44px;padding:10px 12px;border-radius:8px;background:var(--card-bg);color:var(--text-color);text-decoration:none;border:1px solid var(--border-color);font-size:14px}.learning-navigation select{font:inherit;padding:4px;background:var(--input-bg);color:var(--input-text)}.learning-navigation a:focus-visible{outline:3px solid #e29c38}.header-area{flex-wrap:wrap;gap:12px}.container{max-width:760px;width:calc(100% - 32px)}input[type=text]{box-sizing:border-box;max-width:100%;min-height:44px}.primary-btn,.theme-toggle{min-height:44px}#question{overflow-wrap:anywhere}@media(max-width:480px){.container{padding:18px;margin:16px auto}.question-area{padding:12px}input[type=text]{width:100%}.options-area label{min-height:44px;box-sizing:border-box}}`;
  document.head.appendChild(style);
  document.querySelector('.container').prepend(nav);
  nav.querySelector('select').onchange=event=>{ location.href=event.target.value; };
  const answerAudio = document.createElement('button');
  answerAudio.type = 'button'; answerAudio.textContent = '🔊 聽答案發音';
  answerAudio.className = 'primary-btn'; answerAudio.hidden = true;
  document.querySelector('.result-area').appendChild(answerAudio);
  const feedback = document.getElementById('feedback');
  new MutationObserver(()=>{answerAudio.hidden=!feedback.textContent;}).observe(feedback,{childList:true,characterData:true,subtree:true});
  answerAudio.onclick = () => {
    if (!currentQuestion) return;
    if (!('speechSynthesis' in window)) {document.getElementById('status').textContent='此瀏覽器不支援語音朗讀。';return;}
    const utterance = new SpeechSynthesisUtterance(currentQuestion.answers[0]);
    utterance.lang='ja-JP';utterance.rate=.85;
    const voice=window.speechSynthesis.getVoices().find(voice=>/^ja(?:-|_)/i.test(voice.lang));
    if(voice)utterance.voice=voice;
    utterance.onerror=event=>{if(!['canceled','interrupted'].includes(event.error))document.getElementById('status').textContent='無法播放日文語音，請確認裝置有可用的日文語音。';};
    window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
  };
})();
