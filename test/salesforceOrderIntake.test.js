import test from "node:test";
import assert from "node:assert/strict";
import {
    buildAnnualOrderIntake,
    groupOrderItemNetAmounts
} from "../utils/salesforceOrderIntake.js";

test("groups visible Salesforce net totals by order without using list prices", () => {
    assert.deepEqual(groupOrderItemNetAmounts([
        { OrderId: "00254575", Order: { EffectiveDate: "2021-01-21" }, TotalNet__c: 2490 },
        { OrderId: "00254575", Order: { EffectiveDate: "2021-01-21" }, TotalNet__c: 996 },
        { OrderId: "incomplete", Order: { EffectiveDate: "2021-02-01" }, TotalNet__c: 17 },
        { OrderId: "incomplete", Order: { EffectiveDate: "2021-02-01" }, TotalNet__c: null }
    ]), [
        { year: 2021, OrderId: "00254575", itemCount: 2, netAmountCount: 2, netAmount: 3486 },
        { year: 2021, OrderId: "incomplete", itemCount: 2, netAmountCount: 1, netAmount: 17 }
    ]);
});

test("prefers header amounts and fills only missing amounts from complete net positions", () => {
    const years = buildAnnualOrderIntake([
        { year: 2026, orderCount: 2, orderAmountCount: 1, orderAmount: 748 },
        { year: 2025, orderCount: 2, orderAmountCount: 0, orderAmount: null }
    ], [
        { year: 2026, OrderId: "fallback", itemCount: 2, netAmountCount: 2, netAmount: 584.8 },
        { year: 2025, OrderId: "complete", itemCount: 2, netAmountCount: 2, netAmount: 100 },
        { year: 2025, OrderId: "incomplete", itemCount: 2, netAmountCount: 1, netAmount: 50 }
    ], 2026, 2);

    assert.deepEqual(years[0], {
        year: 2026, hasData: true, orderCount: 2, amountKnownCount: 2,
        amountComplete: true, orderAmount: 1332.8,
        previousYearHasData: false, changePercent: null
    });
    assert.deepEqual(years[1], {
        year: 2025, hasData: true, orderCount: 2, amountKnownCount: 1,
        amountComplete: false, orderAmount: 100,
        previousYearHasData: false, changePercent: null
    });
});

test("treats an order without positions as a known zero amount", () => {
    const [year] = buildAnnualOrderIntake([
        { year: 2026, orderCount: 1, orderAmountCount: 0, orderAmount: null }
    ], [
        { year: 2026, OrderId: "empty", itemCount: 0, netAmountCount: 0, netAmount: 0 }
    ], 2026, 1);

    assert.equal(year.amountKnownCount, 1);
    assert.equal(year.amountComplete, true);
    assert.equal(year.orderAmount, 0);
});
