export const projectFileFormat = "projectbuilder-project";
export const projectFileSchemaVersion = 1;

export function buildProjectFilePayload({ project, nodes, positions }) {
    return {
        format: projectFileFormat,
        schemaVersion: projectFileSchemaVersion,
        exportedAt: new Date().toISOString(),
        project: {
            id: project.id, customerId: project.customerId,
            customerNumber: project.customerNumber ?? null,
            customerSalesforceId: project.customerSalesforceId ?? null,
            name: project.name ?? "", description: project.description ?? "",
            projectDiscount: project.projectDiscount ?? 0,
            salesforceOpportunityId: project.salesforceOpportunityId ?? null,
            salesforceQuoteId: project.salesforceQuoteId ?? null
        },
        nodes: nodes.map(node => ({
            id: node.id, parentId: node.parentId, type: node.type, name: node.name ?? "",
            sortOrder: node.sortOrder ?? 0, physicalQuantity: node.physicalQuantity ?? "kWh",
            deviceDesignation: node.deviceDesignation ?? "", dataCollectionLocation: node.dataCollectionLocation ?? "",
            fundingObject: node.fundingObject ?? "", responsibility: node.responsibility ?? "",
            collectionFrequency: node.collectionFrequency ?? "", thirdPartyQuantity: node.thirdPartyQuantity ?? ""
        })),
        positions: positions.map(position => ({
            id: position.id, nodeId: position.nodeId ?? position.projectNodeId,
            articleNumber: position.articleNumber, quantity: position.quantity,
            positionName: position.positionName, sortOrder: position.sortOrder ?? 0,
            isOptional: Boolean(position.isOptional), isAlternative: Boolean(position.isAlternative)
        }))
    };
}
