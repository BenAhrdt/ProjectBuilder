import test from "node:test";
import assert from "node:assert/strict";
import { selectReusableSalesforceQuote } from "../utils/salesforceQuoteSelection.js";

const opportunityId = "006-opportunity";
const pricebookId = "01s-pricebook";

function quote(Id, Status = "Draft") {
    return { Id, Status, OpportunityId: opportunityId, Pricebook2Id: pricebookId };
}

test("reuses the synchronized quote when it is a matching draft", () => {
    const synchronizedQuote = quote("synced");
    assert.equal(selectReusableSalesforceQuote({
        synchronizedQuote,
        draftQuotes: [quote("newest")],
        opportunityId,
        pricebookId
    }), synchronizedQuote);
});

test("creates a new quote when the synchronized quote is no longer a draft", () => {
    assert.equal(selectReusableSalesforceQuote({
        synchronizedQuote: quote("synced", "Presented"),
        draftQuotes: [quote("older-draft")],
        opportunityId,
        pricebookId
    }), null);
});

test("uses the newest draft when no quote is synchronized", () => {
    const newest = quote("newest");
    assert.equal(selectReusableSalesforceQuote({
        synchronizedQuote: null,
        draftQuotes: [newest, quote("older")],
        opportunityId,
        pricebookId
    }), newest);
});

test("creates a new quote when no synchronized quote or draft exists", () => {
    assert.equal(selectReusableSalesforceQuote({
        synchronizedQuote: null,
        draftQuotes: [],
        opportunityId,
        pricebookId
    }), null);
});
