import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const languages = ["de", "en", "es"];
const i18nDirectory = path.join(process.cwd(), "public", "i18n");

function readTranslations(language) {
    return JSON.parse(fs.readFileSync(path.join(i18nDirectory, `${language}.json`), "utf8"));
}

test("all languages contain the same translation keys", () => {
    const dictionaries = Object.fromEntries(
        languages.map(language => [language, readTranslations(language)])
    );
    const referenceKeys = Object.keys(dictionaries.de).sort();

    for (const language of languages) {
        assert.deepEqual(
            Object.keys(dictionaries[language]).sort(),
            referenceKeys,
            `${language}.json differs from the German reference keys`
        );
    }
});
