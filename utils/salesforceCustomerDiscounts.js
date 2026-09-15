export function mapCustomerPricingGroupDiscounts(lineItems, pricingGroupsByProduct) {
    const discountsByAccount = new Map();
    for (const line of lineItems) {
        const accountId = String(line?.Opportunity?.AccountId ?? "").trim();
        const productId = String(line?.Product2Id ?? "").trim();
        const group = Number(pricingGroupsByProduct.get(productId));
        const rawDiscount = Number(line?.BasicDiscount__c);
        if (!accountId || !Number.isInteger(group) || group < 1 || group > 8) continue;
        if (!Number.isFinite(rawDiscount) || rawDiscount === 0) continue;

        const key = `pg${group}`;
        if (!discountsByAccount.has(accountId)) discountsByAccount.set(accountId, {});
        const discounts = discountsByAccount.get(accountId);
        // The Salesforce query is newest-first. Keep the most recent usable SAP result.
        if (!(key in discounts)) discounts[key] = Math.min(Math.abs(rawDiscount), 100);
    }
    return discountsByAccount;
}
