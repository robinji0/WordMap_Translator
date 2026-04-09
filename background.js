try { importScripts('i18n.js'); } catch (error) {}

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    if (command === 'toggle-draw-mode') smartToggleDraw(tab.id, 'pencil');
    if (command === 'toggle-rect-mode') smartToggleDraw(tab.id, 'rect');
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'popup_toggle_draw') {
    if (request.tabId) {
      smartToggleDraw(request.tabId, request.mode || 'pencil', request.uiLang);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) smartToggleDraw(tabs[0].id, request.mode || 'pencil', request.uiLang);
      });
    }
    sendResponse({ status: 'ok' });
    return true;
  }

  if (request.action === 'capture_tab') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 100 }, (dataUrl) => {
      sendResponse({ dataUrl, error: chrome.runtime.lastError?.message || '' });
    });
    return true;
  }

  if (request.action === 'process_image') {
    chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'], async (stored) => {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ status: 'error' });
        return;
      }

      const uiLang = getUiLang(stored.uiLang);
      const apiBaseUrl = (stored.apiBaseUrl || '').trim().replace(/\/$/, '');
      const modelName = (stored.modelName || '').trim();
      const apiKey = (stored.apiKey || '').trim();
      const targetLang = stored.targetLang || 'Chinese';
      const ocrApiKey = (stored.ocrApiKey || '').trim() || 'helloworld';
      const sourceLang = stored.sourceLang || 'eng';

      if (!apiBaseUrl || !modelName) {
        sendTabMessage(tabId, {
          action: 'show_error',
          uiLang,
          message: t(uiLang, 'errorMissingConfig')
        });
        sendResponse({ status: 'missing_config' });
        return;
      }

      try {
        sendTabMessage(tabId, {
          action: 'show_status',
          uiLang,
          title: t(uiLang, 'statusOcrTitle'),
          detail: t(uiLang, 'statusOcrDetail', {
            engine: sourceLang,
            engineLabel: getOcrLanguageLabel(sourceLang, uiLang)
          }),
          state: 'progress'
        });

        const extractedText = await performOCR(request.imageBase64, ocrApiKey, sourceLang, uiLang);
        if (!String(extractedText || '').trim()) {
          throw new Error(t(uiLang, 'errorNoText'));
        }

        sendTabMessage(tabId, {
          action: 'show_status',
          uiLang,
          title: t(uiLang, 'statusTranslateTitle'),
          detail: t(uiLang, 'statusTranslateDetail', {
            preview: clampTextPreview(extractedText, 72)
          }),
          state: 'progress'
        });

        const result = await callUniversalLLM(extractedText, apiBaseUrl, modelName, apiKey, targetLang, uiLang);
        sendTabMessage(tabId, { action: 'show_result', uiLang, data: result, ocrText: extractedText });
        sendResponse({ status: 'ok' });
      } catch (error) {
        sendTabMessage(tabId, {
          action: 'show_error',
          uiLang,
          message: error.message || t(uiLang, 'errorUnknown', { message: 'unknown error' })
        });
        sendResponse({ status: 'error' });
      }
    });
    return true;
  }
});

function getUiLang(value) {
  if (typeof WordMapI18n !== 'undefined') return WordMapI18n.getEffectiveUiLang(value);
  return String(value || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

function t(uiLang, key, params) {
  if (typeof WordMapI18n !== 'undefined') return WordMapI18n.t(uiLang, key, params);
  return key;
}

function getOcrLanguageLabel(code, uiLang) {
  if (typeof WordMapI18n !== 'undefined') return WordMapI18n.getOcrLanguageLabel(code, uiLang);
  return code;
}

function clampTextPreview(text, maxLength) {
  if (typeof WordMapI18n !== 'undefined') return WordMapI18n.clampTextPreview(text, maxLength);
  return String(text || '').slice(0, maxLength || 60);
}

function sendTabMessage(tabId, payload) {
  chrome.tabs.sendMessage(tabId, payload, () => void chrome.runtime.lastError);
}

function smartToggleDraw(tabId, mode, uiLang) {
  chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode, uiLang }, () => {
    if (!chrome.runtime.lastError) return;
    chrome.scripting.insertCSS({ target: { tabId }, files: ['style.css'] })
      .then(() => chrome.scripting.executeScript({ target: { tabId }, files: ['i18n.js', 'content.js'] }))
      .then(() => chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode, uiLang }))
      .catch((error) => console.error('Failed to inject content scripts.', error));
  });
}

async function performOCR(base64Image, ocrApiKey, sourceLang, uiLang) {
  const formData = new FormData();
  formData.append('base64image', base64Image);
  formData.append('language', sourceLang);
  formData.append('scale', 'true');
  formData.append('OCREngine', '1');
  formData.append('apikey', ocrApiKey);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    const rawMessage = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.filter(Boolean).join('; ') : (data.ErrorMessage || 'Unknown OCR error');
    throw new Error(t(uiLang, 'errorOcrEngine', { message: rawMessage }));
  }
  if (Array.isArray(data.ParsedResults) && data.ParsedResults.length > 0) {
    return data.ParsedResults.map((item) => item.ParsedText || '').join('\n').trim();
  }
  return '';
}

function buildChatCompletionsEndpoint(apiBaseUrl) {
  const normalized = String(apiBaseUrl || '').trim().replace(/\/$/, '');
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  if (/\/v\d+$/i.test(normalized) || /\/openai$/i.test(normalized)) return `${normalized}/chat/completions`;
  return `${normalized}/chat/completions`;
}

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang, uiLang) {
  const endpoint = buildChatCompletionsEndpoint(apiBaseUrl);
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const systemPrompt = `You are a professional translator and reading assistant.
Return ONLY valid raw JSON.
Translate the user's text strictly into ${targetLang}.
Every dst value and the full_translation field must be in ${targetLang}.
Do not include markdown.
Use this JSON schema exactly:
{
  "full_translation": "fluent translation in ${targetLang}",
  "words": [
    {"src": "source token", "dst": "translation or brief explanation in ${targetLang}"}
  ]
}`;

  const payload = {
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.1
  };

  const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (error) {}
    const pieces = [t(uiLang, 'errorAiRequest', { status: response.status }), t(uiLang, 'errorEndpointDetail', { endpoint })];
    if (detail) pieces.push(detail.slice(0, 260));
    throw new Error(pieces.join('\n'));
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(t(uiLang, 'errorAiEmpty'));
  }

  let resultText = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const jsonMatch = resultText.match(/\{[\s\S]*\}$/);
  if (jsonMatch) resultText = jsonMatch[0];

  try {
    return JSON.parse(resultText);
  } catch (error) {
    throw new Error(`${t(uiLang, 'errorJsonParse')}\n${resultText.slice(0, 320)}`);
  }
}
