export function recommendSalesforceTaxCode(account = {}, salesArea = {}) {
    if (account.BillingCountryCode && account.BillingCountryCode !== "DE") return "6";
    return salesArea.OutputTax__c || "1";
}

export function buildSalesforceQuoteHeaderFields({
    account = {},
    salesArea = {},
    writableSalesAreaFields = []
} = {}) {
    const accountId = account.Id;
    const fields = accountId ? {
        SoldTo__c: accountId,
        ShipTo__c: accountId,
        BillTo__c: accountId,
        EndUser__c: accountId
    } : {};
    const salesAreaMapping = {
        DistributionChannel__c: salesArea.DistributionChannel__c,
        CustomerGroup__c: salesArea.CustomerGroup__c,
        PriceList__c: salesArea.PriceList__c,
        PaymentTerm__c: salesArea.PaymentTerms__c,
        Incoterms__c: salesArea.Incoterms__c,
        IncotermsLocation1__c: salesArea.IncotermsLocation1__c,
        ShippingCondition__c: salesArea.ShippingCondition__c
    };
    const writableFields = new Set(writableSalesAreaFields);
    for (const [field, value] of Object.entries(salesAreaMapping)) {
        if (value && writableFields.has(field)) fields[field] = value;
    }
    const addressMapping = {
        BillingStreet: account.BillingStreet,
        BillingCity: account.BillingCity,
        BillingStateCode: account.BillingStateCode,
        BillingPostalCode: account.BillingPostalCode,
        BillingCountryCode: account.BillingCountryCode,
        ShippingStreet: account.ShippingStreet || account.BillingStreet,
        ShippingCity: account.ShippingCity || account.BillingCity,
        ShippingStateCode: account.ShippingStateCode || account.BillingStateCode,
        ShippingPostalCode: account.ShippingPostalCode || account.BillingPostalCode,
        ShippingCountryCode: account.ShippingCountryCode || account.BillingCountryCode
    };
    for (const [field, value] of Object.entries(addressMapping)) {
        if (value) fields[field] = value;
    }
    if (account.Language__c) fields.Language__c = account.Language__c;
    return fields;
}
