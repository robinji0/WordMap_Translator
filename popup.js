let isDataLoaded = false;
let currentUILang = navigator.language.startsWith('zh') ? 'zh' : 'en';

const i18nMap = {
    zh: {
        title: "⚙️ WordMap 通用设置",
        ocrHelp: "<b>免费 OCR 引擎支持：</b><br>默认使用公共测试 Key，若报错频繁请 <a href='https://ocr.space/OCRAPI' target='_blank' class='link'>点此免费申请专属 Key</a>",
        uiLangLabel: "界面语言 (UI Language):",
        ocrKeyLabel: "OCR.space API Key:",
        ocrKeyPlaceholder: "留空则使用默认 helloworld",
        baseUrlLabel: "大模型接口地址 (Base URL):",
        modelNameLabel: "大模型名称 (纯文本模型):",
        modelNamePlaceholder: "例如: llama-3.3-70b-versatile",
        apiKeyLabel: "大模型 API Key:",
        sourceLangLabel: "你要抠的网页语言 (Source):",
        targetLangLabel: "翻译目标语言 (Target):",
        saveBtn: "保存配置",
        saveSuccess: "✅ 保存成功！",
        quickActions: "快速操作:",
        pencilBtn: "🖍️ 铅笔画圈",
        rectBtn: "🔲 矩形框选",
        shortcutBtn: "⌨️ 自定义快捷键",
        sysPageError: "⚠️ 插件无法在浏览器系统页面运行！",
        sponsorBtn: "☕ 赞助开发者 (Sponsor)" // 赞助文案
    },
    en: {
        title: "⚙️ WordMap Settings",
        ocrHelp: "<b>Free OCR Support:</b><br>Using public key. If errors occur frequently, <a href='https://ocr.space/OCRAPI' target='_blank' class='link'>get a free private Key here</a>",
        uiLangLabel: "UI Language:",
        ocrKeyLabel: "OCR.space API Key:",
        ocrKeyPlaceholder: "Leave blank for default 'helloworld'",
        baseUrlLabel: "LLM Base URL:",
        modelNameLabel: "Model Name (Text-only):",
        modelNamePlaceholder: "e.g., llama-3.3-70b-versatile",
        apiKeyLabel: "LLM API Key:",
        sourceLangLabel: "Source Language (OCR):",
        targetLangLabel: "Target Language (Translation):",
        saveBtn: "Save Config",
        saveSuccess: "✅ Saved successfully!",
        quickActions: "Quick Actions:",
        pencilBtn: "🖍️ Pencil Draw",
        rectBtn: "🔲 Rect Select",
        shortcutBtn: "⌨️ Custom Shortcuts",
        sysPageError: "⚠️ Extension cannot run on browser system pages!",
        sponsorBtn: "☕ Sponsor Developer" // 赞助文案
    }
};

function renderI18n(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nMap[lang][key]) el.innerHTML = i18nMap[lang][key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (i18nMap[lang][key]) el.placeholder = i18nMap[lang][key];
    });
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'], (result) => {
        if (result.uiLang) currentUILang = result.uiLang;
        document.getElementById('uiLang').value = currentUILang;
        renderI18n(currentUILang);

        if (result.apiBaseUrl) document.getElementById('apiBaseUrl').value = result.apiBaseUrl;
        if (result.modelName) document.getElementById('modelName').value = result.modelName;
        if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
        if (result.targetLang) document.getElementById('targetLang').value = result.targetLang;
        if (result.ocrApiKey) document.getElementById('ocrApiKey').value = result.ocrApiKey;
        if (result.sourceLang) document.getElementById('sourceLang').value = result.sourceLang;

        isDataLoaded = true;
    });
});

const inputIds = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'];
inputIds.forEach(id => {
    const element = document.getElementById(id);
    ['input', 'change'].forEach(eventType => {
        element.addEventListener(eventType, (e) => {
            if (!isDataLoaded) return;

            if (e.target.id === 'uiLang') {
                currentUILang = e.target.value;
                renderI18n(currentUILang);
            }

            chrome.storage.local.set({
                apiBaseUrl: document.getElementById('apiBaseUrl').value.trim(),
                modelName: document.getElementById('modelName').value.trim(),
                apiKey: document.getElementById('apiKey').value.trim(),
                targetLang: document.getElementById('targetLang').value,
                ocrApiKey: document.getElementById('ocrApiKey').value.trim(),
                sourceLang: document.getElementById('sourceLang').value,
                uiLang: document.getElementById('uiLang').value
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
        sourceLang: document.getElementById('sourceLang').value,
        uiLang: document.getElementById('uiLang').value
    }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
});

function sendDrawCommand(mode) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab.url.startsWith("chrome://") || currentTab.url.startsWith("edge://")) {
            alert(i18nMap[currentUILang].sysPageError);
            return;
        }
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

// ==== 绑定赞助按钮逻辑 ====
document.getElementById('sponsorBtn').addEventListener('click', () => {
    chrome.tabs.create({url: "https://www.paypal.com/paypalme/robin326753"});
});
