function numericOrder(value, fallback) {
    return Number.isFinite(Number(value)) ? Number(value) : Number(fallback);
}

function compareSortOrder(first, second) {
    return numericOrder(first.sortOrder, first.id) - numericOrder(second.sortOrder, second.id)
        || Number(first.id) - Number(second.id);
}

function orderProjectNodes(nodes) {
    const childrenByParent = new Map();
    for (const node of nodes) {
        const key = node.parentId == null ? "root" : String(node.parentId);
        if (!childrenByParent.has(key)) childrenByParent.set(key, []);
        childrenByParent.get(key).push(node);
    }
    for (const children of childrenByParent.values()) children.sort(compareSortOrder);

    const ordered = [];
    const visited = new Set();
    const visit = node => {
        const key = String(node.id);
        if (visited.has(key)) return;
        visited.add(key);
        ordered.push(node);
        for (const child of childrenByParent.get(key) ?? []) visit(child);
    };
    for (const node of childrenByParent.get("root") ?? []) visit(node);
    for (const node of [...nodes].sort(compareSortOrder)) visit(node);
    return ordered;
}

export function buildSalesforcePositions(nodes, nodeArticles) {
    const byNode = new Map();
    for (const position of nodeArticles) {
        const key = String(position.projectNodeId);
        if (!byNode.has(key)) byNode.set(key, []);
        byNode.get(key).push(position);
    }
    for (const positions of byNode.values()) positions.sort(compareSortOrder);

    const summaries = new Map();
    for (const node of orderProjectNodes(nodes)) {
        for (const position of byNode.get(String(node.id)) ?? []) {
            const quantity = Number(position.quantity);
            if (quantity <= 0) continue;

            const articleNumber = String(position.articleNumber);
            const isOptional = Boolean(position.isOptional);
            const isAlternative = Boolean(position.isAlternative);
            const key = `${articleNumber}\0${Number(isOptional)}\0${Number(isAlternative)}`;
            if (!summaries.has(key)) {
                summaries.set(key, {
                    articleNumber,
                    quantity: 0,
                    discountGroup: position.discountGroup,
                    isOptional,
                    isAlternative
                });
            }
            summaries.get(key).quantity += quantity;
        }
    }
    return [...summaries.values()];
}

export function buildSalesforceLineItems(pricedPositions) {
    return {
        opportunityLineItems: pricedPositions.map(item => ({
            PricebookEntryId: item.PricebookEntryId,
            Product2Id: item.Product2Id,
            Quantity: item.Quantity,
            UnitPrice: item.listPrice,
            Alternative__c: item.isAlternative,
            ...(item.baseDiscount > 0 ? { Discount: item.baseDiscount } : {})
        })),
        quoteLineItems: pricedPositions.map((item, index) => ({
            PricebookEntryId: item.PricebookEntryId,
            Product2Id: item.Product2Id,
            Quantity: item.Quantity,
            UnitPrice: Math.round(item.listPrice * (1 - item.baseDiscount / 100) * 100) / 100,
            SortOrder: index + 1,
            Position__c: index + 1,
            Alternative__c: item.isAlternative,
            Option__c: item.isOptional
        }))
    };
}
