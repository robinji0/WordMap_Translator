(() => {
  if (window.__WMV_PROBE_INSTALLED__) return;
  window.__WMV_PROBE_INSTALLED__ = true;

  const blobRegistry = new Map();
  const warmNodes = new Set();
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);

  URL.createObjectURL = function patchedCreateObjectURL(obj) {
    const url = originalCreateObjectURL(obj);
    try {
      if (obj instanceof Blob) {
        blobRegistry.set(url, obj);
      }
    } catch {
      // Ignore blob registry failures.
    }
    return url;
  };

  URL.revokeObjectURL = function patchedRevokeObjectURL(url) {
    blobRegistry.delete(url);
    return originalRevokeObjectURL(url);
  };

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('blob_read_failed'));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  function cleanupWarmNode(node) {
    if (!node) return;
    warmNodes.delete(node);
    try {
      node.remove();
    } catch {
      // ignore
    }
  }

  function scoreCandidateImageMatch(image, candidate) {
    if (!image || !candidate || !candidate.sourceUrl) return -Infinity;
    const currentSrc = image.currentSrc || image.src || '';
    const attrSrc = image.getAttribute('src') || '';
    const attrSrcset = image.getAttribute('srcset') || '';
    if (currentSrc !== candidate.sourceUrl && attrSrc !== candidate.sourceUrl && !attrSrcset.includes(candidate.sourceUrl)) {
      return -Infinity;
    }

    let score = 0;
    if (currentSrc === candidate.sourceUrl) score += 60;
    if (attrSrc === candidate.src) score += 20;
    if (attrSrcset && candidate.srcset && attrSrcset === candidate.srcset) score += 12;

    if (candidate.rect) {
      const rect = image.getBoundingClientRect();
      score -= Math.abs(rect.left - Number(candidate.rect.left || 0)) / 12;
      score -= Math.abs(rect.top - Number(candidate.rect.top || 0)) / 12;
      score -= Math.abs(rect.width - Number(candidate.rect.width || 0)) / 18;
      score -= Math.abs(rect.height - Number(candidate.rect.height || 0)) / 18;
    }

    return score;
  }

  function findBestMatchingImage(candidate) {
    let bestNode = null;
    let bestScore = -Infinity;
    Array.from(document.images || []).forEach((image) => {
      const score = scoreCandidateImageMatch(image, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestNode = image;
      }
    });
    return bestNode;
  }

  function warmCandidateResource(candidate, timeout = 1500) {
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      let node = null;

      const finalize = (ok, reason) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        if (node) {
          node.onload = null;
          node.onerror = null;
          cleanupWarmNode(node);
        }
        resolve({ ok, reason });
      };

      timer = window.setTimeout(() => finalize(false, 'timeout'), timeout);

      try {
        const matchedImage = candidate && candidate.type === 'img' ? findBestMatchingImage(candidate) : null;
        node = new Image();
        warmNodes.add(node);
        node.alt = '';
        node.loading = 'eager';
        node.style.cssText = 'position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';
        try {
          node.decoding = 'async';
        } catch {
          // ignore
        }

        const srcValue = (matchedImage && matchedImage.getAttribute('src')) || candidate.src || candidate.sourceUrl;
        const srcsetValue = (matchedImage && matchedImage.getAttribute('srcset')) || candidate.srcset || '';
        const sizesValue = (matchedImage && matchedImage.getAttribute('sizes')) || candidate.sizes || '';
        const crossOriginValue = (matchedImage && matchedImage.crossOrigin) || candidate.crossOrigin || '';
        const referrerPolicyValue = (matchedImage && matchedImage.referrerPolicy) || candidate.referrerPolicy || '';
        const fetchPriorityValue = (matchedImage && matchedImage.fetchPriority) || candidate.fetchPriority || '';

        if (crossOriginValue) node.crossOrigin = crossOriginValue;
        if (referrerPolicyValue) node.referrerPolicy = referrerPolicyValue;
        if (srcsetValue) node.srcset = srcsetValue;
        if (sizesValue) node.sizes = sizesValue;
        if (fetchPriorityValue && 'fetchPriority' in node) {
          try {
            node.fetchPriority = fetchPriorityValue;
          } catch {
            // ignore
          }
        }

        node.onload = () => finalize(true, 'load');
        node.onerror = () => finalize(false, 'error');
        (document.documentElement || document.body || document.head).appendChild(node);
        node.src = srcValue;

        try {
          fetch(candidate.sourceUrl, {
            mode: 'no-cors',
            credentials: 'include',
            cache: 'reload'
          }).catch(() => null).finally(() => {
            window.setTimeout(() => finalize(true, 'fetch_dispatched'), 120);
          });
        } catch {
          // ignore
        }
      } catch (error) {
        finalize(false, error && error.message ? error.message : String(error));
      }
    });
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'WMV_CONTENT') return;

    if (event.data.type === 'WMV_EXPORT_BLOB') {
      const url = event.data.url;
      const requestId = event.data.requestId;
      let payload = {
        source: 'WMV_PROBE',
        type: 'WMV_EXPORT_BLOB_RESULT',
        requestId,
        ok: false,
        url
      };

      try {
        const blob = blobRegistry.get(url);
        if (!blob) {
          payload.error = 'blob_not_found_in_probe_registry';
        } else {
          payload.ok = true;
          payload.dataUrl = await blobToDataUrl(blob);
          payload.mimeType = blob.type || 'image/png';
        }
      } catch (error) {
        payload.error = error.message || String(error);
      }

      window.postMessage(payload, '*');
    }

    if (event.data.type === 'WMV_WARM_RESOURCE') {
      const requestId = event.data.requestId;
      const candidate = event.data.candidate || null;
      const result = await warmCandidateResource(candidate, Number(event.data.timeout || 1500));
      window.postMessage({
        source: 'WMV_PROBE',
        type: 'WMV_WARM_RESOURCE_RESULT',
        requestId,
        candidateId: candidate && candidate.id ? candidate.id : '',
        ok: !!result.ok,
        reason: result.reason || ''
      }, '*');
    }
  });

  window.postMessage({ source: 'WMV_PROBE', type: 'WMV_PROBE_READY' }, '*');
})();
