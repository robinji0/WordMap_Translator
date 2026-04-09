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

    // 【终极加强版 Prompt】：加入强制规则和具体示例，专治各种不服
    const systemPrompt = `You are a professional bilingual translator. 
Task: Break down the user's text into meaningful words or short phrases, and translate them into ${targetLang}.

CRITICAL RULES:
1. You MUST respond ONLY with a raw JSON array. Do not output markdown code blocks.
2. STRICTLY use the keys "src" for the original text, and "dst" for the translation.
3. Even for code, variables (e.g., WordMap_Translator), or symbols, you MUST provide a literal translation or explanation. Do not skip translation.

EXAMPLE FORMAT:
[
  {"src": "WordMap", "dst": "词图"},
  {"src": "_", "dst": "下划线"},
  {"src": "Translator", "dst": "翻译器"}
]`;

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
        temperature: 0.2 // 进一步降低温度，让它必须按规矩办事
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
