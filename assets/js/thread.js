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
    const nodes = Array.from(root.children);
    let inComments = false;
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (isPara(el) && /\bComments\b/i.test(el.textContent)) { inComments = true; continue; }
      if (!inComments) continue;
      if (isMetaPara(el)) {
        const meta = el;
        const wrapper = document.createElement('div');
        wrapper.className = 'comment';
        const avatar = document.createElement('span');
        avatar.className = 'avatar';
        const metaDiv = document.createElement('div');
        metaDiv.className = 'meta';
        
        // Insert wrapper at the meta's original position BEFORE moving nodes
        const anchor = meta;
        root.insertBefore(wrapper, anchor);
        
        // Now move nodes into wrapper
        // Split meta paragraph if it includes body text
        const split = splitMetaParagraph(anchor);
        metaDiv.appendChild(split.metaP);
        setAvatarFromMeta(metaDiv, avatar);
        wrapper.appendChild(avatar);
        wrapper.appendChild(metaDiv);

        const body = [];
        let j = i + 1;
        while (j < nodes.length) {
          const nxt = nodes[j];
          if (!nxt) break;
          if (isHR(nxt) || isMetaPara(nxt)) break;
          if (isPara(nxt)) { body.push(nxt); } else { break; }
          j++;
        }
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'body';
        if (split.bodyP) bodyDiv.appendChild(split.bodyP);
        body.forEach(p => bodyDiv.appendChild(p));
        metaDiv.appendChild(bodyDiv);

        root.insertBefore(wrapper, meta);
        i = j - 1;
      }
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
    const strong = metaRoot.querySelector('strong');
    if (!strong) return;
    const handle = strong.textContent.trim(); // like @TheGenZCatechism
    const initial = (handle.replace(/^@/, '')[0] || '•').toUpperCase();
    const hue = hashHue(handle);
    avatarEl.textContent = initial;
    avatarEl.style.backgroundColor = `hsl(${hue} 70% 45%)`;
    avatarEl.style.border = 'none';
    avatarEl.title = handle;
  } catch (_) {}
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % 360;
}
