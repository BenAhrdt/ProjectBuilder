const DEFAULT_LANGUAGE = "de";
const SUPPORTED_LANGUAGES = ["de", "en", "es"];
const LANGUAGE_STORAGE_KEY = "projectbuilder.language";

let translations = {};
let currentLanguage = DEFAULT_LANGUAGE;
let loadedLanguage = null;

// --------------------------------------------------
// Sprache laden
// --------------------------------------------------

async function loadLanguage(language = getStoredLanguage()) {
    const normalizedLanguage = SUPPORTED_LANGUAGES.includes(language)
        ? language
        : DEFAULT_LANGUAGE;
    if (loadedLanguage === normalizedLanguage) return;

    const response = await fetch(`/i18n/${normalizedLanguage}.json`);
    if (!response.ok) throw new Error(`Could not load language: ${normalizedLanguage}`);

    translations = await response.json();
    currentLanguage = normalizedLanguage;
    loadedLanguage = normalizedLanguage;
    document.documentElement.lang = normalizedLanguage;
}

function getStoredLanguage() {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
}

function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) return false;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    return true;
}

function getCurrentLanguage() {
    return currentLanguage;
}

// --------------------------------------------------
// Übersetzung holen
// --------------------------------------------------

function t(key) {
    return translations[key] || key
}

export {
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    getCurrentLanguage,
    getStoredLanguage,
    loadLanguage,
    setLanguage,
    t
};
