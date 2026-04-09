// 页面加载时读取配置
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang'], (result) => {
        if (result.apiBaseUrl) document.getElementById('apiBaseUrl').value = result.apiBaseUrl;
        if (result.modelName) document.getElementById('modelName').value = result.modelName;
        if (result.apiKey) document.getElementById('apiKey').value = result.apiKey;
        if (result.targetLang) document.getElementById('targetLang').value = result.targetLang;
    });
});

// === 新增：静默自动保存机制 ===
// 监听所有输入框，只要用户敲击键盘或粘贴，立刻自动存入数据库，防丢失
const inputIds = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang'];
inputIds.forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        const config = {
            apiBaseUrl: document.getElementById('apiBaseUrl').value.trim(),
            modelName: document.getElementById('modelName').value.trim(),
            apiKey: document.getElementById('apiKey').value.trim(),
            targetLang: document.getElementById('targetLang').value
        };
        chrome.storage.local.set(config);
    });
});

// 点击明确的保存按钮（提供视觉反馈，并做最终的格式校验）
document.getElementById('saveBtn').addEventListener('click', () => {
    let baseUrl = document.getElementById('apiBaseUrl').value.trim();

    // 智能纠错：如果用户手抖在网址最后多打了一个斜杠，自动去掉，防止 API 拼接报错
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
        document.getElementById('apiBaseUrl').value = baseUrl; // 纠正后的网址更新到界面
    }

    const config = {
        apiBaseUrl: baseUrl,
        modelName: document.getElementById('modelName').value.trim(),
        apiKey: document.getElementById('apiKey').value.trim(),
        targetLang: document.getElementById('targetLang').value
    };

    if (!config.apiBaseUrl || !config.modelName) {
        alert("请至少填写接口地址和模型名称！");
        return;
    }

    chrome.storage.local.set(config, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => status.style.display = 'none', 2000);
    });
});

// 快速操作：抠图翻译
document.getElementById('drawBtn').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab.url.startsWith("chrome://") || currentTab.url.startsWith("edge://")) {
            alert("⚠️ 插件无法在浏览器系统页面运行！请打开一个真实的网页。");
            return;
        }
        chrome.tabs.sendMessage(currentTab.id, {action: "toggle_draw"}, () => {
            if (chrome.runtime.lastError) {
                alert("⚠️ 唤起失败！请先【刷新】一下当前网页（按 F5）。");
            } else {
                window.close();
            }
        });
    });
});

// 快速操作：自定义快捷键
document.getElementById('shortcutBtn').addEventListener('click', () => {
    chrome.tabs.create({url: "chrome://extensions/shortcuts"});
});
