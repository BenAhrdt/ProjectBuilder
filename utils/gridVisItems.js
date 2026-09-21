const ZERO_ITEM_PATTERNS = [
    /^\s*GridVis\b/i,
    /\b(?:Kommunikationsmodul|Kommunikations[-\s]*Modul|Communication\s+Module)\b/i,
    /\b(?:Hutschienennetzteil|Netzteil|Power\s+Supply)\b/i,
    /\bCT[-\s]*SC[-\s]*\d/i,
    /\b(?:Brosch(?:u|ü)re|Flyer|Whitepaper|Schulung|Training|Service)\b/i
];

const ZERO_ITEM_NAME_PATTERNS = [
    /\bCT[-\s]*AC[-\s]*RCM[-\s]*\d/i,
    /\b800[-\s]*CON\b/i
];

const METER_PATTERNS = [
    /\bUMG\s*\d/i,
    /\bProData\b/i,
    /\bRCM\s*\d/i,
    /\bMID\b/i,
    /\bECS?EM\b/i
];

export function inferGridVisItems(article = {}) {
    const name = String(article.manufacturerType ?? "").trim();
    const text = [
        article.manufacturerType,
        article.description
    ].filter(Boolean).join(" ");

    if (!text.trim()) return null;

    if (/^UMG\s*800$/i.test(name)) return 0;

    if (ZERO_ITEM_NAME_PATTERNS.some(pattern => pattern.test(name))) return 0;

    if (ZERO_ITEM_PATTERNS.some(pattern => pattern.test(text))) return 0;

    const currentModule = name.match(
        /^(?:(?:Modul|Module)\s+)?800[-\s]*CT[-\s]*(\d{1,2})\b/i
    );
    if (currentModule) return Number(currentModule[1]) / 8;

    if (/\b\w*(?:modul|module)\b/i.test(name)) return 1;
    if (METER_PATTERNS.some(pattern => pattern.test(name))) return 1;

    return 0;
}

export function normalizeGridVisItems(value) {
    if (value === null || value === undefined || value === "") return null;
    const normalized = Number(String(value).replace(",", "."));
    return Number.isFinite(normalized) && normalized >= 0
        ? normalized
        : Number.NaN;
}
