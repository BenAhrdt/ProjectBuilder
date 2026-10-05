import test from "node:test";
import assert from "node:assert/strict";
import { mapCustomerPricingGroupDiscounts } from "../utils/salesforceCustomerDiscounts.js";

test("does not derive price-group discounts from historical Salesforce lines", () => {
    const result = mapCustomerPricingGroupDiscounts([
        { Opportunity: { AccountId: "customer" }, Product2Id: "p1", BasicDiscount__c: -35 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p3", ListPrice: 100, UnitPrice: 70 }
    ], new Map([
        ["p1", "01"],
        ["p3", "03"]
    ]));

    assert.equal(result.size, 0);
});

test("keeps existing local discounts when Salesforce provides no values", () => {
    const existing = { pg1: 20, pg3: 15, pg14: 10 };
    const imported = mapCustomerPricingGroupDiscounts([], new Map()).get("customer") ?? {};

    assert.deepEqual({ ...existing, ...imported }, existing);
});
