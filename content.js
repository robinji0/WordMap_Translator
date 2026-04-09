(() => {
    let isDrawing = false;
    let canvas = null;
    let ctx = null;
    let points = [];
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pencil';
    let currentUiLang = WordMapI18n.detectBrowserUiLang();
    let cardAutoCloseTimer = null;

    loadStoredUiLang();

    if (window.wordmapEscListener) {
        document.removeEventListener('keydown', window.wordmapEscListener);
    }
    window.wordmapEscListener = handleEscKeydown;
    document.addEventListener('keydown', window.wordmapEscListener);

    if (window.wordmapMessageListener) {
        chrome.runtime.onMessage.removeListener(window.wordmapMessageListener);
    }
    window.wordmapMessageListener = handleRuntimeMessage;
    chrome.runtime.onMessage.addListener(window.wordmapMessageListener);

    if (window.wordmapStorageListener) {
        chrome.storage.onChanged.removeListener(window.wordmapStorageListener);
    }
    window.wordmapStorageListener = handleStorageChange;
    chrome.storage.onChanged.addListener(window.wordmapStorageListener);

    function loadStoredUiLang() {
        chrome.storage.local.get(['uiLang'], (result) => {
            currentUiLang = WordMapI18n.getEffectiveUiLang(result.uiLang);
            updateCardStaticCopy();
            updateDrawHintCopy();
        });
    }

    function handleStorageChange(changes, areaName) {
        if (areaName === 'local' && changes.uiLang) {
            currentUiLang = WordMapI18n.getEffectiveUiLang(changes.uiLang.newValue);
            updateCardStaticCopy();
            updateDrawHintCopy();
        }
    }

    function handleEscKeydown(event) {
        if (event.key !== 'Escape') {
            return;
        }

        if (document.getElementById('wordmap-canvas')) {
            cleanupCanvas();
        }

        removeCard();
    }

    function handleRuntimeMessage(request, sender, sendResponse) {
        if (request.uiLang) {
            currentUiLang = WordMapI18n.getEffectiveUiLang(request.uiLang);
        }

        if (request.action === 'toggle_draw') {
            toggleDrawMode(request.mode || 'pencil');
            sendResponse({ status: 'ok' });
        } else if (request.action === 'show_status') {
            showStatusCard(
                {
                    title: request.title,
                    detail: request.detail,
                    state: request.state || 'progress'
                },
                lastX,
                lastY
            );
        } else if (request.action === 'show_result') {
            renderResult(request.data, lastX, lastY, request.ocrText || '');
        } else if (request.action === 'update_status') {
            showStatusCard(
                {
                    title: request.message,
                    detail: '',
                    state: 'progress'
                },
                lastX,
                lastY
            );
        } else if (request.action === 'show_error') {
            showStatusCard(
                {
                    title: WordMapI18n.t(currentUiLang, 'errorTitle'),
                    detail: request.message,
                    state: 'error'
                },
                lastX,
                lastY
            );
        }

        return true;
    }

    function toggleDrawMode(mode) {
        currentTool = mode;

        if (document.getElementById('wordmap-canvas')) {
            cleanupCanvas();
            return;
        }

        removeCard();

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

        ctx = canvas.getContext('2d');
        initializeCanvasLook();

        document.body.appendChild(canvas);
        document.body.classList.add('wordmap-drawing-mode');
        showDrawHint();

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
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

    function startDrawing(event) {
        isDrawing = true;
        startX = event.clientX;
        startY = event.clientY;
        currentX = startX;
        currentY = startY;

        if (currentTool === 'pencil') {
            points = [];
            ctx.beginPath();
            ctx.moveTo(event.clientX, event.clientY);
            points.push({ x: event.clientX, y: event.clientY });
        }
    }

    function draw(event) {
        if (!isDrawing) {
            return;
        }

        currentX = event.clientX;
        currentY = event.clientY;

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

    function stopDrawing(event) {
        isDrawing = false;

        let minX;
        let minY;
        let width;
        let height;
        const padding = 12;

        if (currentTool === 'pencil') {
            ctx.closePath();
            if (points.length < 5) {
                cleanupCanvas();
                return;
            }

            const pMinX = Math.min(...points.map((point) => point.x));
            const pMaxX = Math.max(...points.map((point) => point.x));
            const pMinY = Math.min(...points.map((point) => point.y));
            const pMaxY = Math.max(...points.map((point) => point.y));

            minX = Math.max(0, pMinX - padding);
            minY = Math.max(0, pMinY - padding);
            width = Math.min(window.innerWidth - minX, pMaxX - pMinX + padding * 2);
            height = Math.min(window.innerHeight - minY, pMaxY - pMinY + padding * 2);
        } else {
            const rMinX = Math.min(startX, currentX);
            const rMaxX = Math.max(startX, currentX);
            const rMinY = Math.min(startY, currentY);
            const rMaxY = Math.max(startY, currentY);

            if (rMaxX - rMinX < 10 || rMaxY - rMinY < 10) {
                cleanupCanvas();
                return;
            }

            minX = Math.max(0, rMinX - padding);
            minY = Math.max(0, rMinY - padding);
            width = Math.min(window.innerWidth - minX, rMaxX - rMinX + padding * 2);
            height = Math.min(window.innerHeight - minY, rMaxY - rMinY + padding * 2);
        }

        lastX = event.clientX + window.scrollX;
        lastY = event.clientY + window.scrollY;

        cleanupCanvas();
        showStatusCard(
            {
                title: WordMapI18n.t(currentUiLang, 'statusPreparingCaptureTitle'),
                detail: WordMapI18n.t(currentUiLang, 'statusPreparingCaptureDetail'),
                state: 'progress'
            },
            lastX,
            lastY
        );

        chrome.runtime.sendMessage({ action: 'capture_tab' }, (response) => {
            if (!response || response.error || !response.dataUrl) {
                showStatusCard(
                    {
                        title: WordMapI18n.t(currentUiLang, 'errorTitle'),
                        detail: WordMapI18n.t(currentUiLang, 'errorCaptureFailed'),
                        state: 'error'
                    },
                    lastX,
                    lastY
                );
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
                    {
                        title: WordMapI18n.t(currentUiLang, 'statusUploadingTitle'),
                        detail: WordMapI18n.t(currentUiLang, 'statusUploadingDetail'),
                        state: 'progress'
                    },
                    lastX,
                    lastY
                );

                chrome.runtime.sendMessage({
                    action: 'process_image',
                    imageBase64: cropCanvas.toDataURL('image/jpeg')
                });
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
        isDrawing = false;
        points = [];
    }

    function showDrawHint() {
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
        if (!hint) {
            return;
        }

        const isRect = currentTool === 'rect';
        const title = isRect
            ? WordMapI18n.t(currentUiLang, 'drawHintRectTitle')
            : WordMapI18n.t(currentUiLang, 'drawHintPencilTitle');
        const description = isRect
            ? WordMapI18n.t(currentUiLang, 'drawHintRectDesc')
            : WordMapI18n.t(currentUiLang, 'drawHintPencilDesc');
        const badge = isRect
            ? WordMapI18n.t(currentUiLang, 'drawModeBadgeRect')
            : WordMapI18n.t(currentUiLang, 'drawModeBadgeFreehand');

        hint.innerHTML = '';

        const badgeElement = document.createElement('div');
        badgeElement.className = 'wordmap-draw-hint-badge';
        badgeElement.textContent = badge;

        const titleElement = document.createElement('div');
        titleElement.className = 'wordmap-draw-hint-title';
        titleElement.textContent = title;

        const descriptionElement = document.createElement('div');
        descriptionElement.className = 'wordmap-draw-hint-desc';
        descriptionElement.textContent = `${description} ${WordMapI18n.t(currentUiLang, 'drawHintFooter')}`;

        hint.appendChild(badgeElement);
        hint.appendChild(titleElement);
        hint.appendChild(descriptionElement);
    }

    function removeDrawHint() {
        const hint = document.getElementById('wordmap-draw-hint');
        if (hint) {
            hint.remove();
        }
    }

    function getOrCreateCard(x, y) {
        clearCardAutoCloseTimer();
        let card = document.getElementById('wordmap-result-card');
        if (!card) {
            card = document.createElement('div');
            card.id = 'wordmap-result-card';

            const header = document.createElement('div');
            header.className = 'wordmap-card-header wordmap-drag-handle';

            const brand = document.createElement('div');
            brand.className = 'wordmap-card-brand';

            const logo = document.createElement('div');
            logo.className = 'wordmap-card-logo';
            logo.textContent = 'WM';

            const brandText = document.createElement('div');
            brandText.className = 'wordmap-card-brand-text';

            const title = document.createElement('div');
            title.className = 'wordmap-card-title';
            title.textContent = 'WordMap';

            const subtitle = document.createElement('div');
            subtitle.className = 'wordmap-card-subtitle';
            subtitle.dataset.role = 'subtitle';

            brandText.appendChild(title);
            brandText.appendChild(subtitle);
            brand.appendChild(logo);
            brand.appendChild(brandText);

            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'wordmap-card-close';
            closeButton.dataset.role = 'close';
            closeButton.textContent = '×';
            closeButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                removeCard();
            });

            header.appendChild(brand);
            header.appendChild(closeButton);

            const content = document.createElement('div');
            content.id = 'wordmap-card-content';

            card.appendChild(header);
            card.appendChild(content);
            document.body.appendChild(card);

            installCardInteractions(card, header);
        }

        updateCardStaticCopy();
        positionCard(card, x, y);
        return {
            card: card,
            content: document.getElementById('wordmap-card-content')
        };
    }

    function installCardInteractions(card, handle) {
        let isDraggingCard = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        handle.addEventListener('mousedown', (event) => {
            if (event.target.closest('.wordmap-card-close')) {
                return;
            }

            isDraggingCard = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            initialLeft = card.offsetLeft;
            initialTop = card.offsetTop;
            handle.style.cursor = 'grabbing';
            event.preventDefault();
        });

        const onMouseMove = (event) => {
            if (!isDraggingCard) {
                return;
            }

            const dx = event.clientX - dragStartX;
            const dy = event.clientY - dragStartY;
            card.style.left = `${initialLeft + dx}px`;
            card.style.top = `${initialTop + dy}px`;
        };

        const onMouseUp = () => {
            isDraggingCard = false;
            handle.style.cursor = 'grab';
        };

        const onOutsideMouseDown = (event) => {
            if (!card.contains(event.target)) {
                removeCard();
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        const outsideClickTimer = window.setTimeout(() => {
            document.addEventListener('mousedown', onOutsideMouseDown);
        }, 80);

        card._wordmapCleanupFns = [
            () => window.clearTimeout(outsideClickTimer),
            () => document.removeEventListener('mousemove', onMouseMove),
            () => document.removeEventListener('mouseup', onMouseUp),
            () => document.removeEventListener('mousedown', onOutsideMouseDown)
        ];
    }

    function updateCardStaticCopy() {
        const card = document.getElementById('wordmap-result-card');
        if (!card) {
            return;
        }

        const subtitle = card.querySelector('[data-role="subtitle"]');
        const closeButton = card.querySelector('[data-role="close"]');
        if (subtitle) {
            subtitle.textContent = WordMapI18n.t(currentUiLang, 'cardSubtitle');
        }
        if (closeButton) {
            closeButton.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'closeButtonAria'));
            closeButton.setAttribute('title', WordMapI18n.t(currentUiLang, 'closeButtonAria'));
        }
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
        if (!card) {
            return;
        }

        if (Array.isArray(card._wordmapCleanupFns)) {
            card._wordmapCleanupFns.forEach((cleanup) => cleanup());
        }
        card.remove();
    }

    function positionCard(card, x, y) {
        requestAnimationFrame(() => {
            const margin = 16;
            const scrollLeft = window.scrollX;
            const scrollTop = window.scrollY;
            const cardWidth = card.offsetWidth || 420;
            const cardHeight = card.offsetHeight || 240;
            const idealLeft = x + 18;
            const idealTop = y + 18;
            const maxLeft = scrollLeft + window.innerWidth - cardWidth - margin;
            const maxTop = scrollTop + window.innerHeight - cardHeight - margin;
            const safeLeft = Math.max(scrollLeft + margin, Math.min(idealLeft, maxLeft));
            const safeTop = Math.max(scrollTop + margin, Math.min(idealTop, maxTop));
            card.style.left = `${safeLeft}px`;
            card.style.top = `${safeTop}px`;
        });
    }

    function showStatusCard(payload, x, y) {
        const cardBundle = getOrCreateCard(x, y);
        const content = cardBundle.content;
        content.innerHTML = '';

        const status = document.createElement('div');
        status.className = `wordmap-status${payload.state === 'error' ? ' wordmap-status--error' : ''}`;

        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'wordmap-status-visual';
        if (payload.state === 'error') {
            iconWrapper.textContent = '✕';
            iconWrapper.classList.add('wordmap-status-error-icon');
        } else {
            const spinner = document.createElement('div');
            spinner.className = 'wordmap-status-spinner';
            iconWrapper.appendChild(spinner);
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

        status.appendChild(iconWrapper);
        status.appendChild(copy);
        content.appendChild(status);
        positionCard(cardBundle.card, x, y);

        if (payload.state === 'error') {
            cardAutoCloseTimer = window.setTimeout(removeCard, 4200);
        }
    }

    function renderResult(data, x, y, ocrText) {
        const cardBundle = getOrCreateCard(x, y);
        const content = cardBundle.content;
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
            showStatusCard(
                {
                    title: WordMapI18n.t(currentUiLang, 'errorTitle'),
                    detail: WordMapI18n.t(currentUiLang, 'resultEmpty'),
                    state: 'error'
                },
                x,
                y
            );
            return;
        }

        if (ocrText) {
            const ocrSection = createSection(WordMapI18n.t(currentUiLang, 'resultSectionDetectedText'), '📝');
            const textBlock = document.createElement('div');
            textBlock.className = 'wordmap-ocr-text';
            textBlock.textContent = ocrText;
            ocrSection.appendChild(textBlock);
            content.appendChild(ocrSection);
        }

        if (fullTranslation) {
            const translationSection = createSection(WordMapI18n.t(currentUiLang, 'resultSectionTranslation'), '✨');
            const fullText = document.createElement('div');
            fullText.className = 'wordmap-full-translation';
            fullText.textContent = fullTranslation;
            translationSection.appendChild(fullText);
            content.appendChild(translationSection);
        }

        if (wordPairs.length > 0) {
            const wordsSection = createSection(WordMapI18n.t(currentUiLang, 'resultSectionGlossary'), '🔎');
            const wordsContainer = document.createElement('div');
            wordsContainer.className = 'wordmap-words-container';

            wordPairs.forEach((pair) => {
                const pairDiv = document.createElement('div');
                pairDiv.className = 'word-pair';

                const originalText = pair.src || pair.en || pair.text || pair.original || '???';
                const translatedText =
                    pair.dst ||
                    pair.zh ||
                    pair.translation ||
                    pair.Chinese ||
                    WordMapI18n.t(currentUiLang, 'resultNoGloss');

                const sourceSpan = document.createElement('span');
                sourceSpan.className = 'word-en';
                sourceSpan.textContent = originalText;

                const targetSpan = document.createElement('span');
                targetSpan.className = 'word-zh';
                targetSpan.textContent = translatedText;

                pairDiv.appendChild(sourceSpan);
                pairDiv.appendChild(targetSpan);
                wordsContainer.appendChild(pairDiv);
            });

            wordsSection.appendChild(wordsContainer);
            content.appendChild(wordsSection);
        }

        positionCard(cardBundle.card, x, y);
    }

    function createSection(titleText, icon) {
        const section = document.createElement('section');
        section.className = 'wordmap-section';

        const title = document.createElement('div');
        title.className = 'wordmap-section-title';
        title.textContent = `${icon} ${titleText}`;

        section.appendChild(title);
        return section;
    }
})();
