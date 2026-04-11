try {
  importScripts('i18n.js');
} catch (error) {
  console.warn('WordMap i18n import failed:', error);
}

const DEFAULT_SETTINGS = {
  uiLang: (typeof WordMapI18n !== 'undefined' && WordMapI18n.getEffectiveUiLang)
    ? WordMapI18n.getEffectiveUiLang()
    : 'en',
  sourceLang: 'eng',
  targetLang: (typeof WordMapI18n !== 'undefined' && WordMapI18n.TARGET_LANG_SIMPLIFIED_CHINESE)
    ? WordMapI18n.TARGET_LANG_SIMPLIFIED_CHINESE
    : 'Simplified Chinese',
  mobileQuickEnabled: true,
  mobileQuickMode: 'rect'
};

let lastActiveWebTabId = null;
const sessions = new Map();

function dbgTarget(tabId) {
  return { tabId };
}

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    const u = new URL(url);
    u.hash = '';
    return u.href;
  } catch {
    return url;
  }
}

function getSession(tabId) {
  let session = sessions.get(tabId);
  if (!session) {
    session = {
      attached: false,
      networkEnabled: false,
      attachedAt: 0,
      imagesByUrl: new Map(),
      imagesByRequestId: new Map(),
      totalImageEvents: 0,
      diagnostics: []
    };
    sessions.set(tabId, session);
  }
  return session;
}

function pushDiag(session, message) {
  session.diagnostics.push({ ts: Date.now(), message });
  if (session.diagnostics.length > 60) session.diagnostics.shift();
}

function debugAttach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(dbgTarget(tabId), '1.3', () => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve();
    });
  });
}

function debugDetach(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach(dbgTarget(tabId), () => resolve());
  });
}

function sendCommand(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(dbgTarget(tabId), method, params, (result) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve(result);
    });
  });
}

async function ensureDebugger(tabId) {
  const session = getSession(tabId);
  if (!session.attached) {
    await debugAttach(tabId);
    session.attached = true;
    session.attachedAt = Date.now();
    pushDiag(session, 'debugger_attached');
  }
  if (!session.networkEnabled) {
    await sendCommand(tabId, 'Network.enable');
    try {
      await sendCommand(tabId, 'Page.enable');
    } catch {
      // ignore
    }
    session.networkEnabled = true;
    pushDiag(session, 'network_enabled');
  }
  return session;
}

function rememberImageResponse(tabId, payload) {
  const session = getSession(tabId);
  const { requestId, response, type } = payload || {};
  if (!requestId || !response) return;
  const mimeType = String(response.mimeType || '').toLowerCase();
  const isImage = type === 'Image' || mimeType.startsWith('image/');
  if (!isImage) return;

  const info = {
    requestId,
    url: response.url || '',
    normalizedUrl: normalizeUrl(response.url || ''),
    mimeType,
    status: response.status,
    fromDiskCache: !!response.fromDiskCache,
    fromPrefetchCache: !!response.fromPrefetchCache,
    encodedDataLength: response.encodedDataLength || 0,
    ts: Date.now()
  };

  session.imagesByRequestId.set(requestId, info);
  if (!session.imagesByUrl.has(info.normalizedUrl)) {
    session.imagesByUrl.set(info.normalizedUrl, []);
  }
  const list = session.imagesByUrl.get(info.normalizedUrl);
  list.push(info);
  if (list.length > 12) list.shift();
  session.totalImageEvents += 1;
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (!source || typeof source.tabId !== 'number') return;
  if (method === 'Network.responseReceived') {
    rememberImageResponse(source.tabId, params);
  }
});

chrome.debugger.onDetach.addListener((source, reason) => {
  if (!source || typeof source.tabId !== 'number') return;
  const session = sessions.get(source.tabId);
  if (!session) return;
  session.attached = false;
  session.networkEnabled = false;
  pushDiag(session, `debugger_detached:${reason}`);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  sessions.delete(tabId);
  if (tabId === lastActiveWebTabId) lastActiveWebTabId = null;
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    rememberTabIfWebPage(tab);
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!tab || !tab.active) return;
  if (changeInfo.url || changeInfo.status === 'complete') rememberTabIfWebPage(tab);
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS), (stored) => {
    const updates = {};
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (typeof stored[key] === 'undefined') updates[key] = value;
    }
    if (Object.keys(updates).length) chrome.storage.local.set(updates);
  });
});

