chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            if (command === "toggle-draw-mode") smartToggleDraw(tabs[0].id, 'pencil');
            if (command === "toggle-rect-mode") smartToggleDraw(tabs[0].id, 'rect');
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "popup_toggle_draw") {
        // ==== 核心修复：使用前端精确传递过来的 tabId ====
        if (request.tabId) {
            smartToggleDraw(request.tabId, request.mode || 'pencil');
        } else {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) smartToggleDraw(tabs[0].id, request.mode || 'pencil');
            });
        }
        sendResponse({ status: "ok" });
        return true;
    }

    if (request.action === "capture_tab") {
        chrome.tabs.captureVisibleTab(null, {format: "jpeg", quality: 100}, (dataUrl) => {
            sendResponse({ dataUrl: dataUrl });
        });
        return true;
    }

    if (request.action === "process_image") {
        chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang'], async (result) => {
            const { apiBaseUrl, modelName, apiKey, targetLang, ocrApiKey, sourceLang } = result;
            if (!apiBaseUrl || !modelName) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: "请先配置大模型接口地址和名称！" });
                return;
            }
            const currentOcrLang = sourceLang || 'eng';

            try {
                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: `📡 正在通过 OCR 提取文字 (引擎: ${currentOcrLang})...` });
                const extractedText = await performOCR(request.imageBase64, ocrApiKey || 'helloworld', currentOcrLang);
                if (!extractedText || extractedText.trim() === '') {
                    chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: "未能在图片中识别出清晰的文字，请重新框选。" });
                    return;
                }

                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: `🧠 识别成功: "${extractedText.substring(0, 15).replace(/\n/g, " ")}..."\n正在请求大模型翻译...` });
                const jsonResult = await callUniversalLLM(extractedText, apiBaseUrl, modelName, apiKey, targetLang || "Chinese");

                // 传递 ocrText
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_result", data: jsonResult, ocrText: extractedText });

            } catch (err) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: err.message });
            }
        });
        return true;
    }
});

function smartToggleDraw(tabId, mode) {
    chrome.tabs.sendMessage(tabId, { action: "toggle_draw", mode: mode }, (response) => {
        if (chrome.runtime.lastError) {
            chrome.scripting.insertCSS({ target: { tabId: tabId }, files: ["style.css"] }).then(() => {
                chrome.scripting.executeScript({ target: { tabId: tabId }, files: ["content.js"] }).then(() => {
                    chrome.tabs.sendMessage(tabId, { action: "toggle_draw", mode: mode });
                }).catch(err => console.error("注入 js 失败", err));
            });
        }
    });
}

async function performOCR(base64Image, ocrApiKey, sourceLang) {
    const formData = new FormData();
    formData.append('base64image', base64Image);
    formData.append('language', sourceLang);
    formData.append('scale', 'true');
    formData.append('OCREngine', '1');
    formData.append('apikey', ocrApiKey);

    const response = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: formData });
    const data = await response.json();
    if (data.IsErroredOnProcessing) throw new Error(`OCR 引擎报错: ${data.ErrorMessage[0]}`);
    if (data.ParsedResults && data.ParsedResults.length > 0) return data.ParsedResults[0].ParsedText;
    return "";
}

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang) {
    const endpoint = `${apiBaseUrl}/chat/completions`;
    const systemPrompt = `You are a professional bilingual translator. 
Task: Translate the user's text into ${targetLang}, AND break down the text into words or short phrases with their translations.
CRITICAL RULES:
1. You MUST respond ONLY with a raw JSON object. Do not output markdown code blocks.
2. DO NOT SKIP ANY WORDS. Every single word, particle (e.g., in Korean/Japanese), and grammatical marker from the source text MUST be accounted for in the "words" array.
3. The JSON object MUST strictly follow this structure:
{
  "full_translation": "The fluent and complete translation of the entire text",
  "words": [
    {"src": "original word or particle", "dst": "translation or grammatical explanation"}
  ]
}`;
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const payload = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ],
        temperature: 0.1
    };
    const response = await fetch(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`AI 请求失败 (状态码 ${response.status})`);
    const data = await response.json();
    if (!data.choices || data.choices.length === 0) throw new Error("AI 返回异常。");
    let resultText = data.choices[0].message.content.trim();
    if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    else if (resultText.startsWith('```')) resultText = resultText.replace(/```/g, '').trim();

    try {
        return JSON.parse(resultText);
    } catch (parseError) {
        throw new Error(`解析 JSON 失败。\n模型返回: ${resultText}`);
    }
}
