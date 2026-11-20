import assert from "node:assert/strict";
import test from "node:test";
import {
    buildSalesforceProductStatus,
    getSalesforceSalesStatusInfo,
    isSalesforceSalesStatusWarning
} from "../utils/salesforceProductStatus.js";

test("flags discontinued Salesforce articles", () => {
    assert.equal(
        isSalesforceSalesStatusWarning({
            salesStatus: "Abgekündigt",
            discontinuationDate: "2027-09-01"
        }),
        true
    );
});

test("does not flag active Salesforce articles without a date", () => {
    assert.equal(
        isSalesforceSalesStatusWarning({ salesStatus: "Active" }),
        false
    );
});

test("does not flag approved series articles", () => {
    const status = buildSalesforceProductStatus({
        salesStatus: "✅",
        plantMaterialStatus: "Serie"
    });

    assert.equal(status.salesStatus, "Serie");
    assert.equal(status.statusInfo.warning, false);
    assert.equal(status.statusInfo.kind, "active");
});

test("keeps searchable lifecycle labels when Salesforce returns a warning icon", () => {
    const status = buildSalesforceProductStatus({
        salesStatus: "⚠️",
        plantMaterialStatus: "Abgekündigt",
        distributionChannelStatus: "Blocked for offers",
        plantMaterialStatusValidFrom: "2027-09-01",
        distributionChannelStatusValidFrom: "2027-09-01",
        now: new Date("2026-11-20T00:00:00Z")
    });

    assert.equal(status.salesStatus, "Abgekündigt / Blocked for offers");
    assert.equal(status.statusInfo.kind, "expiring");
});

test("flags an article when only the discontinuation date is present", () => {
    assert.equal(
        isSalesforceSalesStatusWarning({ discontinuationDate: "2027-09-01" }),
        true
    );
});

test("maps the Salesforce screenshot status to an expiring warning", () => {
    const status = buildSalesforceProductStatus({
        plantMaterialStatus: "Abgekündigt",
        plantMaterialStatusValidFrom: "2027-09-01",
        distributionChannelStatus: "Blocked for offers",
        distributionChannelStatusValidFrom: "2027-09-01",
        now: new Date("2026-11-20T00:00:00Z")
    });

    assert.equal(status.discontinuationDate, "2027-09-01");
    assert.equal(status.statusInfo.kind, "expiring");
    assert.equal(getSalesforceSalesStatusInfo(status).warning, true);
});
