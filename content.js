let isDrawing = false;
let canvas, ctx;
let points = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_draw") {
        toggleDrawMode();
        sendResponse({status: "ok"});
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
    ctx.strokeStyle = 'red';
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

function stopDrawing(e) {
    isDrawing = false;
    ctx.closePath();

    let selectedText = window.getSelection().toString().trim();

    if (!selectedText) {
        selectedText = "WordMap_Translator";
        alert("测试阶段：未选中原生文字，将使用默认测试文本。\n(请先用鼠标高亮选中网页上的文字，再点击画笔)");
    }

    const finalX = e.clientX + window.scrollX;
    const finalY = e.clientY + window.scrollY;

    cleanupCanvas();

    document.body.style.cursor = 'wait';
    requestTranslation(selectedText, finalX, finalY);
}

function cleanupCanvas() {
    if (canvas) {
        canvas.remove();
        canvas = null;
    }
}

function requestTranslation(text, x, y) {
    chrome.runtime.sendMessage({ action: "translate", text: text }, (response) => {
        document.body.style.cursor = 'default';
        if (response && response.error) {
            alert("翻译失败: " + response.error);
            return;
        }
        if (response && response.data) {
            renderResult(response.data, x, y);
        }
    });
}

function renderResult(data, x, y) {
    const oldCard = document.getElementById('wordmap-result-card');
    if (oldCard) oldCard.remove();

    const card = document.createElement('div');
    card.id = 'wordmap-result-card';
    card.style.left = `${x + 15}px`;
    card.style.top = `${y + 15}px`;

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
        document.body.appendChild(card);
        return;
    }

    if (fullTranslation) {
        const fullDiv = document.createElement('div');
        fullDiv.className = 'wordmap-full-translation';
        fullDiv.innerText = "✨ " + fullTranslation;
        card.appendChild(fullDiv);
    }

    if (wordPairs.length > 0) {
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

        card.appendChild(wordsContainer);
    }

    const closeHandler = (e) => {
        if (!card.contains(e.target)) {
            card.remove();
            document.removeEventListener('mousedown', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 100);

    document.body.appendChild(card);
}
