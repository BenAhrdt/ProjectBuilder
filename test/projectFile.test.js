import test from "node:test";
import assert from "node:assert/strict";
import { buildProjectFilePayload } from "../utils/projectFile.js";

test("builds a versioned portable project file with structure, positions and Salesforce links", () => {
    const payload = buildProjectFilePayload({
        project: {
            id: 7, customerId: 3, customerNumber: "1015004200",
            customerSalesforceId: "001000000000001AAA", name: "Testprojekt",
            description: "Beschreibung", projectDiscount: 5,
            salesforceOpportunityId: "006000000000001AAA",
            salesforceQuoteId: "0Q0000000000001AAA"
        },
        nodes: [{ id: 11, parentId: null, type: "meter", name: "Messstelle", sortOrder: 2,
            physicalQuantity: "kWh", deviceDesignation: "Z1", dataCollectionLocation: "NSHV" }],
        positions: [{ id: 12, projectNodeId: 11, articleNumber: "123", quantity: 2,
            positionName: "Gerät", sortOrder: 1, isOptional: 1, isAlternative: 0 }]
    });

    assert.equal(payload.format, "projectbuilder-project");
    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.project.customerNumber, "1015004200");
    assert.equal(payload.project.salesforceOpportunityId, "006000000000001AAA");
    assert.equal(payload.nodes[0].deviceDesignation, "Z1");
    assert.deepEqual(payload.positions[0], {
        id: 12, nodeId: 11, articleNumber: "123", quantity: 2,
        positionName: "Gerät", sortOrder: 1, isOptional: true, isAlternative: false
    });
});
