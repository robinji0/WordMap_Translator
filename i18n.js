(function (root) {
  const UI_LANG_ZH = 'zh-CN';
  const UI_LANG_EN = 'en';

  const dictionaries = {
    [UI_LANG_ZH]: {
      heroPill: 'OCR + AI',
      appTitle: 'WordMap 圈选翻译',
      appTitleCompact: 'WordMap',
      appSubtitle: '在任意网页上圈选文字区域，用 OCR 识别，再交给 AI 即时翻译。',
      appSubtitleCompact: '圈选即翻译，支持 OCR + AI。',
      safetyTitle: '界面语言与 OCR 语言完全独立',
      safetyBody: '界面语言只影响插件界面与网页内提示；OCR 原文语言会直接传给 OCR API 的 language 参数，请按图片中的实际文字语言单独设置。',
      ocrUiSeparatedBadge: 'UI ≠ OCR',
      sectionConnectionTitle: '接口配置',
      sectionConnectionDesc: '配置 OCR 与大模型后即可开始使用。',
      sectionConnectionDescCompact: '填一次即可，后续可直接圈选翻译。',
      sectionLanguageTitle: '语言',
      sectionLanguageDesc: '分别设置界面语言、OCR 原文语言和翻译目标语言。',
      sectionLanguageDescCompact: '这里只设置识别语言和翻译目标。',
      sectionActionTitle: '快速操作',
      sectionActionDesc: '支持自由圈选与矩形框选。',
      sectionActionDescCompact: '两种选区模式，直接开始。',
      ocrKeyHelpTitle: 'OCR.space 可直接试用',
      ocrKeyHelpBody: '默认使用公共测试 Key。若遇到频率限制或稳定性不足，建议申请自己的 OCR.space Key。',
      ocrKeyHelpBodyCompact: 'OCR Key 留空会走默认 helloworld；不稳定时再换成你自己的 Key。',
      ocrKeyHelpLink: '免费申请 OCR.space Key',
      ocrKeyHelpLinkShort: '申请 OCR Key',
      ocrApiKeyLabel: 'OCR Key',
      ocrApiKeyPlaceholder: '留空则使用默认 helloworld',
      apiBaseUrlLabel: '模型 Base URL',
      apiBaseUrlPlaceholder: '例如：https://api.openai.com/v1',
      modelNameLabel: '模型名称',
      modelNamePlaceholder: '例如：gpt-4.1-mini',
      apiKeyLabel: '模型 API Key',
      apiKeyPlaceholder: '例如：sk-...',
      uiLanguageLabel: '界面语言',
      uiLanguageHint: '只影响插件界面与提示，不影响 OCR 参数。',
      uiLanguageToggleTitle: '切换界面语言',
      sourceLangLabel: 'OCR 原文语言',
      sourceLangHint: '这个值会原样传给 OCR API 的 language 参数。',
      sourceLangHintCompact: '只要和图片里的文字语言一致即可；不要跟界面语言混用。',
      targetLangLabel: '翻译目标语言',
      targetLangHint: '这个值决定 AI 输出的目标语言。',
      saveSettings: '保存设置',
      saveSuccess: '已保存',
      drawPencilLabel: '自由圈选',
      drawPencilDesc: '适合不规则气泡、字幕、按钮文案',
      drawPencilDescShort: '适合气泡、字幕',
      drawRectLabel: '矩形框选',
      drawRectDesc: '适合段落、表格、整块区域',
      drawRectDescShort: '适合段落、表格',
      openShortcuts: '打开快捷键设置',
      openShortcutsShort: '快捷键',
      actionHint: '默认快捷键：Alt + T（自由圈选） / Alt + R（矩形框选）',
      actionHintCompact: 'Alt + T / Alt + R',
      systemPageBlocked: '浏览器系统页面不支持运行插件。',
      drawHintPencilTitle: '自由圈选模式',
      drawHintPencilDesc: '沿着目标文字手绘圈选，松开鼠标后自动识别。',
      drawHintRectTitle: '矩形框选模式',
      drawHintRectDesc: '拖拽一个矩形选区，适合整段文本或截图。',
      drawHintFooter: '按 Esc 可取消。',
      cardSubtitle: '可拖动',
      statusPreparingCaptureTitle: '正在截取选区',
      statusPreparingCaptureDetail: '请稍候，正在准备图像。',
      statusUploadingTitle: '正在准备 OCR 请求',
      statusUploadingDetail: '选区已裁剪完成，正在发送到 OCR 服务。',
      statusOcrTitle: '正在提取文字',
      statusOcrDetail: 'OCR 语言：{engineLabel} ({engine})',
      statusTranslateTitle: '正在翻译文本',
      statusTranslateDetail: '已识别：{preview}',
      errorTitle: '处理失败',
      errorMissingConfig: '请先填写并保存模型接口地址与模型名称。',
      errorNoText: '没有识别到清晰文字，请重新框选。',
      errorCaptureFailed: '截图失败，请刷新当前页面后重试。',
      errorOcrEngine: 'OCR 服务返回错误：{message}',
      errorAiRequest: 'AI 请求失败（状态码 {status}）。',
      errorAiRequestDetailed: 'AI 请求失败（状态码 {status}）。请检查 Base URL 是否正确。\n接口：{endpoint}\n详情：{detail}',
      errorAiEmpty: 'AI 返回异常，没有拿到有效结果。',
      errorJsonParse: '模型返回的内容不是有效 JSON。',
      errorUnknown: '发生未知错误：{message}',
      resultSectionDetectedText: 'OCR 原文',
      resultSectionTranslation: '整句翻译',
      resultSectionGlossary: '词语拆解',
      resultEmpty: 'AI 没有返回可展示的翻译结果。',
      resultNoGloss: '暂无释义',
      closeButtonAria: '关闭',
      cardBrandSubtitle: '结果',
      drawModeBadgeFreehand: '自由圈选',
      drawModeBadgeRect: '矩形框选'
    },
    [UI_LANG_EN]: {
      heroPill: 'OCR + AI',
      appTitle: 'WordMap',
      appTitleCompact: 'WordMap',
      appSubtitle: 'Capture text from any page, run OCR, and translate it with AI.',
      appSubtitleCompact: 'Capture, OCR, and translate in one step.',
      safetyTitle: 'UI language is separate from OCR language',
      safetyBody: 'The interface language only changes the extension UI and in-page prompts. The OCR source language is sent directly to the OCR API `language` parameter and must match the text in the image.',
      ocrUiSeparatedBadge: 'UI ≠ OCR',
      sectionConnectionTitle: 'Connection',
      sectionConnectionDesc: 'Set up OCR and your LLM endpoint.',
      sectionConnectionDescCompact: 'Set it once, then capture and translate.',
      sectionLanguageTitle: 'Language',
      sectionLanguageDesc: 'Configure UI language, OCR source language, and translation target separately.',
      sectionLanguageDescCompact: 'Only OCR source and translation target live here.',
      sectionActionTitle: 'Quick actions',
      sectionActionDesc: 'Use freehand or rectangle selection modes.',
      sectionActionDescCompact: 'Two capture modes, ready to use.',
      ocrKeyHelpTitle: 'OCR.space works out of the box',
      ocrKeyHelpBody: 'The public test key is used by default. If you run into rate limits or unstable results, use your own OCR.space key.',
      ocrKeyHelpBodyCompact: 'Leave the OCR key empty to use the default helloworld key. Switch to your own key only if you need better stability.',
      ocrKeyHelpLink: 'Get a free OCR.space key',
      ocrKeyHelpLinkShort: 'Get OCR key',
      ocrApiKeyLabel: 'OCR key',
      ocrApiKeyPlaceholder: 'Leave empty to use the default helloworld key',
      apiBaseUrlLabel: 'Model base URL',
      apiBaseUrlPlaceholder: 'Example: https://api.openai.com/v1',
      modelNameLabel: 'Model name',
      modelNamePlaceholder: 'Example: gpt-4.1-mini',
      apiKeyLabel: 'Model API key',
      apiKeyPlaceholder: 'Example: sk-...',
      uiLanguageLabel: 'Interface language',
      uiLanguageHint: 'Only affects the UI and prompts. It never changes OCR parameters.',
      uiLanguageToggleTitle: 'Switch interface language',
      sourceLangLabel: 'OCR source language',
      sourceLangHint: 'This value is sent to the OCR API as the `language` parameter.',
      sourceLangHintCompact: 'Match this to the language in the image. Do not confuse it with the UI language.',
      targetLangLabel: 'Translation target language',
      targetLangHint: 'This controls the language used in the AI translation output.',
      saveSettings: 'Save settings',
      saveSuccess: 'Saved',
      drawPencilLabel: 'Freehand',
      drawPencilDesc: 'Best for bubbles, subtitles, and irregular shapes',
      drawPencilDescShort: 'Best for bubbles and subtitles',
      drawRectLabel: 'Rectangle',
      drawRectDesc: 'Best for paragraphs, tables, and text blocks',
      drawRectDescShort: 'Best for paragraphs and tables',
      openShortcuts: 'Open shortcut settings',
      openShortcutsShort: 'Shortcuts',
      actionHint: 'Default shortcuts: Alt + T (freehand) / Alt + R (rectangle)',
      actionHintCompact: 'Alt + T / Alt + R',
      systemPageBlocked: 'The extension cannot run on browser system pages.',
      drawHintPencilTitle: 'Freehand mode',
      drawHintPencilDesc: 'Draw around the text. OCR starts when you release the mouse.',
      drawHintRectTitle: 'Rectangle mode',
      drawHintRectDesc: 'Drag a rectangular selection. Great for paragraphs or screenshots.',
      drawHintFooter: 'Press Esc to cancel.',
      cardSubtitle: 'Draggable',
      statusPreparingCaptureTitle: 'Capturing selection',
      statusPreparingCaptureDetail: 'Preparing the cropped image.',
      statusUploadingTitle: 'Preparing OCR request',
      statusUploadingDetail: 'The selected area has been cropped and is being sent to OCR.',
      statusOcrTitle: 'Extracting text',
      statusOcrDetail: 'OCR language: {engineLabel} ({engine})',
      statusTranslateTitle: 'Translating',
      statusTranslateDetail: 'Recognized text: {preview}',
      errorTitle: 'Something went wrong',
      errorMissingConfig: 'Please save the model base URL and model name first.',
      errorNoText: 'No clear text was detected. Please select the area again.',
      errorCaptureFailed: 'Screenshot capture failed. Refresh the page and try again.',
      errorOcrEngine: 'The OCR service returned an error: {message}',
      errorAiRequest: 'The AI request failed (status {status}).',
      errorAiRequestDetailed: 'The AI request failed (status {status}). Check whether the base URL is correct.\nEndpoint: {endpoint}\nDetails: {detail}',
      errorAiEmpty: 'The AI response was empty or malformed.',
      errorJsonParse: 'The model response was not valid JSON.',
      errorUnknown: 'An unexpected error occurred: {message}',
      resultSectionDetectedText: 'Detected text',
      resultSectionTranslation: 'Full translation',
      resultSectionGlossary: 'Glossary',
      resultEmpty: 'The AI did not return any translation data that can be shown.',
      resultNoGloss: 'No gloss available',
      closeButtonAria: 'Close',
      cardBrandSubtitle: 'Result',
      drawModeBadgeFreehand: 'Freehand',
      drawModeBadgeRect: 'Rectangle'
    }
  };

  const uiLanguageOptions = [
    {
      value: UI_LANG_ZH,
      label: {
        [UI_LANG_ZH]: '中文',
        [UI_LANG_EN]: 'Chinese'
      }
    },
    {
      value: UI_LANG_EN,
      label: {
        [UI_LANG_ZH]: 'English',
        [UI_LANG_EN]: 'English'
      }
    }
  ];

  const ocrLanguageOptions = [
    { value: 'eng', label: { [UI_LANG_ZH]: '英语 (English)', [UI_LANG_EN]: 'English' } },
    { value: 'jpn', label: { [UI_LANG_ZH]: '日语 (Japanese)', [UI_LANG_EN]: 'Japanese' } },
    { value: 'kor', label: { [UI_LANG_ZH]: '韩语 (Korean)', [UI_LANG_EN]: 'Korean' } },
    { value: 'fre', label: { [UI_LANG_ZH]: '法语 (French)', [UI_LANG_EN]: 'French' } },
    { value: 'spa', label: { [UI_LANG_ZH]: '西班牙语 (Spanish)', [UI_LANG_EN]: 'Spanish' } },
    { value: 'ger', label: { [UI_LANG_ZH]: '德语 (German)', [UI_LANG_EN]: 'German' } },
    { value: 'rus', label: { [UI_LANG_ZH]: '俄语 (Russian)', [UI_LANG_EN]: 'Russian' } },
    { value: 'chs', label: { [UI_LANG_ZH]: '中文 (Chinese)', [UI_LANG_EN]: 'Chinese' } }
  ];

  const targetLanguageOptions = [
    { value: 'Chinese', label: { [UI_LANG_ZH]: '中文', [UI_LANG_EN]: 'Chinese' } },
    { value: 'English', label: { [UI_LANG_ZH]: '英文', [UI_LANG_EN]: 'English' } },
    { value: 'Japanese', label: { [UI_LANG_ZH]: '日文', [UI_LANG_EN]: 'Japanese' } },
    { value: 'Korean', label: { [UI_LANG_ZH]: '韩文', [UI_LANG_EN]: 'Korean' } },
    { value: 'French', label: { [UI_LANG_ZH]: '法文', [UI_LANG_EN]: 'French' } },
    { value: 'Spanish', label: { [UI_LANG_ZH]: '西班牙文', [UI_LANG_EN]: 'Spanish' } },
    { value: 'German', label: { [UI_LANG_ZH]: '德文', [UI_LANG_EN]: 'German' } },
    { value: 'Russian', label: { [UI_LANG_ZH]: '俄文', [UI_LANG_EN]: 'Russian' } }
  ];

  function normalizeUiLang(value) {
    const raw = String(value || '').trim().toLowerCase();
    return raw.startsWith('zh') ? UI_LANG_ZH : UI_LANG_EN;
  }

  function detectBrowserUiLang() {
    try {
      if (root.chrome && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
        return normalizeUiLang(chrome.i18n.getUILanguage());
      }
    } catch (error) {}

    if (typeof navigator !== 'undefined' && navigator.language) {
      return normalizeUiLang(navigator.language);
    }

    return UI_LANG_EN;
  }

  function getEffectiveUiLang(storedLang) {
    return storedLang ? normalizeUiLang(storedLang) : detectBrowserUiLang();
  }

  function t(uiLang, key, params) {
    const lang = normalizeUiLang(uiLang);
    const dict = dictionaries[lang] || dictionaries[UI_LANG_EN];
    const fallbackDict = dictionaries[UI_LANG_EN];
    let template = dict[key] || fallbackDict[key] || key;

    if (!params) {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match, tokenName) => {
      if (Object.prototype.hasOwnProperty.call(params, tokenName)) {
        const value = params[tokenName];
        return value == null ? '' : String(value);
      }
      return match;
    });
  }

  function mapOptions(options, uiLang) {
    const lang = normalizeUiLang(uiLang);
    return options.map((item) => ({
      value: item.value,
      label: item.label[lang] || item.label[UI_LANG_EN] || item.value
    }));
  }

  function getUiLanguageOptions(uiLang) {
    return mapOptions(uiLanguageOptions, uiLang);
  }

  function getOcrLanguageOptions(uiLang) {
    return mapOptions(ocrLanguageOptions, uiLang);
  }

  function getTargetLanguageOptions(uiLang) {
    return mapOptions(targetLanguageOptions, uiLang);
  }

  function getOcrLanguageLabel(code, uiLang) {
    const option = getOcrLanguageOptions(uiLang).find((item) => item.value === code);
    return option ? option.label : code;
  }

  function clampTextPreview(text, maxLength) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }
    const limit = Number.isFinite(maxLength) ? maxLength : 42;
    return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
  }

  root.WordMapI18n = {
    UI_LANG_ZH,
    UI_LANG_EN,
    normalizeUiLang,
    detectBrowserUiLang,
    getEffectiveUiLang,
    getUiLanguageOptions,
    getOcrLanguageOptions,
    getTargetLanguageOptions,
    getOcrLanguageLabel,
    clampTextPreview,
    t
  };
})(typeof self !== 'undefined' ? self : window);
