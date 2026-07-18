import * as i18n from "../utils/i18n.js";
import {
    showAlert,
    showConfirm,
    showPrompt
} from "../utils/modal.js";

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
            <div id="articles-meta-infomrations" class="meta-informations">
                ${i18n.t("articles.articleCount")}: ${articles.length} 
            </div>
            <button id="add-article-button">
                + Artikel hinzufügen
            </button>
        </div>

        <div id="articles-left" class="view-left"></div>

        <div id="articles-content" class="view-content">

            <div id="article-form-container" class="hidden">

                <div class="article-form">

                    <input
                        id="manual-article-number"
                        type="text"
                        placeholder="Artikelnummer"
                    >

                    <input
                        id="manual-article-name"
                        type="text"
                        placeholder="Name"
                    >

                    <input
                        id="manual-article-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Preis"
                    >

                    <input
                        id="manual-article-discount-group"
                        type="text"
                        placeholder="Rabattgruppe"
                    >

                    <textarea
                        id="manual-article-description"
                        aria-label="Ausschreibungstext / Langtext"
                        placeholder="Ausschreibungstext / Langtext (wird in Word und GAEB übernommen)"
                    ></textarea>

                    <button id="save-manual-article-button">
                        Speichern
                    </button>

                    <button
                        id="cancel-manual-article-button"
                        type="button"
                    >
                        Abbrechen
                    </button>

                </div>

            </div>

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
                            Ausschreibungstext / Langtext
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
                                ${renderArticleNumber(article)}
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
                                ${renderArticlePrice(article)}
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

                    `/api/articles?search=${encodeURIComponent(value)}`

                );

            const articles =
                await response.json();

            renderArticles(articles);

        }
    );

    const addArticleButton =
        document.getElementById(
            "add-article-button"
        );

    const articleFormContainer =
        document.getElementById(
            "article-form-container"
        );

    addArticleButton.addEventListener(
        "click",
        () => {

            articleFormContainer.classList.toggle(
                "hidden"
            );

        }
    );

    const saveManualArticleButton =
        document.getElementById(
            "save-manual-article-button"
        );

    saveManualArticleButton.addEventListener(
        "click",
        saveManualArticle
    );

    const cancelManualArticleButton =
        document.getElementById(
            "cancel-manual-article-button"
        );

    cancelManualArticleButton.addEventListener(
        "click",
        closeManualArticleForm
    );

    attachArticlePriceHandlers();
    attachArticleDeleteHandlers();

}

async function loadArticlesForCurrentSearch() {

    const searchInput =
        document.getElementById(
            "articles-search"
        );

    const search =
        searchInput?.value ?? "";

    const response =
        await fetch(
            `/api/articles?search=${encodeURIComponent(search)}`
        );

    return await response.json();

}

async function refreshArticles() {

    const articles =
        await loadArticlesForCurrentSearch();

    renderArticles(articles);

}

async function saveManualArticle() {

    const articleNumber =
        document.getElementById(
            "manual-article-number"
        ).value.trim();

    const manufacturerType =
        document.getElementById(
            "manual-article-name"
        ).value.trim();

    const rawPrice =
        document.getElementById(
            "manual-article-price"
        ).value.trim();

    const discountGroup =
        document.getElementById(
            "manual-article-discount-group"
        ).value.trim();

    const description =
        document.getElementById(
            "manual-article-description"
        ).value.trim();

    if (!articleNumber || !manufacturerType) {

        await showAlert(
            "Artikelnummer und Name sind Pflicht."
        );

        return;

    }

    const normalizedPrice =
        rawPrice.replace(",", ".");

    if (
        normalizedPrice !== ""
        && Number.isNaN(Number(normalizedPrice))
    ) {

        await showAlert(
            "Bitte einen gültigen Preis eingeben."
        );

        return;

    }

    const response =
        await fetch(
            "/api/articles",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    articleNumber,
                    manufacturerType,
                    listPrice:
                        normalizedPrice === ""
                            ? null
                            : Number(normalizedPrice),
                    listPriceCurrency:
                        "EUR",
                    discountGroup,
                    description
                })
            }
        );

    const result =
        await response.json();

    if (
        !response.ok
        || !result.success
    ) {

        await showAlert(
            result.error
            || "Artikel konnte nicht gespeichert werden."
        );

        return;

    }

    await refreshArticles();

    closeManualArticleForm();

}

