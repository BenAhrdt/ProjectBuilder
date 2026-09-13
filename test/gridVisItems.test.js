import test from "node:test";
import assert from "node:assert/strict";
import {
    inferGridVisItems,
    normalizeGridVisItems
} from "../utils/gridVisItems.js";

test("GridVis-Items werden für UMG 800 und Strommessmodule abgeleitet", () => {
    assert.equal(inferGridVisItems({ manufacturerType: "UMG 800" }), 0);
    assert.equal(inferGridVisItems({ manufacturerType: "Modul 800-CT8-A (24 V)" }), 1);
    assert.equal(inferGridVisItems({ manufacturerType: "Modul 800-CT8-LP" }), 1);
    assert.equal(inferGridVisItems({ manufacturerType: "Modul 800-CT24" }), 3);
    assert.equal(inferGridVisItems({ manufacturerType: "800-CT12-SVD" }), 1.5);
});

test("sonstige Messgeräte und Module benötigen ein Item", () => {
    assert.equal(inferGridVisItems({ manufacturerType: "UMG 96-PQ-L" }), 1);
    assert.equal(inferGridVisItems({ manufacturerType: "Erweiterungsmodul DI14" }), 1);
});

test("Kommunikationsmodule benötigen kein Item", () => {
    assert.equal(inferGridVisItems({ manufacturerType: "Kommunikationsmodul" }), 0);
    assert.equal(inferGridVisItems({ manufacturerType: "Communication Module" }), 0);
});

test("Netzteile und passive Stromwandler benötigen kein Item", () => {
    assert.equal(inferGridVisItems({ manufacturerType: "Hutschienennetzteil HDR 24V (1TE)" }), 0);
    assert.equal(inferGridVisItems({ manufacturerType: "CT-SC-010-500-5/333mV" }), 0);
});

test("CT24-Zubehör wird nicht als 800-CT24-Modul erkannt", () => {
    assert.equal(inferGridVisItems({
        manufacturerType: "CT24 Erweiterungskabel für Litzenwandler",
        description: "Verlängerungskabel für Stromwandler des Modul 800-CT24"
    }), 0);
    assert.equal(inferGridVisItems({
        manufacturerType: "CT24-SC-010-200-50/333mV, Kl.0.5",
        description: "Stromsensor zum Anschluss am UMG 801 (Modul 800-CT24)"
    }), 0);
    assert.equal(inferGridVisItems({ manufacturerType: "CT24-EXT-050-M-F" }), 0);
});

test("Artikel, die keine Geräte oder Module sind, benötigen kein Item", () => {
    assert.equal(inferGridVisItems({ manufacturerType: "Montagesatz" }), 0);
    assert.equal(inferGridVisItems({ manufacturerType: "GridVis Standard Grundpaket 25" }), 0);
});

test("manuelle Itemwerte akzeptieren Dezimalzahlen und null", () => {
    assert.equal(normalizeGridVisItems("1,5"), 1.5);
    assert.equal(normalizeGridVisItems(""), null);
    assert.ok(Number.isNaN(normalizeGridVisItems(-1)));
});
