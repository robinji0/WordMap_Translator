const STORAGE_KEYS = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'];
const REQUIRED_KEYS = ['apiBaseUrl', 'modelName'];

let uiLang = WordMapI18n.getEffectiveUiLang();
let isReady = false;
let autoSaveTimer = 0;
let optionalVisible = false;

const elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheElements();
  bindEvents();

  chrome.storage.local.get(STORAGE_KEYS, (stored) => {
    uiLang = WordMapI18n.getEffectiveUiLang(stored.uiLang);
    hydrateInputs(stored);
    optionalVisible = Boolean((stored.ocrApiKey || '').trim());
    renderStaticText();
    populateLanguageSelects(stored);
    syncOptionalArea();
    updateUiState();
    isReady = true;
  });
}

function cacheElements() {
  elements.apiBaseUrl = document.getElementById('apiBaseUrl');
  elements.modelName = document.getElementById('modelName');
  elements.apiKey = document.getElementById('apiKey');
  elements.ocrApiKey = document.getElementById('ocrApiKey');
  elements.sourceLang = document.getElementById('sourceLang');
  elements.targetLang = document.getElementById('targetLang');

  elements.apiBaseUrlField = document.getElementById('apiBaseUrlField');
  elements.modelNameField = document.getElementById('modelNameField');

  elements.heroText = document.getElementById('heroText');
  elements.popupToast = document.getElementById('popupToast');
  elements.setupState = document.getElementById('setupState');
  elements.status = document.getElementById('status');
  elements.capturePanel = document.getElementById('capturePanel');

  elements.drawPencilBtn = document.getElementById('drawPencilBtn');
  elements.drawRectBtn = document.getElementById('drawRectBtn');
  elements.shortcutBtn = document.getElementById('shortcutBtn');
  elements.uiLangToggle = document.getElementById('uiLangToggle');
  elements.uiLangToggleText = document.getElementById('uiLangToggleText');
  elements.toggleOptionalBtn = document.getElementById('toggleOptionalBtn');
  elements.optionalArea = document.getElementById('optionalArea');
}

function bindEvents() {
  ['apiBaseUrl', 'modelName', 'apiKey', 'ocrApiKey', 'sourceLang', 'targetLang'].forEach((key) => {
    const el = elements[key];
    ['input', 'change'].forEach((eventName) => {
      el.addEventListener(eventName, () => {
        if (!isReady) return;
        clearToast();
        schedulePersist();
        updateUiState();
      });
    });
  });

  elements.drawPencilBtn.addEventListener('click', () => startCapture('pencil'));
  elements.drawRectBtn.addEventListener('click', () => startCapture('rect'));
  elements.shortcutBtn.addEventListener('click', () => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }));
  elements.uiLangToggle.addEventListener('click', toggleUiLang);
  elements.toggleOptionalBtn.addEventListener('click', () => {
    optionalVisible = !optionalVisible;
    syncOptionalArea();
  });
}

function hydrateInputs(stored) {
  elements.apiBaseUrl.value = stored.apiBaseUrl || '';
  elements.modelName.value = stored.modelName || '';
  elements.apiKey.value = stored.apiKey || '';
  elements.ocrApiKey.value = stored.ocrApiKey || '';
}

function renderStaticText() {
  document.documentElement.lang = uiLang === WordMapI18n.UI_LANG_ZH ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = WordMapI18n.t(uiLang, node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = WordMapI18n.t(uiLang, node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.title = WordMapI18n.t(uiLang, node.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', WordMapI18n.t(uiLang, node.dataset.i18nAria));
  });

  elements.uiLangToggleText.textContent = uiLang === WordMapI18n.UI_LANG_ZH ? '中文' : 'EN';
  syncOptionalArea();
}

function populateLanguageSelects(stored = {}) {
  fillSelect(elements.sourceLang, WordMapI18n.getOcrLanguageOptions(uiLang), stored.sourceLang || 'eng');
  fillSelect(elements.targetLang, WordMapI18n.getTargetLanguageOptions(uiLang), stored.targetLang || 'Chinese');
}

function fillSelect(selectElement, options, selectedValue) {
  selectElement.innerHTML = '';
  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.value;
    item.textContent = option.label;
    if (option.value === selectedValue) item.selected = true;
    selectElement.appendChild(item);
  });
}

function getTrimmedValue(key) {
  return (elements[key]?.value || '').trim();
}

