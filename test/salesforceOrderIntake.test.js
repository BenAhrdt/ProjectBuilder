import test from "node:test";
import assert from "node:assert/strict";
import { buildAnnualOrderIntake } from "../utils/salesforceOrderIntake.js";

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
        amountComplete: false, orderAmount: null,
        previousYearHasData: false, changePercent: null
    });
});
