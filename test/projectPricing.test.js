import assert from "node:assert/strict";
import test from "node:test";

import {
    calculateStructureUnitPrice
} from "../public/js/views/projectPricing.js";

test(
    "keeps the list price in list mode",
    () => {
        assert.equal(
            calculateStructureUnitPrice({
                listPrice: 100,
                customerDiscountPercent: 20,
                projectDiscountPercent: 10,
                priceMode: "list"
            }),
            100
        );
    }
);

test(
    "applies customer and project discounts in discounted mode",
    () => {
        assert.equal(
            calculateStructureUnitPrice({
                listPrice: 100,
                customerDiscountPercent: 20,
                projectDiscountPercent: 10,
                priceMode: "discounted"
            }),
            72
        );
    }
);
