import test from "node:test";
import assert from "node:assert/strict";
import {
    resolvePricelistColumns,
    mapPricelistRow
} from "../utils/pricelistColumns.js";

test("maps the existing German pricelist columns", () => {
    const row = {
        Artikelnummer: 1401353,
        Herstellertyp: "B21 311-10J",
        Preis_Listenpreis_Preis: 169,
        "Preis_Listenpreis_Währung": "EUR",
        Rabattgruppe: "PG1",
        "Text_Ausschreibungstext_Langtext (Text)": "Langtext"
    };
    const columns = resolvePricelistColumns(Object.keys(row));

    assert.deepEqual(mapPricelistRow(row, columns), {
        articleNumber: "1401353",
        ean: "",
        manufacturerType: "B21 311-10J",
        manufacturerName: "",
        originCountry: "",
        originRegion: "",
        intrastatNumber: "",
        quantity: null,
        quantityUnit: "",
        listPrice: 169,
        listPriceCurrency: "EUR",
        discountGroup: "PG1",
        description: "Langtext"
    });
});

test("maps English pricelist columns and preserves their currency", () => {
    for (const currency of ["EUR", "GBP", "USD", "AUD"]) {
        const row = {
            "Item number": 1401353,
            EAN: "4022931413530",
            Type: "B21 311-10J",
            Manufacturer: "Janitza",
            "Origin country": "DE",
            "Origin region": "HE",
            "Customs code": "90283019",
            Quantity: "1",
            "Content unit": "PCE",
            "List price": 169,
            "List price currency": currency,
            "Price group": "PG1",
            "Text_Tender Text": "Tender text"
        };
        const columns = resolvePricelistColumns(Object.keys(row));
        const article = mapPricelistRow(row, columns);

        assert.equal(article.articleNumber, "1401353");
        assert.equal(article.listPrice, 169);
        assert.equal(article.listPriceCurrency, currency);
        assert.equal(article.description, "Tender text");
    }
});

test("matches column aliases independent of case and separators", () => {
    const row = {
        " ITEM-NUMBER ": " 12345 ",
        "list_price_currency": "USD"
    };
    const columns = resolvePricelistColumns(Object.keys(row));
    const article = mapPricelistRow(row, columns);

    assert.equal(article.articleNumber, "12345");
    assert.equal(article.listPriceCurrency, "USD");
});