function getFormState() {
  let apiBaseUrl = getTrimmedValue('apiBaseUrl');
  if (apiBaseUrl.endsWith('/')) apiBaseUrl = apiBaseUrl.slice(0, -1);

  return {
    apiBaseUrl,
    modelName: getTrimmedValue('modelName'),
    apiKey: getTrimmedValue('apiKey'),
    ocrApiKey: getTrimmedValue('ocrApiKey'),
    sourceLang: elements.sourceLang.value,
    targetLang: elements.targetLang.value,
    uiLang
  };
}

function hasRequiredConfig(state = getFormState()) {
  return REQUIRED_KEYS.every((key) => String(state[key] || '').trim());
}

function schedulePersist() {
  window.clearTimeout(autoSaveTimer);
  autoSaveTimer = window.setTimeout(() => persistForm(true), 180);
}

function persistForm(showFeedback) {
  const state = getFormState();
  chrome.storage.local.set(state, () => {
    updateUiState();
    if (showFeedback) showStatus(WordMapI18n.t(uiLang, 'autoSavedShort'));
  });
}

function syncOptionalArea() {
  if (elements.optionalArea) elements.optionalArea.hidden = !optionalVisible;
  if (elements.toggleOptionalBtn) {
    elements.toggleOptionalBtn.textContent = WordMapI18n.t(uiLang, optionalVisible ? 'toggleAdvancedHide' : 'toggleAdvancedShow');
  }
}

function updateUiState() {
  const ready = hasRequiredConfig();
  elements.setupState.textContent = WordMapI18n.t(uiLang, ready ? 'setupStateReady' : 'setupStateMissing');
  elements.setupState.classList.toggle('is-ready', ready);
  elements.setupState.classList.toggle('is-missing', !ready);
  elements.capturePanel.classList.toggle('is-missing', !ready);
  elements.heroText.textContent = WordMapI18n.t(uiLang, ready ? 'coachReadyCompact' : 'coachNeedsConfigCompact');
}

function showStatus(message) {
  elements.status.hidden = false;
  elements.status.textContent = message;
  window.clearTimeout(showStatus._timer);
  showStatus._timer = window.setTimeout(() => {
    elements.status.hidden = true;
  }, 1400);
}

function clearToast() {
  elements.popupToast.hidden = true;
  elements.popupToast.textContent = '';
  window.clearTimeout(clearToast._timer);
}

function showToast(message) {
  elements.popupToast.hidden = false;
  elements.popupToast.textContent = message;
  window.clearTimeout(clearToast._timer);
  clearToast._timer = window.setTimeout(() => {
    elements.popupToast.hidden = true;
  }, 2200);
}

function markField(wrapper, isError) {
  if (!wrapper) return;
  wrapper.classList.toggle('is-error', Boolean(isError));
}

function focusFirstMissingField() {
  const missingBaseUrl = !getTrimmedValue('apiBaseUrl');
  const missingModelName = !getTrimmedValue('modelName');

  markField(elements.apiBaseUrlField, missingBaseUrl);
  markField(elements.modelNameField, missingModelName);

  window.clearTimeout(focusFirstMissingField._timer);
  focusFirstMissingField._timer = window.setTimeout(() => {
    markField(elements.apiBaseUrlField, false);
    markField(elements.modelNameField, false);
  }, 1500);

  if (missingBaseUrl) {
    elements.apiBaseUrl.focus();
    return;
  }
  if (missingModelName) {
    elements.modelName.focus();
  }
}

function toggleUiLang() {
  uiLang = uiLang === WordMapI18n.UI_LANG_ZH ? WordMapI18n.UI_LANG_EN : WordMapI18n.UI_LANG_ZH;
  chrome.storage.local.set({ uiLang }, () => {
    renderStaticText();
    populateLanguageSelects(getFormState());
    updateUiState();
    showStatus(WordMapI18n.t(uiLang, 'autoSavedShort'));
  });
}

function startCapture(mode) {
  persistForm(false);
  const state = getFormState();

  if (!hasRequiredConfig(state)) {
    updateUiState();
    focusFirstMissingField();
    showToast(WordMapI18n.t(uiLang, 'popupNeedConfigToast'));
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    if (!currentTab) return;
    const url = currentTab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('edge://')) {
      showToast(WordMapI18n.t(uiLang, 'systemPageBlocked'));
      return;
    }

    chrome.runtime.sendMessage({
      action: 'popup_toggle_draw',
      mode,
      tabId: currentTab.id,
      uiLang
    }, () => window.close());
  });
}
