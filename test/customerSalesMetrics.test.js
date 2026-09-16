import test from "node:test";
import assert from "node:assert/strict";
import { averageOrderValue, calculateSalesMetrics } from "../public/js/utils/customerSalesMetrics.js";

test("calculates current average, five-year comparison and CAGR", () => {
    const years = [
        { year: 2026, hasData: true, orderAmount: 200, orderCount: 4 },
        { year: 2025, hasData: true, orderAmount: 100, orderCount: 2 },
        { year: 2024, hasData: true, orderAmount: 100, orderCount: 1 },
        { year: 2023, hasData: true, orderAmount: 100, orderCount: 1 },
        { year: 2022, hasData: true, orderAmount: 100, orderCount: 1 },
        { year: 2021, hasData: true, orderAmount: 100, orderCount: 1 }
    ];
    const metrics = calculateSalesMetrics(years);
    assert.equal(metrics.currentAverageOrder, 50);
    assert.equal(metrics.fiveYearComparison, 100);
    assert.equal(metrics.fiveYearTotal, 100);
    assert.ok(Math.abs(metrics.cagr - 14.8698) < 0.001);
    assert.equal(metrics.trendStartYear, 2021);
    assert.equal(metrics.trendEndYear, 2026);
});

test("ignores missing years and handles zero orders defensively", () => {
    const years = [
        { year: 2026, hasData: true, orderAmount: 0, orderCount: 0 },
        { year: 2025, hasData: false, orderAmount: 0, orderCount: 0 }
    ];
    assert.equal(averageOrderValue(years[0]), null);
    assert.deepEqual(calculateSalesMetrics(years), {
        currentAverageOrder: null,
        fiveYearComparison: null,
        fiveYearTotal: null,
        cagr: null,
        trendStartYear: null,
        trendEndYear: null
    });
});

test("uses the oldest usable value in the five-year window", () => {
    const metrics = calculateSalesMetrics([
        { year: 2026, hasData: true, orderAmount: 200, orderCount: 2 },
        { year: 2025, hasData: true, orderAmount: 150, orderCount: 2 },
        { year: 2022, hasData: true, orderAmount: 100, orderCount: 1 }
    ]);
    assert.equal(metrics.fiveYearTotal, 100);
    assert.ok(Math.abs(metrics.cagr - 18.9207) < 0.001);
    assert.equal(metrics.trendStartYear, 2022);
    assert.equal(metrics.trendEndYear, 2026);
});

test("excludes years with incomplete order amounts", () => {
    const years = [
        { year: 2026, hasData: true, amountComplete: true, orderAmount: 200, orderCount: 2 },
        { year: 2025, hasData: true, amountComplete: false, orderAmount: null, orderCount: 3 },
        { year: 2024, hasData: true, amountComplete: true, orderAmount: 100, orderCount: 1 }
    ];
    const metrics = calculateSalesMetrics(years);
    assert.equal(metrics.currentAverageOrder, 100);
    assert.equal(metrics.fiveYearComparison, null);
    assert.equal(averageOrderValue(years[1]), null);
});
