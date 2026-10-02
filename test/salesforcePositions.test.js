import test from "node:test";
import assert from "node:assert/strict";
import {
    buildSalesforceLineItems,
    buildSalesforcePositions,
    resolveSalesforcePositionPrice
} from "../utils/salesforcePositions.js";

test("includes and labels regular, optional and alternative Salesforce positions", () => {
    const nodes = [{ id: 1, parentId: null, sortOrder: 1 }];
    const positions = buildSalesforcePositions(nodes, [
        { id: 1, projectNodeId: 1, sortOrder: 1, articleNumber: "A", quantity: 2 },
        { id: 2, projectNodeId: 1, sortOrder: 2, articleNumber: "B", quantity: 3, isOptional: 1 },
        { id: 3, projectNodeId: 1, sortOrder: 3, articleNumber: "C", quantity: 4, isAlternative: 1 }
    ]);

    assert.deepEqual(positions, [
        { articleNumber: "A", quantity: 2, discountGroup: undefined, isOptional: false, isAlternative: false },
        { articleNumber: "B", quantity: 3, discountGroup: undefined, isOptional: true, isAlternative: false },
        { articleNumber: "C", quantity: 4, discountGroup: undefined, isOptional: false, isAlternative: true }
    ]);
});

test("aggregates only positions with the same article and commercial role", () => {
    const nodes = [{ id: 1, parentId: null, sortOrder: 1 }];
    const positions = buildSalesforcePositions(nodes, [
        { id: 1, projectNodeId: 1, sortOrder: 1, articleNumber: "A", quantity: 2 },
        { id: 2, projectNodeId: 1, sortOrder: 2, articleNumber: "A", quantity: 3 },
        { id: 3, projectNodeId: 1, sortOrder: 3, articleNumber: "A", quantity: 4, isOptional: 1 },
        { id: 4, projectNodeId: 1, sortOrder: 4, articleNumber: "A", quantity: 5, isAlternative: 1 },
        { id: 5, projectNodeId: 1, sortOrder: 5, articleNumber: "A", quantity: 0, isOptional: 1 }
    ]);

    assert.deepEqual(positions.map(({ quantity, isOptional, isAlternative }) => ({
        quantity, isOptional, isAlternative
    })), [
        { quantity: 5, isOptional: false, isAlternative: false },
        { quantity: 4, isOptional: true, isAlternative: false },
        { quantity: 5, isOptional: false, isAlternative: true }
    ]);
});

test("aggregates commercial positions at the selected project level", () => {
    const nodes = [
        { id: 1, parentId: null, type: "building", sortOrder: 1 },
        { id: 2, parentId: 1, type: "panel", sortOrder: 1 },
        { id: 3, parentId: 1, type: "panel", sortOrder: 2 }
    ];
    const articles = [
        { id: 1, projectNodeId: 2, articleNumber: "A", quantity: 2 },
        { id: 2, projectNodeId: 3, articleNumber: "A", quantity: 3 }
    ];
    assert.deepEqual(buildSalesforcePositions(nodes, articles, "commercial_building").map(item => item.quantity), [5]);
    assert.deepEqual(buildSalesforcePositions(nodes, articles, "commercial_panel").map(item => item.quantity), [2, 3]);
});

test("keeps every position in project order when using as projected", () => {
    const nodes = [{ id: 1, parentId: null, type: "field", sortOrder: 1 }];
    const positions = buildSalesforcePositions(nodes, [
        { id: 2, projectNodeId: 1, sortOrder: 2, articleNumber: "A", quantity: 3 },
        { id: 1, projectNodeId: 1, sortOrder: 1, articleNumber: "A", quantity: 2 }
    ], "projected");
    assert.deepEqual(positions.map(item => item.quantity), [2, 3]);
});

test("maps Salesforce flags and leaves optional opportunity items unmarked", () => {
    const { opportunityLineItems, quoteLineItems } = buildSalesforceLineItems([
        {
            PricebookEntryId: "pricebook-entry",
            Product2Id: "product",
            Quantity: 2,
            listPrice: 100,
            baseDiscount: 15,
            isOptional: true,
            isAlternative: false
        },
        {
            PricebookEntryId: "alternative-entry",
            Product2Id: "alternative-product",
            Quantity: 1,
            listPrice: 50,
            baseDiscount: 0,
            isOptional: false,
            isAlternative: true
        }
    ]);

    assert.equal(opportunityLineItems[0].Alternative__c, false);
    assert.equal(opportunityLineItems[0].UnitPrice, 85);
    assert.equal(opportunityLineItems[0].BasicDiscount__c, -15);
    assert.equal("Discount" in opportunityLineItems[0], false);
    assert.equal("Option__c" in opportunityLineItems[0], false);
    assert.equal(opportunityLineItems[1].Alternative__c, true);
    assert.equal(opportunityLineItems[1].BasicDiscount__c, 0);
    assert.equal(quoteLineItems[0].Option__c, true);
    assert.equal(quoteLineItems[0].Alternative__c, false);
    assert.equal(quoteLineItems[0].UnitPrice, 85);
    assert.equal("Discount" in quoteLineItems[0], false);
    assert.equal(quoteLineItems[1].Option__c, false);
    assert.equal(quoteLineItems[1].Alternative__c, true);
    assert.equal(quoteLineItems[1].UnitPrice, 50);
    assert.equal("Discount" in quoteLineItems[1], false);
});

test("uses a special price as the Salesforce line price and derives its effective discount", () => {
    const price = resolveSalesforcePositionPrice({
        listPrice: 1374,
        baseDiscount: 0,
        specialPrice: 999
    });

    assert.equal(price.unitPrice, 999);
    assert.equal(price.discountPercent, 27.29);

    const { opportunityLineItems, quoteLineItems } = buildSalesforceLineItems([
        {
            PricebookEntryId: "pricebook-entry",
            Product2Id: "product",
            Quantity: 1,
            listPrice: 1374,
            baseDiscount: 0,
            specialPrice: 999,
            isOptional: false,
            isAlternative: false
        }
    ]);

    assert.equal(opportunityLineItems[0].UnitPrice, 999);
    assert.equal(opportunityLineItems[0].BasicDiscount__c, -27.29);
    assert.equal(quoteLineItems[0].UnitPrice, 999);
});

test("uses a position-specific special discount instead of the customer discount", () => {
    const price = resolveSalesforcePositionPrice({
        listPrice: 100,
        baseDiscount: 35,
        specialDiscount: 12.5
    });

    assert.equal(price.unitPrice, 87.5);
    assert.equal(price.discountPercent, 12.5);
});

test("does not merge positions with different special prices", () => {
    const positions = buildSalesforcePositions([
        { id: 1, parentId: null, sortOrder: 1 }
    ], [
        {
            id: 1,
            projectNodeId: 1,
            sortOrder: 1,
            articleNumber: "A",
            quantity: 1,
            specialPrice: 999
        },
        {
            id: 2,
            projectNodeId: 1,
            sortOrder: 2,
            articleNumber: "A",
            quantity: 2,
            specialPrice: 950
        }
    ]);

    assert.equal(positions.length, 2);
    assert.deepEqual(
        positions.map(position => [position.specialPrice, position.quantity]),
        [[999, 1], [950, 2]]
    );
});
