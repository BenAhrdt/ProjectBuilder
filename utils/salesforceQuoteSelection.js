export function selectReusableSalesforceQuote({
    synchronizedQuote,
    draftQuotes,
    opportunityId,
    pricebookId
}) {
    if (synchronizedQuote) {
        const isReusable = synchronizedQuote.Status === "Draft"
            && synchronizedQuote.OpportunityId === opportunityId
            && synchronizedQuote.Pricebook2Id === pricebookId;
        return isReusable ? synchronizedQuote : null;
    }
    return draftQuotes[0] ?? null;
}
