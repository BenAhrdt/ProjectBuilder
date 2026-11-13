const compactArticleText = value =>
    String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");

function getArticleClassificationText(article = {}) {

    return [
        article.articleNumber,
        article.manufacturerType,
        article.name,
        article.description,
        article.descriptionText,
        article.longDescription,
        article.longDescriptionText
    ]
        .filter(value => value !== null && value !== undefined)
        .map(compactArticleText)
        .join(" ");

}

function getArticleIdentityText(article = {}) {

    return [
        article.articleNumber,
        article.manufacturerType,
        article.name
    ]
        .filter(value => value !== null && value !== undefined)
        .map(compactArticleText)
        .join(" ");

}

/**
 * Returns the commissioning type from the device/article assignment.
 * Types 1–5 follow the Janitza commissioning service mapping.
 */
export function getCommissioningType(article = {}) {

    const identityText = getArticleIdentityText(article);
    const text = getArticleClassificationText(article);
    const articleNumber = compactArticleText(article.articleNumber);

    // IBN-Dienstleistungsartikel (DL510...) tragen selbst die Typbezeichnung
    // im Namen, sind aber keine Messgeraete und duerfen weder ein Badge noch
    // einen weiteren IBN-Bedarf erzeugen.
    if (/^dl510/.test(articleNumber)) return null;

    // The more specific device families must be checked before UMG 96 and
    // module patterns so that a device is assigned to exactly one type.
    if (identityText.includes("umg20cm")) return 3;
    if (identityText.includes("prodata2")) return 4;

    // CON-/Kommunikationsmodule werden nicht in Betrieb genommen. Diese
    // Ausnahme muss vor der allgemeinen Modulregel greifen.
    if (
        /(?:modul|module)(?:800)?con/.test(identityText)
        || identityText.includes("conmodul")
        || identityText.includes("communicationmodule")
        || identityText.includes("kommunikationsmodul")
    ) {
        return null;
    }

    // UMG 800 is a type 1 device. Its description contains the word
    // "modular", which must not make the device look like a type 2 module.
    if (
        identityText.includes("umg800")
        || articleNumber === "5238002"
    ) {
        return 1;
    }

    if (
        /umg(?:103|104)/.test(identityText)
        || /umg96(?:s|s2|rm|pa|pql)/.test(identityText)
        || /(?:modul|module)/.test(identityText)
    ) {
        return 2;
    }

    if (
        /umg(?:508|509|511|512|604|605|800|801|806)/.test(identityText)
        || identityText.includes("rcm202ab")
        || identityText.includes("rcm201rogo")
    ) {
        return 1;
    }

    // Keep a description-based fallback for imports that have no model name.
    // Only specific device patterns are allowed here; a generic "modular"
    // description is deliberately ignored.
    if (
        /umg(?:103|104)/.test(text)
        || /umg96(?:s|s2|rm|pa|pql)/.test(text)
    ) {
        return 2;
    }

    if (
        /umg(?:508|509|511|512|604|605|800|801|806)/.test(text)
        || text.includes("rcm202ab")
        || text.includes("rcm201rogo")
    ) {
        return 1;
    }

    if (
        /(?:energiezahler|energymeter|stromzahler)/.test(text)
        || /emd/.test(text)
        || /(?:b21|b23|b24)/.test(text)
        || /^140135[3-9]$/.test(articleNumber)
    ) {
        return 5;
    }

    return null;

}

