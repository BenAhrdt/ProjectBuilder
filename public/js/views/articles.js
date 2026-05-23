import * as i18n from "../utils/i18n.js";

await i18n.loadLanguage("de");

const view = document.getElementById("view");

async function renderView() {

    // --------------------------------------------------
    // Artikel laden
    // --------------------------------------------------

    const response =
        await fetch("/api/articles");

    const articles =
        await response.json();

    // --------------------------------------------------
    // Rendern
    // --------------------------------------------------

    view.innerHTML = `

        <div id="articles-header" class="view-header">
            <span class="header-text">
                ${i18n.t("articles.articles")}
            </span>
            <div class="header-search">
                <div class="searchBox">
                    <input id="articles-search" type="text" placeholder="${i18n.t("articles.search")}...">
                </div>
            </div>
        </div>

        <div id="articles-left" class="view-left"></div>

        <div id="articles-content" class="view-content">

            <table class="articles-table">

                <thead>

                    <tr>

                        <th>
                            Artikelnummer
                        </th>

                        <th>
                            Name
                        </th>

                        <th>
                            Beschreibung
                        </th>

                        <th>
                            Rabattgruppe
                        </th>

                        <th>
                            Preis
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${articles.map(article => `

                        <tr>

                            <td>
                                ${article.articleNumber ?? ""}
                            </td>

                            <td>
                                ${article.manufacturerType ?? ""}
                            </td>

                            <td>
                                ${article.description ?? ""}
                            </td>

                            <td>
                                ${article.discountGroup ?? ""}
                            </td>

                            <td>
                                ${article.listPrice ?? ""} ${article.listPriceCurrency ?? ""}
                            </td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

        <div id="articles-right" class="view-right"></div>

    `;

    generateHandler();
}

function generateHandler() {

    const searchInput =
        document.getElementById(
            "articles-search"
        );

    searchInput.addEventListener(
        "input",
        async () => {

            const value =
                searchInput.value;

            const response =
                await fetch(

                    `/api/articles?search=${value}`

                );

            const articles =
                await response.json();

            renderArticles(articles);

        }
    );

}

function renderArticles(articles) {

    const tbody =
        document.querySelector(
            ".articles-table tbody"
        );

    tbody.innerHTML =
        articles.map(article => `

            <tr>

                <td>
                    ${article.articleNumber ?? ""}
                </td>

                <td>
                    ${article.manufacturerType ?? ""}
                </td>

                <td>
                    ${article.description ?? ""}
                </td>

                <td>
                    ${article.discountGroup ?? ""}
                </td>

                <td>
                    ${article.listPrice ?? ""} ${article.listPriceCurrency ?? ""}
                </td>

            </tr>

        `).join("");

}

export {
    renderView
};