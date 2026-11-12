import test from "node:test";
import assert from "node:assert/strict";
import {
    getCommissioningType
} from "../public/js/utils/commissioningTypes.js";

test("assigns the configured commissioning types to device families", () => {

    assert.equal(
        getCommissioningType({ manufacturerType: "UMG 800" }),
        1
    );
    assert.equal(
        getCommissioningType({
            manufacturerType: "UMG 800",
            description: "Modular erweiterbarer Energieanalysator UMG 800"
        }),
        1
    );
    assert.equal(
        getCommissioningType({ manufacturerType: "UMG 96RM-P" }),
        2
    );
    assert.equal(
        getCommissioningType({ manufacturerType: "UMG20CM" }),
        3
    );
    assert.equal(
        getCommissioningType({
            manufacturerType: "Modul 800-CT8-A",
            description: "für UMG 800"
        }),
        2
    );
    assert.equal(
        getCommissioningType({ manufacturerType: "Modul 800-MF8 (CE)" }),
        2
    );
    assert.equal(
        getCommissioningType({ manufacturerType: "Modul 96-RCM-E" }),
        2
    );
    assert.equal(
        getCommissioningType({
            manufacturerType: "Modul 800-CON-RJ45 Standard"
        }),
        null
    );
    assert.equal(
        getCommissioningType({ manufacturerType: "ProData 2" }),
        4
    );
    assert.equal(
        getCommissioningType({
            articleNumber: "1401356",
            manufacturerType: "B23 Energiezähler"
        }),
        5
    );

});

test("recognizes commissioning families in descriptions and leaves other articles unassigned", () => {

    assert.equal(
        getCommissioningType({
            name: "Modul 800-CT8-LP",
            description: "für UMG 96RM"
        }),
        2
    );
    assert.equal(
        getCommissioningType({
            name: "Hutschienennetzteil HDR 24V"
        }),
        null
    );

});

