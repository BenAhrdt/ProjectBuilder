const ACCESSORY_PATTERN = /\b(?:klemmleiste|hutschiene|erweiterungskabel|kabel|zubeh[oö]r|ersatzteil|adapter|halter|montage|netzteil|module?)\b/i;
const TRANSFORMER_PATTERN = /\bCT[\s-]*(?:\d|AC\b)|\b(?:stromwandler|current transformer|wandler|rogowski)\b|\bRogoTrans\b/i;
const DEVICE_PATTERN = /\b(?:UMG(?:[\s-]*\d+[A-Z]*)?|RCM[\s-]*\d+[A-Z]*|RogoTrand)\b/i;

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
    if (DEVICE_PATTERN.test(name)) return "device";
    return "unclassified";
}