chrome.commands.onCommand.addListener((command) => {
  const mode = command === 'toggle-draw-mode'
    ? 'pencil'
    : command === 'toggle-rect-mode'
      ? 'rect'
      : '';
  if (!mode) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs[0];
    if (activeTab) rememberTabIfWebPage(activeTab);
    resolveBestCaptureTab(null, (tabId) => {
      if (typeof tabId === 'number') smartToggleDraw(tabId, mode);
    });
  });
});

function rememberTabIfWebPage(tab) {
  if (!tab || typeof tab.id !== 'number') return;
  if (!isCapturableUrl(tab.url || '')) return;
  lastActiveWebTabId = tab.id;
}

function isCapturableUrl(url) {
  return !/^(chrome|edge|about|brave|vivaldi|opera|chrome-extension):\/\//i.test(String(url || ''));
}

function resolveBestCaptureTab(preferredTabId, callback) {
  if (typeof preferredTabId === 'number') {
    chrome.tabs.get(preferredTabId, (tab) => {
      if (!chrome.runtime.lastError && tab && isCapturableUrl(tab.url || '')) {
        rememberTabIfWebPage(tab);
        callback(tab.id);
        return;
      }
      resolveBestCaptureTab(null, callback);
    });
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs && tabs[0];
    if (activeTab && isCapturableUrl(activeTab.url || '')) {
      rememberTabIfWebPage(activeTab);
      callback(activeTab.id);
      return;
    }

    if (typeof lastActiveWebTabId === 'number') {
      chrome.tabs.get(lastActiveWebTabId, (fallbackTab) => {
        if (!chrome.runtime.lastError && fallbackTab && isCapturableUrl(fallbackTab.url || '')) {
          callback(fallbackTab.id);
          return;
        }
        callback(null);
      });
      return;
    }

    callback(null);
  });
}

function smartToggleDraw(tabId, mode) {
  chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode }, () => {
    if (!chrome.runtime.lastError) return;
    chrome.scripting
      .insertCSS({ target: { tabId }, files: ['style.css'] })
      .then(() => chrome.scripting.executeScript({ target: { tabId }, files: ['bootstrap.js', 'i18n.js', 'content.js'] }))
      .then(() => chrome.tabs.sendMessage(tabId, { action: 'toggle_draw', mode }))
      .catch((error) => console.error('WordMap injection failed:', error));
  });
}

function readConfig() {
  return chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS)).then((stored) => ({ ...DEFAULT_SETTINGS, ...stored }));
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveChatCompletionsEndpoint(value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return '';
  if (/\/chat\/completions$/i.test(normalized)) return normalized;
  return `${normalized}/chat/completions`;
}

function sendProgressStatus(tabId, uiLang, payload) {
  chrome.tabs.sendMessage(tabId, {
    action: 'show_status',
    uiLang,
    state: 'progress',
    title: payload.title,
    detail: payload.detail
  });
}

function sendErrorStatus(tabId, uiLang, detail) {
  chrome.tabs.sendMessage(tabId, {
    action: 'show_status',
    uiLang,
    state: 'error',
    title: WordMapI18n.t(uiLang, 'errorTitle'),
    detail
  });
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
  if (startIndex === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return null;
}

function parseJsonFromModelOutput(outputText) {
  const stripped = stripMarkdownCodeFences(outputText).trim();
  try {
    return JSON.parse(stripped);
  } catch (error) {
    const extracted = extractFirstBalancedJsonObject(stripped);
    if (!extracted) throw error;
    return JSON.parse(extracted);
  }
}

function extractProviderErrorMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error.message === 'string') return parsed.error.message;
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // ignore
  }
  return WordMapI18n.clampTextPreview(text, 180);
}

