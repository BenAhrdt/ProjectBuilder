let translations = {}

let currentLanguage = "de"

// --------------------------------------------------
// Sprache laden
// --------------------------------------------------

async function loadLanguage(language) {

    currentLanguage = language

    const response = await fetch(`/i18n/${language}.json`)

    translations = await response.json()

}

// --------------------------------------------------
// Übersetzung holen
// --------------------------------------------------

function t(key) {
    return translations[key] || key
}

export {
    loadLanguage,
    t
};