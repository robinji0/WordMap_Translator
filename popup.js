const STORAGE_KEYS = [
  'apiBaseUrl',
  'modelName',
  'apiKey',
  'targetLang',
  'ocrApiKey',
  'sourceLang',
  'uiLang',
  'mobileQuickEnabled',
  'mobileQuickMode'
];

const REQUIRED_KEYS = ['apiBaseUrl', 'modelName'];

const DEFAULT_STATE = {
  uiLang: WordMapI18n.getEffectiveUiLang(),
  sourceLang: 'eng',
  targetLang: WordMapI18n.TARGET_LANG_SIMPLIFIED_CHINESE,
  mobileQuickEnabled: true,
  mobileQuickMode: 'rect'
};

let uiLang = DEFAULT_STATE.uiLang;
let isReady = false;
let saveTimer = 0;

const elements = {};
document.addEventListener('DOMContentLoaded', init);

function init() {
  applyPlatformClass();
  cacheElements();
  bindEvents();

  chrome.storage.local.get(STORAGE_KEYS, (stored) => {
    uiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang || DEFAULT_STATE.uiLang);
    hydrateForm(stored);
    renderStaticText();
    populateSelects(stored);
    syncAdvancedState();
    updateUiState();
    persistSettings(false);
    isReady = true;
  });
}

function applyPlatformClass() {
  const touch = isTouchEnvironment();
  document.documentElement.classList.toggle('wordmap-touch-ui', touch);
  document.documentElement.classList.toggle('wordmap-desktop-ui', !touch);
}

function cacheElements() {
  [
    'apiBaseUrl',
    'modelName',
    'apiKey',
    'ocrApiKey',
    'sourceLang',
    'targetLang',
    'mobileQuickEnabled',
    'mobileQuickMode',
    'uiLangToggle',
    'uiLangToggleText',
    'shortcutBtn',
    'drawPencilBtn',
    'drawRectBtn',
    'missingConfigBanner',
    'advancedDetails',
    'advancedSummary',
    'status'
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  ['apiBaseUrl', 'modelName', 'apiKey', 'ocrApiKey'].forEach((id) => {
    elements[id].addEventListener('input', handleFormChange);
  });

  ['sourceLang', 'targetLang', 'mobileQuickEnabled', 'mobileQuickMode'].forEach((id) => {
    elements[id].addEventListener('change', handleFormChange);
  });

  elements.uiLangToggle.addEventListener('click', toggleUiLang);
  elements.shortcutBtn.addEventListener('click', handleShortcutButton);
  elements.drawPencilBtn.addEventListener('click', () => startCapture('pencil'));
  elements.drawRectBtn.addEventListener('click', () => startCapture('rect'));
  elements.advancedDetails.addEventListener('toggle', syncAdvancedSummaryCopy);
}

function hydrateForm(stored) {
  elements.apiBaseUrl.value = stored.apiBaseUrl || '';
  elements.modelName.value = stored.modelName || '';
  elements.apiKey.value = stored.apiKey || '';
  elements.ocrApiKey.value = stored.ocrApiKey || '';
  elements.mobileQuickEnabled.checked = stored.mobileQuickEnabled !== false;
}

function renderStaticText() {
  document.documentElement.lang = uiLang === WordMapI18n.UI_LANG_ZH ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = WordMapI18n.t(uiLang, node.dataset.i18n);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = WordMapI18n.t(uiLang, node.dataset.i18nPlaceholder);
  });

  elements.uiLangToggleText.textContent = uiLang === WordMapI18n.UI_LANG_ZH ? '中文' : 'EN';
  elements.uiLangToggle.title = WordMapI18n.t(uiLang, 'toolbarLanguage');
  document.getElementById('sponsorBtn').title = WordMapI18n.t(uiLang, 'toolbarSponsor');
  elements.shortcutBtn.title = isTouchEnvironment()
    ? WordMapI18n.t(uiLang, 'toolbarMobileHelp')
    : WordMapI18n.t(uiLang, 'toolbarShortcuts');

  syncAdvancedSummaryCopy();
}

