/**
 * Price-group discount fields do not exist in Salesforce yet. Historical
 * opportunity and quote line items are intentionally ignored until those
 * fields are available. The returned map must contain only actual Salesforce
 * values so a customer refresh cannot clear an existing local discount.
 */
export function mapCustomerPricingGroupDiscounts() {
    return new Map();
}
