import assert from "node:assert/strict";
import test from "node:test";
import {
    buildSalesforceQuoteHeaderFields,
    recommendSalesforceTaxCode
} from "../utils/salesforceQuoteFields.js";

const writableSalesAreaFields = [
    "DistributionChannel__c", "CustomerGroup__c", "PriceList__c", "PaymentTerm__c",
    "Incoterms__c", "IncotermsLocation1__c", "ShippingCondition__c"
];

test("maps German SAP sales-area data and customer addresses to quote fields", () => {
    const fields = buildSalesforceQuoteHeaderFields({
        account: {
            Id: "account-de", BillingStreet: "Wissenbacher Weg 5", BillingCity: "Dillenburg-Frohnhausen",
            BillingStateCode: "HE", BillingPostalCode: "35684", BillingCountryCode: "DE", Language__c: "DE"
        },
        salesArea: {
            DistributionChannel__c: "10", CustomerGroup__c: "04", PriceList__c: "01",
            PaymentTerms__c: "Z005", Incoterms__c: "CPT",
            IncotermsLocation1__c: "Dillenburg-Frohnhausen", ShippingCondition__c: "32", OutputTax__c: "1"
        },
        writableSalesAreaFields
    });
    assert.equal(fields.SoldTo__c, "account-de");
    assert.equal(fields.ShipTo__c, "account-de");
    assert.equal(fields.BillTo__c, "account-de");
    assert.equal(fields.EndUser__c, "account-de");
    assert.equal(fields.AccountId, undefined);
    assert.equal(fields.PaymentTerm__c, "Z005");
    assert.equal(fields.CustomerGroup__c, "04");
    assert.equal(fields.PriceList__c, "01");
    assert.equal(fields.ShippingCountryCode, "DE");
    assert.equal(recommendSalesforceTaxCode({ BillingCountryCode: "DE" }, { OutputTax__c: "1" }), "1");
});

test("maps foreign sales-area data, falls back to billing address and proposes third-country tax", () => {
    const fields = buildSalesforceQuoteHeaderFields({
        account: {
            Id: "account-uy", BillingStreet: "Estivao 1764", BillingCity: "Montevideo",
            BillingPostalCode: "11600", BillingCountryCode: "UY", Language__c: "EN"
        },
        salesArea: {
            DistributionChannel__c: "10", CustomerGroup__c: "07", PriceList__c: "01",
            PaymentTerms__c: "Z005", Incoterms__c: "FCA", IncotermsLocation1__c: "Lahnau"
        },
        writableSalesAreaFields
    });
    assert.equal(fields.PaymentTerm__c, "Z005");
    assert.equal(fields.CustomerGroup__c, "07");
    assert.equal(fields.Incoterms__c, "FCA");
    assert.equal(fields.ShippingStreet, "Estivao 1764");
    assert.equal(fields.ShippingCountryCode, "UY");
    assert.equal(recommendSalesforceTaxCode({ BillingCountryCode: "UY" }, {}), "6");
});

test("does not send sales-area fields that Salesforce marks read-only", () => {
    const fields = buildSalesforceQuoteHeaderFields({
        salesArea: { CustomerGroup__c: "04", PriceList__c: "01" },
        writableSalesAreaFields: ["PriceList__c"]
    });
    assert.equal(fields.PriceList__c, "01");
    assert.equal(fields.CustomerGroup__c, undefined);
});
