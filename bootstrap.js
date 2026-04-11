(() => {
  if (window.__WORDMAP_BOOTSTRAP_INSTALLED__) return;
  window.__WORDMAP_BOOTSTRAP_INSTALLED__ = true;

  function inject() {
    if (document.getElementById('wordmap-probe-main')) return;
    const host = document.documentElement || document.head || document.body;
    if (!host) return;
    const script = document.createElement('script');
    script.id = 'wordmap-probe-main';
    script.src = chrome.runtime.getURL('probe-main.js');
    script.async = false;
    host.appendChild(script);
  }

  if (document.documentElement || document.head || document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  }
})();