function populateSelects(stored) {
  const selectedSourceLang = stored.sourceLang || DEFAULT_STATE.sourceLang;
  const selectedTargetLang = WordMapI18n.normalizeTargetLang(stored.targetLang || DEFAULT_STATE.targetLang);
  const selectedQuickMode = stored.mobileQuickMode || DEFAULT_STATE.mobileQuickMode;

  fillSelect(elements.sourceLang, WordMapI18n.getOcrLanguageOptions(uiLang), selectedSourceLang);
  fillSelect(elements.targetLang, WordMapI18n.getTargetLanguageOptions(uiLang), selectedTargetLang);
  fillSelect(elements.mobileQuickMode, WordMapI18n.getCaptureModeOptions(uiLang), selectedQuickMode);
}

function fillSelect(selectElement, options, selectedValue) {
  selectElement.innerHTML = '';
  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === selectedValue;
    selectElement.appendChild(item);
  });
}

function handleFormChange() {
  if (!isReady) return;
  syncAdvancedState();
  updateUiState();
  debouncePersist();
}

function syncAdvancedState() {
  if (!elements.advancedDetails.open && elements.ocrApiKey.value.trim()) {
    elements.advancedDetails.open = true;
  }
  syncAdvancedSummaryCopy();
  elements.mobileQuickMode.disabled = !elements.mobileQuickEnabled.checked;
}

function syncAdvancedSummaryCopy() {
  elements.advancedSummary.textContent = WordMapI18n.t(uiLang, 'optionalSection');
}

function debouncePersist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => persistSettings(true), 180);
}

function getFormState() {
  const apiBaseUrl = normalizeBaseUrl(elements.apiBaseUrl.value);
  return {
    apiBaseUrl,
    modelName: elements.modelName.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    ocrApiKey: elements.ocrApiKey.value.trim(),
    sourceLang: elements.sourceLang.value,
    targetLang: WordMapI18n.normalizeTargetLang(elements.targetLang.value),
    uiLang,
    mobileQuickEnabled: Boolean(elements.mobileQuickEnabled.checked),
    mobileQuickMode: elements.mobileQuickMode.value || DEFAULT_STATE.mobileQuickMode
  };
}

function hasRequiredConfig(state = getFormState()) {
  return REQUIRED_KEYS.every((key) => String(state[key] || '').trim());
}

function updateUiState() {
  elements.missingConfigBanner.hidden = hasRequiredConfig();
}

function persistSettings(showFeedback) {
  const state = getFormState();
  chrome.storage.local.set(state, () => {
    if (showFeedback) showStatus(WordMapI18n.t(uiLang, 'saveSuccess'));
  });
}

function showStatus(message) {
  elements.status.hidden = false;
  elements.status.textContent = message;
  window.clearTimeout(showStatus._timer);
  showStatus._timer = window.setTimeout(() => {
    elements.status.hidden = true;
  }, 1600);
}

function toggleUiLang() {
  uiLang = uiLang === WordMapI18n.UI_LANG_ZH ? WordMapI18n.UI_LANG_EN : WordMapI18n.UI_LANG_ZH;
  const currentState = getFormState();
  chrome.storage.local.set({ uiLang }, () => {
    renderStaticText();
    populateSelects(currentState);
    updateUiState();
  });
}

function handleShortcutButton() {
  if (isTouchEnvironment()) {
    showStatus(WordMapI18n.t(uiLang, 'mobileQuickHelpToast'));
    return;
  }

  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

function startCapture(mode) {
  const state = getFormState();
  if (!hasRequiredConfig(state)) {
    updateUiState();
    focusFirstMissingField();
    showStatus(WordMapI18n.t(uiLang, 'popupNeedConfigAlert'));
    return;
  }

  chrome.runtime.sendMessage({ action: 'popup_toggle_draw', mode }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus(chrome.runtime.lastError.message || WordMapI18n.t(uiLang, 'noPageToCapture'));
      return;
    }

    if (!response || response.status !== 'ok') {
      showStatus(WordMapI18n.t(uiLang, 'noPageToCapture'));
      return;
    }

    try { window.close(); } catch (error) { /* Ignore. */ }
  });
}

function focusFirstMissingField() {
  if (!elements.apiBaseUrl.value.trim()) {
    elements.apiBaseUrl.focus();
    return;
  }

  if (!elements.modelName.value.trim()) {
    elements.modelName.focus();
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isTouchEnvironment() {
  return (
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}
