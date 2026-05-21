let translations = {}

let currentLanguage = "de"

// --------------------------------------------------
// Sprache laden
// --------------------------------------------------

export async function loadLanguage(language) {

    currentLanguage = language

    const response = await fetch(`/i18n/${language}.json`)

    translations = await response.json()

}

// --------------------------------------------------
// Übersetzung holen
// --------------------------------------------------

export function t(key) {

    return translations[key] || key

}