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

test("accepts formatted Salesforce pricing group values", () => {
    const result = mapCustomerPricingGroupDiscounts([
        { Opportunity: { AccountId: "customer" }, Product2Id: "p4", BasicDiscount__c: -15 },
        { Opportunity: { AccountId: "customer" }, Product2Id: "p5", BasicDiscount__c: -20 }
    ], new Map([["p4", "PG04"], ["p5", "PG5"]]));

    assert.deepEqual(result.get("customer"), { pg4: 15, pg5: 20 });
});

test("derives discounts from historical list and unit prices", () => {
    const result = mapCustomerPricingGroupDiscounts([
        {
            Opportunity: { AccountId: "customer" }, Product2Id: "p6",
            BasicDiscount__c: null, ListPrice: 94, UnitPrice: 42.93
        },
        {
            Opportunity: { AccountId: "customer" }, Product2Id: "p8",
            BasicDiscount__c: null, ListPrice: 235, UnitPrice: 158.4
        }
    ], new Map([["p6", "06"], ["p8", "08"]]));

    assert.deepEqual(result.get("customer"), { pg6: 54.33, pg8: 32.6 });
});

test("explicit zero discounts do not fall back to price differences", () => {
    const result = mapCustomerPricingGroupDiscounts([
        {
            Opportunity: { AccountId: "customer" }, Product2Id: "p1",
            BasicDiscount__c: 0, ListPrice: 100, UnitPrice: 70
        }
    ], new Map([["p1", "01"]]));

    assert.equal(result.has("customer"), false);
});
