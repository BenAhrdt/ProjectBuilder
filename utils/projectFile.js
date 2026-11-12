export const projectFileFormat = "projectbuilder-project";
export const projectFileSchemaVersion = 1;

export function buildProjectFilePayload({
    project,
    nodes,
    positions,
    nodeLabels = [],
    articleLabels = [],
    nodeLabelSettings = [],
    nodeLabelHidden = [],
    articleLabelSettings = [],
    articleLabelHidden = []
}) {
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
            overviewColors: project.overviewColors ?? "{}",
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
            isOptional: Boolean(position.isOptional), isAlternative: Boolean(position.isAlternative),
            specialDiscount: position.specialDiscount ?? null,
            specialPrice: position.specialPrice ?? null
        })),
        labels: nodeLabels.map(label => ({
            id: label.id,
            nodeId: label.nodeId ?? label.projectNodeId,
            text: label.text ?? "",
            color: label.color ?? "#2f6fb4",
            side: label.side === "right" ? "right" : "left",
            sortOrder: Number(label.sortOrder) || 0
        })),
        articleLabels: articleLabels.map(label => ({
            id: label.id,
            articleId: label.articleId ?? label.projectNodeArticleId,
            text: label.text ?? "",
            color: label.color ?? "#2f6fb4",
            side: label.side === "right" ? "right" : "left",
            sortOrder: Number(label.sortOrder) || 0
        })),
        nodeLabelSettings: nodeLabelSettings.map(setting => ({
            nodeId: setting.nodeId ?? setting.projectNodeId,
            inheritToChildren: setting.inheritToChildren !== 0,
            inheritFromParent: setting.inheritFromParent !== 0
        })),
        nodeLabelHidden: nodeLabelHidden.map(item => ({
            nodeId: item.nodeId ?? item.projectNodeId,
            sourceLabelId: item.sourceLabelId ?? item.sourceProjectNodeLabelId
        })),
        articleLabelSettings: articleLabelSettings.map(setting => ({
            articleId: setting.articleId ?? setting.projectNodeArticleId,
            inheritFromParent: setting.inheritFromParent !== 0
        })),
        articleLabelHidden: articleLabelHidden.map(item => ({
            articleId: item.articleId ?? item.projectNodeArticleId,
            sourceLabelId: item.sourceLabelId ?? item.sourceProjectNodeLabelId
        }))
    };
}
