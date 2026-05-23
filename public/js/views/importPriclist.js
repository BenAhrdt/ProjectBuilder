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
        <div id="upload-area">
            <div>Preisliste auswählen
            </div>
        </div>
        <input type="file" id="price-list-file" accept=".xlsx,.xls" hidden>
        </div>
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

    const importContent =
        document.getElementById(
            "import-content"
        );

    // --------------------------------------------------
    // Uploadbereich klicken
    // --------------------------------------------------

    uploadArea.addEventListener(
        "click",
        () => {

            input.click();

        }
    );

    // --------------------------------------------------
    // Datei gewählt
    // --------------------------------------------------

    input.addEventListener(
        "change",
        async () => {

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

            importContent.innerHTML = `

                <div class="import-report">

                    <h2>
                        Import abgeschlossen
                    </h2>

                    <p>
                        Importiert:
                        ${result.imported}
                    </p>

                    <p>
                        Aktualisiert:
                        ${result.updated}
                    </p>

                    <p>
                        Übersprungen:
                        ${result.skipped.length}
                    </p>

                </div>

            `;

        }
    );

}

export {
    renderView
}