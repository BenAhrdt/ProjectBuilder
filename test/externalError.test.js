import test from "node:test";
import assert from "node:assert/strict";
import {
    isSalesforceAuthenticationError,
    normalizeExternalError
} from "../utils/externalError.js";

test("recognizes missing and expired Salesforce sessions", () => {
    assert.equal(isSalesforceAuthenticationError(new Error("Keine Salesforce-Anmeldung vorhanden.")), true);
    assert.equal(isSalesforceAuthenticationError("INVALID_SESSION_ID: Session expired or invalid"), true);
    assert.equal(isSalesforceAuthenticationError("We are down for maintenance"), false);
});

test("replaces HTML maintenance responses with a readable message", () => {
    const html = '<html><body><span style="font-weight: bold;">We are down for maintenance.</span></body></html>';
    assert.equal(
        normalizeExternalError(html),
        "Salesforce oder ein angebundener Dienst ist derzeit wegen Wartungsarbeiten nicht verfügbar. Bitte versuchen Sie es später erneut."
    );
    assert.equal(normalizeExternalError("Normale Fehlermeldung"), "Normale Fehlermeldung");
});
