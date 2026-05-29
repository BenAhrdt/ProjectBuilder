import * as i18n from "../utils/i18n.js";

await i18n.loadLanguage("de");

const view =
    document.getElementById(
        "view"
    );

async function renderView(
    projectId
) {

    const response =
        await fetch(
            `/api/projects/${projectId}`
        );

    const project =
        await response.json();

    const customerResponse =
        await fetch(
            "/api/customers"
        );

    const customers =
        await customerResponse.json();

    view.innerHTML = `

        <div class="view-header">

            ${project.name}

        </div>

        <div class="view-left"></div>

        <div
            id="project-content"
            class="view-content"
        >

            <div class="project-card">

                <h2>
                    Projektdaten
                </h2>

               <div class="project-form">

                    <div class="project-form-top">

                        <div class="project-form-row">

                            <label>
                                ${i18n.t("project.projectname")}:
                            </label>

                            <input
                                id="project-name"
                                value="${project.name ?? ""}"
                            >

                        </div>

                        <div class="project-form-row">

                            <label>
                                Kunde:
                            </label>

                                <select id="project-customer">

                                    <option
                                        value=""
                                        ${!project.customerId ? "selected" : ""}
                                    >
                                        Kunde auswählen
                                    </option>

                                    ${customers.map(customer => `
                                        <option
                                            value="${customer.id}"
                                            ${customer.id == project.customerId ? "selected" : ""}
                                        >
                                            ${customer.name}
                                        </option>
                                    `).join("")}

                                </select>

                        </div>

                    </div>

                    <div class="project-description-wrapper">

                        <label>
                            ${i18n.t("project.description")}:
                        </label>

                        <textarea
                            id="project-description"
                        >${project.description ?? ""}</textarea>

                    </div>

                </div>

            </div>

        </div>

        <div class="view-right"></div>

    `;

    generateHandler(projectId);

}

// Autosave
let saveTimeout;

function generateHandler(
    projectId
) {

    const inputs =
        document.querySelectorAll(
            "input, textarea, select"
        );

    inputs.forEach(input => {

        input.addEventListener(
            "input",
            () => {

                clearTimeout(
                    saveTimeout
                );

                saveTimeout =
                    setTimeout(
                        () => saveProject(projectId),
                        500
                    );

            }
        );

    });

}

async function saveProject(
    projectId
) {

    await fetch(

        `/api/projects/${projectId}`,

        {

            method: "PUT",

            headers: {

                "Content-Type":
                    "application/json"

            },

            body: JSON.stringify({

                name:
                    document.getElementById(
                        "project-name"
                    ).value,

                customerId:
                    document.getElementById(
                        "project-customer"
                    ).value || null,

                description:
                    document.getElementById(
                        "project-description"
                    ).value

            })

        }

    );

}

export {
    renderView
};