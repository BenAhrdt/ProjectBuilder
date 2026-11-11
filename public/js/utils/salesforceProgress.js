import * as i18n from "./i18n.js";

let activeSalesforceProgress = null;

export function showSalesforceProgress(
    operation
) {

    activeSalesforceProgress?.close();

    const titleKey =
        operation === "load"
            ? "project.salesforceProgressLoad"
            : operation === "pricelist-import"
                ? "importPricelist.running"
            : operation === "article-check"
                ? "articles.salesforceProgressCheck"
                : operation === "article-import"
                    ? "articles.salesforceProgressImport"
                    : "project.salesforceProgressSync";
    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "salesforce-progress-overlay";
    overlay.setAttribute(
        "role",
        "dialog"
    );
    overlay.setAttribute(
        "aria-modal",
        "true"
    );
    overlay.setAttribute(
        "aria-labelledby",
        "salesforce-progress-title"
    );
    overlay.innerHTML = `
        <section class="salesforce-progress-card">
            <div class="salesforce-progress-logo-wrap">
                <img
                    class="salesforce-progress-logo"
                    src="/icons/janitza-logo.svg"
                    alt="Janitza"
                >
            </div>
            <h2 id="salesforce-progress-title">
                ${i18n.t(titleKey)}
            </h2>
            <p class="salesforce-progress-message">
                ${i18n.t("project.salesforceProgressWait")}
            </p>
            <div
                class="salesforce-progress-bar"
                role="progressbar"
                aria-label="Salesforce-Fortschritt"
                aria-valuemin="0"
                aria-valuemax="100"
            >
                <span class="salesforce-progress-bar-fill"></span>
            </div>
            <div class="salesforce-progress-percent">…</div>
            <div class="salesforce-progress-running-gag" aria-live="polite"></div>
        </section>
    `;

    document.body.appendChild(
        overlay
    );

    const progressBar =
        overlay.querySelector(
            ".salesforce-progress-bar"
        );
    const progressFill =
        overlay.querySelector(
            ".salesforce-progress-bar-fill"
        );
    const percent =
        overlay.querySelector(
            ".salesforce-progress-percent"
        );
    const runningGag =
        overlay.querySelector(
            ".salesforce-progress-running-gag"
        );
    const runningMessages = [
        i18n.t("project.salesforceSpinnerComingSoon"),
        i18n.t("project.salesforceSpinnerWeLoveUmg")
    ];
    let messageIndex = 0;

    runningGag.textContent =
        runningMessages[messageIndex];

    const runningTimer =
        window.setInterval(
            () => {
                messageIndex =
                    (messageIndex + 1)
                    %
                    runningMessages.length;
                runningGag.textContent =
                    runningMessages[messageIndex];
            },
            6000
        );

    const progress = {
        complete() {
            window.clearInterval(
                runningTimer
            );
            progressBar.classList.remove(
                "is-indeterminate"
            );
            progressFill.style.width =
                "100%";
            progressBar.setAttribute(
                "aria-valuenow",
                "100"
            );
            percent.textContent =
                i18n.t(
                    "project.salesforceProgressComplete"
                );
            runningGag.textContent =
                i18n.t(
                    "project.salesforceProgressComplete"
                );
            overlay.classList.add(
                "is-complete"
            );
        },
        close() {
            window.clearInterval(
                runningTimer
            );
            overlay.remove();
            if (
                activeSalesforceProgress === progress
            ) {
                activeSalesforceProgress =
                    null;
            }
        }
    };

    progressBar.classList.add(
        "is-indeterminate"
    );
    activeSalesforceProgress =
        progress;

    return progress;

}

export async function finishSalesforceProgress(
    progress
) {

    if (!progress) {

        return;

    }

    progress.complete();
    await new Promise(resolve =>
        window.setTimeout(
            resolve,
            450
        )
    );
    progress.close();

}
