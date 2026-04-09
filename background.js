importScripts('i18n.js');

const DEFAULT_SETTINGS = {
    uiLang: WordMapI18n.detectBrowserUiLang(),
    sourceLang: 'eng',
    targetLang: 'Chinese'
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['uiLang', 'sourceLang', 'targetLang'], (result) => {
        const updates = {};
        if (!result.uiLang) updates.uiLang = DEFAULT_SETTINGS.uiLang;
        if (!result.sourceLang) updates.sourceLang = DEFAULT_SETTINGS.sourceLang;
        if (!result.targetLang) updates.targetLang = DEFAULT_SETTINGS.targetLang;
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates);
        }
    });
});

chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
            return;
        }
        if (command === 'toggle-draw-mode') smartToggleDraw(tabs[0].id, 'pencil');
        if (command === 'toggle-rect-mode') smartToggleDraw(tabs[0].id, 'rect');
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'popup_toggle_draw') {
        if (request.tabId) {
            smartToggleDraw(request.tabId, request.mode || 'pencil');
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) smartToggleDraw(tabs[0].id, request.mode || 'pencil');
            });
        }
        sendResponse({ status: 'ok' });
        return true;
    }

    if (request.action === 'capture_tab') {
        chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 100 }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                sendResponse({ error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'capture_failed' });
                return;
            }
            sendResponse({ dataUrl: dataUrl });
        });
        return true;
    }

    if (request.action === 'process_image') {
        chrome.storage.local.get(
            ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'],
            async (result) => {
                const uiLang = WordMapI18n.getEffectiveUiLang(result.uiLang);
                const tabId = sender.tab && sender.tab.id;

                if (!tabId) {
                    sendResponse({ status: 'no_tab' });
                    return;
                }

                const apiBaseUrl = normalizeBaseUrl(result.apiBaseUrl);
                const modelName = (result.modelName || '').trim();
                const apiKey = (result.apiKey || '').trim();
                const targetLang = result.targetLang || DEFAULT_SETTINGS.targetLang;
                const ocrApiKey = (result.ocrApiKey || '').trim() || 'helloworld';

                // Important: OCR source language is independent from the UI language.
                // Never derive this value from uiLang, otherwise OCR results may be wrong.
                const ocrSourceLang = result.sourceLang || DEFAULT_SETTINGS.sourceLang;

                if (!apiBaseUrl || !modelName) {
                    sendErrorStatus(tabId, uiLang, WordMapI18n.t(uiLang, 'errorMissingConfig'));
                    sendResponse({ status: 'missing_config' });
                    return;
                }

                try {
                    sendProgressStatus(tabId, uiLang, {
                        title: WordMapI18n.t(uiLang, 'statusOcrTitle'),
                        detail: WordMapI18n.t(uiLang, 'statusOcrDetail', {
                            engine: ocrSourceLang,
                            engineLabel: WordMapI18n.getOcrLanguageLabel(ocrSourceLang, uiLang)
                        })
                    });

                    const extractedText = await performOCR(request.imageBase64, ocrApiKey, ocrSourceLang, uiLang);
                    if (!extractedText || extractedText.trim() === '') {
                        sendErrorStatus(tabId, uiLang, WordMapI18n.t(uiLang, 'errorNoText'));
                        sendResponse({ status: 'no_text' });
                        return;
                    }

                    sendProgressStatus(tabId, uiLang, {
                        title: WordMapI18n.t(uiLang, 'statusTranslateTitle'),
                        detail: WordMapI18n.t(uiLang, 'statusTranslateDetail', {
                            preview: WordMapI18n.clampTextPreview(extractedText, 46)
                        })
                    });

                    const jsonResult = await callUniversalLLM(
                        extractedText,
                        apiBaseUrl,
                        modelName,
                        apiKey,
                        targetLang,
                        uiLang
                    );

                    chrome.tabs.sendMessage(tabId, {
                        action: 'show_result',
                        data: jsonResult,
                        ocrText: extractedText,
                        uiLang: uiLang,
                        targetLang: targetLang
                    });
                    sendResponse({ status: 'ok' });
                } catch (error) {
                    const message = error && error.message
                        ? error.message
                        : WordMapI18n.t(uiLang, 'errorUnknown', { message: String(error) });
                    sendErrorStatus(tabId, uiLang, message);
                    sendResponse({ status: 'error', message: message });
                }
            }
        );
        return true;
    }
});

function smartToggleDraw(tabId, mode) {
    chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode: mode }, () => {
        if (!chrome.runtime.lastError) {
            return;
        }

        chrome.scripting
            .insertCSS({ target: { tabId: tabId }, files: ['style.css'] })
            .then(() => chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['i18n.js', 'content.js'] }))
            .then(() => chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode: mode }))
            .catch((error) => {
                console.error('WordMap injection failed:', error);
            });
    });
}

function sendProgressStatus(tabId, uiLang, payload) {
    chrome.tabs.sendMessage(tabId, {
        action: 'show_status',
        uiLang: uiLang,
        state: 'progress',
        title: payload.title,
        detail: payload.detail
    });
}

