document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey'], (result) => {
        if (result.apiBaseUrl) document.getElementById('apiBaseUrl').value = result.apiBaseUrl;
        if (result.modelName) document.getElementById('modelName').value = result.modelName;
        if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
        if (result.targetLang) document.getElementById('targetLang').value = result.targetLang;
        if (result.ocrApiKey) document.getElementById('ocrApiKey').value = result.ocrApiKey;
    });
});

// 实时自动保存
const inputIds = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey'];
inputIds.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        chrome.storage.local.set({
            apiBaseUrl: document.getElementById('apiBaseUrl').value.trim(),
            modelName: document.getElementById('modelName').value.trim(),
            apiKey: document.getElementById('apiKey').value.trim(),
            targetLang: document.getElementById('targetLang').value,
            ocrApiKey: document.getElementById('ocrApiKey').value.trim()
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
        ocrApiKey: document.getElementById('ocrApiKey').value.trim()
    }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
});

document.getElementById('drawBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab.url.startsWith("chrome://") || currentTab.url.startsWith("edge://")) {
            alert("⚠️ 插件无法在浏览器系统页面运行！");
            return;
        }
        chrome.tabs.sendMessage(currentTab.id, {action: "toggle_draw"}, () => {
            if (!chrome.runtime.lastError) window.close();
        });
    });
});

// 恢复跳转快捷键设置页面
document.getElementById('shortcutBtn').addEventListener('click', () => {
    chrome.tabs.create({url: "chrome://extensions/shortcuts"});
});
