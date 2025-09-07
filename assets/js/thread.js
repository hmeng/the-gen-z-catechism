(function() {
  function isElement(el, tag) { return el && el.nodeType === 1 && el.tagName === tag; }
  function isPara(el) { return isElement(el, 'P'); }
  function isHeading2(el) { return isElement(el, 'H2'); }
  function isHR(el) { return isElement(el, 'HR'); }

  function isMetaPara(el) {
    if (!isPara(el)) return false;
    const first = el.firstElementChild;
    return first && first.tagName === 'STRONG' && /^@/.test(first.textContent.trim());
  }

  function isMetricsPara(el) {
    if (!isPara(el)) return false;
    const strongs = el.querySelectorAll('strong');
    return strongs.length >= 2 || /💭|❤️|🔄/.test(el.textContent);
  }

  // If a meta paragraph also contains trailing body text, split it.
  function splitMetaParagraph(p) {
    const metaP = document.createElement('p');
    const bodyP = document.createElement('p');
    let toBody = false;
    Array.from(p.childNodes).forEach(node => {
      if (!toBody) metaP.appendChild(node.cloneNode(true)); else bodyP.appendChild(node.cloneNode(true));
      if (!toBody && node.nodeType === 1 && node.tagName === 'EM') {
        toBody = true; // move subsequent nodes to body
      }
    });
    // Trim whitespace in bodyP
    bodyP.textContent = bodyP.textContent.trim();
    return { metaP, bodyP: bodyP.textContent ? bodyP : null };
  }

  function findIndex(nodes, predicate, startAt) {
    for (let i = startAt || 0; i < nodes.length; i++) { if (predicate(nodes[i])) return i; }
    return -1;
  }

  function wrapMainPost(root) {
    const nodes = Array.from(root.children);
    // Find the H2 line with the phone emoji to locate the post meta start
    const h2Idx = findIndex(nodes, el => isHeading2(el) && /📱/.test(el.textContent));
    const commentsTitleIdx = findIndex(nodes, el => isPara(el) && /\bComments\b/i.test(el.textContent));
    if (h2Idx === -1) return; // Not a standard post layout

    const firstMetaIdx = findIndex(nodes, el => isMetaPara(el), h2Idx + 1);
    if (firstMetaIdx === -1) return;

    // Gather from firstMetaIdx through metrics paragraph (inclusive)
    const metricsIdx = findIndex(nodes, el => isMetricsPara(el), firstMetaIdx + 1);
    let endIdx = metricsIdx !== -1 ? metricsIdx : (commentsTitleIdx !== -1 ? commentsTitleIdx - 1 : nodes.length - 1);
    // Stop before first HR after metrics
    if (metricsIdx !== -1) {
      const hrAfterMetricsIdx = findIndex(nodes, el => isHR(el), metricsIdx + 1);
      if (hrAfterMetricsIdx !== -1) endIdx = Math.min(endIdx, hrAfterMetricsIdx - 1);
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'post';

    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    const metaDiv = document.createElement('div');
    metaDiv.className = 'meta';
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'body';

    // Insert wrapper at the original meta position BEFORE moving nodes
    const anchor = nodes[firstMetaIdx];
    root.insertBefore(wrapper, anchor);

    // Meta paragraph may include body text after <em>; split it
    const split = splitMetaParagraph(anchor);
    metaDiv.appendChild(split.metaP);
    if (split.bodyP) bodyDiv.appendChild(split.bodyP);
    setAvatarFromMeta(metaDiv, avatar);
    // Remove original mixed meta/body paragraph now that we've split it
    anchor.remove();

    // Move paragraphs between firstMetaIdx and endIdx into body (skip metrics; we’ll add separately)
    const toMove = [];
    for (let i = firstMetaIdx + 1; i <= endIdx; i++) {
      const el = nodes[i];
      if (el && !isMetricsPara(el)) toMove.push(el);
    }
    toMove.forEach(el => bodyDiv.appendChild(el));

    // Metrics
    let metricsEl = null;
    if (metricsIdx !== -1) {
      metricsEl = nodes[metricsIdx];
      metricsEl.classList.add('metrics');
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(metaDiv);
    wrapper.appendChild(bodyDiv);
    if (metricsEl) wrapper.appendChild(metricsEl);
  }

  function wrapComments(root) {
    let inComments = false;
    let el = root.firstElementChild;
    while (el) {
      if (isPara(el) && /\bComments\b/i.test(el.textContent)) { inComments = true; el = el.nextElementSibling; continue; }
      if (!inComments) { el = el.nextElementSibling; continue; }
      if (!isMetaPara(el)) { el = el.nextElementSibling; continue; }

      const anchor = el;
      const wrapper = document.createElement('div');
      wrapper.className = 'comment';
      const avatar = document.createElement('span');
      avatar.className = 'avatar';
      const metaDiv = document.createElement('div');
      metaDiv.className = 'meta';

      // Insert wrapper before the anchor, then move nodes into it
      root.insertBefore(wrapper, anchor);

      const split = splitMetaParagraph(anchor);
      metaDiv.appendChild(split.metaP);
      setAvatarFromMeta(metaDiv, avatar);
      anchor.remove();

      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'body';
      if (split.bodyP) bodyDiv.appendChild(split.bodyP);

      // Collect subsequent paragraph siblings as body until HR or next meta
      let nxt = wrapper.nextElementSibling;
      while (nxt && !isHR(nxt) && !isMetaPara(nxt)) {
        if (!isPara(nxt)) break;
        const move = nxt;
        nxt = nxt.nextElementSibling;
        bodyDiv.appendChild(move);
      }

      metaDiv.appendChild(bodyDiv);
      wrapper.appendChild(avatar);
      wrapper.appendChild(metaDiv);

      // Continue from the next sibling after the wrapper (already set in nxt)
      el = wrapper.nextElementSibling;
    }
  }

  function initThread() {
    const thread = document.querySelector('.thread');
    if (!thread) return;
    try { wrapMainPost(thread); } catch(e) { /* noop */ }
    try { wrapComments(thread); } catch(e) { /* noop */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThread);
  } else {
    initThread();
  }
})();

// Avatar helpers
function setAvatarFromMeta(metaRoot, avatarEl) {
  try {
    // Prefer the first <strong> that starts with '@'
    let handle = null;
    const strongs = metaRoot.querySelectorAll('strong');
    for (const s of strongs) {
      const t = (s.textContent || '').trim();
      if (/^@/.test(t)) { handle = t; break; }
    }
    // Fallback: regex from the full text
    if (!handle) {
      const m = (metaRoot.textContent || '').match(/@[A-Za-z0-9_\.\-]+/);
      if (m) handle = m[0];
    }
    if (!handle) return; // no handle found

    const initial = (handle.replace(/^@/, '')[0] || '•').toUpperCase();
    const hue = hashHue(handle);
    avatarEl.textContent = initial;
    // Use widely-supported comma syntax for HSL
    avatarEl.style.backgroundColor = `hsl(${hue}, 70%, 45%)`;
    avatarEl.style.border = 'none';
    avatarEl.title = handle;
    avatarEl.setAttribute('data-handle', handle);
  } catch (_) {}
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
