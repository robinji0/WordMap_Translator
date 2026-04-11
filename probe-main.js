(() => {
  if (window.__WMV_PROBE_INSTALLED__) return;
  window.__WMV_PROBE_INSTALLED__ = true;

  const blobRegistry = new Map();
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
  });

  window.postMessage({ source: 'WMV_PROBE', type: 'WMV_PROBE_READY' }, '*');
})();
