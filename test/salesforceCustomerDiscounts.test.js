import test from "node:test";
import assert from "node:assert/strict";
import { mapCustomerPricingGroupDiscounts } from "../utils/salesforceCustomerDiscounts.js";

test("maps newest non-zero Salesforce base discounts to customer PG1 through PG8", () => {
    const result = mapCustomerPricingGroupDiscounts([
        { Opportunity: { AccountId: "customer" }, Product2Id: "p1", BasicDiscount__c: -35 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p1", BasicDiscount__c: -30 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p3", BasicDiscount__c: -20 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p9", BasicDiscount__c: -38 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p5", BasicDiscount__c: 0 }
    ], new Map([["p1", "01"], ["p3", "03"], ["p5", "05"], ["p9", "09"]]));

    assert.deepEqual(result.get("customer"), { pg1: 35, pg3: 20 });
});

test("keeps discounts separated by Salesforce customer", () => {
    const result = mapCustomerPricingGroupDiscounts([
        { Opportunity: { AccountId: "a" }, Product2Id: "p", BasicDiscount__c: -28 },
        { Opportunity: { AccountId: "b" }, Product2Id: "p", BasicDiscount__c: -50 }
    ], new Map([["p", "08"]]));

    assert.deepEqual(result.get("a"), { pg8: 28 });
    assert.deepEqual(result.get("b"), { pg8: 50 });
});