function sendErrorStatus(tabId, uiLang, detail) {
    chrome.tabs.sendMessage(tabId, {
        action: 'show_status',
        uiLang: uiLang,
        state: 'error',
        title: WordMapI18n.t(uiLang, 'errorTitle'),
        detail: detail
    });
}

async function performOCR(base64Image, ocrApiKey, ocrSourceLang, uiLang) {
    const formData = new FormData();
    formData.append('base64image', base64Image);
    formData.append('language', ocrSourceLang);
    formData.append('scale', 'true');
    formData.append('OCREngine', '1');
    formData.append('apikey', ocrApiKey);

    let response;
    try {
        response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData
        });
    } catch (error) {
        throw new Error(WordMapI18n.t(uiLang, 'errorUnknown', { message: error.message || String(error) }));
    }

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(WordMapI18n.t(uiLang, 'errorOcrEngine', { message: response.statusText || response.status }));
    }

    if (!response.ok || data.IsErroredOnProcessing) {
        const rawMessage = Array.isArray(data.ErrorMessage)
            ? data.ErrorMessage.filter(Boolean).join('; ')
            : data.ErrorMessage || data.ErrorDetails || response.statusText || response.status;
        throw new Error(WordMapI18n.t(uiLang, 'errorOcrEngine', { message: rawMessage }));
    }

    if (data.ParsedResults && data.ParsedResults.length > 0) {
        return data.ParsedResults
            .map((item) => item.ParsedText || '')
            .join('\n')
            .trim();
    }

    return '';
}

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang, uiLang) {
    const endpoint = resolveChatCompletionsEndpoint(apiBaseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
    }

    const payload = {
        model: modelName,
        messages: [
            {
                role: 'system',
                content: buildTranslationSystemPrompt(targetLang)
            },
            {
                role: 'user',
                content: text
            }
        ],
        temperature: 0.1
    };

    let response;
    try {
        response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
    } catch (error) {
        throw new Error(WordMapI18n.t(uiLang, 'errorUnknown', { message: error.message || String(error) }));
    }

    const rawText = await response.text();
    if (!response.ok) {
        throw new Error(
            WordMapI18n.t(uiLang, 'errorAiRequestDetailed', {
                status: response.status,
                endpoint: endpoint,
                detail: extractProviderErrorMessage(rawText) || response.statusText || String(response.status)
            })
        );
    }

    let data;
    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch (error) {
        throw new Error(WordMapI18n.t(uiLang, 'errorAiEmpty'));
    }

    if (!data || !data.choices || !data.choices.length || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error(WordMapI18n.t(uiLang, 'errorAiEmpty'));
    }

    const resultText = String(data.choices[0].message.content || '').trim();

    try {
        return parseJsonFromModelOutput(resultText);
    } catch (error) {
        throw new Error(
            `${WordMapI18n.t(uiLang, 'errorJsonParse')}
${WordMapI18n.clampTextPreview(resultText, 220)}`
        );
    }
}

function buildTranslationSystemPrompt(targetLang) {
    return `You are a professional translation engine.
Your task is to translate OCR text strictly into ${targetLang}.

Rules:
1. Output ONLY a raw JSON object. Do not use markdown.
2. The value of "full_translation" must be a fluent translation written entirely in ${targetLang}.
3. Every value in "words[].dst" must also be written in ${targetLang}.
4. Preserve names, numbers, punctuation, and line-break meaning whenever possible.
5. Do not omit any meaningful source unit. Every meaningful token, particle, or phrase should be covered in the "words" array.
6. If OCR is noisy, make the most likely translation, but stay conservative and do not invent extra content.

Return exactly this shape:
{
  "full_translation": "A natural full translation in ${targetLang}",
  "words": [
    { "src": "source token", "dst": "translation or brief explanation in ${targetLang}" }
  ]
}`;
}

function parseJsonFromModelOutput(outputText) {
    const stripped = stripMarkdownCodeFences(outputText).trim();
    try {
        return JSON.parse(stripped);
    } catch (error) {
        const extracted = extractFirstBalancedJsonObject(stripped);
        if (!extracted) {
            throw error;
        }
        return JSON.parse(extracted);
    }
}

function stripMarkdownCodeFences(text) {
    return String(text || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
}

function extractFirstBalancedJsonObject(text) {
    const source = String(text || '');
    const startIndex = source.indexOf('{');
    if (startIndex === -1) {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = startIndex; index < source.length; index += 1) {
        const char = source[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                return source.slice(startIndex, index + 1);
            }
        }
    }

    return null;
}

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}


function resolveChatCompletionsEndpoint(value) {
    const normalized = normalizeBaseUrl(value);
    if (!normalized) {
        return '';
    }

    if (/\/chat\/completions$/i.test(normalized)) {
        return normalized;
    }

    return `${normalized}/chat/completions`;
}

function extractProviderErrorMessage(rawText) {
    const text = String(rawText || '').trim();
    if (!text) {
        return '';
    }

    try {
        const parsed = JSON.parse(text);
        if (typeof parsed.error === 'string') {
            return parsed.error;
        }
        if (parsed.error && typeof parsed.error.message === 'string') {
            return parsed.error.message;
        }
        if (typeof parsed.message === 'string') {
            return parsed.message;
        }
    } catch (error) {
        // Fall through to plain text.
    }

    return WordMapI18n.clampTextPreview(text, 180);
}
