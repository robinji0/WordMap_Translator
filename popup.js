const STORAGE_KEYS = ['apiBaseUrl', 'modelName', 'apiKey', 'targetLang', 'ocrApiKey', 'sourceLang', 'uiLang'];
const FORM_FIELD_IDS = ['ocrApiKey', 'apiBaseUrl', 'modelName', 'apiKey', 'sourceLang', 'targetLang'];

let isDataLoaded = false;
let autoSaveTimer = null;
let currentUiLang = WordMapI18n.detectBrowserUiLang();

const elements = {};

document.addEventListener('DOMContentLoaded', initializePopup);

function initializePopup() {
    cacheElements();
    bindEvents();

    chrome.storage.local.get(STORAGE_KEYS, (result) => {
        currentUiLang = WordMapI18n.getEffectiveUiLang(result.uiLang);
        applyLocalizedUi({
            uiLang: currentUiLang,
            sourceLang: result.sourceLang || 'eng',
            targetLang: result.targetLang || 'Chinese'
        });
        populateForm(result);
        isDataLoaded = true;
        backfillDefaultsIfNeeded(result);
    });
}

function cacheElements() {
    FORM_FIELD_IDS.forEach((id) => {
        elements[id] = document.getElementById(id);
    });

    elements.saveBtn = document.getElementById('saveBtn');
    elements.status = document.getElementById('status');
    elements.drawPencilBtn = document.getElementById('drawPencilBtn');
    elements.drawRectBtn = document.getElementById('drawRectBtn');
    elements.shortcutBtn = document.getElementById('shortcutBtn');
    elements.uiLangToggle = document.getElementById('uiLangToggle');
    elements.uiLangToggleText = document.getElementById('uiLangToggleText');
}

function bindEvents() {
    FORM_FIELD_IDS.forEach((id) => {
        const element = document.getElementById(id);
        ['input', 'change'].forEach((eventType) => {
            element.addEventListener(eventType, handleFieldChange);
        });
    });

    elements.uiLangToggle.addEventListener('click', handleToggleUiLanguage);
    elements.saveBtn.addEventListener('click', () => persistSettings(true));
    elements.drawPencilBtn.addEventListener('click', () => sendDrawCommand('pencil'));
    elements.drawRectBtn.addEventListener('click', () => sendDrawCommand('rect'));
    elements.shortcutBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });
}

function handleFieldChange() {
    if (!isDataLoaded) {
        return;
    }
    queueAutoSave();
}

function handleToggleUiLanguage() {
    currentUiLang = currentUiLang === WordMapI18n.UI_LANG_ZH
        ? WordMapI18n.UI_LANG_EN
        : WordMapI18n.UI_LANG_ZH;

    applyLocalizedUi({
        uiLang: currentUiLang,
        sourceLang: elements.sourceLang.value,
        targetLang: elements.targetLang.value
    });
    persistSettings(false);
}

function queueAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => persistSettings(false), 180);
}

function applyLocalizedUi(state) {
    const uiLang = WordMapI18n.normalizeUiLang(state.uiLang);
    document.documentElement.lang = uiLang;
    document.title = WordMapI18n.t(uiLang, 'appTitle');

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.dataset.i18n;
        element.textContent = WordMapI18n.t(uiLang, key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        const key = element.dataset.i18nPlaceholder;
        element.placeholder = WordMapI18n.t(uiLang, key);
    });

    renderSelectOptions(elements.sourceLang, WordMapI18n.getOcrLanguageOptions(uiLang), state.sourceLang || 'eng');
    renderSelectOptions(elements.targetLang, WordMapI18n.getTargetLanguageOptions(uiLang), state.targetLang || 'Chinese');
    updateUiLanguageToggle();

    if (!elements.status.hidden) {
        elements.status.textContent = WordMapI18n.t(uiLang, 'saveSuccess');
    }
}

function updateUiLanguageToggle() {
    const nextLang = currentUiLang === WordMapI18n.UI_LANG_ZH ? 'EN' : '中';
    elements.uiLangToggleText.textContent = nextLang;
    elements.uiLangToggle.setAttribute('title', WordMapI18n.t(currentUiLang, 'uiLanguageToggleTitle'));
    elements.uiLangToggle.setAttribute('aria-label', WordMapI18n.t(currentUiLang, 'uiLanguageToggleTitle'));
}

function renderSelectOptions(selectElement, options, selectedValue) {
    const valueToUse = selectedValue || selectElement.value;
    const allowedValues = new Set(options.map((optionData) => optionData.value));
    selectElement.innerHTML = '';

    options.forEach((optionData) => {
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        selectElement.appendChild(option);
    });

    selectElement.value = allowedValues.has(valueToUse) ? valueToUse : options[0].value;
}

function populateForm(result) {
    elements.ocrApiKey.value = result.ocrApiKey || '';
    elements.apiBaseUrl.value = result.apiBaseUrl || '';
    elements.modelName.value = result.modelName || '';
    elements.apiKey.value = result.apiKey || '';
    elements.sourceLang.value = result.sourceLang || 'eng';
    elements.targetLang.value = result.targetLang || 'Chinese';
}

function collectSettings() {
    return {
        ocrApiKey: elements.ocrApiKey.value.trim(),
        apiBaseUrl: normalizeBaseUrl(elements.apiBaseUrl.value),
        modelName: elements.modelName.value.trim(),
        apiKey: elements.apiKey.value.trim(),
        uiLang: WordMapI18n.normalizeUiLang(currentUiLang),
        sourceLang: elements.sourceLang.value || 'eng',
        targetLang: elements.targetLang.value || 'Chinese'
    };
}

function persistSettings(showFeedback) {
    clearTimeout(autoSaveTimer);
    const payload = collectSettings();
    currentUiLang = payload.uiLang;

    chrome.storage.local.set(payload, () => {
        if (!showFeedback) {
            return;
        }

        elements.status.hidden = false;
        elements.status.textContent = WordMapI18n.t(currentUiLang, 'saveSuccess');
        setTimeout(() => {
            elements.status.hidden = true;
        }, 1800);
    });
}

function backfillDefaultsIfNeeded(result) {
    const normalizedBaseUrl = normalizeBaseUrl(result.apiBaseUrl || '');
    const needsBackfill =
        !result.uiLang ||
        !result.sourceLang ||
        !result.targetLang ||
        normalizedBaseUrl !== (result.apiBaseUrl || '');

    if (needsBackfill) {
        persistSettings(false);
    }
}

function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function sendDrawCommand(mode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs && tabs[0];
        const url = currentTab && currentTab.url ? currentTab.url : '';

        if (!currentTab || /^(chrome|edge|about|brave|vivaldi|opera):\/\//i.test(url)) {
            window.alert(WordMapI18n.t(currentUiLang, 'systemPageBlocked'));
            return;
        }

        chrome.runtime.sendMessage(
            { action: 'popup_toggle_draw', mode: mode, tabId: currentTab.id },
            () => window.close()
        );
    });
}
