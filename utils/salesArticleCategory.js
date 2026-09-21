const ACCESSORY_PATTERN = /\b(?:klemmleiste|hutschiene|erweiterungskabel|kabel|zubeh[oö]r|ersatzteil|adapter|halter|montage|netzteil|module?)\b/i;
const TRANSFORMER_PATTERN = /^\s*CT[\s-]*(?:\d|AC\b)|\b(?:stromwandler|current transformer)\b|\bwandler\b/i;
const DEVICE_PATTERN = /^\s*(?:UMG(?:\s*\d+)?|RCM[\s-]*\d+|Rogo(?:Trans|Trand)\b|Rogowski\b)/i;

export const SALES_ARTICLE_CATEGORIES = Object.freeze([
    "device",
    "transformer",
    "accessory",
    "other"
]);

export function inferSalesArticleCategory(article = {}) {
    const name = String(article.manufacturerType || article.name || "").trim();
    if (ACCESSORY_PATTERN.test(name)) return "accessory";
    if (TRANSFORMER_PATTERN.test(name)) return "transformer";
    if (DEVICE_PATTERN.test(name)) return "device";
    return "other";
}
