import * as i18n from "./i18n.js";
import { showAlert, showChoice } from "./modal.js";

export function isSalesforceConnectionError(error) {
    return /Keine Salesforce-Anmeldung vorhanden|Salesforce (?:is )?not connected|No Salesforce (?:sign-in|login)/i
        .test(String(error?.message ?? error ?? ""));
}

export async function offerSalesforceConnection(error) {
    if (!isSalesforceConnectionError(error)) return false;

    const choice = await showChoice(
        i18n.t("salesforce.connectionRequired"),
        {
            title: i18n.t("salesforce.connectionRequiredTitle"),
            choices: [{
                label: i18n.t("salesforce.connect"),
                value: "connect"
            }]
        }
    );
    if (choice !== "connect") return false;

    try {
        const response = await fetch("/api/salesforce/login", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? i18n.t("salesforce.error"));
        await showAlert(i18n.t("salesforce.connected"));
        return true;
    } catch (loginError) {
        await showAlert(loginError.message ?? i18n.t("salesforce.error"));
        return false;
    }
}
