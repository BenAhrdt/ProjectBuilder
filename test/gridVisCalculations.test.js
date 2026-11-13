import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateLicenseExpansion,
    calculateMismatchedRenewal,
    calculateReactivation
} from "../public/js/utils/gridVisCalculations.js";

test("berechnet die Erweiterung einer bestehenden Lizenz", () => {
    assert.deepEqual(
        calculateLicenseExpansion({
            existingItems: 1500,
            existingAzrDays: 0,
            expansionItems: 500,
            expansionAzrDays: 365
        }),
        { totalItems: 2000, azrDays: 91.25 }
    );
});

test("berechnet die Verlängerung mit abweichender Item-Anzahl", () => {
    assert.deepEqual(
        calculateMismatchedRenewal({
            existingItems: 2000,
            existingAzrDays: 0,
            renewalItems: 2500,
            renewalYears: 1
        }),
        { renewalDays: 365, azrDays: 456.25 }
    );
});

test("berechnet die Reaktivierung geparkter Items", () => {
    assert.deepEqual(
        calculateReactivation({
            activeItems: 50,
            activeAzrDays: 200,
            parkedGroups: [
                { items: 50, azrDays: 365 },
                { items: 0, azrDays: 0 }
            ]
        }),
        { totalItems: 100, azrDays: 282.5 }
    );
});

test("weist unplausible Nenner zurück", () => {
    assert.throws(
        () => calculateMismatchedRenewal({
            existingItems: 0,
            existingAzrDays: 0,
            renewalItems: 250,
            renewalYears: 1
        }),
        /größer als 0/
    );
});
