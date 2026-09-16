import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage();

import * as router from "../router.js";
import {
    showAlert,
    showConfirm,
    showChoice,
    showPrompt
} from "../utils/modal.js";
import { withSalesforceConnectionRetry } from "../utils/salesforceConnection.js";

const view =
    document.getElementById("view");
let displayedProjects = [];
let projectSort = { key: null, direction: "asc" };

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[character]);
}

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

    displayedProjects = projects;

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
                accept=".projectbuilder.json,.json,application/json"
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
                        placeholder="${i18n.t("projects.projectname")}"
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
                        placeholder="${i18n.t("projects.description")}"
                    ></textarea>

                    <button id="save-project-button">

                        ${i18n.t("common.save")}

                    </button>

                </div>

            </div>

            <table class="projects-table">

                <thead>

                    <tr>

                        <th data-sort-key="name" aria-sort="none">
                            <button class="project-sort-button" type="button" data-sort-key="name">
                                ${i18n.t("projects.projectname")}
                                <span class="project-sort-indicator" aria-hidden="true">↕</span>
                            </button>
                        </th>

                        <th data-sort-key="customerName" aria-sort="none">
                            <button class="project-sort-button" type="button" data-sort-key="customerName">
                                ${i18n.t("projects.customer")}
                                <span class="project-sort-indicator" aria-hidden="true">↕</span>
                            </button>
                        </th>

                        <th>
                            ${i18n.t("projects.description")}
                        </th>

                        <th class="table-actions-heading">${i18n.t("common.actions")}</th>

                    </tr>

                </thead>

                <tbody>

                    ${renderProjectRows(sortProjects(projects))}

                </tbody>

            </table>

        </div>

        <div id="projects-right" class="view-right"></div>

    `;

    generateHandler();
    updateProjectSortHeaders();

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

            displayedProjects = projects;
            renderProjects(projects);

        }
    );

    document.querySelectorAll(".project-sort-button").forEach(button => {
        button.addEventListener("click", () => {
            const key = button.dataset.sortKey;
            projectSort = {
                key,
                direction: projectSort.key === key && projectSort.direction === "asc"
                    ? "desc"
                    : "asc"
            };
            renderProjects(displayedProjects);
        });
    });

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
        async () => {

            const source = await showChoice(i18n.t("projects.importSourcePrompt"), {
                title: i18n.t("projects.importProject"),
                choices: [
                    { value: "file", label: i18n.t("projects.importFromFile") },
                    { value: "salesforce", label: i18n.t("projects.importFromSalesforce") }
                ]
            });

            if (source === "salesforce") {
                await importProjectFromSalesforce();
                return;
            }
            if (source !== "file") return;

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

    document.querySelectorAll(".duplicate-project").forEach(button => {
        button.addEventListener("click", async event => {
            event.stopPropagation();
            button.disabled = true;
            try {
                const response = await fetch(`/api/projects/${button.dataset.id}/duplicate`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ copySuffix: i18n.t("common.copySuffix") })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || i18n.t("projects.duplicateFailed"));
                await renderView();
            } catch (error) {
                await showAlert(error.message || i18n.t("projects.duplicateFailed"));
                button.disabled = false;
            }
        });
    });

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

            row.addEventListener(
                "keydown",
                event => {
                    if (event.target.closest("button")) return;
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.navigate(`/project/${row.dataset.id}`);
                    }
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
                confirmText: i18n.t("common.import")
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

    tbody.innerHTML = renderProjectRows(sortProjects(projects));

    updateProjectSortHeaders();

    attachProjectRowHandlers();

}

async function importProjectFromSalesforce() {
    const search = await showPrompt(i18n.t("projects.salesforceOpportunitySearchHint"), {
        title: i18n.t("projects.importFromSalesforce"),
        confirmText: i18n.t("projects.search"),
        placeholder: i18n.t("projects.salesforceOpportunitySearchPlaceholder")
    });
    if (!search) return;
    try {
        const result = await fetchSalesforceJson(
            `/api/projects/import/salesforce/opportunities?search=${encodeURIComponent(search)}`
        );
        const available = result.opportunities.filter(item => item.hasProjectFile);
        if (!available.length) return showAlert(i18n.t("projects.noSalesforceProjectFiles"));
        const opportunityId = await showChoice(i18n.t("projects.selectSalesforceOpportunity"), {
            title: i18n.t("projects.importFromSalesforce"),
            choiceLayout: "list",
            choices: available.map(item => ({
                value: item.id,
                label: `${item.name} · ${item.accountName}${item.customerNumber ? ` (${item.customerNumber})` : ""}`
            }))
        });
        if (!opportunityId) return;
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opportunityId })
        };
        const preview = await fetchSalesforceJson("/api/projects/import/salesforce/preview", requestOptions);
        if (preview.missingArticleNumbers.length) {
            return showAlert(`${i18n.t("projects.importMissingArticles")}:\n${preview.missingArticleNumbers.join(", ")}`);
        }
        const confirmed = await confirmProjectImport(preview);
        if (!confirmed) return;
        const imported = await fetchSalesforceJson("/api/projects/import/salesforce", requestOptions);
        router.navigate(`/project/${imported.project.id}`);
    } catch (error) {
        await showAlert(error.message || i18n.t("projects.importFailed"));
    }
}

function fetchSalesforceJson(url, options) {
    return withSalesforceConnectionRetry(async () => {
        const response = await fetch(url, options);
        const result = await response.json();
        if (!response.ok || result?.ok === false) {
            throw new Error(result?.error || i18n.t("projects.importFailed"));
        }
        return result;
    });
}

function confirmProjectImport(preview) {
    return showConfirm([
        i18n.t("projects.importPreview"), "",
        `${i18n.t("projects.projectname")}: ${preview.projectName}`,
        `${i18n.t("projects.importNodeCount")}: ${preview.nodeCount}`,
        `${i18n.t("projects.importPositionCount")}: ${preview.positionCount}`, "",
        i18n.t("projects.importConfirm")
    ].join("\n"), {
        title: i18n.t("projects.importPreview"), confirmText: i18n.t("common.import")
    });
}

function renderProjectRows(projects) {
    return projects.map(project => `

            <tr
                class="project-row"
                data-id="${project.id}"
                tabindex="0"
                role="link"
            >

                <td>
                    ${escapeHtml(project.name)}
                </td>

                <td>
                    ${escapeHtml(project.customerName)}
                </td>

                <td>
                    ${escapeHtml(project.description)}
                </td>

                <td class="table-actions"><button type="button" class="duplicate-project" data-id="${project.id}">${i18n.t("common.duplicate")}</button></td>

            </tr>

        `).join("");
}

function sortProjects(projects) {
    if (!projectSort.key) return [...projects];
    const factor = projectSort.direction === "asc" ? 1 : -1;
    return [...projects].sort((first, second) => {
        const comparison = String(first[projectSort.key] ?? "").localeCompare(
            String(second[projectSort.key] ?? ""),
            i18n.getCurrentLanguage(),
            { sensitivity: "base", numeric: true }
        );
        return comparison * factor || Number(first.id) - Number(second.id);
    });
}

function updateProjectSortHeaders() {
    document.querySelectorAll(".project-sort-button").forEach(button => {
        const active = button.dataset.sortKey === projectSort.key;
        const direction = active ? projectSort.direction : null;
        const heading = button.closest("th");
        heading.setAttribute("aria-sort", direction === "asc"
            ? "ascending"
            : direction === "desc" ? "descending" : "none");
        button.querySelector(".project-sort-indicator").textContent = direction === "asc"
            ? "▲"
            : direction === "desc" ? "▼" : "↕";
        button.title = direction === "asc"
            ? i18n.t("projects.sortDescending")
            : i18n.t("projects.sortAscending");
    });
}

export {
    renderView
};
