chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-draw-mode") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_draw" });
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translate") {
        chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang'], async (result) => {
            const { apiBaseUrl, modelName, apiKey, targetLang } = result;

            if (!apiBaseUrl || !modelName) {
                sendResponse({ error: "请先点击扩展图标，配置 AI 接口地址和模型名称！" });
                return;
            }

            try {
                const jsonResult = await callUniversalLLM(request.text, apiBaseUrl, modelName, apiKey, targetLang || "Chinese");
                sendResponse({ data: jsonResult });
            } catch (err) {
                sendResponse({ error: err.message });
            }
        });
        return true;
    }
});

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang) {
    const endpoint = `${apiBaseUrl}/chat/completions`;

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

    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = {
        model: modelName,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ],
        temperature: 0.2
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 请求失败 (状态码 ${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
        throw new Error("API 返回异常，未获取到内容。");
    }

    let resultText = data.choices[0].message.content.trim();

    if (resultText.startsWith('```json')) {
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (resultText.startsWith('```')) {
        resultText = resultText.replace(/```/g, '').trim();
    }

    try {
        return JSON.parse(resultText);
    } catch (parseError) {
        throw new Error(`解析 JSON 失败。\n模型返回原始内容: ${resultText}`);
    }
}
