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
  let currentTool = 'rect';
  let currentUiLang = WordMapI18n.getEffectiveUiLang();
  let activePointerId = null;
  let cardAutoCloseTimer = null;
  let drawHintTimer = null;
  let mobileQuickEnabled = true;
  let mobileQuickMode = 'rect';
  let mobileLauncherPosition = null;
  let launcherToastTimer = null;

  loadSettings();

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

  window.addEventListener('resize', handleViewportResize);

  function loadSettings() {
    chrome.storage.local.get(['uiLang', 'mobileQuickEnabled', 'mobileQuickMode', 'mobileLauncherPosition'], (stored) => {
      currentUiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
      mobileQuickEnabled = stored.mobileQuickEnabled !== false;
      mobileQuickMode = stored.mobileQuickMode || 'rect';
      mobileLauncherPosition = stored.mobileLauncherPosition || null;
      updateCardStaticCopy();
      updateDrawHintCopy();
      updateMobileLauncher();
    });
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    if (changes.uiLang) currentUiLang = WordMapI18n.getEffectiveUiLang(changes.uiLang.newValue);
    if (changes.mobileQuickEnabled) mobileQuickEnabled = changes.mobileQuickEnabled.newValue !== false;
    if (changes.mobileQuickMode) mobileQuickMode = changes.mobileQuickMode.newValue || 'rect';
    if (changes.mobileLauncherPosition) mobileLauncherPosition = changes.mobileLauncherPosition.newValue || null;

    updateCardStaticCopy();
    updateDrawHintCopy();
    updateMobileLauncher();
  }

  function handleEscKeydown(event) {
    if (event.key !== 'Escape') return;
    if (document.getElementById('wordmap-canvas')) cleanupCanvas({ restoreLauncher: true });
    removeCard();
  }

  function handleRuntimeMessage(request, sender, sendResponse) {
    if (request.uiLang) currentUiLang = WordMapI18n.getEffectiveUiLang(request.uiLang);

    if (request.action === 'toggle_draw') {
      toggleDrawMode(request.mode || 'rect');
      sendResponse({ status: 'ok' });
    } else if (request.action === 'show_status') {
      showStatusCard({ title: request.title, detail: request.detail, state: request.state || 'progress' }, lastX, lastY);
    } else if (request.action === 'show_result') {
      renderResult(request.data, lastX, lastY, request.ocrText || '');
    }
    return true;
  }

  function toggleDrawMode(mode) {
    currentTool = mode;

    if (document.getElementById('wordmap-canvas')) {
      cleanupCanvas({ restoreLauncher: true });
      return;
    }

    removeCard();
    hideMobileLauncher();

    canvas = document.createElement('canvas');
    canvas.id = 'wordmap-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '999998';
    canvas.style.cursor = 'crosshair';
    canvas.style.touchAction = 'none';

    ctx = canvas.getContext('2d');
    initializeCanvasLook();

    document.body.appendChild(canvas);
    document.documentElement.classList.add('wordmap-drawing-mode');
    document.body.classList.add('wordmap-drawing-mode');

    showDrawHint();

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
  }

  function initializeCanvasLook() {
    if (currentTool === 'rect') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);
  }

  function handlePointerDown(event) {
    if (activePointerId !== null) return;
    activePointerId = event.pointerId;
    hideDrawHint();
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    }
    startDrawingAt(event.clientX, event.clientY);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!isDrawing || event.pointerId !== activePointerId) return;
    drawAt(event.clientX, event.clientY);
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (event.pointerId !== activePointerId) return;
    finishDrawingAt(event.clientX, event.clientY);
    activePointerId = null;
    if (canvas && canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    }
    event.preventDefault();
  }

  function handlePointerCancel(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    cleanupCanvas({ restoreLauncher: true });
  }

  function startDrawingAt(clientX, clientY) {
    isDrawing = true;
    startX = clientX;
    startY = clientY;
    currentX = clientX;
    currentY = clientY;

    if (currentTool === 'pencil') {
      points = [];
      ctx.beginPath();
      ctx.moveTo(clientX, clientY);
      points.push({ x: clientX, y: clientY });
    }
  }

  function drawAt(clientX, clientY) {
    currentX = clientX;
    currentY = clientY;

    if (currentTool === 'pencil') {
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      points.push({ x: currentX, y: currentY });
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const rectX = Math.min(startX, currentX);
    const rectY = Math.min(startY, currentY);
    const rectW = Math.abs(currentX - startX);
    const rectH = Math.abs(currentY - startY);

    ctx.clearRect(rectX, rectY, rectW, rectH);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(rectX, rectY, rectW, rectH);
  }

  function finishDrawingAt(clientX, clientY) {
    isDrawing = false;

    let minX;
    let minY;
    let width;
    let height;
    const padding = 12;

    if (currentTool === 'pencil') {
      ctx.closePath();
      if (points.length < 5) {
        cleanupCanvas({ restoreLauncher: true });
        return;
      }

      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      minX = Math.max(0, Math.min(...xs) - padding);
      minY = Math.max(0, Math.min(...ys) - padding);
      width = Math.min(window.innerWidth - minX, Math.max(...xs) - Math.min(...xs) + padding * 2);
      height = Math.min(window.innerHeight - minY, Math.max(...ys) - Math.min(...ys) + padding * 2);
    } else {
      const rMinX = Math.min(startX, currentX);
      const rMaxX = Math.max(startX, currentX);
      const rMinY = Math.min(startY, currentY);
      const rMaxY = Math.max(startY, currentY);

      if (rMaxX - rMinX < 10 || rMaxY - rMinY < 10) {
        cleanupCanvas({ restoreLauncher: true });
        return;
      }

      minX = Math.max(0, rMinX - padding);
      minY = Math.max(0, rMinY - padding);
      width = Math.min(window.innerWidth - minX, rMaxX - rMinX + padding * 2);
      height = Math.min(window.innerHeight - minY, rMaxY - rMinY + padding * 2);
    }

    lastX = clientX;
    lastY = clientY;

    cleanupCanvas({ restoreLauncher: false });
    showStatusCard({
      title: WordMapI18n.t(currentUiLang, 'statusPreparingCaptureTitle'),
      detail: WordMapI18n.t(currentUiLang, 'statusPreparingCaptureDetail'),
      state: 'progress'
    }, lastX, lastY);

    chrome.runtime.sendMessage({ action: 'capture_tab' }, (response) => {
      if (!response || response.error || !response.dataUrl) {
        updateMobileLauncher();
        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'errorTitle'),
          detail: WordMapI18n.t(currentUiLang, 'errorCaptureFailed'),
          state: 'error'
        }, lastX, lastY);
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

        updateMobileLauncher();

        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'statusUploadingTitle'),
          detail: WordMapI18n.t(currentUiLang, 'statusUploadingDetail'),
          state: 'progress'
        }, lastX, lastY);

        chrome.runtime.sendMessage({
          action: 'process_image',
          imageBase64: cropCanvas.toDataURL('image/jpeg')
        });
      };
      image.src = response.dataUrl;
    });
  }

  function cleanupCanvas({ restoreLauncher = true } = {}) {
    clearDrawHintTimer();
    removeDrawHint();
    document.documentElement.classList.remove('wordmap-drawing-mode');
    document.body.classList.remove('wordmap-drawing-mode');

    if (canvas) {
      canvas.remove();
      canvas = null;
    }

    isDrawing = false;
    points = [];
    activePointerId = null;

    if (restoreLauncher) updateMobileLauncher();
  }

  function showDrawHint() {
    let hint = document.getElementById('wordmap-draw-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'wordmap-draw-hint';
      document.body.appendChild(hint);
    }
    hint.hidden = false;
    hint.classList.remove('is-hiding');
    updateDrawHintCopy();
    clearDrawHintTimer();
    drawHintTimer = window.setTimeout(hideDrawHint, 1200);
  }

  function updateDrawHintCopy() {
    const hint = document.getElementById('wordmap-draw-hint');
    if (!hint) return;

    const isRect = currentTool === 'rect';
    const title = isRect ? WordMapI18n.t(currentUiLang, 'drawHintRectTitle') : WordMapI18n.t(currentUiLang, 'drawHintPencilTitle');
    const description = isRect ? WordMapI18n.t(currentUiLang, 'drawHintRectDesc') : WordMapI18n.t(currentUiLang, 'drawHintPencilDesc');
    const badge = isRect ? WordMapI18n.t(currentUiLang, 'drawModeBadgeRect') : WordMapI18n.t(currentUiLang, 'drawModeBadgeFreehand');
    const footer = isTouchEnvironment()
      ? WordMapI18n.t(currentUiLang, 'drawHintFooterTouch')
      : WordMapI18n.t(currentUiLang, 'drawHintFooterDesktop');

    hint.innerHTML = '';

    const copy = document.createElement('div');
    copy.className = 'wordmap-draw-hint-copy';

    const badgeElement = document.createElement('div');
    badgeElement.className = 'wordmap-draw-hint-badge';
    badgeElement.textContent = badge;

    const titleElement = document.createElement('div');
    titleElement.className = 'wordmap-draw-hint-title';
    titleElement.textContent = title;

    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'wordmap-draw-hint-desc';
    descriptionElement.textContent = `${description} ${footer}`;

    copy.appendChild(badgeElement);
    copy.appendChild(titleElement);
    copy.appendChild(descriptionElement);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'wordmap-draw-hint-close';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'drawHintCancel'));
    closeButton.setAttribute('title', WordMapI18n.t(currentUiLang, 'drawHintCancel'));
    closeButton.addEventListener('click', () => cleanupCanvas({ restoreLauncher: true }));

    hint.appendChild(copy);
    hint.appendChild(closeButton);
  }

  function removeDrawHint() {
    const hint = document.getElementById('wordmap-draw-hint');
    if (hint) hint.remove();
  }

  function hideDrawHint() {
    const hint = document.getElementById('wordmap-draw-hint');
    if (!hint) return;
    clearDrawHintTimer();
    hint.classList.add('is-hiding');
    window.setTimeout(() => {
      if (hint.classList.contains('is-hiding')) hint.hidden = true;
    }, 180);
  }

  function clearDrawHintTimer() {
    if (!drawHintTimer) return;
    window.clearTimeout(drawHintTimer);
    drawHintTimer = null;
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
          <button class="wordmap-card-close" data-role="close" type="button">×</button>
        </div>
        <div id="wordmap-card-content"></div>
      `;
      document.body.appendChild(card);
      installCardInteractions(card, card.querySelector('.wordmap-card-header'));
      card.querySelector('[data-role="close"]').addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeCard();
      });
    }

    updateCardStaticCopy();
    positionCard(card, x, y);
    return { card, content: document.getElementById('wordmap-card-content') };
  }

  function installCardInteractions(card, handle) {
    let dragging = false;
    let pointerId = null;
    let startClientX = 0;
    let startClientY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (event) => {
      if (event.target.closest('.wordmap-card-close')) return;
      dragging = true;
      pointerId = event.pointerId;
      startClientX = event.clientX;
      startClientY = event.clientY;
      startLeft = card.offsetLeft;
      startTop = card.offsetTop;
      handle.style.cursor = 'grabbing';
      event.preventDefault();
    };

    const onPointerMove = (event) => {
      if (!dragging || event.pointerId !== pointerId) return;
      const nextLeft = startLeft + (event.clientX - startClientX);
      const nextTop = startTop + (event.clientY - startClientY);
      card.style.left = `${clamp(nextLeft, 10, window.innerWidth - card.offsetWidth - 10)}px`;
      card.style.top = `${clamp(nextTop, 10, window.innerHeight - card.offsetHeight - 10)}px`;
    };

    const onPointerUp = () => {
      dragging = false;
      pointerId = null;
      handle.style.cursor = isTouchEnvironment() ? 'default' : 'grab';
    };

    const onOutsidePointerDown = (event) => {
      if (!card.contains(event.target)) removeCard();
    };

    handle.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    const outsideTimer = window.setTimeout(() => {
      document.addEventListener('pointerdown', onOutsidePointerDown, true);
    }, 80);

    card._cleanupFns = [
      () => window.clearTimeout(outsideTimer),
      () => handle.removeEventListener('pointerdown', onPointerDown),
      () => document.removeEventListener('pointermove', onPointerMove),
      () => document.removeEventListener('pointerup', onPointerUp),
      () => document.removeEventListener('pointercancel', onPointerUp),
      () => document.removeEventListener('pointerdown', onOutsidePointerDown, true)
    ];
  }

  function updateCardStaticCopy() {
    const card = document.getElementById('wordmap-result-card');
    if (!card) return;

    const subtitle = card.querySelector('[data-role="subtitle"]');
    const closeButton = card.querySelector('[data-role="close"]');
    if (subtitle) subtitle.textContent = WordMapI18n.t(currentUiLang, 'cardSubtitle');
    if (closeButton) {
      closeButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'closeButtonAria'));
      closeButton.setAttribute('title', WordMapI18n.t(currentUiLang, 'closeButtonAria'));
    }
  }

  function showStatusCard(payload, x, y) {
    const { card, content } = getOrCreateCard(x, y);
    content.innerHTML = '';

    const status = document.createElement('div');
    status.className = `wordmap-status${payload.state === 'error' ? ' wordmap-status--error' : ''}`;

    const icon = document.createElement('div');
    icon.className = 'wordmap-status-visual';
    if (payload.state === 'error') {
      icon.classList.add('wordmap-status-error-icon');
      icon.textContent = '✕';
    } else {
      const spinner = document.createElement('div');
      spinner.className = 'wordmap-status-spinner';
      icon.appendChild(spinner);
    }

    const copy = document.createElement('div');
    copy.className = 'wordmap-status-copy';
    const title = document.createElement('div');
    title.className = 'wordmap-status-title';
    title.textContent = payload.title;
    copy.appendChild(title);

    if (payload.detail) {
      const detail = document.createElement('div');
      detail.className = 'wordmap-status-detail';
      detail.textContent = payload.detail;
      copy.appendChild(detail);
    }

    status.appendChild(icon);
    status.appendChild(copy);
    content.appendChild(status);
    positionCard(card, x, y);

    if (payload.state === 'error') {
      cardAutoCloseTimer = window.setTimeout(removeCard, 4200);
    }
  }

  function renderResult(data, x, y, ocrText) {
    const { card, content } = getOrCreateCard(x, y);
    content.innerHTML = '';

    let fullTranslation = '';
    let wordPairs = [];

    if (Array.isArray(data)) {
      wordPairs = data;
    } else if (data && typeof data === 'object') {
      fullTranslation = data.full_translation || data.translation || '';
      wordPairs = Array.isArray(data.words) ? data.words : [];
    }

    if (wordPairs.length === 0 && !fullTranslation) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'errorTitle'),
        detail: WordMapI18n.t(currentUiLang, 'resultEmpty'),
        state: 'error'
      }, x, y);
      return;
    }

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
    positionCard(card, x, y);
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

  function positionCard(card, x, y) {
    requestAnimationFrame(() => {
      const margin = 12;
      const cardWidth = card.offsetWidth || 420;
      const cardHeight = card.offsetHeight || 240;

      if (window.innerWidth <= 720) {
        const left = Math.max(margin, (window.innerWidth - cardWidth) / 2);
        const top = margin + 44;
        card.style.left = `${left}px`;
        card.style.top = `${Math.min(top, window.innerHeight - cardHeight - margin)}px`;
        return;
      }

      const idealLeft = x + 18;
      const idealTop = y + 18;
      const maxLeft = window.innerWidth - cardWidth - margin;
      const maxTop = window.innerHeight - cardHeight - margin;
      card.style.left = `${clamp(idealLeft, margin, maxLeft)}px`;
      card.style.top = `${clamp(idealTop, margin, maxTop)}px`;
    });
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
    card.remove();
  }

  function updateMobileLauncher() {
    if (!shouldShowMobileLauncher()) {
      hideMobileLauncher();
      return;
    }

    const launcher = getOrCreateMobileLauncher();
    syncMobileLauncherCopy(launcher);
    applyMobileLauncherPosition(launcher, mobileLauncherPosition);
    launcher.hidden = false;
  }

  function shouldShowMobileLauncher() {
    return isTouchEnvironment() && mobileQuickEnabled && !canvas;
  }

  function hideMobileLauncher() {
    const launcher = document.getElementById('wordmap-mobile-launcher');
    if (launcher) launcher.hidden = true;
  }

  function getOrCreateMobileLauncher() {
    let launcher = document.getElementById('wordmap-mobile-launcher');
    if (launcher) return launcher;

    launcher = document.createElement('div');
    launcher.id = 'wordmap-mobile-launcher';
    launcher.innerHTML = `
      <button class="wordmap-mobile-launcher-main" type="button" data-role="main">WM</button>
      <button class="wordmap-mobile-launcher-mode" type="button" data-role="mode"></button>
    `;
    document.body.appendChild(launcher);

    const mainButton = launcher.querySelector('[data-role="main"]');
    const modeButton = launcher.querySelector('[data-role="mode"]');

    let dragState = null;

    mainButton.addEventListener('pointerdown', (event) => {
      dragState = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startLeft: launcher.offsetLeft,
        startTop: launcher.offsetTop,
        moved: false
      };
      if (mainButton.setPointerCapture) {
        try { mainButton.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      }
      event.preventDefault();
    });

    mainButton.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      const dx = event.clientX - dragState.startClientX;
      const dy = event.clientY - dragState.startClientY;

      if (!dragState.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        dragState.moved = true;
      }

      if (!dragState.moved) return;

      applyMobileLauncherPosition(launcher, {
        left: dragState.startLeft + dx,
        top: dragState.startTop + dy
      });
      event.preventDefault();
    });

    const finishDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      if (dragState.moved) {
        mobileLauncherPosition = {
          left: launcher.offsetLeft,
          top: launcher.offsetTop
        };
        chrome.storage.local.set({ mobileLauncherPosition });
      } else {
        launchFromMobileBubble(launcher);
      }
      dragState = null;
      event.preventDefault();
    };

    mainButton.addEventListener('pointerup', finishDrag);
    mainButton.addEventListener('pointercancel', () => { dragState = null; });

    modeButton.addEventListener('click', (event) => {
      event.preventDefault();
      mobileQuickMode = mobileQuickMode === 'rect' ? 'pencil' : 'rect';
      chrome.storage.local.set({ mobileQuickMode });
      syncMobileLauncherCopy(launcher);
      showLauncherToast(
        mobileQuickMode === 'rect'
          ? WordMapI18n.t(currentUiLang, 'mobileLauncherSwitchedRect')
          : WordMapI18n.t(currentUiLang, 'mobileLauncherSwitchedFreehand')
      );
    });

    return launcher;
  }

  function syncMobileLauncherCopy(launcher) {
    const modeButton = launcher.querySelector('[data-role="mode"]');
    modeButton.innerHTML = getModeIconSvg(mobileQuickMode);
    modeButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'mobileLauncherModeAria'));
    modeButton.setAttribute('title',
      mobileQuickMode === 'rect'
        ? WordMapI18n.t(currentUiLang, 'mobileLauncherModeRect')
        : WordMapI18n.t(currentUiLang, 'mobileLauncherModeFreehand')
    );

    const mainButton = launcher.querySelector('[data-role="main"]');
    mainButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'mobileLauncherMainAria'));
    mainButton.setAttribute('title', WordMapI18n.t(currentUiLang, 'mobileLauncherMainAria'));
  }

  function getModeIconSvg(mode) {
    if (mode === 'pencil') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 20l3.2-.8 9.9-9.9a2.4 2.4 0 0 0-3.4-3.4L3.8 15.8 3 19z"></path>
        <path d="M12.6 6.9l4.5 4.5"></path>
      </svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4.5" y="6" width="15" height="12" rx="2.5"></rect>
      <path d="M8 10h8"></path>
      <path d="M8 14h5"></path>
    </svg>`;
  }

  function applyMobileLauncherPosition(launcher, pos) {
    const left = pos && Number.isFinite(pos.left) ? pos.left : window.innerWidth - 74;
    const top = pos && Number.isFinite(pos.top) ? pos.top : window.innerHeight - 110;
    launcher.style.left = `${clamp(left, 10, window.innerWidth - launcher.offsetWidth - 10)}px`;
    launcher.style.top = `${clamp(top, 10, window.innerHeight - launcher.offsetHeight - 10)}px`;
  }

  function launchFromMobileBubble(launcher) {
    chrome.storage.local.get(['apiBaseUrl', 'modelName'], (stored) => {
      if (!String(stored.apiBaseUrl || '').trim() || !String(stored.modelName || '').trim()) {
        const rect = launcher.getBoundingClientRect();
        lastX = rect.left + rect.width / 2;
        lastY = rect.top;
        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'errorTitle'),
          detail: WordMapI18n.t(currentUiLang, 'mobileLauncherSetupToast'),
          state: 'error'
        }, lastX, lastY);
        return;
      }

      const rect = launcher.getBoundingClientRect();
      lastX = rect.left + rect.width / 2;
      lastY = rect.top;
      toggleDrawMode(mobileQuickMode);
    });
  }

  function showLauncherToast(message) {
    let toast = document.getElementById('wordmap-mobile-launcher-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'wordmap-mobile-launcher-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(launcherToastTimer);
    launcherToastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1400);
  }

  function handleViewportResize() {
    if (canvas) {
      cleanupCanvas({ restoreLauncher: true });
      return;
    }
    const launcher = document.getElementById('wordmap-mobile-launcher');
    if (launcher && !launcher.hidden) {
      applyMobileLauncherPosition(launcher, mobileLauncherPosition);
    }
  }

  function isTouchEnvironment() {
    return (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    );
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
})();
