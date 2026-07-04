import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

import * as router from "../router.js";
import {
    showAlert,
    showConfirm
} from "../utils/modal.js";

const view =
    document.getElementById("view");

async function renderView() {

    // --------------------------------------------------
    // Kunden laden
    // --------------------------------------------------

    const customerResponse =
        await fetch(
            "/api/customers"
        );

    const customers =
        await customerResponse.json();

    // --------------------------------------------------
    // Projekte laden
    // --------------------------------------------------

    const response =
        await fetch("/api/projects");

    const projects =
        await response.json();

    // --------------------------------------------------
    // Rendern
    // --------------------------------------------------

    view.innerHTML = `

        <div id="projects-header" class="view-header">

            <span class="header-text">

                ${i18n.t("projects.projects")}

            </span>

            <div class="header-search">

                <div class="searchBox">

                    <input
                        id="projects-search"
                        type="text"
                        placeholder="${i18n.t("projects.search")}..."
                    >

                </div>

            </div>

            <div
                id="projects-meta-infomrations"
                class="meta-informations"
            >

                ${i18n.t("projects.projectCount")}:
                ${projects.length}

            </div>

            <button id="add-project-button">

                + ${i18n.t("projects.addProject")}

            </button>

            <button id="import-project-button">

                ${i18n.t("projects.importProject")}

            </button>

            <input
                id="import-project-file"
                type="file"
                accept=".xlsx,.xls"
                hidden
            >

        </div>

        <div id="projects-left" class="view-left"></div>

        <div id="projects-content" class="view-content">

            <div id="project-form-container" class="hidden">

                <div class="project-form">

                    <input
                        id="project-name"
                        type="text"
                        placeholder="Projektname"
                    >

                    <div class="project-select-wrapper">
                        <select
                            id="project-customer"
                        >

                            <option value="">
                                ${i18n.t("projects.selectCustomer")}
                            </option>

                            ${customers.map(customer => `

                                <option
                                    value="${customer.id}"
                                >

                                    ${customer.name}

                                </option>

                            `).join("")}

                        </select>
                    </div>
                    <textarea
                        id="project-description"
                        placeholder="Beschreibung"
                    ></textarea>

                    <button id="save-project-button">

                        Speichern

                    </button>

                </div>

            </div>

            <table class="projects-table">

                <thead>

                    <tr>

                        <th>
                            ${i18n.t("projects.projectname")}
                        </th>

                        <th>
                            ${i18n.t("projects.customer")}
                        </th>

                        <th>
                            ${i18n.t("projects.description")}
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${projects.map(project => `

                        <tr
                            class="project-row"
                            data-id="${project.id}"
                        >

                            <td>
                                ${project.name ?? ""}
                            </td>

                            <td>
                                ${project.customerName ?? ""}
                            </td>

                            <td>
                                ${project.description ?? ""}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

        <div id="projects-right" class="view-right"></div>

    `;

    generateHandler();

}

// --------------------------------------------------
// Suche
// --------------------------------------------------

function generateHandler() {

    const searchInput =
        document.getElementById(
            "projects-search"
        );

    searchInput.addEventListener(
        "input",
        async () => {

            const value =
                searchInput.value;

            const response =
                await fetch(
                    `/api/projects?search=${value}`
                );

            const projects =
                await response.json();

            renderProjects(projects);

        }
    );

    // --------------------------------------------------
    // Projekt hinzufügen
    // --------------------------------------------------

    const addProjectButton =
        document.getElementById(
            "add-project-button"
        );

    const formContainer =
        document.getElementById(
            "project-form-container"
        );

    addProjectButton.addEventListener(
        "click",
        () => {

            formContainer.classList.toggle(
                "hidden"
            );

        }
    );

    // --------------------------------------------------
    // Speichern
    // --------------------------------------------------

    const saveProjectButton =
        document.getElementById(
            "save-project-button"
        );

    saveProjectButton.addEventListener(
        "click",
        async () => {

            const name =
                document.getElementById(
                    "project-name"
                ).value;

            const description =
                document.getElementById(
                    "project-description"
                ).value;

            const customerId =
                document.getElementById(
                    "project-customer"
                ).value;

            await fetch(
                "/api/projects",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        customerId,

                        name,

                        description

                    })

                }
            );

            renderView();

        }
    );

    // --------------------------------------------------
    // Projekt importieren
    // --------------------------------------------------

    const importProjectButton =
        document.getElementById(
            "import-project-button"
        );

    const importProjectFile =
        document.getElementById(
            "import-project-file"
        );

    importProjectButton.addEventListener(
        "click",
        () => {

            importProjectFile.value =
                "";

            importProjectFile.click();

        }
    );

    importProjectFile.addEventListener(
        "change",
        async () => {

            const file =
                importProjectFile.files?.[0];

            if (!file) {

                return;

            }

            await importProjectFromFile(
                file
            );

        }
    );

    attachProjectRowHandlers();

}

function attachProjectRowHandlers() {

    document
        .querySelectorAll(
            ".project-row"
        )
        .forEach(row => {

            row.addEventListener(
                "click",
                () => {

                    const projectId =
                        row.dataset.id;

                    router.navigate(
                        `/project/${projectId}`
                    );

                }
            );

        });

}

async function importProjectFromFile(
    file
) {

    const previewForm =
        new FormData();

    previewForm.append(
        "file",
        file
    );

    const previewResponse =
        await fetch(
            "/api/projects/import/preview",
            {
                method: "POST",
                body:
                    previewForm
            }
        );

    const preview =
        await previewResponse.json();

    if (
        !previewResponse.ok
        ||
        !preview.ok
    ) {

        await showAlert(
            preview.error
            ||
            i18n.t("projects.importFailed")
        );

        return;

    }

    if (preview.missingArticleNumbers.length > 0) {

        await showAlert(
            `${i18n.t("projects.importMissingArticles")}:\n${preview.missingArticleNumbers.join(", ")}`
        );

        return;

    }

    const confirmed =
        await showConfirm(
            [
                i18n.t("projects.importPreview"),
                "",
                `${i18n.t("projects.projectname")}: ${preview.projectName}`,
                `${i18n.t("projects.importNodeCount")}: ${preview.nodeCount}`,
                `${i18n.t("projects.importPositionCount")}: ${preview.positionCount}`,
                "",
                i18n.t("projects.importConfirm")
            ].join("\n"),
            {
                title: i18n.t("projects.importPreview"),
                confirmText: "Importieren"
            }
        );

    if (!confirmed) {

        return;

    }

    const importForm =
        new FormData();

    importForm.append(
        "file",
        file
    );

    const importResponse =
        await fetch(
            "/api/projects/import",
            {
                method: "POST",
                body:
                    importForm
            }
        );

    const result =
        await importResponse.json();

    if (
        !importResponse.ok
        ||
        !result.ok
    ) {

        await showAlert(
            result.error
            ||
            i18n.t("projects.importFailed")
        );

        return;

    }

    router.navigate(
        `/project/${result.project.id}`
    );

}

// --------------------------------------------------
// Tabelle rendern
// --------------------------------------------------

function renderProjects(projects) {

    const tbody =
        document.querySelector(
            ".projects-table tbody"
        );

    tbody.innerHTML =
        projects.map(project => `

            <tr
                class="project-row"
                data-id="${project.id}"
            >

                <td>
                    ${project.name ?? ""}
                </td>

                <td>
                    ${project.customerName ?? ""}
                </td>

                <td>
                    ${project.description ?? ""}
                </td>

            </tr>

        `).join("");

    attachProjectRowHandlers();

}

export {
    renderView
};
