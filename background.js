function getMsg(key, lang, arg) {
    const msgs = {
        err_config: { zh: "请先配置大模型接口地址和名称！", en: "Please configure LLM Base URL and Model Name first!" },
        ocr_extracting: { zh: `📡 正在通过 OCR 提取文字 (引擎: ${arg})...`, en: `📡 Extracting text via OCR (Engine: ${arg})...` },
        err_ocr_fail: { zh: "未能在图片中识别出清晰的文字，请重新框选。", en: "Failed to recognize clear text in the image. Please re-select." },
        llm_requesting: { zh: `🧠 识别成功: "${arg}..."\n正在请求大模型翻译...`, en: `🧠 OCR Success: "${arg}..."\nRequesting LLM translation...` }
    };
    return msgs[key][lang] || msgs[key]['zh'];
}

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
        chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'], async (result) => {
            const { apiBaseUrl, modelName, apiKey, targetLang, ocrApiKey, sourceLang, uiLang } = result;

            const currentUILang = uiLang || (navigator.language.startsWith('zh') ? 'zh' : 'en');
            const currentOcrLang = sourceLang || 'eng';

            if (!apiBaseUrl || !modelName) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: getMsg('err_config', currentUILang) });
                return;
            }

            try {
                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: getMsg('ocr_extracting', currentUILang, currentOcrLang) });

                const extractedText = await performOCR(request.imageBase64, ocrApiKey || 'helloworld', currentOcrLang);
                if (!extractedText || extractedText.trim() === '') {
                    chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: getMsg('err_ocr_fail', currentUILang) });
                    return;
                }

                const shortText = extractedText.substring(0, 15).replace(/\n/g, " ");
                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: getMsg('llm_requesting', currentUILang, shortText) });

                const jsonResult = await callUniversalLLM(extractedText, apiBaseUrl, modelName, apiKey, targetLang || "Chinese");
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
    if (data.IsErroredOnProcessing) throw new Error(`OCR Error: ${data.ErrorMessage[0]}`);
    if (data.ParsedResults && data.ParsedResults.length > 0) return data.ParsedResults[0].ParsedText;
    return "";
}

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang) {
    // ==== 核心修复：智能补全或裁剪 API 后缀 ====
    let endpoint = apiBaseUrl.trim();
    if (!endpoint.endsWith('/chat/completions')) {
        endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }

    const systemPrompt = `You are a professional bilingual translator. 
Task: You MUST translate the user's text strictly into ${targetLang}.
CRITICAL RULES:
1. TARGET LANGUAGE ENFORCEMENT: The 'full_translation' AND every 'dst' value MUST be in ${targetLang}. Do NOT use English unless ${targetLang} is English!
2. FORMAT: You MUST respond ONLY with a raw JSON object. Do not output markdown code blocks.
3. COMPLETENESS: DO NOT SKIP ANY WORDS. Every single word, particle, and grammatical marker from the source text MUST be accounted for in the "words" array.
4. The JSON object MUST strictly follow this structure:
{
  "full_translation": "The fluent and complete translation of the entire text strictly in ${targetLang}",
  "words": [
    {"src": "original word or particle", "dst": "translation or grammatical explanation strictly in ${targetLang}"}
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
    if (!response.ok) throw new Error(`AI Request Failed (HTTP ${response.status})`);
    const data = await response.json();
    if (!data.choices || data.choices.length === 0) throw new Error("AI returned empty data.");
    let resultText = data.choices[0].message.content.trim();
    if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    else if (resultText.startsWith('```')) resultText = resultText.replace(/```/g, '').trim();

    try {
        return JSON.parse(resultText);
    } catch (parseError) {
        throw new Error(`Parse JSON failed.\nModel output: ${resultText}`);
    }
}
