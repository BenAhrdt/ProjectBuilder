export function mapCustomerPricingGroupDiscounts(lineItems, pricingGroupsByProduct) {
    const discountsByAccount = new Map();
    for (const line of lineItems) {
        const accountId = String(line?.Opportunity?.AccountId ?? "").trim();
        const productId = String(line?.Product2Id ?? "").trim();
        const groupMatch = String(pricingGroupsByProduct.get(productId) ?? "").match(/\d+/);
        const group = groupMatch ? Number(groupMatch[0]) : NaN;
        const discount = getLineDiscountPercent(line);
        if (!accountId || !Number.isInteger(group) || group < 1 || group > 8) continue;
        if (!Number.isFinite(discount) || discount <= 0) continue;

        const key = `pg${group}`;
        if (!discountsByAccount.has(accountId)) discountsByAccount.set(accountId, {});
        const discounts = discountsByAccount.get(accountId);
        // The Salesforce query is newest-first. Keep the most recent usable SAP result.
        if (!(key in discounts)) discounts[key] = discount;
    }
    return discountsByAccount;
}

function getLineDiscountPercent(line) {
    const explicitDiscount = Number(line?.BasicDiscount__c);
    if (line?.BasicDiscount__c !== null && line?.BasicDiscount__c !== undefined
        && Number.isFinite(explicitDiscount)) {
        return Math.min(Math.abs(explicitDiscount), 100);
    }

    const listPrice = Number(line?.ListPrice);
    const unitPrice = Number(line?.UnitPrice);
    if (!Number.isFinite(listPrice) || listPrice <= 0
        || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice >= listPrice) {
        return 0;
    }
    return Math.min(Math.round((1 - unitPrice / listPrice) * 10000) / 100, 100);
}
