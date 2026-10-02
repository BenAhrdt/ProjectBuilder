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

const GROUP_NODE_TYPES = {
    commercial_building: "building",
    commercial_panel: "panel",
    commercial_field: "field",
    commercial_meter: "meter"
};

function normalizeOptionalNumber(value) {
    if (value === null || value === undefined || String(value).trim() === "") {
        return null;
    }

    const number = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(number) ? number : null;
}

function normalizePercent(value) {
    const number = Number(value);
    return Number.isFinite(number)
        ? Math.min(Math.max(number, 0), 100)
        : 0;
}

function roundCurrency(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

export function resolveSalesforcePositionPrice({
    listPrice,
    baseDiscount = 0,
    specialDiscount = null,
    specialPrice = null
}) {
    const normalizedListPrice = Number(listPrice);
    const safeListPrice = Number.isFinite(normalizedListPrice)
        ? normalizedListPrice
        : 0;
    const normalizedSpecialPrice = normalizeOptionalNumber(specialPrice);
    const normalizedSpecialDiscount = normalizeOptionalNumber(specialDiscount);

    if (normalizedSpecialPrice !== null && normalizedSpecialPrice >= 0) {
        const effectiveDiscount = safeListPrice > 0
            ? normalizePercent((1 - normalizedSpecialPrice / safeListPrice) * 100)
            : 0;
        return {
            unitPrice: roundCurrency(normalizedSpecialPrice),
            discountPercent: Math.round(effectiveDiscount * 100) / 100
        };
    }

    const discountPercent = normalizedSpecialDiscount !== null
        ? normalizePercent(normalizedSpecialDiscount)
        : normalizePercent(baseDiscount);

    return {
        unitPrice: roundCurrency(
            safeListPrice * (1 - discountPercent / 100)
        ),
        discountPercent
    };
}

export function buildSalesforcePositions(nodes, nodeArticles, mode = "commercial_total") {
    const byNode = new Map();
    for (const position of nodeArticles) {
        const key = String(position.projectNodeId);
        if (!byNode.has(key)) byNode.set(key, []);
        byNode.get(key).push(position);
    }
    for (const positions of byNode.values()) positions.sort(compareSortOrder);

    const nodeById = new Map(nodes.map(node => [String(node.id), node]));
    const groupType = GROUP_NODE_TYPES[mode];
    const groupForNode = node => {
        if (!groupType) return "total";
        let current = node;
        while (current) {
            if (current.type === groupType) return String(current.id);
            current = current.parentId == null ? null : nodeById.get(String(current.parentId));
        }
        return `ungrouped:${node?.id ?? "unknown"}`;
    };
    const summaries = new Map();
    for (const node of orderProjectNodes(nodes)) {
        for (const position of byNode.get(String(node.id)) ?? []) {
            const quantity = Number(position.quantity);
            if (quantity <= 0) continue;

            const articleNumber = String(position.articleNumber);
            const isOptional = Boolean(position.isOptional);
            const isAlternative = Boolean(position.isAlternative);
            const specialDiscount = normalizeOptionalNumber(position.specialDiscount);
            const specialPrice = normalizeOptionalNumber(position.specialPrice);
            const group = mode === "projected" ? `position:${position.id}` : groupForNode(node);
            const key = [
                group,
                articleNumber,
                Number(isOptional),
                Number(isAlternative),
                specialDiscount ?? "",
                specialPrice ?? ""
            ].join("\0");
            if (!summaries.has(key)) {
                summaries.set(key, {
                    articleNumber,
                    quantity: 0,
                    discountGroup: position.discountGroup,
                    isOptional,
                    isAlternative,
                    ...(specialDiscount !== null ? { specialDiscount } : {}),
                    ...(specialPrice !== null ? { specialPrice } : {})
                });
            }
            summaries.get(key).quantity += quantity;
        }
    }
    return [...summaries.values()];
}

export function buildSalesforceLineItems(pricedPositions) {
    return {
        opportunityLineItems: pricedPositions.map(item => {
            const price = resolveSalesforcePositionPrice(item);
            return {
                PricebookEntryId: item.PricebookEntryId,
                Product2Id: item.Product2Id,
                Quantity: item.Quantity,
                UnitPrice: price.unitPrice,
                BasicDiscount__c: price.discountPercent > 0
                    ? -price.discountPercent
                    : 0,
                Alternative__c: item.isAlternative,
            };
        }),
        quoteLineItems: pricedPositions.map((item, index) => {
            const price = resolveSalesforcePositionPrice(item);
            return {
                PricebookEntryId: item.PricebookEntryId,
                Product2Id: item.Product2Id,
                Quantity: item.Quantity,
                UnitPrice: price.unitPrice,
                SortOrder: index + 1,
                Position__c: index + 1,
                Alternative__c: item.isAlternative,
                Option__c: item.isOptional
            };
        })
    };
}
