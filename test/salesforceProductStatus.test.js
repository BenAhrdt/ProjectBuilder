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
