function errorText(value) {
    if (typeof value === "string") return value;
    if (value?.message) return errorText(value.message);
    try { return JSON.stringify(value); }
    catch { return String(value ?? ""); }
}

export function isSalesforceAuthenticationError(error) {
    return /Keine Salesforce-Anmeldung vorhanden|Salesforce (?:is )?not connected|No Salesforce (?:sign-in|login)|INVALID_SESSION_ID|session (?:expired|is invalid)|invalid session/i
        .test(errorText(error));
}

export function normalizeExternalError(error, fallback = "Salesforce-Abfrage fehlgeschlagen.") {
    const message = errorText(error).trim();
    if (!message) return fallback;
    if (/<(?:!doctype|html|body|table|center|span)\b/i.test(message)) {
        if (/down for maintenance|maintenance/i.test(message)) {
            return "Salesforce oder ein angebundener Dienst ist derzeit wegen Wartungsarbeiten nicht verfügbar. Bitte versuchen Sie es später erneut.";
        }
        return fallback;
    }
    return message.length > 800 ? `${message.slice(0, 797)}…` : message;
}
