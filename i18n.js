(function (root) {
  const UI_LANG_ZH = 'zh-CN';
  const UI_LANG_EN = 'en';
  const TARGET_LANG_SIMPLIFIED_CHINESE = 'Simplified Chinese';

  const dictionaries = {
    [UI_LANG_ZH]: {
      appTitleCompact: 'WordMap',
      appSubtitleCompact: '圈选即翻译',
      toolbarLanguage: '切换界面语言',
      toolbarSponsor: '赞助开发者',
      toolbarShortcuts: '打开快捷键设置',
      toolbarMobileHelp: '查看手机端使用方式',

      stepSetup: '填模型',
      stepLanguage: '选语言',
      stepCapture: '开始圈选',

      sectionSetupTitle: '基础配置',
      sectionSetupDescCompact: '先填模型，再开始使用。',
      quickActions: '开始圈选',
      quickActionsDesc: '点按钮即可开始；手机端建议直接用页面悬浮按钮。',
      ocrUiSeparatedBadge: 'UI ≠ OCR',

      apiBaseUrlLabel: '模型接口地址 *',
      apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
      modelNameLabel: '模型名称 *',
      modelNamePlaceholder: '例如：gpt-4.1-mini',
      apiKeyLabel: '模型 API Key',
      apiKeyPlaceholder: '如服务商要求，请填写',
      sourceLangLabel: 'OCR 原文语言',
      targetLangLabel: '翻译目标语言',
      sourceLangHintCompact: 'OCR 语言会直接传给 OCR API，和界面语言无关。',

      optionalSection: '高级 / 可选',
      ocrApiKeyLabel: 'OCR.space API Key（可选）',
      ocrApiKeyPlaceholder: '留空则使用默认 helloworld',
      ocrKeyHelpLinkShort: '申请 OCR Key',

      mobileQuickTitle: '手机快速唤起',
      mobileQuickToggle: '启用页面悬浮按钮',
      mobileQuickModeLabel: '默认模式',
      mobileQuickHint: '点 WM 直接开始；点小图标切换模式。',
      mobileQuickHelpToast: '手机端建议开启页面悬浮按钮：点 WM 直接开始，点右侧小图标切换自由圈选 / 矩形框选。',

      drawPencilLabel: '自由圈选',
      drawPencilDescShort: '字幕 / 气泡',
      drawRectLabel: '矩形框选',
      drawRectDescShort: '段落 / 表格',
      captureReady: 'Alt + T / Alt + R',

      saveSuccess: '已自动保存',
      requiredHintDetailed: '先填写模型接口地址和模型名称，再开始圈选。',
      popupNeedConfigAlert: '请先填写模型接口地址和模型名称。',
      systemPageBlocked: '当前页面不支持运行插件。请切回普通网页再试。',
      noPageToCapture: '没有找到可圈选的网页标签页。请先切回网页，再打开插件。',

      drawHintPencilTitle: '自由圈选模式',
      drawHintPencilDesc: '沿着目标文字拖动圈选，松开后自动识别。',
      drawHintRectTitle: '矩形框选模式',
      drawHintRectDesc: '拖出一个矩形区域，适合整段文本或表格。',
      drawHintFooterDesktop: '按 Esc 可取消。',
      drawHintFooterTouch: '点右上角关闭按钮可取消。',
      drawHintCancel: '取消',

      drawModeBadgeFreehand: '自由圈选',
      drawModeBadgeRect: '矩形框选',

      cardSubtitle: '可拖动 · 右上角关闭',
      closeButtonAria: '关闭',

      statusPreparingCaptureTitle: '正在截取选区',
      statusPreparingCaptureDetail: '正在准备裁剪图像…',
      statusUploadingTitle: '正在上传到 OCR',
      statusUploadingDetail: '选区已裁剪，正在发送到 OCR 服务。',
      statusOcrTitle: '正在识别文字',
      statusOcrDetail: 'OCR 语言：{engineLabel} ({engine})',
      statusTranslateTitle: '正在请求 AI 翻译',
      statusTranslateDetail: '已识别：{preview}',
      statusMobileFallbackTitle: '正在切换到手机兼容模式',
      statusMobileFallbackDetail: '浏览器截图不可用，正在尝试网页内回退方案…',
      statusMobileTextFallbackTitle: '已直接提取网页文字',
      statusMobileTextFallbackDetail: '手机端已从选区中直接提取网页文字，正在跳过 OCR 直接翻译。',
      statusMobileImageFallbackTitle: '已改为图片元素裁剪',
      statusMobileImageFallbackDetail: '手机端正在直接裁剪选中的图片元素，再发送到 OCR。',

      statusRouterWarmupTitle: '正在连接资源取图链路',
      statusRouterWarmupDetail: '手机端会直接从页面真实资源重建选区图像。首次在当前页使用时可能会自动刷新一次。',
      statusRouterReloadTitle: '正在刷新当前页以记录真实资源',
      statusRouterReloadDetail: '刷新后会自动回到原位置，并继续开始框选。',
      statusRouterCaptureTitle: '正在重建真实图片片段',
      statusRouterCaptureDetail: '这次不走浏览器截图，而是直接从页面真实资源重建选区图像。',
      statusRouterTextFallbackTitle: '已直接提取网页文字',
      statusRouterTextFallbackDetail: '当前选区更像真实 DOM 文本，已跳过 OCR 直接翻译。',
      errorRouterPrepare: '资源取图链路启动失败：{message}',
      errorRouterNoPreview: '页面找到了候选资源，但当前路径还没能重建出可识别的选区图像。下面保留了本次候选预览，方便你判断实际命中了什么。',
      resultSectionCapturePreview: '本次送 OCR 的图像',
      resultSectionCaptureMeta: '取图链路',
      resultSectionDiagnostics: '取图诊断',
      diagnosticSelection: '选区',
      diagnosticCandidate: '候选',
      diagnosticPath: '路径',
      diagnosticScore: '评分',
      diagnosticReason: '判定',
      diagnosticSource: '来源',

      errorTitle: '处理失败',
      errorMissingConfig: '请先填写并保存模型接口地址和模型名称。',
      errorNoText: '没有识别到清晰文字，请重新框选。',
      errorCaptureFailed: '截图失败，请刷新页面后重试。',
      errorCaptureFailedMobile: '手机端截图失败，且网页内回退方案没有拿到可识别内容。请尽量框选纯文字区或单张图片后再试。',
      errorOcrEngine: 'OCR 服务返回错误：{message}',
      errorAiRequestDetailed: 'AI 请求失败（状态码 {status}）。\n{detail}\n请求地址：{endpoint}',
      errorAiEmpty: 'AI 返回异常，没有拿到有效结果。',
      errorJsonParse: '模型返回的内容不是有效 JSON。',
      errorUnknown: '发生未知错误：{message}',

      resultSectionDetectedText: '识别原文',
      resultSectionTranslation: '整句翻译',
      resultSectionGlossary: '词语拆解',
      resultEmpty: 'AI 没有返回可展示的翻译结果。',
      resultNoGloss: '暂无释义',
      cardBrandSubtitle: '视觉翻译结果',

      mobileLauncherMainAria: '开始圈选',
      mobileLauncherModeAria: '切换手机默认圈选模式',
      mobileLauncherModeRect: '当前默认：矩形框选',
      mobileLauncherModeFreehand: '当前默认：自由圈选',
      mobileLauncherSetupToast: '请先在插件里填好模型接口地址和模型名称。',
      mobileLauncherSwitchedRect: '默认模式已切换为：矩形框选',
      mobileLauncherSwitchedFreehand: '默认模式已切换为：自由圈选'
    },

    [UI_LANG_EN]: {
      appTitleCompact: 'WordMap',
      appSubtitleCompact: 'Capture and translate',
      toolbarLanguage: 'Switch interface language',
      toolbarSponsor: 'Support the developer',
      toolbarShortcuts: 'Open shortcut settings',
      toolbarMobileHelp: 'Show the mobile usage tip',

      stepSetup: 'Set model',
      stepLanguage: 'Pick language',
      stepCapture: 'Capture',

      sectionSetupTitle: 'Setup',
      sectionSetupDescCompact: 'Fill in the model first, then capture.',
      quickActions: 'Start capture',
      quickActionsDesc: 'Tap a button to begin. On phones, the in-page bubble is the fastest path.',
      ocrUiSeparatedBadge: 'UI ≠ OCR',

      apiBaseUrlLabel: 'Model base URL *',
      apiBaseUrlPlaceholder: 'https://api.openai.com/v1',
      modelNameLabel: 'Model name *',
      modelNamePlaceholder: 'Example: gpt-4.1-mini',
      apiKeyLabel: 'Model API key',
      apiKeyPlaceholder: 'Fill this in if your provider requires auth',
      sourceLangLabel: 'OCR source language',
      targetLangLabel: 'Translation target',
      sourceLangHintCompact: 'The OCR language is passed directly to the OCR API. It never follows the UI language.',

      optionalSection: 'Advanced / optional',
      ocrApiKeyLabel: 'OCR.space API key (optional)',
      ocrApiKeyPlaceholder: 'Leave empty to use the default helloworld key',
      ocrKeyHelpLinkShort: 'Get OCR key',

      mobileQuickTitle: 'Mobile quick launch',
      mobileQuickToggle: 'Enable the in-page bubble',
      mobileQuickModeLabel: 'Default mode',
      mobileQuickHint: 'Tap WM to start. Tap the small icon to switch modes.',
      mobileQuickHelpToast: 'On phones, enable the in-page bubble. Tap WM to start capture, then tap the small mode icon to switch between freehand and rectangle.',

      drawPencilLabel: 'Freehand',
      drawPencilDescShort: 'Subtitles / bubbles',
      drawRectLabel: 'Rectangle',
      drawRectDescShort: 'Paragraphs / tables',
      captureReady: 'Alt + T / Alt + R',

      saveSuccess: 'Saved automatically',
      requiredHintDetailed: 'Fill in the model base URL and model name before you start capturing.',
      popupNeedConfigAlert: 'Please fill in the model base URL and model name first.',
      systemPageBlocked: 'This page type does not allow the extension to run. Switch back to a normal webpage and try again.',
      noPageToCapture: 'No webpage tab is available for capture. Switch back to a normal page and open WordMap again.',

      drawHintPencilTitle: 'Freehand mode',
      drawHintPencilDesc: 'Trace around the text and release to run OCR.',
      drawHintRectTitle: 'Rectangle mode',
      drawHintRectDesc: 'Drag out a rectangle. Great for text blocks and tables.',
      drawHintFooterDesktop: 'Press Esc to cancel.',
      drawHintFooterTouch: 'Tap the close button to cancel.',
      drawHintCancel: 'Cancel',

      drawModeBadgeFreehand: 'Freehand',
      drawModeBadgeRect: 'Rectangle',

      cardSubtitle: 'Draggable · Close from the top right',
      closeButtonAria: 'Close',

      statusPreparingCaptureTitle: 'Capturing selection',
      statusPreparingCaptureDetail: 'Preparing the cropped image…',
      statusUploadingTitle: 'Uploading to OCR',
      statusUploadingDetail: 'The cropped area is being sent to OCR.',
      statusOcrTitle: 'Extracting text',
      statusOcrDetail: 'OCR language: {engineLabel} ({engine})',
      statusTranslateTitle: 'Requesting AI translation',
      statusTranslateDetail: 'Recognized: {preview}',
      statusMobileFallbackTitle: 'Switching to mobile-safe capture',
      statusMobileFallbackDetail: 'Browser screenshot capture is unavailable, so WordMap is trying an in-page fallback…',
      statusMobileTextFallbackTitle: 'Page text extracted directly',
      statusMobileTextFallbackDetail: 'The selected page text was extracted directly on mobile, so OCR is skipped and AI translation is starting.',
      statusMobileImageFallbackTitle: 'Switched to element crop',
      statusMobileImageFallbackDetail: 'WordMap is cropping the selected image element directly, then sending it to OCR.',

      statusRouterWarmupTitle: 'Connecting to the resource capture route',
      statusRouterWarmupDetail: 'On mobile, WordMap rebuilds the crop from real page assets. The first run on a page may trigger one automatic reload.',
      statusRouterReloadTitle: 'Reloading the page to record real assets',
      statusRouterReloadDetail: 'After reload, WordMap returns to the same spot and resumes capture automatically.',
      statusRouterCaptureTitle: 'Rebuilding the real image crop',
      statusRouterCaptureDetail: 'This path does not rely on browser screenshots. It rebuilds the selected image from real page assets.',
      statusRouterTextFallbackTitle: 'Page text was extracted directly',
      statusRouterTextFallbackDetail: 'This area looks like real DOM text, so OCR is skipped and AI translation starts directly.',
      errorRouterPrepare: 'The resource capture route could not start: {message}',
      errorRouterNoPreview: 'The page exposed candidate assets, but the current path could not rebuild a readable crop yet. The candidate previews are kept below so you can see what was actually hit.',
      resultSectionCapturePreview: 'Image sent to OCR',
      resultSectionCaptureMeta: 'Capture route',
      resultSectionDiagnostics: 'Capture diagnostics',
      diagnosticSelection: 'Selection',
      diagnosticCandidate: 'Candidate',
      diagnosticPath: 'Path',
      diagnosticScore: 'Score',
      diagnosticReason: 'Decision',
      diagnosticSource: 'Source',

      errorTitle: 'Something went wrong',
      errorMissingConfig: 'Please save the model base URL and model name first.',
      errorNoText: 'No clear text was detected. Please select the area again.',
      errorCaptureFailed: 'Screenshot capture failed. Refresh the page and try again.',
      errorCaptureFailedMobile: 'Mobile screenshot capture failed, and the in-page fallback could not recover useful text or an image. Try selecting plain text or a single image and run it again.',
      errorOcrEngine: 'The OCR service returned an error: {message}',
      errorAiRequestDetailed: 'The AI request failed (status {status}).\n{detail}\nEndpoint: {endpoint}',
      errorAiEmpty: 'The AI response was empty or malformed.',
      errorJsonParse: 'The model response was not valid JSON.',
      errorUnknown: 'An unexpected error occurred: {message}',

      resultSectionDetectedText: 'Detected text',
      resultSectionTranslation: 'Full translation',
      resultSectionGlossary: 'Glossary',
      resultEmpty: 'The AI did not return any translation data that can be shown.',
      resultNoGloss: 'No gloss available',
      cardBrandSubtitle: 'Visual translation result',

      mobileLauncherMainAria: 'Start capture',
      mobileLauncherModeAria: 'Switch the mobile default capture mode',
      mobileLauncherModeRect: 'Current default: rectangle',
      mobileLauncherModeFreehand: 'Current default: freehand',
      mobileLauncherSetupToast: 'Finish the model setup in the extension first.',
      mobileLauncherSwitchedRect: 'Default mode switched to rectangle',
      mobileLauncherSwitchedFreehand: 'Default mode switched to freehand'
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
    { value: 'chs', label: { [UI_LANG_ZH]: '简体中文 (Chinese)', [UI_LANG_EN]: 'Chinese (Simplified)' } }
  ];

  const targetLanguageOptions = [
    { value: TARGET_LANG_SIMPLIFIED_CHINESE, label: { [UI_LANG_ZH]: '简体中文', [UI_LANG_EN]: 'Simplified Chinese' } },
    { value: 'English', label: { [UI_LANG_ZH]: '英文', [UI_LANG_EN]: 'English' } },
    { value: 'Japanese', label: { [UI_LANG_ZH]: '日文', [UI_LANG_EN]: 'Japanese' } },
    { value: 'Korean', label: { [UI_LANG_ZH]: '韩文', [UI_LANG_EN]: 'Korean' } },
    { value: 'French', label: { [UI_LANG_ZH]: '法文', [UI_LANG_EN]: 'French' } },
    { value: 'Spanish', label: { [UI_LANG_ZH]: '西班牙文', [UI_LANG_EN]: 'Spanish' } },
    { value: 'German', label: { [UI_LANG_ZH]: '德文', [UI_LANG_EN]: 'German' } },
    { value: 'Russian', label: { [UI_LANG_ZH]: '俄文', [UI_LANG_EN]: 'Russian' } }
  ];

  const captureModeOptions = [
    { value: 'rect', label: { [UI_LANG_ZH]: '矩形框选', [UI_LANG_EN]: 'Rectangle' } },
    { value: 'pencil', label: { [UI_LANG_ZH]: '自由圈选', [UI_LANG_EN]: 'Freehand' } }
  ];

  function normalizeUiLang(value) {
    const raw = String(value || '').trim().toLowerCase();
    return raw.startsWith('zh') ? UI_LANG_ZH : UI_LANG_EN;
  }

  function normalizeTargetLang(value) {
    const raw = String(value || '').trim();
    if (!raw) return TARGET_LANG_SIMPLIFIED_CHINESE;
    if (/^chinese$/i.test(raw) || /^中文$/i.test(raw)) return TARGET_LANG_SIMPLIFIED_CHINESE;
    return raw;
  }

  function detectBrowserUiLang() {
    try {
      if (root.chrome && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
        return normalizeUiLang(chrome.i18n.getUILanguage());
      }
    } catch (error) {
      // Ignore and fall back.
    }

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

    return template.replace(/\{(\w+)\}/g, (_, token) => {
      if (Object.prototype.hasOwnProperty.call(params, token)) {
        const value = params[token];
        return value == null ? '' : String(value);
      }
      return `{${token}}`;
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

  function getCaptureModeOptions(uiLang) {
    return mapOptions(captureModeOptions, uiLang);
  }

  function getOcrLanguageLabel(code, uiLang) {
    const option = getOcrLanguageOptions(uiLang).find((item) => item.value === code);
    return option ? option.label : code;
  }

  function getTargetLanguageLabel(value, uiLang) {
    const normalized = normalizeTargetLang(value);
    const option = getTargetLanguageOptions(uiLang).find((item) => item.value === normalized);
    return option ? option.label : normalized;
  }

  function clampTextPreview(text, maxLength) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const limit = Number.isFinite(maxLength) ? maxLength : 42;
    return normalized.length > limit ? `${normalized.slice(0, Math.max(0, limit - 1))}…` : normalized;
  }

  root.WordMapI18n = {
    UI_LANG_ZH,
    UI_LANG_EN,
    TARGET_LANG_SIMPLIFIED_CHINESE,
    normalizeUiLang,
    normalizeTargetLang,
    detectBrowserUiLang,
    getEffectiveUiLang,
    getUiLanguageOptions,
    getOcrLanguageOptions,
    getTargetLanguageOptions,
    getCaptureModeOptions,
    getOcrLanguageLabel,
    getTargetLanguageLabel,
    clampTextPreview,
    t
  };
})(typeof self !== 'undefined' ? self : window);