function closeManualArticleForm() {

    [
        "manual-article-number",
        "manual-article-name",
        "manual-article-price",
        "manual-article-discount-group",
        "manual-article-description"
    ].forEach(id => {

        document.getElementById(id).value =
            "";

    });

    document
        .getElementById(
            "article-form-container"
        )
        .classList.add(
            "hidden"
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
                    ${renderArticleNumber(article)}
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
                    ${renderArticlePrice(article)}
                </td>

            </tr>

        `).join("");

    attachArticlePriceHandlers();
    attachArticleDeleteHandlers();

}

function renderArticleNumber(article) {

    if (article.manufacturerName !== "Manuell") {

        return article.articleNumber ?? "";

    }

    return `
        <div class="article-number-actions">
            <span>
                ${article.articleNumber ?? ""}
            </span>
            <button
                class="article-delete-button"
                type="button"
                data-article-number="${article.articleNumber ?? ""}"
                title="Artikel löschen"
            >
                Löschen
            </button>
        </div>
    `;

}

function renderArticlePrice(article) {

    const renderedPrice =
        formatArticlePrice(article);

    return `
        <div class="article-price-editor">
            <span>
                ${renderedPrice}
            </span>
            <button
                class="article-price-edit-button"
                type="button"
                data-article-number="${article.articleNumber ?? ""}"
                data-current-price="${article.listPrice ?? ""}"
                data-current-currency="${article.listPriceCurrency ?? "EUR"}"
                title="Preis ändern"
            >
                Ändern
            </button>
        </div>
    `;

}

function formatArticlePrice(article) {

    if (
        article.listPrice !== null
        && article.listPrice !== undefined
        && article.listPrice !== ""
        && !isNaN(article.listPrice)
    ) {

        return `
            ${article.listPrice}
            ${article.listPriceCurrency ?? ""}
        `;

    }

    return article.listPrice ?? "Auf Anfrage";

}

function attachArticlePriceHandlers() {

    document
        .querySelectorAll(
            ".article-price-edit-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    await editArticlePrice(button);

                }
            );

        });

}

function attachArticleDeleteHandlers() {

    document
        .querySelectorAll(
            ".article-delete-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                async event => {

                    event.stopPropagation();

                    await deleteArticle(
                        button.dataset.articleNumber
                    );

                }
            );

        });

}

async function deleteArticle(
    articleNumber
) {

    const confirmed =
        await showConfirm(
            `Artikel ${articleNumber} wirklich löschen?`,
            {
                title: "Artikel löschen",
                confirmText: "Löschen",
                danger: true
            }
        );

    if (!confirmed) {

        return;

    }

    const response =
        await fetch(
            `/api/articles/${encodeURIComponent(articleNumber)}`,
            {
                method: "DELETE"
            }
        );

    const result =
        await response.json();

    if (
        !response.ok
        || !result.success
    ) {

        await showAlert(
            result.error
            || "Artikel konnte nicht gelöscht werden."
        );

        return;

    }

    await refreshArticles();

}

async function editArticlePrice(button) {

    const articleNumber =
        button.dataset.articleNumber;

    const currentPrice =
        button.dataset.currentPrice;

    const currentCurrency =
        button.dataset.currentCurrency || "EUR";

    const newPrice =
        await showPrompt(
            `Neuer Preis für Artikel ${articleNumber}`,
            {
                title: "Preis ändern",
                value:
                    currentPrice && !isNaN(currentPrice)
                        ? currentPrice
                        : "",
                confirmText: "Speichern"
            }
        );

    if (newPrice === null) {

        return;

    }

    const trimmedPrice =
        newPrice.trim().replace(",", ".");

    if (
        trimmedPrice !== ""
        && Number.isNaN(Number(trimmedPrice))
    ) {

        await showAlert(
            "Bitte einen gültigen Preis eingeben."
        );

        return;

    }

    const response =
        await fetch(
            `/api/articles/${encodeURIComponent(articleNumber)}/price`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    listPrice:
                        trimmedPrice === ""
                            ? null
                            : Number(trimmedPrice),
                    listPriceCurrency:
                        currentCurrency
                })
            }
        );

    const result =
        await response.json();

    if (
        !response.ok
        || !result.ok
    ) {

        await showAlert(
            result.error
            || "Preis konnte nicht gespeichert werden."
        );

        return;

    }

    await refreshArticles();

}

export {
    renderView
};
