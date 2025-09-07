(function(){
  const feed = document.getElementById('feed');
  if (!feed) return;
  const endpoint = feed.getAttribute('data-endpoint') || '/search.json';

  function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function cleanExcerpt(text, title){
    // Keep only pre-comments, pre-metrics
    let t = text.split('💬 Comments')[0];
    t = t.split('💭')[0];
    // Remove tokens we don't want (not line-anchored; works on normalized text)
    t = t
      .replace(/Post\s*#\d+\s*:/gi, '')
      .replace(/📱\s*Post\s*#\d+/gi, '')
      .replace(/@[A-Za-z0-9_.\-]+\s*•\s*[^\s][^]*?(?=\s{2,}|$)/gi, '') // author • time chunk
      .replace(/📖\s*Scripture:[^]*$/i, '')
      .replace(/🔗\s*Related\s*Posts:[^]*$/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Remove duplicated title at the start of the excerpt
    if (title) {
      const pure = title.replace(/^Post\s*#\d+\s*:\s*/i, '').trim();
      if (pure) {
        const rx = new RegExp('^' + escapeRe(pure).replace(/\s+/g,'\\s+') + '\\s*', 'i');
        t = t.replace(rx, '').trim();
      }
    }
    // Take first ~70 words
    const words = t.trim().split(/\s+/).slice(0, 70).join(' ');
    return words;
  }

  function excerptFromHtml(html, title){
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    // Remove H1 title and H2 meta with 📱
    const h1 = tmp.querySelector('h1'); if (h1) h1.remove();
    tmp.querySelectorAll('h2').forEach(h => { if (/📱/.test(h.textContent)) h.remove(); });
    // Remove metrics paragraphs and rules
    tmp.querySelectorAll('p').forEach(p => { if (/💭|🔄|❤️/.test(p.textContent)) p.remove(); });
    tmp.querySelectorAll('hr').forEach(hr => hr.remove());
    // Cut everything from the comments heading onward
    const comments = Array.from(tmp.querySelectorAll('p')).find(p => /\bComments\b/i.test(p.textContent));
    if (comments) {
      let n = comments; while (n) { const next = n.nextSibling; n.remove(); n = next; }
    }
    // Remove Scripture/Related blocks and author meta lines
    tmp.querySelectorAll('p').forEach(p => {
      const txt = p.textContent.trim();
      if (/^📖\s*Scripture:/i.test(txt) || /^🔗\s*Related\s*Posts:/i.test(txt)) { p.remove(); return; }
      const first = p.firstElementChild;
      if (first && first.tagName === 'STRONG' && /^@/.test(first.textContent.trim())) { p.remove(); return; }
    });
    // Collect first two paragraphs
    const paras = Array.from(tmp.querySelectorAll('p')).filter(p => p.textContent.trim().length > 0).slice(0,2);
    let htmlOut = paras.map(p => p.outerHTML).join('');
    // Remove duplicate title at start
    if (title) {
      const pure = title.replace(/^Post\s*#\d+\s*:\s*/i, '').trim();
      if (pure) {
        const rx = new RegExp('^\n*\s*' + escapeRe(pure).replace(/\s+/g,'\\s+') + '\\s*', 'i');
        htmlOut = htmlOut.replace(rx, '');
      }
    }
    return htmlOut;
  }

  function postNumberFromTitle(title){
    const m = title.match(/^Post\s*#\d+/i);
    return m ? m[0] : '';
  }

  function sortByPostNum(items){
    return items.slice().sort((a,b)=>{
      const an = (a.title.match(/#(\d+)/)||[0,0])[1]|0;
      const bn = (b.title.match(/#(\d+)/)||[0,0])[1]|0;
      return an - bn;
    });
  }

  function render(items){
    feed.innerHTML = '';
    const list = sortByPostNum(items.filter(i => /\/chapters\/post-\d+\//.test(i.url)));
    for (const it of list){
      const meta = postNumberFromTitle(it.title);
      const excerptHtml = excerptFromHtml(it.content_html || '', it.title) || `<p>${cleanExcerpt(it.content, it.title)}</p>`;
      const art = document.createElement('article');
      art.className = 'tile';
      art.innerHTML = `
        <h2 class="tile__title"><a href="${it.url}">${it.title}</a></h2>
        ${meta ? `<div class="tile__meta">📱 ${meta}</div>` : ''}
        <div class="tile__excerpt">${excerptHtml}</div>
        <div class="tile__actions"><a href="${it.url}">Open thread →</a></div>
      `;
      feed.appendChild(art);
    }
  }

  fetch(endpoint)
    .then(r => r.json())
    .then(render)
    .catch(()=>{ feed.innerHTML = '<p>Failed to load feed.</p>'; });
})();
