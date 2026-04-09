let isDataLoaded = false;

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang'], (result) => {
        if (result.apiBaseUrl) document.getElementById('apiBaseUrl').value = result.apiBaseUrl;
        if (result.modelName) document.getElementById('modelName').value = result.modelName;
        if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
        if (result.targetLang) document.getElementById('targetLang').value = result.targetLang;
        if (result.ocrApiKey) document.getElementById('ocrApiKey').value = result.ocrApiKey;
        if (result.sourceLang) document.getElementById('sourceLang').value = result.sourceLang;
        isDataLoaded = true;
    });
});

const inputIds = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang'];
inputIds.forEach(id => {
    const element = document.getElementById(id);
    ['input', 'change'].forEach(eventType => {
        element.addEventListener(eventType, () => {
            if (!isDataLoaded) return;
            chrome.storage.local.set({
                apiBaseUrl: document.getElementById('apiBaseUrl').value.trim(),
                modelName: document.getElementById('modelName').value.trim(),
                apiKey: document.getElementById('apiKey').value.trim(),
                targetLang: document.getElementById('targetLang').value,
                ocrApiKey: document.getElementById('ocrApiKey').value.trim(),
                sourceLang: document.getElementById('sourceLang').value
            });
        });
    });
});

document.getElementById('saveBtn').addEventListener('click', () => {
    let baseUrl = document.getElementById('apiBaseUrl').value.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    chrome.storage.local.set({
        apiBaseUrl: baseUrl,
        modelName: document.getElementById('modelName').value.trim(),
        apiKey: document.getElementById('apiKey').value.trim(),
        targetLang: document.getElementById('targetLang').value,
        ocrApiKey: document.getElementById('ocrApiKey').value.trim(),
        sourceLang: document.getElementById('sourceLang').value
    }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
});

// ==== 核心修复：精准传递 tabId，防止弹窗关闭导致找不到网页 ====
function sendDrawCommand(mode) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab.url.startsWith("chrome://") || currentTab.url.startsWith("edge://")) {
            alert("⚠️ 插件无法在浏览器系统页面运行！");
            return;
        }
        // 把 currentTab.id 传给后台
        chrome.runtime.sendMessage({ action: "popup_toggle_draw", mode: mode, tabId: currentTab.id }, () => {
            window.close();
        });
    });
}

document.getElementById('drawPencilBtn').addEventListener('click', () => sendDrawCommand('pencil'));
document.getElementById('drawRectBtn').addEventListener('click', () => sendDrawCommand('rect'));

document.getElementById('shortcutBtn').addEventListener('click', () => {
    chrome.tabs.create({url: "chrome://extensions/shortcuts"});
});
