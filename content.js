(() => {
  let isDrawing = false;
  let canvas = null;
  let ctx = null;
  let points = [];
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let lastX = 24;
  let lastY = 24;
  let currentTool = 'pencil';
  let currentUiLang = WordMapI18n.getEffectiveUiLang();
  let cardAutoCloseTimer = null;

  chrome.storage.local.get(['uiLang'], (stored) => {
    currentUiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
    updateDynamicCopy();
  });

  if (window.wordmapEscListener) {
    document.removeEventListener('keydown', window.wordmapEscListener);
  }
  window.wordmapEscListener = handleEscKeydown;
  document.addEventListener('keydown', window.wordmapEscListener);

  if (window.wordmapRuntimeListener) {
    chrome.runtime.onMessage.removeListener(window.wordmapRuntimeListener);
  }
  window.wordmapRuntimeListener = handleRuntimeMessage;
  chrome.runtime.onMessage.addListener(window.wordmapRuntimeListener);

  if (window.wordmapStorageListener) {
    chrome.storage.onChanged.removeListener(window.wordmapStorageListener);
  }
  window.wordmapStorageListener = handleStorageChange;
  chrome.storage.onChanged.addListener(window.wordmapStorageListener);

  function handleStorageChange(changes, areaName) {
    if (areaName === 'local' && changes.uiLang) {
      currentUiLang = WordMapI18n.getEffectiveUiLang(changes.uiLang.newValue);
      updateDynamicCopy();
    }
  }

  function handleEscKeydown(event) {
    if (event.key !== 'Escape') return;
    cleanupCanvas();
    removeCard();
  }

  function handleRuntimeMessage(request, sender, sendResponse) {
    if (request.uiLang) {
      currentUiLang = WordMapI18n.getEffectiveUiLang(request.uiLang);
    }

    if (request.action === 'toggle_draw') {
      toggleDrawMode(request.mode || 'pencil');
      sendResponse({ status: 'ok' });
      return true;
    }

    if (request.action === 'show_status') {
      showStatusCard(request.title, request.detail, request.state || 'progress', lastX, lastY);
      return true;
    }

    if (request.action === 'show_error') {
      showStatusCard(WordMapI18n.t(currentUiLang, 'errorTitle'), request.message, 'error', lastX, lastY);
      return true;
    }

    if (request.action === 'show_result') {
      renderResult(request.data, request.ocrText || '', lastX, lastY);
      return true;
    }

    return true;
  }

  function toggleDrawMode(mode) {
    currentTool = mode;
    if (canvas) {
      cleanupCanvas();
      return;
    }

    removeCard();
    canvas = document.createElement('canvas');
    canvas.id = 'wordmap-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh', zIndex: '999998', cursor: 'crosshair'
    });
    ctx = canvas.getContext('2d');
    setupCanvasAppearance();
    document.body.appendChild(canvas);
    document.body.classList.add('wordmap-drawing-mode');
    showDrawHint();

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
  }

  function setupCanvasAppearance() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentTool === 'rect') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
    }
  }

  function startDrawing(event) {
    isDrawing = true;
    startX = event.clientX;
    startY = event.clientY;
    currentX = startX;
    currentY = startY;

    if (currentTool === 'pencil') {
      points = [{ x: startX, y: startY }];
      ctx.beginPath();
      ctx.moveTo(startX, startY);
    }
  }

  function draw(event) {
    if (!isDrawing) return;
    currentX = event.clientX;
    currentY = event.clientY;

    if (currentTool === 'pencil') {
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      points.push({ x: currentX, y: currentY });
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectW = Math.abs(currentX - startX);
    const rectH = Math.abs(currentY - startY);

    ctx.clearRect(rectX, rectY, rectW, rectH);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(rectX, rectY, rectW, rectH);
  }

  function stopDrawing(event) {
    if (!isDrawing) return;
    isDrawing = false;

    const padding = 12;
    let minX = 0, minY = 0, width = 0, height = 0;

    if (currentTool === 'pencil') {
      ctx.closePath();
      if (points.length < 5) {
        cleanupCanvas();
        return;
      }
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const pMinX = Math.min(...xs);
      const pMaxX = Math.max(...xs);
      const pMinY = Math.min(...ys);
      const pMaxY = Math.max(...ys);
      minX = Math.max(0, pMinX - padding);
      minY = Math.max(0, pMinY - padding);
      width = Math.min(window.innerWidth - minX, (pMaxX - pMinX) + padding * 2);
      height = Math.min(window.innerHeight - minY, (pMaxY - pMinY) + padding * 2);
    } else {
      const rMinX = Math.min(startX, currentX);
      const rMaxX = Math.max(startX, currentX);
      const rMinY = Math.min(startY, currentY);
      const rMaxY = Math.max(startY, currentY);
      if ((rMaxX - rMinX) < 10 || (rMaxY - rMinY) < 10) {
        cleanupCanvas();
        return;
      }
      minX = Math.max(0, rMinX - padding);
      minY = Math.max(0, rMinY - padding);
      width = Math.min(window.innerWidth - minX, (rMaxX - rMinX) + padding * 2);
      height = Math.min(window.innerHeight - minY, (rMaxY - rMinY) + padding * 2);
    }

    lastX = Math.min(window.innerWidth - 40, event.clientX + 16);
    lastY = Math.min(window.innerHeight - 40, event.clientY + 16);

    cleanupCanvas();
    showStatusCard(
      WordMapI18n.t(currentUiLang, 'statusPreparingCaptureTitle'),
      WordMapI18n.t(currentUiLang, 'statusPreparingCaptureDetail'),
      'progress',
      lastX,
      lastY
    );

    chrome.runtime.sendMessage({ action: 'capture_tab' }, (response) => {
      if (!response || response.error || !response.dataUrl) {
        showStatusCard(WordMapI18n.t(currentUiLang, 'errorTitle'), WordMapI18n.t(currentUiLang, 'errorCaptureFailed'), 'error', lastX, lastY);
        return;
      }

      const image = new Image();
      image.onload = () => {
        const scaleX = image.width / window.innerWidth;
        const scaleY = image.height / window.innerHeight;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = Math.max(1, Math.round(width * scaleX));
        cropCanvas.height = Math.max(1, Math.round(height * scaleY));
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(
          image,
          minX * scaleX,
          minY * scaleY,
          width * scaleX,
          height * scaleY,
          0,
          0,
          cropCanvas.width,
          cropCanvas.height
        );

        showStatusCard(
          WordMapI18n.t(currentUiLang, 'statusUploadingTitle'),
          WordMapI18n.t(currentUiLang, 'statusUploadingDetail'),
          'progress',
          lastX,
          lastY
        );

        chrome.runtime.sendMessage({ action: 'process_image', imageBase64: cropCanvas.toDataURL('image/jpeg') });
      };
      image.src = response.dataUrl;
    });
  }

  function cleanupCanvas() {
    removeDrawHint();
    document.body.classList.remove('wordmap-drawing-mode');
    if (canvas) {
      canvas.remove();
      canvas = null;
    }
    points = [];
    isDrawing = false;
  }

  function showDrawHint() {
    let hint = document.getElementById('wordmap-draw-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'wordmap-draw-hint';
      document.body.appendChild(hint);
    }
    const isRect = currentTool === 'rect';
    hint.innerHTML = `
      <div class="wordmap-draw-hint-badge">${isRect ? WordMapI18n.t(currentUiLang, 'drawModeBadgeRect') : WordMapI18n.t(currentUiLang, 'drawModeBadgeFreehand')}</div>
      <div class="wordmap-draw-hint-title">${isRect ? WordMapI18n.t(currentUiLang, 'drawHintRectTitle') : WordMapI18n.t(currentUiLang, 'drawHintPencilTitle')}</div>
      <div class="wordmap-draw-hint-desc">${isRect ? WordMapI18n.t(currentUiLang, 'drawHintRectDesc') : WordMapI18n.t(currentUiLang, 'drawHintPencilDesc')} ${WordMapI18n.t(currentUiLang, 'drawHintFooter')}</div>
    `;
  }

  function removeDrawHint() {
    const hint = document.getElementById('wordmap-draw-hint');
    if (hint) hint.remove();
  }

  function getOrCreateCard(x, y) {
    clearCardAutoCloseTimer();
    let card = document.getElementById('wordmap-result-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'wordmap-result-card';
      card.innerHTML = `
        <div class="wordmap-card-header">
          <div class="wordmap-card-brand">
            <div class="wordmap-card-logo">WM</div>
            <div class="wordmap-card-brand-meta">
              <div class="wordmap-card-title">WordMap</div>
              <div class="wordmap-card-subtitle" data-role="subtitle"></div>
            </div>
          </div>
          <div class="wordmap-card-tools">
            <div class="wordmap-drag-pill" data-role="drag-pill"></div>
            <button class="wordmap-card-close" data-role="close" type="button">×</button>
          </div>
        </div>
        <div id="wordmap-card-content"></div>
      `;
      document.body.appendChild(card);
      installCardDrag(card, card.querySelector('.wordmap-card-header'));
      card.querySelector('[data-role="close"]').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeCard();
      });
      document.addEventListener('mousedown', handleOutsideClick, true);
    }

    updateDynamicCopy();
    positionCard(card, x, y);
    return { card, content: document.getElementById('wordmap-card-content') };
  }

  function installCardDrag(card, handle) {
    let dragging = false;
    let startClientX = 0;
    let startClientY = 0;
    let startLeft = 0;
    let startTop = 0;

    handle.addEventListener('mousedown', (event) => {
      if (event.target.closest('.wordmap-card-close')) return;
      dragging = true;
      startClientX = event.clientX;
      startClientY = event.clientY;
      startLeft = card.offsetLeft;
      startTop = card.offsetTop;
      event.preventDefault();
    });

    const onMove = (event) => {
      if (!dragging) return;
      const left = startLeft + (event.clientX - startClientX);
      const top = startTop + (event.clientY - startClientY);
      card.style.left = `${clamp(left, 12, window.innerWidth - card.offsetWidth - 12)}px`;
      card.style.top = `${clamp(top, 12, window.innerHeight - card.offsetHeight - 12)}px`;
    };

    const onUp = () => { dragging = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    card._cleanupFns = [
      () => document.removeEventListener('mousemove', onMove),
      () => document.removeEventListener('mouseup', onUp)
    ];
  }

  function handleOutsideClick(event) {
    const card = document.getElementById('wordmap-result-card');
    if (card && !card.contains(event.target)) removeCard();
  }

  function updateDynamicCopy() {
    const card = document.getElementById('wordmap-result-card');
    if (!card) return;
    const subtitle = card.querySelector('[data-role="subtitle"]');
    const dragPill = card.querySelector('[data-role="drag-pill"]');
    const closeButton = card.querySelector('[data-role="close"]');
    if (subtitle) subtitle.textContent = WordMapI18n.t(currentUiLang, 'cardBrandSubtitle');
    if (dragPill) dragPill.textContent = WordMapI18n.t(currentUiLang, 'cardSubtitle');
    if (closeButton) {
      const label = WordMapI18n.t(currentUiLang, 'closeButtonAria');
      closeButton.setAttribute('aria-label', label);
      closeButton.title = label;
    }
  }

  function positionCard(card, x, y) {
    const width = Math.min(760, window.innerWidth - 24);
    card.style.width = `${width}px`;
    const left = x + width + 20 > window.innerWidth ? window.innerWidth - width - 12 : x;
    card.style.left = `${clamp(left, 12, window.innerWidth - width - 12)}px`;
    requestAnimationFrame(() => {
      const height = card.offsetHeight || 320;
      const top = y + height + 12 > window.innerHeight ? window.innerHeight - height - 12 : y;
      card.style.top = `${clamp(top, 12, window.innerHeight - height - 12)}px`;
    });
  }

  function showStatusCard(title, detail, state, x, y) {
    const { content } = getOrCreateCard(x, y);
    content.innerHTML = `
      <div class="wordmap-status ${state === 'error' ? 'wordmap-status--error' : ''}">
        <div class="wordmap-status-visual">
          ${state === 'error' ? '<div class="wordmap-status-error-icon">×</div>' : '<div class="wordmap-status-spinner"></div>'}
        </div>
        <div class="wordmap-status-copy">
          <div class="wordmap-status-title">${escapeHtml(title)}</div>
          <div class="wordmap-status-detail">${escapeHtml(detail || '')}</div>
        </div>
      </div>
    `;

    if (state === 'error') {
      clearCardAutoCloseTimer();
      cardAutoCloseTimer = window.setTimeout(removeCard, 5000);
    }
  }

  function renderResult(data, ocrText, x, y) {
    const { content } = getOrCreateCard(x, y);
    const fullTranslation = (data && typeof data === 'object') ? (data.full_translation || data.translation || '') : '';
    const wordPairs = Array.isArray(data) ? data : ((data && Array.isArray(data.words)) ? data.words : []);

    if (!fullTranslation && wordPairs.length === 0) {
      showStatusCard(WordMapI18n.t(currentUiLang, 'errorTitle'), WordMapI18n.t(currentUiLang, 'resultEmpty'), 'error', x, y);
      return;
    }

    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'wordmap-result-grid';

    if (ocrText) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionDetectedText'));
      const text = document.createElement('div');
      text.className = 'wordmap-ocr-text';
      text.textContent = ocrText;
      section.appendChild(text);
      grid.appendChild(section);
    }

    if (fullTranslation) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionTranslation'));
      const text = document.createElement('div');
      text.className = 'wordmap-full-translation';
      text.textContent = fullTranslation;
      section.appendChild(text);
      grid.appendChild(section);
    }

    if (wordPairs.length > 0) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionGlossary'));
      section.classList.add('wordmap-section--full');
      const list = document.createElement('div');
      list.className = 'wordmap-words-container';
      wordPairs.forEach((pair) => {
        const chip = document.createElement('div');
        chip.className = 'word-pair';
        const src = document.createElement('div');
        src.className = 'word-en';
        src.textContent = pair.src || pair.en || pair.text || pair.original || '—';
        const dst = document.createElement('div');
        dst.className = 'word-zh';
        dst.textContent = pair.dst || pair.zh || pair.translation || pair.Chinese || WordMapI18n.t(currentUiLang, 'resultNoGloss');
        chip.appendChild(src);
        chip.appendChild(dst);
        list.appendChild(chip);
      });
      section.appendChild(list);
      grid.appendChild(section);
    }

    content.appendChild(grid);
  }

  function createSection(titleText) {
    const section = document.createElement('section');
    section.className = 'wordmap-section';
    const title = document.createElement('div');
    title.className = 'wordmap-section-title';
    title.textContent = titleText;
    section.appendChild(title);
    return section;
  }

  function clearCardAutoCloseTimer() {
    if (cardAutoCloseTimer) {
      window.clearTimeout(cardAutoCloseTimer);
      cardAutoCloseTimer = null;
    }
  }

  function removeCard() {
    clearCardAutoCloseTimer();
    const card = document.getElementById('wordmap-result-card');
    if (!card) return;
    if (Array.isArray(card._cleanupFns)) card._cleanupFns.forEach((fn) => fn());
    document.removeEventListener('mousedown', handleOutsideClick, true);
    card.remove();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  }
})();
