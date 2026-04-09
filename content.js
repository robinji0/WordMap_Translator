let isDrawing = false;
let canvas, ctx;
let points = [];
let lastX = 0, lastY = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_draw") {
        toggleDrawMode();
        sendResponse({status: "ok"});
    }

    // 接收后台发来的各个阶段状态和结果
    if (request.action === "update_status") {
        showLoadingCard(request.message, lastX, lastY);
    } else if (request.action === "show_error") {
        showLoadingCard(`❌ 出错啦: ${request.message}`, lastX, lastY, true);
    } else if (request.action === "show_result") {
        renderResult(request.data, lastX, lastY);
    }
    return true;
});

function toggleDrawMode() {
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
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    document.body.appendChild(canvas);

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    points = [];
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
    points.push({x: e.clientX, y: e.clientY});
}

function draw(e) {
    if (!isDrawing) return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.stroke();
    points.push({x: e.clientX, y: e.clientY});
}

async function stopDrawing(e) {
    isDrawing = false;
    ctx.closePath();

    if (points.length < 5) {
        cleanupCanvas();
        return;
    }

    let minX = Math.min(...points.map(p => p.x));
    let maxX = Math.max(...points.map(p => p.x));
    let minY = Math.min(...points.map(p => p.y));
    let maxY = Math.max(...points.map(p => p.y));

    let padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    let width = Math.min(window.innerWidth - minX, (maxX - minX) + padding * 2);
    let height = Math.min(window.innerHeight - minY, (maxY - minY) + padding * 2);

    lastX = e.clientX + window.scrollX;
    lastY = e.clientY + window.scrollY;

    cleanupCanvas();
    showLoadingCard("📸 正在提取图像...", lastX, lastY);

    chrome.runtime.sendMessage({ action: "capture_tab" }, (response) => {
        if (!response || !response.dataUrl) {
            showLoadingCard("❌ 截图失败", lastX, lastY, true);
            return;
        }

        let img = new Image();
        img.onload = () => {
            let cropCanvas = document.createElement('canvas');
            let dpr = window.devicePixelRatio || 1;
            cropCanvas.width = width * dpr;
            cropCanvas.height = height * dpr;

            let cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(
                img,
                minX * dpr, minY * dpr, width * dpr, height * dpr,
                0, 0, cropCanvas.width, cropCanvas.height
            );

            let croppedBase64 = cropCanvas.toDataURL('image/jpeg');

            showLoadingCard("📡 正在上传识别文字...", lastX, lastY);
            // 把裁剪好的图片发给后台，剩下的事交给后台全权打理
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
}

function showLoadingCard(message, x, y, isError = false) {
    let card = document.getElementById('wordmap-result-card');
    if (!card) {
        card = document.createElement('div');
        card.id = 'wordmap-result-card';
        card.style.left = `${x + 15}px`;
        card.style.top = `${y + 15}px`;
        document.body.appendChild(card);
    }
    card.innerHTML = `<span style='padding:10px; font-size:14px; color:${isError ? 'red' : '#555'}; white-space:pre-wrap; display:block; max-width:300px;'>${message}</span>`;

    if (isError) {
        setTimeout(() => { if (card) card.remove(); }, 3500);
    }
}

function renderResult(data, x, y) {
    const card = document.getElementById('wordmap-result-card');
    if (!card) return;
    card.innerHTML = "";

    let fullTranslation = "";
    let wordPairs = [];

    if (Array.isArray(data)) {
        wordPairs = data;
    } else if (data && typeof data === 'object') {
        fullTranslation = data.full_translation || data.translation || "";
        wordPairs = data.words || [];
    }

    if (wordPairs.length === 0 && !fullTranslation) {
        card.innerHTML = "<span style='padding:10px; color:red;'>AI 未返回任何有效翻译数据</span>";
        return;
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
        card.appendChild(fullSection);
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
        card.appendChild(wordsSection);
    }

    const closeHandler = (e) => {
        if (!card.contains(e.target)) {
            card.remove();
            document.removeEventListener('mousedown', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 100);
}
