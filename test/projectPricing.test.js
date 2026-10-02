import assert from "node:assert/strict";
import test from "node:test";

import {
    calculateProjectPositionPricing,
    calculateStructureUnitPrice
} from "../public/js/views/projectPricing.js";

test(
    "includes a special price in the position discount and excludes it from the project discount",
    () => {
        const pricing = calculateProjectPositionPricing({
            listPrice: 1374,
            quantity: 1,
            customerDiscountPercent: 0,
            projectDiscountPercent: 10,
            specialPrice: 999
        });

        assert.equal(pricing.discountTotal, 375);
        assert.equal(pricing.projectDiscountableTotal, 0);
        assert.equal(pricing.projectDiscount, 0);
        assert.equal(pricing.projectDiscountedTotal, 999);
    }
);

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

test(
    "uses a special price as the resulting discounted unit price",
    () => {
        assert.equal(
            calculateStructureUnitPrice({
                listPrice: 1374.5,
                customerDiscountPercent: 27.3,
                projectDiscountPercent: 5,
                specialPrice: 999,
                priceMode: "discounted"
            }),
            999
        );
    }
);
