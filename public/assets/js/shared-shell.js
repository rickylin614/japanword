/* Shared sticky navigation and return-to-top controls. Native details support keyboard use. */
(function () {
  try { document.documentElement.dataset.theme=localStorage.getItem('theme')==='dark'?'dark':'light'; } catch {}
  if(document.body.dataset.supplement&&!document.querySelector('.site-header')){const h=document.createElement('header');h.className='site-header';h.innerHTML='<div class="header-inner"><a class="brand" href="layout.html">日語練習室<small>JAPANESE STUDY / N1 – N5</small></a><nav class="nav-links" aria-label="主要導覽"></nav></div>';document.body.prepend(h);}
  const header=document.querySelector('.site-header');
  if(header){
    header.classList.add('frozen-header');
    const nav=header.querySelector('.nav-links');
    if(nav){
      const theme=nav.querySelector('button');
      nav.replaceChildren();
      const home=document.createElement('a');home.href='layout.html';home.textContent='學習總覽';nav.append(home);
      const favorites=document.createElement('a');favorites.href='favorites.html';favorites.textContent='已收藏';if(location.pathname.endsWith('/favorites.html'))favorites.setAttribute('aria-current','page');nav.append(favorites);
      const tree=document.createElement('details');tree.className='study-menu';tree.id='study-menu';
      const labels={nouns:'名詞',verbs:'動詞詞彙',i_adjectives:'い形容詞',na_adjectives:'な形容詞',others:'其餘詞性'};
      tree.innerHTML=`<summary>學習選單</summary><div class="study-tree"><ul>${['n5','n4','n3','n2','n1'].map(l=>`<li><details class="level-branch"><summary>${l.toUpperCase()}</summary><ul>${`<li><a href="grammar.html?level=${l}">文法練習 · 500 題</a></li><li><a href="grammar-overview.html?level=${l}">文法彙整 · 句型與例句</a></li>`}<li><details><summary>詞彙分類</summary><ul>${Object.entries(labels).map(([c,name])=>`<li><a href="${l}-${c}.html">${name}</a></li>`).join('')}</ul></details></li>${['n3','n4','n5'].includes(l)?`<li><a href="${l}.html">動詞變化與情境測驗</a></li>`:''}</ul></details></li>`).join('')}<li><a href="grammar-overview.html">全部文法彙整</a></li><li><a href="50.html">五十音練習</a></li><li><a href="sources.html">查看來源與實際詞量</a></li></ul></div>`;
      tree.querySelector('.study-tree > ul').insertAdjacentHTML('afterbegin', '<li><a href="aizuchi.html">相づち · 100 句</a></li><li><a href="gitaigo.html">擬態語 · 100 組</a></li>');
      nav.append(tree);
      if(theme)nav.append(theme);
      else {const b=document.createElement('button');b.textContent='切換主題';b.onclick=()=>{const v=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=v;try{localStorage.setItem('theme',v);}catch{}};nav.append(b);}
      const close=()=>{tree.open=false;};
      document.addEventListener('click',e=>{if(!tree.contains(e.target))close();});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&tree.open){close();tree.querySelector('summary').focus();}});
      tree.addEventListener('focusout',()=>setTimeout(()=>{if(!tree.contains(document.activeElement))close();},0));
      tree.querySelectorAll('a').forEach(a=>{if(new URL(a.href).pathname===location.pathname&&new URL(a.href).search===location.search)a.setAttribute('aria-current','page');});
    }
    const resize=()=>document.documentElement.style.setProperty('--sticky-header-height',header.getBoundingClientRect().height+'px');
    resize();new ResizeObserver(resize).observe(header);
  }
  const end=document.createElement('div');end.className='return-top';
  const button=document.createElement('button');button.type='button';button.id='back-to-top';button.textContent='↑ TOP · 回到頂端';
  button.onclick=()=>{window.scrollTo({top:0,behavior:'instant'});const target=header?.querySelector('.brand')||document.querySelector('h1');if(target){if(!target.matches('a,button'))target.tabIndex=-1;target.focus({preventScroll:true});}};
  end.append(button);document.body.append(end);
})();
