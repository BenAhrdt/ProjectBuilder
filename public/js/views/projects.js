import * as i18n from "../utils/i18n.js";
await i18n.loadLanguage("de");

import * as router from "../router.js";

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
    // Projekt öffnen
    // --------------------------------------------------

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
                    ${project.description ?? ""}
                </td>

            </tr>

        `).join("");

}

export {
    renderView
};