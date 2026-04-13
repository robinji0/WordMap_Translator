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
  let mobileQuickEnabled = true;
  let mobileQuickMode = 'rect';
  let mobileLauncherPosition = null;
  let launcherToastTimer = null;
  let routerWarmupTimer = null;
  let drawHintSeenDesktop = false;
  let drawHintSeenTouch = false;

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
    chrome.storage.local.get(['uiLang', 'mobileQuickEnabled', 'mobileQuickMode', 'mobileLauncherPosition', 'drawHintSeenDesktop', 'drawHintSeenTouch'], (stored) => {
      currentUiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
      mobileQuickEnabled = stored.mobileQuickEnabled !== false;
      mobileQuickMode = stored.mobileQuickMode || 'rect';
      mobileLauncherPosition = stored.mobileLauncherPosition || null;
      drawHintSeenDesktop = stored.drawHintSeenDesktop === true;
      drawHintSeenTouch = stored.drawHintSeenTouch === true;
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
    if (changes.drawHintSeenDesktop) drawHintSeenDesktop = changes.drawHintSeenDesktop.newValue === true;
    if (changes.drawHintSeenTouch) drawHintSeenTouch = changes.drawHintSeenTouch.newValue === true;

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

    const shouldShowHint = shouldShowDrawHint();
    if (isTouchEnvironment() && !shouldShowHint) ensureDrawCloseButton();
    if (shouldShowHint) showDrawHint();

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

    const selectionBounds = { left: minX, top: minY, width, height };

    chrome.runtime.sendMessage({ action: 'capture_tab' }, (response) => {
      if (!response || response.error || !response.dataUrl) {
        if (isTouchEnvironment()) {
          runMobileCaptureFallback(selectionBounds).catch(() => {
            updateMobileLauncher();
            showStatusCard({
              title: WordMapI18n.t(currentUiLang, 'errorTitle'),
              detail: WordMapI18n.t(currentUiLang, 'errorCaptureFailedMobile'),
              state: 'error'
            }, lastX, lastY);
          });
          return;
        }

        updateMobileLauncher();
        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'errorTitle'),
          detail: WordMapI18n.t(currentUiLang, 'errorCaptureFailed'),
          state: 'error'
        }, lastX, lastY);
        return;
      }

      processCapturedDataUrl(response.dataUrl, selectionBounds);
    });
  }

  function processCapturedDataUrl(dataUrl, selectionBounds) {
    const image = new Image();
    image.onload = () => {
      const scaleX = image.width / window.innerWidth;
      const scaleY = image.height / window.innerHeight;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.max(1, Math.round(selectionBounds.width * scaleX));
      cropCanvas.height = Math.max(1, Math.round(selectionBounds.height * scaleY));
      const cropCtx = cropCanvas.getContext('2d');

      cropCtx.drawImage(
        image,
        selectionBounds.left * scaleX,
        selectionBounds.top * scaleY,
        selectionBounds.width * scaleX,
        selectionBounds.height * scaleY,
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
        imageBase64: cropCanvas.toDataURL('image/jpeg', 0.96)
      });
    };
    image.src = dataUrl;
  }

  async function runMobileCaptureFallback(selectionBounds) {
    showStatusCard({
      title: WordMapI18n.t(currentUiLang, 'statusMobileFallbackTitle'),
      detail: WordMapI18n.t(currentUiLang, 'statusMobileFallbackDetail'),
      state: 'progress'
    }, lastX, lastY);

    const fallbackResult = await captureSelectionFallback(selectionBounds);
    if (!fallbackResult) throw new Error('mobile_fallback_failed');

    updateMobileLauncher();

    if (fallbackResult.kind === 'text') {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'statusMobileTextFallbackTitle'),
        detail: WordMapI18n.t(currentUiLang, 'statusMobileTextFallbackDetail'),
        state: 'progress'
      }, lastX, lastY);
      chrome.runtime.sendMessage({ action: 'process_text', text: fallbackResult.text });
      return;
    }

    showStatusCard({
      title: WordMapI18n.t(currentUiLang, 'statusMobileImageFallbackTitle'),
      detail: WordMapI18n.t(currentUiLang, 'statusMobileImageFallbackDetail'),
      state: 'progress'
    }, lastX, lastY);
    chrome.runtime.sendMessage({ action: 'process_image', imageBase64: fallbackResult.dataUrl });
  }

  async function captureSelectionFallback(selectionBounds) {
    const visualCandidate = getBestVisualCandidate(selectionBounds);
    if (visualCandidate && visualCandidate.score > 0.55) {
      const dataUrl = await captureVisualCandidate(visualCandidate.element, selectionBounds);
      if (dataUrl) return { kind: 'image', dataUrl };
    }

    const extractedText = extractTextFromSelection(selectionBounds);
    if (extractedText && extractedText.length >= 6) {
      return { kind: 'text', text: extractedText };
    }

    if (visualCandidate) {
      const dataUrl = await captureVisualCandidate(visualCandidate.element, selectionBounds);
      if (dataUrl) return { kind: 'image', dataUrl };
    }

    if (extractedText) {
      return { kind: 'text', text: extractedText };
    }

    return null;
  }

  function extractTextFromSelection(selectionBounds) {
    if (!document.body) return '';
    const selectionRect = toSelectionRect(selectionBounds);
    const ignoredTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const text = String(node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (!text) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ignoredTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const collected = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(currentNode);
      const rects = Array.from(range.getClientRects());
      const hasOverlap = rects.some((rect) => computeIntersectionArea(rect, selectionRect) > 18);
      if (hasOverlap) {
        const text = String(currentNode.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (text) collected.push(text);
      }
      if (typeof range.detach === 'function') range.detach();
    }
    return normalizeExtractedText(collected.join('\n'));
  }

  function normalizeExtractedText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  function getBestVisualCandidate(selectionBounds) {
    const selectionRect = toSelectionRect(selectionBounds);
    const candidates = [];
    const seen = new Set();
    const centerX = selectionBounds.left + (selectionBounds.width / 2);
    const centerY = selectionBounds.top + (selectionBounds.height / 2);

    const centerElements = document.elementsFromPoint(centerX, centerY) || [];
    centerElements.forEach((element) => {
      const candidate = resolveVisualCandidateElement(element);
      if (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        candidates.push(candidate);
      }
    });

    document.querySelectorAll('img, canvas, svg, video').forEach((element) => {
      if (seen.has(element)) return;
      const rect = element.getBoundingClientRect();
      if (computeIntersectionArea(rect, selectionRect) > 0) {
        seen.add(element);
        candidates.push(element);
      }
    });

    let best = null;
    candidates.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (!isElementVisibleForCapture(element, rect)) return;
      const intersection = computeIntersectionArea(rect, selectionRect);
      if (intersection <= 0) return;
      const score = intersection / Math.max(1, selectionRect.width * selectionRect.height);
      if (!best || score > best.score) {
        best = { element, score };
      }
    });

    return best;
  }

  function resolveVisualCandidateElement(element) {
    if (!element) return null;
    const tagName = String(element.tagName || '').toUpperCase();
    if (tagName === 'IMG' || tagName === 'CANVAS' || tagName === 'SVG' || tagName === 'VIDEO') return element;
    return element.closest ? element.closest('img, canvas, svg, video') : null;
  }

  function isElementVisibleForCapture(element, rect) {
    if (!element || !rect || rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) return false;
    return true;
  }

  async function captureVisualCandidate(element, selectionBounds) {
    if (!element) return null;
    const tagName = String(element.tagName || '').toUpperCase();
    try {
      if (tagName === 'IMG') return await captureImgElement(element, selectionBounds);
      if (tagName === 'CANVAS') return captureCanvasElement(element, selectionBounds);
      if (tagName === 'SVG') return await captureSvgElement(element, selectionBounds);
      if (tagName === 'VIDEO') return captureVideoElement(element, selectionBounds);
    } catch (error) {
      return null;
    }
    return null;
  }

  async function captureImgElement(imgElement, selectionBounds) {
    const rect = imgElement.getBoundingClientRect();
    const direct = attemptCropFromDrawable(
      imgElement,
      rect,
      imgElement.naturalWidth || imgElement.width,
      imgElement.naturalHeight || imgElement.height,
      selectionBounds
    );
    if (direct) return direct;

    const src = imgElement.currentSrc || imgElement.src;
    if (!src) return null;

    const fetchedDataUrl = await fetchImageAsDataUrl(src);
    if (!fetchedDataUrl) return null;
    const image = await loadImageFromUrl(fetchedDataUrl);
    return attemptCropFromDrawable(
      image,
      rect,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      selectionBounds
    );
  }

  function captureCanvasElement(canvasElement, selectionBounds) {
    const rect = canvasElement.getBoundingClientRect();
    return attemptCropFromDrawable(canvasElement, rect, canvasElement.width, canvasElement.height, selectionBounds);
  }

  async function captureSvgElement(svgElement, selectionBounds) {
    const rect = svgElement.getBoundingClientRect();
    const serialized = new XMLSerializer().serializeToString(svgElement);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
    const image = await loadImageFromUrl(dataUrl);
    return attemptCropFromDrawable(
      image,
      rect,
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
      selectionBounds
    );
  }

  function captureVideoElement(videoElement, selectionBounds) {
    const rect = videoElement.getBoundingClientRect();
    return attemptCropFromDrawable(videoElement, rect, videoElement.videoWidth, videoElement.videoHeight, selectionBounds);
  }

  function attemptCropFromDrawable(drawable, rect, sourceWidth, sourceHeight, selectionBounds) {
    if (!drawable || !rect || !sourceWidth || !sourceHeight || rect.width <= 0 || rect.height <= 0) return null;
    const selectionRect = toSelectionRect(selectionBounds);
    const clipLeft = Math.max(selectionRect.left, rect.left);
    const clipTop = Math.max(selectionRect.top, rect.top);
    const clipRight = Math.min(selectionRect.right, rect.right);
    const clipBottom = Math.min(selectionRect.bottom, rect.bottom);
    const clipWidth = clipRight - clipLeft;
    const clipHeight = clipBottom - clipTop;
    if (clipWidth <= 0 || clipHeight <= 0) return null;

    const scaleX = sourceWidth / rect.width;
    const scaleY = sourceHeight / rect.height;
    const sx = Math.max(0, Math.round((clipLeft - rect.left) * scaleX));
    const sy = Math.max(0, Math.round((clipTop - rect.top) * scaleY));
    const sw = Math.max(1, Math.round(clipWidth * scaleX));
    const sh = Math.max(1, Math.round(clipHeight * scaleY));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.max(1, Math.round(clipWidth * scaleX));
    outCanvas.height = Math.max(1, Math.round(clipHeight * scaleY));
    const outCtx = outCanvas.getContext('2d');
    outCtx.drawImage(drawable, sx, sy, sw, sh, 0, 0, outCanvas.width, outCanvas.height);
    return outCanvas.toDataURL('image/jpeg', 0.96);
  }

  function toSelectionRect(selectionBounds) {
    return {
      left: selectionBounds.left,
      top: selectionBounds.top,
      right: selectionBounds.left + selectionBounds.width,
      bottom: selectionBounds.top + selectionBounds.height,
      width: selectionBounds.width,
      height: selectionBounds.height
    };
  }

  function computeIntersectionArea(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    const width = right - left;
    const height = bottom - top;
    if (width <= 0 || height <= 0) return 0;
    return width * height;
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image_load_failed'));
      image.src = url;
    });
  }

  function fetchImageAsDataUrl(url) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'fetch_image_as_data_url', url }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        if (!response || response.error || !response.dataUrl) {
          reject(new Error(response && response.error ? response.error : 'image_fetch_failed'));
          return;
        }
        resolve(response.dataUrl);
      });
    });
  }

  function cleanupCanvas({ restoreLauncher = true } = {}) {
    removeDrawHint();
    removeDrawCloseButton();
    document.documentElement.classList.remove('wordmap-drawing-mode');
    document.body.classList.remove('wordmap-drawing-mode');

    if (canvas) {
      canvas.remove();
      canvas = null;
    }

    isDrawing = false;
    points = [];
    activePointerId = null;

    if (restoreLauncher && isTouchEnvironment() && routerDebuggerPrepared && !routerCaptureInFlight) {
      void releaseRouterDebugger('router_canvas_cleanup');
    }

    if (restoreLauncher) updateMobileLauncher();
  }

  function shouldShowDrawHint() {
    return isTouchEnvironment() ? !drawHintSeenTouch : !drawHintSeenDesktop;
  }

  function markDrawHintSeen() {
    const key = isTouchEnvironment() ? 'drawHintSeenTouch' : 'drawHintSeenDesktop';
    if (key === 'drawHintSeenTouch') {
      if (drawHintSeenTouch) return;
      drawHintSeenTouch = true;
    } else {
      if (drawHintSeenDesktop) return;
      drawHintSeenDesktop = true;
    }
    chrome.storage.local.set({ [key]: true });
  }

  function ensureDrawCloseButton() {
    if (!isTouchEnvironment()) return;
    let closeButton = document.getElementById('wordmap-draw-close');
    if (!closeButton) {
      closeButton = document.createElement('button');
      closeButton.id = 'wordmap-draw-close';
      closeButton.type = 'button';
      closeButton.textContent = '×';
      closeButton.addEventListener('click', () => cleanupCanvas({ restoreLauncher: true }));
      document.body.appendChild(closeButton);
    }
    closeButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'drawHintCancel'));
    closeButton.setAttribute('title', WordMapI18n.t(currentUiLang, 'drawHintCancel'));
  }

  function removeDrawCloseButton() {
    const closeButton = document.getElementById('wordmap-draw-close');
    if (closeButton) closeButton.remove();
  }

  function showDrawHint() {
    markDrawHintSeen();
    let hint = document.getElementById('wordmap-draw-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'wordmap-draw-hint';
      document.body.appendChild(hint);
    }
    updateDrawHintCopy();
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


  const WORDMAP_ROUTER_KEYS = {
    RELOAD_ARMED: '__wm_router_reload_armed__',
    SCROLL_X: '__wm_router_scroll_x__',
    SCROLL_Y: '__wm_router_scroll_y__',
    AUTO_START: '__wm_router_auto_start__',
    AUTO_MODE: '__wm_router_auto_mode__',
    WARMUP_HINT_SHOWN: '__wm_router_warmup_hint_shown__'
  };

  let wordmapProbeReady = false;
  let routerPrepareInFlight = false;
  let routerDebuggerPrepared = false;
  let routerCaptureInFlight = false;
  let routerMessageCounter = 1;
  const routerProbeRequests = new Map();
  const routerSoftWarmRefs = new Set();

  function initSmartRouter() {
    window.addEventListener('message', handleRouterProbeMessage);
    restoreRouterAfterReloadIfNeeded();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureProbeScriptPresent, { once: true });
    } else {
      ensureProbeScriptPresent();
    }
  }

  function handleRouterProbeMessage(event) {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;
    if (event.data.source === 'WMV_PROBE' && event.data.type === 'WMV_PROBE_READY') {
      wordmapProbeReady = true;
      return;
    }
    if (event.data.source === 'WMV_PROBE' && event.data.requestId) {
      const pending = routerProbeRequests.get(event.data.requestId);
      if (!pending) return;
      routerProbeRequests.delete(event.data.requestId);
      pending.resolve(event.data);
    }
  }

  function ensureProbeScriptPresent() {
    if (document.getElementById('wordmap-probe-main')) return;
    try {
      const host = document.documentElement || document.head || document.body;
      if (!host) return;
      const script = document.createElement('script');
      script.id = 'wordmap-probe-main';
      script.src = chrome.runtime.getURL('probe-main.js');
      script.async = false;
      host.appendChild(script);
    } catch {
      // probe is optional for non-blob pages
    }
  }

  function routerSend(message) {
    return chrome.runtime.sendMessage(message);
  }

  function requestBlobExportForRouter(url, timeout = 3000) {
    if (!wordmapProbeReady) return Promise.resolve(null);
    return new Promise((resolve) => {
      const requestId = `router-blob-${routerMessageCounter++}`;
      const timer = window.setTimeout(() => {
        routerProbeRequests.delete(requestId);
        resolve(null);
      }, timeout);
      routerProbeRequests.set(requestId, {
        resolve: (payload) => {
          window.clearTimeout(timer);
          resolve(payload);
        }
      });
      window.postMessage({ source: 'WMV_CONTENT', type: 'WMV_EXPORT_BLOB', url, requestId }, '*');
    });
  }

  function requestProbeWarmResource(candidate, timeout = 1500) {
    if (!wordmapProbeReady || !candidate || !candidate.sourceUrl) return Promise.resolve(null);
    return new Promise((resolve) => {
      const requestId = `router-warm-${routerMessageCounter++}`;
      const timer = window.setTimeout(() => {
        routerProbeRequests.delete(requestId);
        resolve(null);
      }, timeout + 200);
      routerProbeRequests.set(requestId, {
        resolve: (payload) => {
          window.clearTimeout(timer);
          resolve(payload);
        }
      });
      window.postMessage({
        source: 'WMV_CONTENT',
        type: 'WMV_WARM_RESOURCE',
        candidate,
        requestId,
        timeout
      }, '*');
    });
  }

  function releaseRouterDebugger(reason = 'router_capture_complete') {
    if (!routerDebuggerPrepared) return Promise.resolve();
    routerDebuggerPrepared = false;
    return routerSend({ action: 'wm_debugger_detach', reason }).catch(() => null);
  }

  function softWarmRouterUrl(url, timeout = 1200) {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return Promise.resolve(false);
    return new Promise((resolve) => {
      let settled = false;
      let timer = 0;
      const img = new Image();
      routerSoftWarmRefs.add(img);

      const finalize = (result) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        routerSoftWarmRefs.delete(img);
        resolve(result);
      };

      timer = window.setTimeout(() => finalize(false), timeout);
      img.onload = () => finalize(true);
      img.onerror = () => finalize(false);

      try {
        img.decoding = 'async';
      } catch {
        // ignore
      }

      try {
        img.src = url;
      } catch {
        finalize(false);
        return;
      }

      try {
        fetch(url, {
          mode: 'no-cors',
          credentials: 'include',
          cache: 'reload'
        }).catch(() => null).finally(() => {
          window.setTimeout(() => finalize(true), 80);
        });
      } catch {
        // ignore
      }
    });
  }

  async function softWarmRouterCandidates(candidates, timeout = 1200) {
    const uniqueCandidates = [];
    const seen = new Set();
    (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
      const url = candidate && candidate.sourceUrl;
      if (!url || url.startsWith('blob:') || url.startsWith('data:')) return;
      if (seen.has(url)) return;
      seen.add(url);
      uniqueCandidates.push(candidate);
    });

    if (!uniqueCandidates.length) {
      return { attempted: 0, succeeded: 0, pageProbe: false };
    }

    const limited = uniqueCandidates.slice(0, 6);
    const useProbe = wordmapProbeReady;
    const results = await Promise.allSettled(
      limited.map((candidate) => (
        useProbe
          ? requestProbeWarmResource(candidate, timeout)
          : softWarmRouterUrl(candidate.sourceUrl, timeout).then((ok) => ({ ok, reason: ok ? 'content_soft_warm' : 'content_soft_warm_failed' }))
      ))
    );
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    return {
      attempted: limited.length,
      succeeded: results.filter((item) => item.status === 'fulfilled' && item.value && item.value.ok).length,
      pageProbe: useProbe
    };
  }

  async function prepareRouterAndOpen(mode) {
    if (routerPrepareInFlight) return;
    routerPrepareInFlight = true;
    currentTool = mode;
    removeCard();
    hideMobileLauncher();

    const shouldShowWarmupHint = sessionStorage.getItem(WORDMAP_ROUTER_KEYS.WARMUP_HINT_SHOWN) !== '1';
    window.clearTimeout(routerWarmupTimer);
    routerWarmupTimer = null;
    if (shouldShowWarmupHint) {
      routerWarmupTimer = window.setTimeout(() => {
        if (!routerPrepareInFlight) return;
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.WARMUP_HINT_SHOWN, '1');
        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'statusRouterWarmupTitle'),
          detail: WordMapI18n.t(currentUiLang, 'statusRouterWarmupDetail'),
          state: 'progress'
        }, lastX, lastY);
      }, 280);
    }

    try {
      const prep = await routerSend({ action: 'wm_prepare' });
      if (!prep || prep.ok === false) {
        throw new Error(prep && prep.error ? prep.error : 'router_prepare_failed');
      }
      routerDebuggerPrepared = true;

      const armed = sessionStorage.getItem(WORDMAP_ROUTER_KEYS.RELOAD_ARMED);
      if (prep.requiresReload && armed !== 'done') {
        window.clearTimeout(routerWarmupTimer);
        routerWarmupTimer = null;
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.RELOAD_ARMED, 'pending');
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.SCROLL_X, String(window.scrollX || 0));
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.SCROLL_Y, String(window.scrollY || 0));
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.AUTO_START, '1');
        sessionStorage.setItem(WORDMAP_ROUTER_KEYS.AUTO_MODE, mode);
        showStatusCard({
          title: WordMapI18n.t(currentUiLang, 'statusRouterReloadTitle'),
          detail: WordMapI18n.t(currentUiLang, 'statusRouterReloadDetail'),
          state: 'progress'
        }, lastX, lastY);
        window.setTimeout(() => location.reload(), 180);
        return;
      }

      window.clearTimeout(routerWarmupTimer);
      routerWarmupTimer = null;
      openDrawCanvas();
    } catch (error) {
      routerDebuggerPrepared = false;
      window.clearTimeout(routerWarmupTimer);
      routerWarmupTimer = null;
      updateMobileLauncher();
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'errorTitle'),
        detail: WordMapI18n.t(currentUiLang, 'errorRouterPrepare', { message: error.message || String(error) }),
        state: 'error'
      }, lastX, lastY);
    } finally {
      window.clearTimeout(routerWarmupTimer);
      routerWarmupTimer = null;
      routerPrepareInFlight = false;
    }
  }

  function restoreRouterAfterReloadIfNeeded() {
    const armed = sessionStorage.getItem(WORDMAP_ROUTER_KEYS.RELOAD_ARMED);
    if (!armed) return;

    const sx = Number(sessionStorage.getItem(WORDMAP_ROUTER_KEYS.SCROLL_X) || '0');
    const sy = Number(sessionStorage.getItem(WORDMAP_ROUTER_KEYS.SCROLL_Y) || '0');
    const autoMode = sessionStorage.getItem(WORDMAP_ROUTER_KEYS.AUTO_MODE) || 'rect';

    sessionStorage.setItem(WORDMAP_ROUTER_KEYS.RELOAD_ARMED, 'done');
    window.scrollTo(sx, sy);

    if (sessionStorage.getItem(WORDMAP_ROUTER_KEYS.AUTO_START) === '1') {
      sessionStorage.removeItem(WORDMAP_ROUTER_KEYS.AUTO_START);
      window.setTimeout(() => {
        toggleDrawMode(autoMode, { skipRouterPreparation: true });
      }, 360);
    }
  }

  function toggleDrawMode(mode, options = {}) {
    currentTool = mode;

    if (document.getElementById('wordmap-canvas')) {
      cleanupCanvas({ restoreLauncher: true });
      return;
    }

    if (isTouchEnvironment() && !options.skipRouterPreparation) {
      prepareRouterAndOpen(mode);
      return;
    }

    openDrawCanvas();
  }

  function openDrawCanvas() {
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

    const shouldShowHint = shouldShowDrawHint();
    if (isTouchEnvironment() && !shouldShowHint) ensureDrawCloseButton();
    if (shouldShowHint) showDrawHint();

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerCancel);
  }

  function handleRuntimeMessage(request, sender, sendResponse) {
    if (request.uiLang) currentUiLang = WordMapI18n.getEffectiveUiLang(request.uiLang);

    if (request.action === 'toggle_draw') {
      toggleDrawMode(request.mode || 'rect');
      sendResponse({ status: 'ok' });
    } else if (request.action === 'show_status') {
      showStatusCard({ title: request.title, detail: request.detail, state: request.state || 'progress' }, lastX, lastY);
    } else if (request.action === 'show_result') {
      renderResult(request.data, lastX, lastY, request.ocrText || '', request.capturePreview || '', request.captureMeta || null);
    }
    return true;
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
    const selectionBounds = { left: minX, top: minY, width, height, right: minX + width, bottom: minY + height };

    cleanupCanvas({ restoreLauncher: false });

    if (isTouchEnvironment()) {
      routerCaptureInFlight = true;
      runSmartResourceCapture(selectionBounds).finally(() => {
        routerCaptureInFlight = false;
        releaseRouterDebugger('router_capture_complete').finally(() => updateMobileLauncher());
      });
      return;
    }

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
      processCapturedDataUrl(response.dataUrl, selectionBounds);
    });
  }

  async function runSmartResourceCapture(selectionBounds) {
    showStatusCard({
      title: WordMapI18n.t(currentUiLang, 'statusRouterCaptureTitle'),
      detail: WordMapI18n.t(currentUiLang, 'statusRouterCaptureDetail'),
      state: 'progress'
    }, lastX, lastY);

    let debugStatus = await routerSend({ action: 'wm_get_debug_status' }).catch(() => ({ ok: false, attached: false, totalImageEvents: 0 }));
    const rawCandidates = collectRouterCandidates(selectionBounds);
    const extractedText = extractTextFromSelection(selectionBounds);
    let warmStats = null;

    if (!rawCandidates.length && extractedText) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'statusRouterTextFallbackTitle'),
        detail: WordMapI18n.t(currentUiLang, 'statusRouterTextFallbackDetail'),
        state: 'progress'
      }, lastX, lastY);
      chrome.runtime.sendMessage({ action: 'process_text', text: extractedText, captureMeta: { path: 'dom_text', candidateType: 'text' } });
      return;
    }

    const candidates = await hydrateRouterBlobCandidates(rawCandidates);
    if (debugStatus && debugStatus.ok !== false && debugStatus.staleImageEvents) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'statusRouterWarmupTitle'),
        detail: WordMapI18n.t(currentUiLang, 'statusRouterWarmupDetail'),
        state: 'progress'
      }, lastX, lastY);
      warmStats = await softWarmRouterCandidates(candidates);
      debugStatus = await routerSend({ action: 'wm_get_debug_status' }).catch(() => debugStatus);
      if (warmStats && warmStats.attempted > 0 && Number(debugStatus.totalImageEvents || 0) === 0) {
        const retryStats = await softWarmRouterCandidates(candidates, 1800);
        warmStats = {
          attempted: Number(warmStats.attempted || 0) + Number(retryStats && retryStats.attempted || 0),
          succeeded: Number(warmStats.succeeded || 0) + Number(retryStats && retryStats.succeeded || 0),
          pageProbe: !!(warmStats.pageProbe || (retryStats && retryStats.pageProbe))
        };
        debugStatus = await routerSend({ action: 'wm_get_debug_status' }).catch(() => debugStatus);
      }
    }
    const resolvedResponse = await routerSend({ action: 'wm_resolve_resources', candidates }).catch((error) => ({ ok: false, error: error.message || String(error) }));
    const resolvedMap = new Map(((resolvedResponse && resolvedResponse.resolved) || []).map((item) => [item.candidateId, item.resource]));

    const previews = [];
    for (const candidate of candidates) {
      const resource = resolvedMap.get(candidate.id) || { ok: false, reason: 'resource_not_returned' };
      const item = { candidate, resource, isUseful: false, blankReason: '', stats: null, previewDataUrl: '' };
      if (resource.ok && resource.dataUrl) {
        try {
          Object.assign(item, await renderRouterCandidatePreview(candidate, resource, selectionBounds));
        } catch (error) {
          item.renderError = error.message || String(error);
        }
      }
      previews.push(item);
    }

    previews.sort((a, b) => {
      const scoreA = (a.stats && a.stats.score ? a.stats.score : -999) + (a.candidate.overlapArea || 0) / 100;
      const scoreB = (b.stats && b.stats.score ? b.stats.score : -999) + (b.candidate.overlapArea || 0) / 100;
      return scoreB - scoreA;
    });

    const best = previews.find((item) => item.resource && item.resource.ok && item.previewDataUrl && item.isUseful) || null;
    if (best && best.previewDataUrl) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'statusUploadingTitle'),
        detail: WordMapI18n.t(currentUiLang, 'statusUploadingDetail'),
        state: 'progress'
      }, lastX, lastY);
      chrome.runtime.sendMessage({
        action: 'process_image',
        imageBase64: best.previewDataUrl,
        capturePreview: best.previewDataUrl,
        captureMeta: {
          path: best.resource.path || 'router',
          candidateType: best.candidate.type,
          sourceUrl: best.resource.sourceUrl || best.candidate.sourceUrl || ''
        }
      });
      return;
    }

    if (extractedText) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'statusRouterTextFallbackTitle'),
        detail: WordMapI18n.t(currentUiLang, 'statusRouterTextFallbackDetail'),
        state: 'progress'
      }, lastX, lastY);
      chrome.runtime.sendMessage({ action: 'process_text', text: extractedText, captureMeta: { path: 'dom_text', candidateType: 'text' } });
      return;
    }

    renderRouterDiagnostics({
      selection: selectionBounds,
      debugStatus: debugStatus && debugStatus.ok !== false ? debugStatus : { attached: false, totalImageEvents: 0 },
      warmStats,
      previews,
      errorMessage: WordMapI18n.t(currentUiLang, 'errorRouterNoPreview')
    });
  }

  function collectRouterCandidates(selection) {
    const selectionRect = toSelectionRect(selection);
    const candidates = new Map();
    const seen = new Set();

    function isInternalNode(el) {
      if (!el) return true;
      const id = el.id || '';
      if (id.startsWith('wordmap-') || id.startsWith('wmv-')) return true;
      const cls = typeof el.className === 'string' ? el.className : '';
      return /wordmap-|wmv-/.test(cls);
    }

    function addElement(el) {
      if (!el || seen.has(el) || isInternalNode(el)) return;
      seen.add(el);
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) return;
      const rect = el.getBoundingClientRect();
      const box = toSelectionRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
      const overlap = intersectRouterRect(selectionRect, box);
      if (!overlap || overlap.width < 4 || overlap.height < 4) return;

      if (el.tagName === 'IMG' && el.currentSrc) {
        candidates.set(`img:${el.currentSrc}:${rect.left}:${rect.top}`, {
          id: `cand-${candidates.size + 1}`,
          type: 'img',
          sourceUrl: el.currentSrc,
          src: el.getAttribute('src') || el.currentSrc,
          srcset: el.getAttribute('srcset') || '',
          sizes: el.getAttribute('sizes') || '',
          crossOrigin: el.crossOrigin || '',
          referrerPolicy: el.referrerPolicy || '',
          fetchPriority: el.fetchPriority || '',
          rect: box,
          overlapArea: overlap.width * overlap.height,
          naturalWidth: el.naturalWidth || 0,
          naturalHeight: el.naturalHeight || 0,
          objectFit: style.objectFit || 'fill',
          objectPosition: style.objectPosition || '50% 50%'
        });
        return;
      }

      const bg = style.backgroundImage || '';
      const match = bg.match(/url\(["']?(.*?)["']?\)/i);
      if (match && match[1]) {
        candidates.set(`bg:${match[1]}:${rect.left}:${rect.top}`, {
          id: `cand-${candidates.size + 1}`,
          type: 'bg',
          sourceUrl: match[1],
          rect: box,
          overlapArea: overlap.width * overlap.height,
          backgroundSize: style.backgroundSize || 'auto',
          backgroundPosition: style.backgroundPosition || '0% 0%',
          backgroundRepeat: style.backgroundRepeat || 'repeat'
        });
      }
    }

    const sampleCols = 4;
    const sampleRows = 4;
    for (let row = 0; row <= sampleRows; row += 1) {
      for (let col = 0; col <= sampleCols; col += 1) {
        const x = selection.left + (selection.width * col) / sampleCols;
        const y = selection.top + (selection.height * row) / sampleRows;
        const stack = document.elementsFromPoint(clamp(x, 0, window.innerWidth - 1), clamp(y, 0, window.innerHeight - 1));
        stack.forEach((el) => {
          let node = el;
          for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
            addElement(node);
          }
        });
      }
    }

    Array.from(document.images).forEach(addElement);

    return Array.from(candidates.values())
      .sort((a, b) => (b.overlapArea || 0) - (a.overlapArea || 0))
      .slice(0, 8);
  }

  async function hydrateRouterBlobCandidates(candidates) {
    const hydrated = [];
    for (const candidate of candidates) {
      const next = { ...candidate };
      if (candidate.sourceUrl.startsWith('blob:') && wordmapProbeReady) {
        const exported = await requestBlobExportForRouter(candidate.sourceUrl);
        if (exported && exported.ok && exported.dataUrl) {
          next.inlineDataUrl = exported.dataUrl;
          next.inlineMimeType = exported.mimeType || 'image/png';
        }
      }
      hydrated.push(next);
    }
    return hydrated;
  }

  function intersectRouterRect(a, b) {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    if (right <= left || bottom <= top) return null;
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  function parseRouterPositionPair(raw) {
    const value = (raw || '50% 50%').trim().replace(/\s+/g, ' ');
    const parts = value.split(' ');
    return [routerPositionToFraction(parts[0] || '50%'), routerPositionToFraction(parts[1] || '50%')];
  }

  function routerPositionToFraction(token) {
    const normalized = String(token || '').trim().toLowerCase();
    if (normalized === 'left' || normalized === 'top') return 0;
    if (normalized === 'center') return 0.5;
    if (normalized === 'right' || normalized === 'bottom') return 1;
    if (normalized.endsWith('%')) {
      const num = Number(normalized.slice(0, -1));
      if (!Number.isNaN(num)) return num / 100;
    }
    return 0.5;
  }

  function parseRouterBackgroundSize(raw, boxWidth, boxHeight, imageWidth, imageHeight) {
    const value = (raw || 'auto').trim().toLowerCase();
    if (value === 'cover') {
      const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
      return { width: imageWidth * scale, height: imageHeight * scale };
    }
    if (value === 'contain') {
      const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
      return { width: imageWidth * scale, height: imageHeight * scale };
    }
    if (value === 'auto') {
      return { width: imageWidth, height: imageHeight };
    }

    const parts = value.split(' ');
    const first = parts[0];
    const second = parts[1] || 'auto';
    function lenToPx(token, axisLength) {
      if (token === 'auto') return null;
      if (token.endsWith('%')) return axisLength * (Number(token.slice(0, -1)) / 100);
      if (token.endsWith('px')) return Number(token.slice(0, -2));
      const num = Number(token);
      return Number.isFinite(num) ? num : null;
    }
    let w = lenToPx(first, boxWidth);
    let h = lenToPx(second, boxHeight);
    if (w == null && h == null) return { width: imageWidth, height: imageHeight };
    if (w == null) w = (h / imageHeight) * imageWidth;
    if (h == null) h = (w / imageWidth) * imageHeight;
    return { width: w, height: h };
  }

  function computeRouterCrop(candidate, selection, imageWidth, imageHeight) {
    const local = {
      left: selection.left - candidate.rect.left,
      top: selection.top - candidate.rect.top,
      width: selection.width,
      height: selection.height
    };
    if (candidate.type === 'bg') {
      return computeRouterBackgroundCrop(candidate, local, imageWidth, imageHeight);
    }
    return computeRouterImageCrop(candidate, local, imageWidth, imageHeight);
  }

  function computeRouterImageCrop(candidate, local, imageWidth, imageHeight) {
    const rectW = candidate.rect.width;
    const rectH = candidate.rect.height;
    const fit = (candidate.objectFit || 'fill').toLowerCase();
    const pos = parseRouterPositionPair(candidate.objectPosition || '50% 50%');
    const posX = pos[0];
    const posY = pos[1];

    let drawnW;
    let drawnH;
    let scaleX;
    let scaleY;
    let offsetX;
    let offsetY;

    if (fit === 'fill') {
      drawnW = rectW;
      drawnH = rectH;
      scaleX = rectW / imageWidth;
      scaleY = rectH / imageHeight;
      offsetX = 0;
      offsetY = 0;
    } else {
      let scale;
      if (fit === 'contain') scale = Math.min(rectW / imageWidth, rectH / imageHeight);
      else if (fit === 'cover') scale = Math.max(rectW / imageWidth, rectH / imageHeight);
      else if (fit === 'none') scale = 1;
      else if (fit === 'scale-down') scale = Math.min(1, Math.min(rectW / imageWidth, rectH / imageHeight));
      else scale = Math.min(rectW / imageWidth, rectH / imageHeight);

      drawnW = imageWidth * scale;
      drawnH = imageHeight * scale;
      scaleX = scale;
      scaleY = scale;
      offsetX = (rectW - drawnW) * posX;
      offsetY = (rectH - drawnH) * posY;
    }

    const overlap = intersectRouterRect(
      { left: local.left, top: local.top, right: local.left + local.width, bottom: local.top + local.height, width: local.width, height: local.height },
      { left: offsetX, top: offsetY, right: offsetX + drawnW, bottom: offsetY + drawnH, width: drawnW, height: drawnH }
    );
    if (!overlap) return { ok: false, error: 'selection_hits_only_blank_object_fit_padding' };

    const sx = clamp((overlap.left - offsetX) / scaleX, 0, imageWidth);
    const sy = clamp((overlap.top - offsetY) / scaleY, 0, imageHeight);
    const sw = clamp(overlap.width / scaleX, 1, imageWidth - sx);
    const sh = clamp(overlap.height / scaleY, 1, imageHeight - sy);

    return {
      ok: true,
      source: { sx, sy, sw, sh },
      output: { width: Math.max(1, Math.round(overlap.width)), height: Math.max(1, Math.round(overlap.height)) }
    };
  }

  function computeRouterBackgroundCrop(candidate, local, imageWidth, imageHeight) {
    const rectW = candidate.rect.width;
    const rectH = candidate.rect.height;
    const repeat = (candidate.backgroundRepeat || 'repeat').toLowerCase();
    if (repeat !== 'no-repeat') return { ok: false, error: 'background_repeat_unsupported' };

    const size = parseRouterBackgroundSize(candidate.backgroundSize, rectW, rectH, imageWidth, imageHeight);
    const pos = parseRouterPositionPair(candidate.backgroundPosition || '0% 0%');
    const drawnW = size.width;
    const drawnH = size.height;
    const offsetX = (rectW - drawnW) * pos[0];
    const offsetY = (rectH - drawnH) * pos[1];

    const overlap = intersectRouterRect(
      { left: local.left, top: local.top, right: local.left + local.width, bottom: local.top + local.height, width: local.width, height: local.height },
      { left: offsetX, top: offsetY, right: offsetX + drawnW, bottom: offsetY + drawnH, width: drawnW, height: drawnH }
    );
    if (!overlap) return { ok: false, error: 'selection_not_on_background_pixels' };

    const scaleX = drawnW / imageWidth;
    const scaleY = drawnH / imageHeight;
    const sx = clamp((overlap.left - offsetX) / scaleX, 0, imageWidth);
    const sy = clamp((overlap.top - offsetY) / scaleY, 0, imageHeight);
    const sw = clamp(overlap.width / scaleX, 1, imageWidth - sx);
    const sh = clamp(overlap.height / scaleY, 1, imageHeight - sy);

    return {
      ok: true,
      source: { sx, sy, sw, sh },
      output: { width: Math.max(1, Math.round(overlap.width)), height: Math.max(1, Math.round(overlap.height)) }
    };
  }

  function loadRouterImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('image_decode_failed'));
      image.src = dataUrl;
    });
  }

  function analyzeRouterCanvas(canvasToCheck) {
    const sampleW = Math.min(128, canvasToCheck.width);
    const sampleH = Math.min(128, canvasToCheck.height);
    const temp = document.createElement('canvas');
    temp.width = sampleW;
    temp.height = sampleH;
    temp.getContext('2d').drawImage(canvasToCheck, 0, 0, sampleW, sampleH);
    const data = temp.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, sampleW, sampleH).data;

    let sum = 0;
    let sumSq = 0;
    let dark = 0;
    let light = 0;
    const grays = new Float32Array(sampleW * sampleH);

    for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      grays[p] = gray;
      sum += gray;
      sumSq += gray * gray;
      if (gray < 18) dark += 1;
      if (gray > 237) light += 1;
    }

    const total = sampleW * sampleH;
    const mean = sum / total;
    const variance = sumSq / total - mean * mean;
    let edges = 0;
    for (let y = 1; y < sampleH; y += 1) {
      for (let x = 1; x < sampleW; x += 1) {
        const idx = y * sampleW + x;
        const dx = Math.abs(grays[idx] - grays[idx - 1]);
        const dy = Math.abs(grays[idx] - grays[idx - sampleW]);
        if (dx + dy > 32) edges += 1;
      }
    }
    const edgeDensity = edges / total;
    const darkRatio = dark / total;
    const lightRatio = light / total;
    const isMostlyBlack = darkRatio > 0.97;
    const isMostlyWhite = lightRatio > 0.97;
    const isLowInfo = variance < 18 && edgeDensity < 0.015;
    const isUseful = !(isMostlyBlack || isMostlyWhite || isLowInfo);

    let blankReason = '';
    if (isMostlyBlack) blankReason = 'almost_black';
    else if (isMostlyWhite) blankReason = 'almost_white';
    else if (isLowInfo) blankReason = 'low_information';

    return {
      mean,
      variance,
      edgeDensity,
      darkRatio,
      lightRatio,
      isUseful,
      blankReason,
      score: variance + edgeDensity * 500 + Math.min(400, canvasToCheck.width * canvasToCheck.height / 1200)
    };
  }

  async function renderRouterCandidatePreview(candidate, resource, selection) {
    const image = await loadRouterImage(resource.dataUrl);
    const crop = computeRouterCrop(candidate, selection, image.naturalWidth || image.width, image.naturalHeight || image.height);
    if (!crop.ok) return { renderError: crop.error };

    const outW = clamp(crop.output.width, 1, 2200);
    const outH = clamp(crop.output.height, 1, 2200);
    const canvasOut = document.createElement('canvas');
    canvasOut.width = outW;
    canvasOut.height = outH;
    const canvasCtx = canvasOut.getContext('2d');
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.fillRect(0, 0, outW, outH);
    canvasCtx.drawImage(image, crop.source.sx, crop.source.sy, crop.source.sw, crop.source.sh, 0, 0, outW, outH);

    const stats = analyzeRouterCanvas(canvasOut);
    return {
      previewDataUrl: canvasOut.toDataURL('image/png'),
      stats,
      blankReason: stats.blankReason,
      isUseful: stats.isUseful
    };
  }

  function renderResult(data, x, y, ocrText, capturePreview = '', captureMeta = null) {
    const pairData = data && typeof data === 'object' ? data : {};
    let fullTranslation = '';
    let wordPairs = [];

    if (Array.isArray(data)) {
      wordPairs = data;
    } else if (pairData && typeof pairData === 'object') {
      fullTranslation = pairData.full_translation || pairData.translation || '';
      wordPairs = Array.isArray(pairData.words) ? pairData.words : [];
    }

    if (!fullTranslation && wordPairs.length === 0) {
      showStatusCard({
        title: WordMapI18n.t(currentUiLang, 'errorTitle'),
        detail: WordMapI18n.t(currentUiLang, 'resultEmpty'),
        state: 'error'
      }, x, y);
      return;
    }

    const cardParts = [];
    if (capturePreview) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionCapturePreview'));
      const img = document.createElement('img');
      img.className = 'wordmap-capture-preview';
      img.src = capturePreview;
      img.alt = 'capture preview';
      section.appendChild(img);
      if (captureMeta && (captureMeta.path || captureMeta.candidateType)) {
        const meta = document.createElement('div');
        meta.className = 'wordmap-meta-line';
        const path = captureMeta.path || 'router';
        const type = captureMeta.candidateType || 'image';
        meta.innerHTML = `<strong>${WordMapI18n.t(currentUiLang, 'resultSectionCaptureMeta')}</strong> · ${escapeHtml(type)} / ${escapeHtml(path)}`;
        section.appendChild(meta);
      }
      cardParts.push(section);
    }

    if (ocrText) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionDetectedText'));
      const text = document.createElement('div');
      text.className = 'wordmap-ocr-text';
      text.textContent = ocrText;
      section.appendChild(text);
      cardParts.push(section);
    }

    if (fullTranslation) {
      const section = createSection(WordMapI18n.t(currentUiLang, 'resultSectionTranslation'));
      const text = document.createElement('div');
      text.className = 'wordmap-full-translation';
      text.textContent = fullTranslation;
      cardParts.push(section);
      section.appendChild(text);
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
      cardParts.push(section);
    }

    const { card, content } = getOrCreateCard(x, y);
    content.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'wordmap-result-grid';
    if (capturePreview && (ocrText || fullTranslation)) {
      cardParts[0].classList.add('wordmap-section--full');
    }
    cardParts.forEach((section) => grid.appendChild(section));
    content.appendChild(grid);
    positionCard(card, x, y);
  }

  function renderRouterDiagnostics(payload) {
    const { card, content } = getOrCreateCard(lastX, lastY);
    content.innerHTML = '';

    const top = document.createElement('div');
    top.className = 'wordmap-status wordmap-status--error';
    top.innerHTML = `
      <div class="wordmap-status-visual wordmap-status-error-icon">✕</div>
      <div class="wordmap-status-copy">
        <div class="wordmap-status-title">${escapeHtml(WordMapI18n.t(currentUiLang, 'errorTitle'))}</div>
        <div class="wordmap-status-detail">${escapeHtml(payload.errorMessage || WordMapI18n.t(currentUiLang, 'errorRouterNoPreview'))}</div>
      </div>
    `;
    content.appendChild(top);

    const summary = createSection(WordMapI18n.t(currentUiLang, 'resultSectionDiagnostics'));
    const debug = payload.debugStatus || {};
    const recentDiag = Array.isArray(debug.diagnostics) && debug.diagnostics.length
      ? debug.diagnostics[debug.diagnostics.length - 1].message
      : '';
    const warmStats = payload.warmStats || null;
    const details = document.createElement('div');
    details.className = 'wordmap-meta-line';
    const lines = [
      `<strong>${WordMapI18n.t(currentUiLang, 'diagnosticSelection')}</strong> · ${Math.round(payload.selection.width)} × ${Math.round(payload.selection.height)}`,
      `<strong>Debugger</strong> · ${debug.attached ? 'attached' : 'not attached'}`,
      `<strong>Network</strong> · ${Number(debug.totalImageEvents || 0)} image events`
    ];
    if (debug.staleImageEvents) lines.push('<strong>Session</strong> · warmup needed before capture');
    if (warmStats && warmStats.attempted) {
      lines.push(`<strong>Warmup</strong> · ${warmStats.succeeded}/${warmStats.attempted} dispatched${warmStats.pageProbe ? ' via page probe' : ''}`);
    }
    if (recentDiag) lines.push(`<strong>Latest</strong> · ${escapeHtml(recentDiag)}`);
    details.innerHTML = lines.join('<br>');
    summary.appendChild(details);
    content.appendChild(summary);

    const previewSection = createSection(WordMapI18n.t(currentUiLang, 'resultSectionCapturePreview'));
    previewSection.classList.add('wordmap-section--full');
    const grid = document.createElement('div');
    grid.className = 'wordmap-diagnostics-grid';

    const previews = Array.isArray(payload.previews) ? payload.previews : [];
    previews.forEach((item, index) => {
      const cardNode = document.createElement('div');
      cardNode.className = `wordmap-diagnostic-card ${item.isUseful ? 'wordmap-diagnostic-card--good' : 'wordmap-diagnostic-card--bad'}`;

      if (item.previewDataUrl) {
        const img = document.createElement('img');
        img.className = 'wordmap-diagnostic-preview';
        img.src = item.previewDataUrl;
        img.alt = `candidate ${index + 1}`;
        cardNode.appendChild(img);
      } else {
        const empty = document.createElement('div');
        empty.className = 'wordmap-diagnostic-empty';
        cardNode.appendChild(empty);
      }

      const meta = document.createElement('div');
      meta.className = 'wordmap-diagnostic-meta';
      const lines = [
        `${WordMapI18n.t(currentUiLang, 'diagnosticCandidate')} #${index + 1} · ${item.candidate.type}`,
        `${WordMapI18n.t(currentUiLang, 'diagnosticPath')} · ${item.resource && item.resource.path ? item.resource.path : 'unresolved'}`,
        `${WordMapI18n.t(currentUiLang, 'diagnosticScore')} · ${item.stats ? item.stats.score.toFixed(1) : 'n/a'}`,
        `${WordMapI18n.t(currentUiLang, 'diagnosticSource')} · ${truncateText(item.resource && (item.resource.sourceUrl || item.candidate.sourceUrl) || '', 72)}`
      ];
      if (item.blankReason) lines.push(`${WordMapI18n.t(currentUiLang, 'diagnosticReason')} · ${item.blankReason}`);
      if (item.renderError) lines.push(`${WordMapI18n.t(currentUiLang, 'diagnosticReason')} · ${item.renderError}`);
      if (item.resource && !item.resource.ok && item.resource.reason) lines.push(`${WordMapI18n.t(currentUiLang, 'diagnosticReason')} · ${item.resource.reason}`);
      meta.innerHTML = escapeHtml(lines.join('\n')).replace(/\n/g, '<br>');
      cardNode.appendChild(meta);
      grid.appendChild(cardNode);
    });

    previewSection.appendChild(grid);
    content.appendChild(previewSection);
    positionCard(card, lastX, lastY);
  }

  function truncateText(text, max = 72) {
    const value = String(text || '');
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>\"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  initSmartRouter();
})();
