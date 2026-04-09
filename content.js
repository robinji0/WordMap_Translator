// ==== 全局变量 ====
var isDrawing = false;
var canvas, ctx;
var points = [];
var startX = 0, startY = 0, currentX = 0, currentY = 0;
var lastX = 0, lastY = 0;
var currentTool = 'pencil'; // 'pencil' or 'rect'

// ==== 核心修复 1：全局监听 ESC 按键 ====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // 1. 如果正在画圈/框选，直接取消
        if (document.getElementById('wordmap-canvas')) {
            cleanupCanvas();
        }
        // 2. 如果结果卡片正在显示，直接关闭
        var card = document.getElementById('wordmap-result-card');
        if (card) {
            card.remove();
        }
    }
});

// 移除之前的同名监听器，防止热注入多重绑定
if (window.wordmapMessageListener) {
    chrome.runtime.onMessage.removeListener(window.wordmapMessageListener);
}

window.wordmapMessageListener = (request, sender, sendResponse) => {
    if (request.action === "toggle_draw") {
        toggleDrawMode(request.mode || 'pencil');
        sendResponse({status: "ok"});
    }

    if (request.action === "update_status") {
        showLoadingCard(request.message, lastX, lastY);
    } else if (request.action === "show_error") {
        showLoadingCard(`❌ 出错啦: ${request.message}`, lastX, lastY, true);
    } else if (request.action === "show_result") {
        renderResult(request.data, lastX, lastY, request.ocrText);
    }
    return true;
};

chrome.runtime.onMessage.addListener(window.wordmapMessageListener);

function toggleDrawMode(mode) {
    currentTool = mode;
    if (document.getElementById('wordmap-canvas')) {
        cleanupCanvas();
        return;
    }

    canvas = document.createElement('canvas');
    canvas.id = 'wordmap-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '999998';
    canvas.style.cursor = 'crosshair';

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');

    if (currentTool === 'rect') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#FF3B30';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.setLineDash([]);
    }

    document.body.appendChild(canvas);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = startX;
    currentY = startY;

    if (currentTool === 'pencil') {
        points = [];
        ctx.beginPath();
        ctx.moveTo(e.clientX, e.clientY);
        points.push({x: e.clientX, y: e.clientY});
    }
}

function draw(e) {
    if (!isDrawing) return;
    currentX = e.clientX;
    currentY = e.clientY;

    if (currentTool === 'pencil') {
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        points.push({x: currentX, y: currentY});
    } else if (currentTool === 'rect') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const rectX = Math.min(startX, currentX);
        const rectY = Math.min(startY, currentY);
        const rectW = Math.abs(currentX - startX);
        const rectH = Math.abs(currentY - startY);

        ctx.clearRect(rectX, rectY, rectW, rectH);
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(rectX, rectY, rectW, rectH);
    }
}

async function stopDrawing(e) {
    isDrawing = false;
    var minX, minY, width, height;
    var padding = 12; // 增加统一的安全留白，防止切掉边缘字母

    if (currentTool === 'pencil') {
        ctx.closePath();
        if (points.length < 5) { cleanupCanvas(); return; }
        var pMinX = Math.min(...points.map(p => p.x));
        var pMaxX = Math.max(...points.map(p => p.x));
        var pMinY = Math.min(...points.map(p => p.y));
        var pMaxY = Math.max(...points.map(p => p.y));

        minX = Math.max(0, pMinX - padding);
        minY = Math.max(0, pMinY - padding);
        width = Math.min(window.innerWidth - minX, (pMaxX - pMinX) + padding * 2);
        height = Math.min(window.innerHeight - minY, (pMaxY - pMinY) + padding * 2);
    } else {
        var rMinX = Math.min(startX, currentX);
        var rMaxX = Math.max(startX, currentX);
        var rMinY = Math.min(startY, currentY);
        var rMaxY = Math.max(startY, currentY);

        if ((rMaxX - rMinX) < 10 || (rMaxY - rMinY) < 10) { cleanupCanvas(); return; }

        // 给矩形框选也强制增加留白 padding
        minX = Math.max(0, rMinX - padding);
        minY = Math.max(0, rMinY - padding);
        width = Math.min(window.innerWidth - minX, (rMaxX - rMinX) + padding * 2);
        height = Math.min(window.innerHeight - minY, (rMaxY - rMinY) + padding * 2);
    }

    lastX = e.clientX + window.scrollX;
    lastY = e.clientY + window.scrollY;

    cleanupCanvas();
    showLoadingCard("📸 正在截取图像...", lastX, lastY);

    chrome.runtime.sendMessage({ action: "capture_tab" }, (response) => {
        if (!response || !response.dataUrl) {
            showLoadingCard("❌ 截图失败", lastX, lastY, true);
            return;
        }
        var img = new Image();
        img.onload = () => {
            // ==== 核心修复 2：彻底抛弃 devicePixelRatio，使用实际图像的真实比例，完美免疫网页缩放干扰 ====
            var scaleX = img.width / window.innerWidth;
            var scaleY = img.height / window.innerHeight;

            var cropCanvas = document.createElement('canvas');
            cropCanvas.width = width * scaleX;
            cropCanvas.height = height * scaleY;
            var cropCtx = cropCanvas.getContext('2d');

            // 精准裁剪
            cropCtx.drawImage(
                img,
                minX * scaleX, minY * scaleY, width * scaleX, height * scaleY,
                0, 0, cropCanvas.width, cropCanvas.height
            );
            var croppedBase64 = cropCanvas.toDataURL('image/jpeg');
            showLoadingCard("📡 正在上传识别文字...", lastX, lastY);
            chrome.runtime.sendMessage({ action: "process_image", imageBase64: croppedBase64 });
        };
        img.src = response.dataUrl;
    });
}

