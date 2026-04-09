chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-draw-mode") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_draw" });
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "capture_tab") {
        chrome.tabs.captureVisibleTab(null, {format: "jpeg", quality: 100}, (dataUrl) => {
            sendResponse({ dataUrl: dataUrl });
        });
        return true;
    }

    if (request.action === "process_image") {
        chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey'], async (result) => {
            const { apiBaseUrl, modelName, apiKey, targetLang, ocrApiKey } = result;

            if (!apiBaseUrl || !modelName) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: "请先配置大模型接口地址和名称！" });
                return;
            }

            try {
                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: "📡 正在通过 OCR.space 提取文字..." });
                const extractedText = await performOCR(request.imageBase64, ocrApiKey || 'helloworld');

                if (!extractedText || extractedText.trim() === '') {
                    chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: "未能在图片中识别出文字" });
                    return;
                }

                chrome.tabs.sendMessage(sender.tab.id, { action: "update_status", message: `🧠 识别成功: "${extractedText.substring(0, 15)}..."\n正在请求大模型翻译...` });

                const jsonResult = await callUniversalLLM(extractedText, apiBaseUrl, modelName, apiKey, targetLang || "Chinese");

                chrome.tabs.sendMessage(sender.tab.id, { action: "show_result", data: jsonResult });

            } catch (err) {
                chrome.tabs.sendMessage(sender.tab.id, { action: "show_error", message: err.message });
            }
        });
        return true;
    }
});

// 调用免费的 OCR API
async function performOCR(base64Image, ocrApiKey) {
    const formData = new FormData();
    formData.append('base64image', base64Image);
    formData.append('language', 'eng'); // 默认英文识别最准，遇到中文也能应对
    formData.append('apikey', ocrApiKey);

    const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if (data.IsErroredOnProcessing) {
        throw new Error(`OCR 引擎报错: ${data.ErrorMessage[0]}`);
    }
    if (data.ParsedResults && data.ParsedResults.length > 0) {
        return data.ParsedResults[0].ParsedText;
    }
    return "";
}

// 纯文本大模型调用（极省额度）
async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang) {
    const endpoint = `${apiBaseUrl}/chat/completions`;

    // 【核心修复】：加回了强有力的示例 (EXAMPLE)，强制规范大模型的输出结构
    const systemPrompt = `You are a professional bilingual translator. 
Task: Translate the user's text into ${targetLang}, AND break down the text into meaningful words or short phrases with their translations.

CRITICAL RULES:
1. You MUST respond ONLY with a raw JSON object. Do not output markdown code blocks.
2. The JSON object MUST strictly follow this structure:
{
  "full_translation": "The fluent and complete translation of the entire text",
  "words": [
    {"src": "original word", "dst": "translation"},
    ...
  ]
}
3. Even for code, variables, or symbols, provide a literal translation or explanation in the "words" array.

EXAMPLE:
{
  "full_translation": "词图翻译器",
  "words": [
    {"src": "WordMap", "dst": "词图"},
    {"src": "_", "dst": "下划线"},
    {"src": "Translator", "dst": "翻译器"}
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
        temperature: 0.2
    };

    const response = await fetch(endpoint, { method: 'POST', headers: headers, body: JSON.stringify(payload) });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI 请求失败 (状态码 ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) throw new Error("AI 返回异常，未获取到内容。");

    let resultText = data.choices[0].message.content.trim();
    if (resultText.startsWith('```json')) resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    else if (resultText.startsWith('```')) resultText = resultText.replace(/```/g, '').trim();

    try {
        return JSON.parse(resultText);
    } catch (parseError) {
        throw new Error(`解析 JSON 失败。\n模型返回: ${resultText}`);
    }
}
