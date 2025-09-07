---
layout: default
title: Search
permalink: /search/
---

# Search

{% include site_nav.html %}

<input id="search-input" type="search" placeholder="Search chapters and pages…" style="width:100%;padding:.6rem 0.8rem;font-size:1rem;border-radius:6px;border:1px solid #d0d7de;margin:0.5rem 0 1rem;">

<div id="search-results"></div>

<script>
(function() {
  const input = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');
  const endpoint = '{{ '/search.json' | relative_url }}';
  let items = [];

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s] || s));
  }

  function highlight(text, q) {
    const rx = new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig');
    return text.replace(rx, '<mark>$1</mark>');
  }

  function render(results, q) {
    if (!q) { resultsEl.innerHTML = ''; return; }
    if (results.length === 0) { resultsEl.innerHTML = '<p>No results.</p>'; return; }
    const html = results.map(r => {
      const where = r.content.toLowerCase().indexOf(q.toLowerCase());
      const start = Math.max(0, where - 100);
      const end = Math.min(r.content.length, (where >= 0 ? where + q.length + 100 : 200));
      const snippetRaw = r.content.slice(start, end).trim();
      const snippet = highlight(escapeHtml(snippetRaw), q);
      const title = highlight(escapeHtml(r.title), q);
      return `<div style="margin:1rem 0;">
        <div><a href="${r.url}"><strong>${title}</strong></a></div>
        <div style="color:#57606a;font-size:.95rem;">${snippet}…</div>
      </div>`;
    }).join('');
    resultsEl.innerHTML = html;
  }

  function onQuery() {
    const q = input.value.trim();
    if (q.length < 2) { resultsEl.innerHTML = ''; return; }
    const qlc = q.toLowerCase();
    const results = items.filter(it =>
      it.title.toLowerCase().includes(qlc) || it.content.toLowerCase().includes(qlc)
    ).slice(0, 30);
    render(results, q);
  }

  fetch(endpoint)
    .then(r => r.json())
    .then(data => { items = data; })
    .catch(() => { resultsEl.innerHTML = '<p>Failed to load search index.</p>'; });

  input.addEventListener('input', onQuery);
})();
</script>