async function callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang, uiLang) {
  const endpoint = resolveChatCompletionsEndpoint(apiBaseUrl);
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const normalizedTargetLang = WordMapI18n.normalizeTargetLang(targetLang);
  const targetInstruction = normalizedTargetLang === WordMapI18n.TARGET_LANG_SIMPLIFIED_CHINESE
    ? 'Simplified Chinese (简体中文). Never use Traditional Chinese (繁體中文).'
    : normalizedTargetLang;

  const payload = {
    model: modelName,
    messages: [
      {
        role: 'system',
        content: `You are a professional translation engine.\nYour task is to translate OCR text strictly into ${targetInstruction}.\n\nRules:\n1. Output ONLY a raw JSON object. Do not use markdown.\n2. The value of \"full_translation\" must be a fluent translation written entirely in ${targetInstruction}.\n3. Every value in \"words[].dst\" must also be written in ${targetInstruction}.\n4. Preserve names, numbers, punctuation, and line-break meaning whenever possible.\n5. Do not omit meaningful source units. Cover all meaningful tokens, particles, or phrases in \"words\".\n6. If OCR is noisy, make the most likely conservative translation without inventing extra content.\n7. If the target is Simplified Chinese, you must use simplified Chinese characters only.\n\nReturn exactly this shape:\n{\n  \"full_translation\": \"A natural full translation in ${targetInstruction}\",\n  \"words\": [\n    { \"src\": \"source token\", \"dst\": \"translation or short explanation in ${targetInstruction}\" }\n  ]\n}`
      },
      { role: 'user', content: text }
    ],
    temperature: 0.1
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error(WordMapI18n.t(uiLang, 'errorUnknown', { message: error.message || String(error) }));
  }

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(WordMapI18n.t(uiLang, 'errorAiRequestDetailed', {
      status: response.status,
      detail: extractProviderErrorMessage(rawText) || response.statusText || String(response.status),
      endpoint
    }));
  }

  let data;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(WordMapI18n.t(uiLang, 'errorAiEmpty'));
  }

  if (!data || !data.choices || !data.choices.length || !data.choices[0].message || !data.choices[0].message.content) {
    throw new Error(WordMapI18n.t(uiLang, 'errorAiEmpty'));
  }

  const resultText = String(data.choices[0].message.content || '').trim();
  try {
    return parseJsonFromModelOutput(resultText);
  } catch {
    throw new Error(`${WordMapI18n.t(uiLang, 'errorJsonParse')}\n${WordMapI18n.clampTextPreview(resultText, 220)}`);
  }
}

async function performSingleOCR(base64Image, ocrApiKey, ocrSourceLang, engine) {
  const formData = new FormData();
  formData.append('base64image', base64Image);
  formData.append('language', ocrSourceLang);
  formData.append('scale', 'true');
  formData.append('OCREngine', String(engine));
  formData.append('apikey', ocrApiKey);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(response.statusText || response.status || 'ocr_response_parse_failed');
  }

  if (!response.ok || data.IsErroredOnProcessing) {
    const message = Array.isArray(data.ErrorMessage)
      ? data.ErrorMessage.filter(Boolean).join('; ')
      : data.ErrorMessage || data.ErrorDetails || response.statusText || response.status;
    throw new Error(message || 'ocr_processing_error');
  }

  const text = (Array.isArray(data.ParsedResults) ? data.ParsedResults : [])
    .map((item) => item.ParsedText || '')
    .join('\n')
    .trim();

  return text;
}

async function performOCR(base64Image, ocrApiKey, ocrSourceLang, uiLang) {
  const engines = [2, 1];
  let lastError = '';
  for (const engine of engines) {
    try {
      const text = await performSingleOCR(base64Image, ocrApiKey, ocrSourceLang, engine);
      if (text) return text;
    } catch (error) {
      lastError = error.message || String(error);
    }
  }

  if (lastError) {
    throw new Error(WordMapI18n.t(uiLang, 'errorOcrEngine', { message: lastError }));
  }

  return '';
}

function bodyToDataUrl(bodyResult, fallbackMimeType = 'image/png') {
  const mime = fallbackMimeType || 'image/png';
  if (!bodyResult) return null;
  if (bodyResult.base64Encoded) return `data:${mime};base64,${bodyResult.body}`;
  try {
    return `data:${mime};base64,${btoa(bodyResult.body)}`;
  } catch {
    return null;
  }
}

async function getImageBodyViaDebugger(tabId, requestId, mimeType) {
  const bodyResult = await sendCommand(tabId, 'Network.getResponseBody', { requestId });
  return bodyToDataUrl(bodyResult, mimeType);
}

