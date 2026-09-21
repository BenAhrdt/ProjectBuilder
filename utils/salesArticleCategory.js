const ACCESSORY_PATTERN = /\b(?:klemmleiste|hutschiene|erweiterungskabel|kabel|zubeh[oö]r|ersatzteil|adapter|halter|montage|netzteil|module?)\b/i;
const TRANSFORMER_PATTERN = /^\s*CT[\s-]*(?:\d|AC\b)|\b(?:stromwandler|current transformer)\b|\bwandler\b/i;

export const SALES_ARTICLE_CATEGORIES = Object.freeze([
    "device",
    "transformer",
    "accessory",
    "other",
    "unclassified"
]);

export function inferSalesArticleCategory(article = {}) {
    const name = String(article.manufacturerType || article.name || "").trim();
    if (ACCESSORY_PATTERN.test(name)) return "accessory";
    if (TRANSFORMER_PATTERN.test(name)) return "transformer";
    return "unclassified";
}
