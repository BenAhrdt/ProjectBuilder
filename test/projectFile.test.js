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
            physicalQuantity: "kWh", deviceDesignation: "Z1", dataCollectionLocation: "NSHV",
            overviewColor: "#4c8bf5" }],
        positions: [{ id: 12, projectNodeId: 11, articleNumber: "123", quantity: 2,
            positionName: "Gerät", sortOrder: 1, isOptional: 1, isAlternative: 0,
            specialDiscount: 12.5, specialPrice: 999 }],
        nodeLabels: [{ id: 21, projectNodeId: 11, text: "Energie", color: "#2f6fb4", side: "right", sortOrder: 1 }],
        articleLabels: [{ id: 22, projectNodeArticleId: 12, text: "Hauptzähler", color: "#b94a48", side: "left", sortOrder: 2 }],
        nodeLabelSettings: [{ projectNodeId: 11, inheritToChildren: 0, inheritFromParent: 1 }],
        nodeLabelHidden: [{ projectNodeId: 11, sourceProjectNodeLabelId: 21 }],
        articleLabelSettings: [{ projectNodeArticleId: 12, inheritFromParent: 0 }],
        articleLabelHidden: [{ projectNodeArticleId: 12, sourceProjectNodeLabelId: 21 }]
    });

    assert.equal(payload.format, "projectbuilder-project");
    assert.equal(payload.schemaVersion, 1);
    assert.equal(payload.project.customerNumber, "1015004200");
    assert.equal(payload.project.salesforceOpportunityId, "006000000000001AAA");
    assert.equal(payload.nodes[0].deviceDesignation, "Z1");
    assert.equal(payload.nodes[0].overviewColor, "#4c8bf5");
    assert.deepEqual(payload.labels[0], {
        id: 21, nodeId: 11, text: "Energie", color: "#2f6fb4", side: "right", sortOrder: 1
    });
    assert.deepEqual(payload.articleLabels[0], {
        id: 22, articleId: 12, text: "Hauptzähler", color: "#b94a48", side: "left", sortOrder: 2
    });
    assert.deepEqual(payload.nodeLabelSettings[0], {
        nodeId: 11, inheritToChildren: false, inheritFromParent: true
    });
    assert.deepEqual(payload.nodeLabelHidden[0], {
        nodeId: 11, sourceLabelId: 21
    });
    assert.deepEqual(payload.articleLabelSettings[0], {
        articleId: 12, inheritFromParent: false
    });
    assert.deepEqual(payload.articleLabelHidden[0], {
        articleId: 12, sourceLabelId: 21
    });
    assert.deepEqual(payload.positions[0], {
        id: 12, nodeId: 11, articleNumber: "123", quantity: 2,
        positionName: "Gerät", sortOrder: 1, isOptional: true, isAlternative: false,
        specialDiscount: 12.5, specialPrice: 999
    });
});