async function resolveCandidateResource(tabId, candidate) {
  if (!candidate || !candidate.sourceUrl) {
    return { ok: false, reason: 'missing_source_url' };
  }

  if (candidate.inlineDataUrl && candidate.inlineDataUrl.startsWith('data:')) {
    return {
      ok: true,
      path: 'probe_blob',
      sourceUrl: candidate.sourceUrl,
      dataUrl: candidate.inlineDataUrl,
      mimeType: candidate.inlineMimeType || 'image/png'
    };
  }

  if (candidate.sourceUrl.startsWith('data:')) {
    return {
      ok: true,
      path: 'data_url',
      sourceUrl: candidate.sourceUrl,
      dataUrl: candidate.sourceUrl,
      mimeType: candidate.sourceUrl.slice(5, candidate.sourceUrl.indexOf(';')) || 'image/png'
    };
  }

  if (candidate.sourceUrl.startsWith('blob:')) {
    return {
      ok: false,
      reason: 'blob_url_without_probe_export',
      sourceUrl: candidate.sourceUrl
    };
  }

  const session = getSession(tabId);
  const key = normalizeUrl(candidate.sourceUrl);
  const matches = session.imagesByUrl.get(key) || [];
  const latest = [...matches].sort((a, b) => b.ts - a.ts)[0];
  if (!latest) {
    return {
      ok: false,
      reason: 'no_cdp_network_match',
      sourceUrl: candidate.sourceUrl
    };
  }

  try {
    const dataUrl = await getImageBodyViaDebugger(tabId, latest.requestId, latest.mimeType);
    if (!dataUrl) {
      return {
        ok: false,
        reason: 'empty_cdp_body',
        sourceUrl: candidate.sourceUrl,
        requestId: latest.requestId
      };
    }
    return {
      ok: true,
      path: 'cdp_network_body',
      sourceUrl: candidate.sourceUrl,
      requestId: latest.requestId,
      mimeType: latest.mimeType || 'image/png',
      dataUrl
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'cdp_get_body_failed',
      sourceUrl: candidate.sourceUrl,
      requestId: latest.requestId,
      error: error.message || String(error)
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'popup_toggle_draw') {
        resolveBestCaptureTab(request.tabId, (tabId) => {
          if (!tabId) {
            sendResponse({ status: 'no_target_tab' });
            return;
          }
          smartToggleDraw(tabId, request.mode || 'rect');
          sendResponse({ status: 'ok', tabId });
        });
        return;
      }

      if (request.action === 'capture_tab') {
        const preferredTabId = typeof request.tabId === 'number'
          ? request.tabId
          : sender.tab && typeof sender.tab.id === 'number'
            ? sender.tab.id
            : null;

        resolveBestCaptureTab(preferredTabId, (tabId) => {
          if (typeof tabId !== 'number') {
            sendResponse({ error: 'no_target_tab' });
            return;
          }

          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
              sendResponse({ error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'capture_failed' });
              return;
            }

            const windowId = typeof tab.windowId === 'number' ? tab.windowId : null;
            chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 100 }, (dataUrl) => {
              if (chrome.runtime.lastError || !dataUrl) {
                sendResponse({ error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'capture_failed' });
                return;
              }
              sendResponse({ dataUrl, tabId, windowId });
            });
          });
        });
        return;
      }

      if (request.action === 'wm_prepare') {
        const tabId = sender.tab?.id || request.tabId;
        if (typeof tabId !== 'number') throw new Error('missing_tab_id');
        const session = await ensureDebugger(tabId);
        sendResponse({
          ok: true,
          attached: session.attached,
          networkEnabled: session.networkEnabled,
          totalImageEvents: session.totalImageEvents,
          requiresReload: session.totalImageEvents === 0,
          diagnostics: session.diagnostics.slice(-5)
        });
        return;
      }

      if (request.action === 'wm_get_debug_status') {
        const tabId = sender.tab?.id || request.tabId;
        const session = getSession(tabId);
        sendResponse({
          ok: true,
          attached: session.attached,
          networkEnabled: session.networkEnabled,
          totalImageEvents: session.totalImageEvents,
          diagnostics: session.diagnostics.slice(-10)
        });
        return;
      }

      if (request.action === 'wm_resolve_resources') {
        const tabId = sender.tab?.id || request.tabId;
        if (typeof tabId !== 'number') throw new Error('missing_tab_id');
        const candidates = Array.isArray(request.candidates) ? request.candidates : [];
        const resolved = [];
        for (const candidate of candidates) {
          const resource = await resolveCandidateResource(tabId, candidate);
          resolved.push({ candidateId: candidate.id, resource });
        }
        sendResponse({ ok: true, resolved });
        return;
      }

      if (request.action === 'process_text') {
        const stored = await chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'uiLang']);
        const uiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
        const tabId = sender.tab && sender.tab.id;
        const text = String(request.text || '').trim();
        const apiBaseUrl = normalizeBaseUrl(stored.apiBaseUrl);
        const modelName = String(stored.modelName || '').trim();
        const apiKey = String(stored.apiKey || '').trim();
        const targetLang = WordMapI18n.normalizeTargetLang(stored.targetLang || DEFAULT_SETTINGS.targetLang);

        if (!tabId) {
          sendResponse({ status: 'no_tab' });
          return;
        }
        if (!apiBaseUrl || !modelName) {
          sendErrorStatus(tabId, uiLang, WordMapI18n.t(uiLang, 'errorMissingConfig'));
          sendResponse({ status: 'missing_config' });
          return;
        }
        if (!text) {
          sendErrorStatus(tabId, uiLang, WordMapI18n.t(uiLang, 'errorNoText'));
          sendResponse({ status: 'no_text' });
          return;
        }

        try {
          sendProgressStatus(tabId, uiLang, {
            title: WordMapI18n.t(uiLang, 'statusTranslateTitle'),
            detail: WordMapI18n.t(uiLang, 'statusTranslateDetail', { preview: WordMapI18n.clampTextPreview(text, 48) })
          });
          const jsonResult = await callUniversalLLM(text, apiBaseUrl, modelName, apiKey, targetLang, uiLang);
          chrome.tabs.sendMessage(tabId, {
            action: 'show_result',
            uiLang,
            data: jsonResult,
            ocrText: text,
            capturePreview: '',
            captureMeta: request.captureMeta || null
          });
          sendResponse({ status: 'ok' });
        } catch (error) {
          const message = error && error.message ? error.message : WordMapI18n.t(uiLang, 'errorUnknown', { message: String(error) });
          sendErrorStatus(tabId, uiLang, message);
          sendResponse({ status: 'error', message });
        }
        return;
      }

      if (request.action === 'process_image') {
        const stored = await chrome.storage.local.get(['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang']);
        const uiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
        const tabId = sender.tab && sender.tab.id;
        const apiBaseUrl = normalizeBaseUrl(stored.apiBaseUrl);
        const modelName = String(stored.modelName || '').trim();
        const apiKey = String(stored.apiKey || '').trim();
        const targetLang = WordMapI18n.normalizeTargetLang(stored.targetLang || DEFAULT_SETTINGS.targetLang);
        const ocrApiKey = String(stored.ocrApiKey || '').trim() || 'helloworld';
        const ocrSourceLang = stored.sourceLang || DEFAULT_SETTINGS.sourceLang;

        if (!tabId) {
          sendResponse({ status: 'no_tab' });
          return;
        }
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
          if (!extractedText) {
            sendErrorStatus(tabId, uiLang, WordMapI18n.t(uiLang, 'errorNoText'));
            sendResponse({ status: 'no_text' });
            return;
          }

          sendProgressStatus(tabId, uiLang, {
            title: WordMapI18n.t(uiLang, 'statusTranslateTitle'),
            detail: WordMapI18n.t(uiLang, 'statusTranslateDetail', { preview: WordMapI18n.clampTextPreview(extractedText, 48) })
          });
          const jsonResult = await callUniversalLLM(extractedText, apiBaseUrl, modelName, apiKey, targetLang, uiLang);
          chrome.tabs.sendMessage(tabId, {
            action: 'show_result',
            uiLang,
            data: jsonResult,
            ocrText: extractedText,
            capturePreview: request.capturePreview || '',
            captureMeta: request.captureMeta || null
          });
          sendResponse({ status: 'ok' });
        } catch (error) {
          const message = error && error.message ? error.message : WordMapI18n.t(uiLang, 'errorUnknown', { message: String(error) });
          sendErrorStatus(tabId, uiLang, message);
          sendResponse({ status: 'error', message });
        }
        return;
      }

      if (request.action === 'wm_debugger_detach') {
        const tabId = sender.tab?.id || request.tabId;
        if (typeof tabId === 'number') {
          try { await debugDetach(tabId); } catch {}
          const session = getSession(tabId);
          session.attached = false;
          session.networkEnabled = false;
        }
        sendResponse({ ok: true });
        return;
      }

      throw new Error(`unknown_action:${request.action}`);
    } catch (error) {
      sendResponse({ ok: false, error: error.message || String(error) });
    }
  })();
  return true;
});
