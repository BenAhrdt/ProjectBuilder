import test from "node:test";
import assert from "node:assert/strict";
import {
    customerDiscountGroupKeys,
    customerDiscountGroupNumbers,
    normalizeDiscountGroup
} from "../utils/discountGroups.js";

test("supports all price groups from the 2027 model", () => {
    assert.deepEqual(customerDiscountGroupNumbers, [
        1, 3, 4, 5, 6, 7, 8, 13, 14, 15, 16, 17
    ]);
    assert.deepEqual(customerDiscountGroupKeys, [
        "pg1", "pg3", "pg4", "pg5", "pg6", "pg7", "pg8",
        "pg13", "pg14", "pg15", "pg16", "pg17"
    ]);
});

test("normalizes the newly supported price groups", () => {
    assert.equal(normalizeDiscountGroup("PG13"), "PG13");
    assert.equal(normalizeDiscountGroup("15"), "PG15");
    assert.equal(normalizeDiscountGroup("pg 17"), "PG17");
    assert.equal(normalizeDiscountGroup("PG2"), "");
});