function cleanupCanvas() {
    if (canvas) {
        canvas.remove();
        canvas = null;
    }
    isDrawing = false;
}

function getOrCreateCard(x, y) {
    var card = document.getElementById('wordmap-result-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'wordmap-result-card';
        card.style.left = `${x + 15}px`;
        card.style.top = `${y + 15}px`;

        var handle = document.createElement('div');
        handle.className = 'wordmap-drag-handle';
        card.appendChild(handle);

        var content = document.createElement('div');
        content.id = 'wordmap-card-content';
        card.appendChild(content);

        document.body.appendChild(card);

        var isDragging = false, dragStartX, dragStartY, initialLeft, initialTop;
        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            initialLeft = card.offsetLeft;
            initialTop = card.offsetTop;
            handle.style.cursor = 'grabbing';
            e.preventDefault();
        });
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            card.style.left = `${initialLeft + dx}px`;
            card.style.top = `${initialTop + dy}px`;
        };
        const onMouseUp = () => {
            isDragging = false;
            handle.style.cursor = 'grab';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        const closeHandler = (e) => {
            // 防止点击卡片内部或者拖拽手柄时关闭
            if (!card.contains(e.target)) {
                card.remove();
                document.removeEventListener('mousedown', closeHandler);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeHandler), 100);
    }
    return { card, content: document.getElementById('wordmap-card-content') };
}

function showLoadingCard(message, x, y, isError = false) {
    const { content } = getOrCreateCard(x, y);
    content.innerHTML = `<span style='font-size:14px; color:${isError ? 'red' : '#555'}; white-space:pre-wrap; display:block; max-width:300px;'>${message}</span>`;
    if (isError) {
        setTimeout(() => {
            var card = document.getElementById('wordmap-result-card');
            if (card) card.remove();
        }, 3500);
    }
}

function renderResult(data, x, y, ocrText = "") {
    const { content } = getOrCreateCard(x, y);
    content.innerHTML = "";

    let fullTranslation = "";
    let wordPairs = [];

    if (Array.isArray(data)) wordPairs = data;
    else if (data && typeof data === 'object') {
        fullTranslation = data.full_translation || data.translation || "";
        wordPairs = data.words || [];
    }

    if (wordPairs.length === 0 && !fullTranslation) {
        content.innerHTML = "<span style='padding:10px; color:red;'>AI 未返回任何有效翻译数据</span>";
        return;
    }

    if (ocrText) {
        const ocrSection = document.createElement('div');
        ocrSection.className = 'wordmap-section';
        const title = document.createElement('div');
        title.className = 'wordmap-section-title';
        title.innerText = "📝 OCR 识别原文";
        const textDiv = document.createElement('div');
        textDiv.className = 'wordmap-ocr-text';
        textDiv.innerText = ocrText;
        ocrSection.appendChild(title);
        ocrSection.appendChild(textDiv);
        content.appendChild(ocrSection);
    }

    if (fullTranslation) {
        const fullSection = document.createElement('div');
        fullSection.className = 'wordmap-section';
        const title = document.createElement('div');
        title.className = 'wordmap-section-title';
        title.innerText = "✨ 整句翻译";
        const fullText = document.createElement('div');
        fullText.className = 'wordmap-full-translation';
        fullText.innerText = fullTranslation;
        fullSection.appendChild(title);
        fullSection.appendChild(fullText);
        content.appendChild(fullSection);
    }

    if (wordPairs.length > 0) {
        const wordsSection = document.createElement('div');
        wordsSection.className = 'wordmap-section';
        const title = document.createElement('div');
        title.className = 'wordmap-section-title';
        title.innerText = "🔍 词语拆解";
        const wordsContainer = document.createElement('div');
        wordsContainer.className = 'wordmap-words-container';

        wordPairs.forEach(pair => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'word-pair';
            const originalText = pair.src || pair.en || pair.text || pair.original || "???";
            const translatedText = pair.dst || pair.zh || pair.translation || pair.Chinese || "无翻译";
            const enSpan = document.createElement('span');
            enSpan.className = 'word-en';
            enSpan.innerText = originalText;
            const zhSpan = document.createElement('span');
            zhSpan.className = 'word-zh';
            zhSpan.innerText = translatedText;
            pairDiv.appendChild(enSpan);
            pairDiv.appendChild(zhSpan);
            wordsContainer.appendChild(pairDiv);
        });
        wordsSection.appendChild(title);
        wordsSection.appendChild(wordsContainer);
        content.appendChild(wordsSection);
    }
}
