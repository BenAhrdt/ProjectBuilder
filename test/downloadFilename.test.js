import test from "node:test";
import assert from "node:assert/strict";
import { buildContentDisposition } from "../utils/downloadFilename.js";

test("encodes Unicode download filenames without corrupting umlauts", () => {
    const header = buildContentDisposition("HSD - Erweiterung für Messtechnik.xlsx");

    assert.equal(
        header,
        "attachment; filename=\"HSD - Erweiterung fur Messtechnik.xlsx\"; filename*=UTF-8''HSD%20-%20Erweiterung%20f%C3%BCr%20Messtechnik.xlsx"
    );
});

test("keeps inline disposition and removes unsafe filename characters", () => {
    const header = buildContentDisposition("Bericht/2026\n.pdf", "inline");

    assert.equal(header, "inline; filename=\"Bericht_2026_.pdf\"; filename*=UTF-8''Bericht_2026_.pdf");
});
