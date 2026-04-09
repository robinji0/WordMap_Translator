(function (root) {
  const UI_LANG_ZH = 'zh-CN';
  const UI_LANG_EN = 'en';

  const dictionaries = {
    [UI_LANG_ZH]: {
      appTitleCompact: 'WordMap',
      appSubtitleCompact: '圈选即翻译',
      appTaglineMini: '圈一下就翻译',

      toolbarLanguage: '切换界面语言',
      toolbarSponsor: '赞助开发者',
      toolbarShortcuts: '打开快捷键设置',
      sponsorButton: '赞助',

      stepSetup: '填模型',
      stepLanguage: '选语言',
      stepCapture: '开始圈选',

      sectionSetupTitle: '配置',
      sectionSetupDescCompact: '模型配置必填，OCR Key 可选。',
      sectionLanguageTitle: '语言',
      sectionLanguageDescCompact: '这里只放 OCR 原文语言和翻译目标语言。',
      quickActions: '开始圈选',
      quickActionsDesc: '先配置，后圈选。',
      ocrUiSeparatedBadge: 'UI ≠ OCR',
      captureReady: 'Alt + T / Alt + R',

      coachReadyCompact: '已就绪，直接点下面按钮。',
      coachNeedsConfigCompact: '先填模型地址和模型名。',
      coachReady: '已就绪，直接开始圈选。',
      coachNeedsConfig: '请先完成基础配置。',
      coachStateReady: '已就绪',
      coachStateMissing: '待配置',

      setupStateReady: '已就绪',
      setupStateMissing: '待填写',
      captureStateReady: '可开始',
      captureStateMissing: '先配置',
      readyStateReady: '已就绪',
      readyStateMissing: '待配置',

      sourceLangLabel: 'OCR 原文',
      targetLangLabel: '翻译到',
      sourceLangShort: 'OCR 语言',
      targetLangShort: '翻译到',
      sourceLangShortLabel: 'OCR 原文语言',
      targetLangShortLabel: '翻译目标语言',
      sourceLangHintCompact: 'OCR 语言会直接传给 OCR API，和界面语言无关。',

      apiBaseUrlLabel: '模型地址 *',
      apiBaseUrlLabelShort: '模型地址 *',
      apiBaseUrlShort: '模型地址 *',
      apiBaseUrlPlaceholder: 'https://api.openai.com/v1 或 /chat/completions',
      modelNameLabel: '模型名 *',
      modelNameLabelShort: '模型名 *',
      modelNameShort: '模型名 *',
      modelNamePlaceholder: '例如：gpt-4.1-mini',
      apiKeyLabel: 'API Key',
      apiKeyLabelShort: 'API Key',
      apiKeyShort: 'API Key',
      apiKeyPlaceholder: '按需填写',
      ocrApiKeyLabel: 'OCR.space Key（可选）',
      ocrApiKeyLabelShort: 'OCR Key',
      ocrApiKeyShort: 'OCR Key',
      ocrApiKeyPlaceholder: '留空则使用默认 helloworld',

      toggleAdvancedShow: '+ OCR Key（可选）',
      toggleAdvancedHide: '− 收起 OCR Key',
      optionalSection: '高级 / 可选',
      optionalSectionCompact: '展开 OCR Key',
      optionalSectionShort: '+ OCR Key',
      optionalSectionHide: '收起 OCR Key',
      ocrKeyHelpLinkShort: '申请 OCR Key',
      ocrKeyHelpTiny: '申请 OCR Key',

      saveSettings: '保存',
      saveSuccess: '已保存',
      autoSavedShort: '已自动保存',
      autoSaveHint: '自动保存',

      drawPencilLabel: '自由圈选',
      drawPencilDescShort: '字幕 / 气泡',
      drawRectLabel: '矩形框选',
      drawRectDescShort: '段落 / 表格',
      drawPencilSimple: '圈字幕',
      drawPencilTiny: '气泡 / 零散文本',
      drawRectSimple: '框段落',
      drawRectTiny: '段落 / 表格',
      openShortcutsShort: '快捷键',
      supportShort: '赞助',

      requiredHint: '开始使用前，请先保存模型接口地址和模型名称。',
      requiredHintDetailed: '未完成必填配置：请填写模型接口地址和模型名称。若你的服务商要求认证，再填写 API Key。',
      fillRequiredCta: '去填写配置',
      popupNeedConfigAlert: '请先填写并保存模型接口地址和模型名称，再开始圈选。',
      popupNeedConfigToast: '先填模型地址和模型名，再开始圈选。',
      sponsorThanks: '支持插件持续更新',
      systemPageBlocked: '浏览器系统页面不支持运行插件。',

      drawHintPencilTitle: '自由圈选模式',
      drawHintPencilDesc: '沿着目标文字手绘圈选，松开后自动识别。',
      drawHintRectTitle: '矩形框选模式',
      drawHintRectDesc: '拖出矩形区域，适合整段文本和表格。',
      drawHintFooter: '按 Esc 可取消。',
      drawModeBadgeFreehand: '自由圈选',
      drawModeBadgeRect: '矩形框选',
      cardSubtitle: '可拖动 · Esc 关闭',
      closeButtonAria: '关闭',
      cardBrandSubtitle: '视觉翻译结果',

      statusPreparingCaptureTitle: '正在截取选区',
      statusPreparingCaptureDetail: '准备裁剪图像…',
      statusUploadingTitle: '正在上传 OCR',
      statusUploadingDetail: '选区已裁剪，正在发送到 OCR 服务。',
      statusOcrTitle: '正在识别文字',
      statusOcrDetail: 'OCR 语言：{engineLabel} ({engine})',
      statusTranslateTitle: '正在请求 AI 翻译',
      statusTranslateDetail: '已识别：{preview}',

      errorTitle: '处理失败',
      errorMissingConfig: '请先填写并保存模型接口地址和模型名称。',
      errorNoText: '没有识别到清晰文字，请重新框选。',
      errorCaptureFailed: '截图失败，请刷新页面后重试。',
      errorOcrEngine: 'OCR 服务返回错误：{message}',
      errorAiRequest: 'AI 请求失败（状态码 {status}）。',
      errorAiEmpty: 'AI 返回异常，没有拿到有效结果。',
      errorJsonParse: '模型返回的内容不是有效 JSON。',
      errorUnknown: '发生未知错误：{message}',
      errorEndpointDetail: '请求地址：{endpoint}',

      resultSectionDetectedText: '识别原文',
      resultSectionTranslation: '整句翻译',
      resultSectionGlossary: '词语拆解',
      resultEmpty: 'AI 没有返回可展示的翻译结果。',
      resultNoGloss: '暂无释义',

      brandTag: '即开即用',
      uiLangToggleTitle: '切换界面语言',
      sponsorTitle: '赞助作者',
      shortcutTitle: '打开快捷键设置',
      setupCardTitle: '必要设置',
      setupCardTip: '填完两项就能用。',
      captureCardTitle: '开始圈选',
      captureCardTip: '选择一种方式开始。',
      bottomStripTitle: '语言',
      bottomStripTip: '这里只配置 OCR 原文语言和翻译目标语言。'
    },

    [UI_LANG_EN]: {
      appTitleCompact: 'WordMap',
      appSubtitleCompact: 'Capture and translate',
      appTaglineMini: 'Capture → translate',

      toolbarLanguage: 'Switch UI language',
      toolbarSponsor: 'Support the developer',
      toolbarShortcuts: 'Open shortcut settings',
      sponsorButton: 'Support',

      stepSetup: 'Model',
      stepLanguage: 'Language',
      stepCapture: 'Capture',

      sectionSetupTitle: 'Setup',
      sectionSetupDescCompact: 'Model settings are required. OCR key is optional.',
      sectionLanguageTitle: 'Language',
      sectionLanguageDescCompact: 'Only OCR source and translation target live here.',
      quickActions: 'Capture',
      quickActionsDesc: 'Set up first, then capture.',
      ocrUiSeparatedBadge: 'UI ≠ OCR',
      captureReady: 'Alt + T / Alt + R',

      coachReadyCompact: 'Ready. Use either capture button below.',
      coachNeedsConfigCompact: 'Add the model URL and model name first.',
      coachReady: 'Ready. Start capturing.',
      coachNeedsConfig: 'Finish the required setup first.',
      coachStateReady: 'Ready',
      coachStateMissing: 'Setup',

      setupStateReady: 'Ready',
      setupStateMissing: 'Required',
      captureStateReady: 'Ready',
      captureStateMissing: 'Setup',
      readyStateReady: 'Ready',
      readyStateMissing: 'Setup',

      sourceLangLabel: 'OCR source',
      targetLangLabel: 'Translate to',
      sourceLangShort: 'OCR source',
      targetLangShort: 'Translate to',
      sourceLangShortLabel: 'OCR source language',
      targetLangShortLabel: 'Translation target',
      sourceLangHintCompact: 'The OCR language is passed directly to the OCR API. It never follows the UI language.',

      apiBaseUrlLabel: 'Model URL *',
      apiBaseUrlLabelShort: 'Model URL *',
      apiBaseUrlShort: 'Model URL *',
      apiBaseUrlPlaceholder: 'https://api.openai.com/v1 or /chat/completions',
      modelNameLabel: 'Model *',
      modelNameLabelShort: 'Model *',
      modelNameShort: 'Model *',
      modelNamePlaceholder: 'Example: gpt-4.1-mini',
      apiKeyLabel: 'API key',
      apiKeyLabelShort: 'API key',
      apiKeyShort: 'API key',
      apiKeyPlaceholder: 'Only if your provider requires auth',
      ocrApiKeyLabel: 'OCR.space key (optional)',
      ocrApiKeyLabelShort: 'OCR key',
      ocrApiKeyShort: 'OCR key',
      ocrApiKeyPlaceholder: 'Leave empty to use the default helloworld key',

      toggleAdvancedShow: '+ OCR key (optional)',
      toggleAdvancedHide: '− Hide OCR key',
      optionalSection: 'Advanced / optional',
      optionalSectionCompact: 'Show OCR key',
      optionalSectionShort: '+ OCR key',
      optionalSectionHide: 'Hide OCR key',
      ocrKeyHelpLinkShort: 'Get OCR key',
      ocrKeyHelpTiny: 'Get OCR key',

      saveSettings: 'Save',
      saveSuccess: 'Saved',
      autoSavedShort: 'Saved',
      autoSaveHint: 'Auto-saves',

      drawPencilLabel: 'Freehand',
      drawPencilDescShort: 'Subtitles / bubbles',
      drawRectLabel: 'Rectangle',
      drawRectDescShort: 'Paragraphs / tables',
      drawPencilSimple: 'Circle text',
      drawPencilTiny: 'Bubbles / subtitles',
      drawRectSimple: 'Box text',
      drawRectTiny: 'Paragraphs / tables',
      openShortcutsShort: 'Shortcuts',
      supportShort: 'Support',

      requiredHint: 'Save the model base URL and model name before using capture.',
      requiredHintDetailed: 'Required setup is incomplete: add the model base URL and model name first. Fill the API key too if your provider requires authentication.',
      fillRequiredCta: 'Complete setup',
      popupNeedConfigAlert: 'Please save the model base URL and model name before you start capturing.',
      popupNeedConfigToast: 'Add the model URL and model name first.',
      sponsorThanks: 'Help keep the plugin improving',
      systemPageBlocked: 'The extension cannot run on browser system pages.',

      drawHintPencilTitle: 'Freehand mode',
      drawHintPencilDesc: 'Draw around the text. OCR starts when you release the mouse.',
      drawHintRectTitle: 'Rectangle mode',
      drawHintRectDesc: 'Drag a rectangle. Great for blocks of text and tables.',
      drawHintFooter: 'Press Esc to cancel.',
      drawModeBadgeFreehand: 'Freehand',
      drawModeBadgeRect: 'Rectangle',
      cardSubtitle: 'Draggable · Esc closes',
      closeButtonAria: 'Close',
      cardBrandSubtitle: 'Visual translation result',

      statusPreparingCaptureTitle: 'Capturing selection',
      statusPreparingCaptureDetail: 'Preparing the cropped image…',
      statusUploadingTitle: 'Uploading to OCR',
      statusUploadingDetail: 'The cropped area is being sent to OCR.',
      statusOcrTitle: 'Extracting text',
      statusOcrDetail: 'OCR language: {engineLabel} ({engine})',
      statusTranslateTitle: 'Requesting AI translation',
      statusTranslateDetail: 'Recognized: {preview}',

      errorTitle: 'Something went wrong',
      errorMissingConfig: 'Please save the model base URL and model name first.',
      errorNoText: 'No clear text was detected. Please select the area again.',
      errorCaptureFailed: 'Screenshot capture failed. Refresh the page and try again.',
      errorOcrEngine: 'The OCR service returned an error: {message}',
      errorAiRequest: 'The AI request failed (status {status}).',
      errorAiEmpty: 'The AI response was empty or malformed.',
      errorJsonParse: 'The model response was not valid JSON.',
      errorUnknown: 'An unexpected error occurred: {message}',
      errorEndpointDetail: 'Endpoint: {endpoint}',

      resultSectionDetectedText: 'Detected text',
      resultSectionTranslation: 'Full translation',
      resultSectionGlossary: 'Glossary',
      resultEmpty: 'The AI did not return any translation data that can be shown.',
      resultNoGloss: 'No gloss available',

      brandTag: 'Fast setup',
      uiLangToggleTitle: 'Switch interface language',
      sponsorTitle: 'Support the creator',
      shortcutTitle: 'Open shortcut settings',
      setupCardTitle: 'Required setup',
      setupCardTip: 'Two fields and you are ready.',
      captureCardTitle: 'Start capture',
      captureCardTip: 'Pick a mode and go.',
      bottomStripTitle: 'Language',
      bottomStripTip: 'Only OCR source and translation target belong here.'
    }
  };

  const uiLanguageOptions = [
    { value: UI_LANG_ZH, label: { [UI_LANG_ZH]: '中文', [UI_LANG_EN]: '中文' } },
    { value: UI_LANG_EN, label: { [UI_LANG_ZH]: 'EN', [UI_LANG_EN]: 'EN' } }
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
    const fallback = dictionaries[UI_LANG_EN];
    let template = dict[key] || fallback[key] || key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, token) => (
      Object.prototype.hasOwnProperty.call(params, token) ? String(params[token] ?? '') : _
    ));
  }

  function mapOptions(options, uiLang) {
    const lang = normalizeUiLang(uiLang);
    return options.map((item) => ({ value: item.value, label: item.label[lang] || item.label[UI_LANG_EN] || item.value }));
  }

  function getUiLanguageOptions(uiLang) { return mapOptions(uiLanguageOptions, uiLang); }
  function getOcrLanguageOptions(uiLang) { return mapOptions(ocrLanguageOptions, uiLang); }
  function getTargetLanguageOptions(uiLang) { return mapOptions(targetLanguageOptions, uiLang); }
  function getOcrLanguageLabel(code, uiLang) {
    const option = getOcrLanguageOptions(uiLang).find((item) => item.value === code);
    return option ? option.label : code;
  }

  function clampTextPreview(text, maxLength) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const limit = Number.isFinite(maxLength) ? maxLength : 60;
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
