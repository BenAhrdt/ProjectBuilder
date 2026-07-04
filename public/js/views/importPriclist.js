import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

const view = document.getElementById('view');

function renderView() {
    view.innerHTML = `
        <div id="import.header" class="view-header">
            ${i18n.t("importPricelist.importPricelist")}
        </div>
        <div id="import-left" class="view-left"></div>
        <div id="import-content" class="view-content">
            <div id="importPriclistDescription">${i18n.t("importPricelist.decription")}</div>
        <div id="upload-wrapper">
            <div id="upload-area">
                <div>
                    Preisliste auswählen
                </div>
            </div>
        </div>
        <label id="preserve-price-option">
            <input
                id="preserve-existing-prices-from-zero"
                type="checkbox"
                checked
            >
            0 € / Auf Anfrage überschreibt keine vorhandenen Preise
        </label>
        <label id="clear-articles-option">
            <input
                id="clear-existing-articles-before-import"
                type="checkbox"
            >
            Vorhandene Artikel vor dem Import löschen
        </label>
        <div id="import-status-header">Status:</div>
        <div id="import-status">Bereit</div>
        <input type="file" id="price-list-file" accept=".xlsx,.xls" hidden>
        <div id="import-right" class="view-right"/></div>
    `;

    generateHandler();
}


function generateHandler() {

    const uploadArea =
        document.getElementById(
            "upload-area"
        );

    const input =
        document.getElementById(
            "price-list-file"
        );

    const importStatus =
        document.getElementById(
            "import-status"
        );

    const preserveExistingPricesFromZero =
        document.getElementById(
            "preserve-existing-prices-from-zero"
        );

    const clearExistingArticlesBeforeImport =
        document.getElementById(
            "clear-existing-articles-before-import"
        );

    // --------------------------------------------------
    // Uploadbereich klicken
    // --------------------------------------------------

    uploadArea.addEventListener(
        "click",
        () => {
            console.log("Klick kommt");
            input.click();

        }
    );

    // --------------------------------------------------
    // Datei gewählt
    // --------------------------------------------------

    input.addEventListener(
        "change",
        async () => {
            console.log("Change kommt");
            importStatus.innerHTML = `Import läuft ...`
            const file =
                input.files[0];

            if (!file) {
                return;
            }

            // --------------------------------------------------
            // FormData
            // --------------------------------------------------

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            formData.append(
                "preserveExistingPricesFromZero",
                preserveExistingPricesFromZero.checked
                    ? "true"
                    : "false"
            );

            formData.append(
                "clearExistingArticlesBeforeImport",
                clearExistingArticlesBeforeImport.checked
                    ? "true"
                    : "false"
            );

            // --------------------------------------------------
            // Upload
            // --------------------------------------------------

            const response =
                await fetch(

                    "/api/articles/import",

                    {
                        method: "POST",
                        body: formData
                    }

                );

            const result =
                await response.json();

            // --------------------------------------------------
            // Report anzeigen
            // --------------------------------------------------

            
            importStatus.innerHTML = `
                    <div class="import-report">
                        <h2>
                            Import abgeschlossen
                        </h2>`;

            if (result.imported !== 0) {
                importStatus.innerHTML += `
                            <p>
                                Importiert:
                                ${result.imported}
                            </p>`;
            }

            if ((result.deletedExistingArticles ?? 0) !== 0) {
                importStatus.innerHTML += `
                            <p>
                                Vorher gelöscht:
                                ${result.deletedExistingArticles}
                            </p>`;
            }

            if (result.updated !== 0) {
                importStatus.innerHTML += `
                            <p>
                                Aktualisiert:
                                ${result.updated}
                             </p>`;
            }

            if ((result.preservedPrices ?? 0) !== 0) {
                importStatus.innerHTML += `
                            <p>
                                Preise beibehalten:
                                ${result.preservedPrices}
                            </p>`;
            }

            if (result.skipped.length !== 0) {
                importStatus.innerHTML += `
                            <p>
                                Übersprungen:
                                ${result.skipped.length}
                            </p>`;
            }
            importStatus.innerHTML += `
            </div>
            `;
            input.value = "";
        }
    );
}

export {
    renderView
}
