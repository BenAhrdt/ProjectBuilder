import * as i18n from "./i18n.js";

let activeModal = null;

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}

function ensureModalRoot() {

    let root =
        document.getElementById(
            "app-modal-root"
        );

    if (!root) {

        root =
            document.createElement(
                "div"
            );

        root.id =
            "app-modal-root";

        document.body.appendChild(
            root
        );

    }

    return root;

}

function closeActiveModal() {

    if (activeModal) {

        activeModal.remove();
        activeModal =
            null;

    }

}

function showModal({
    title,
    message,
    confirmText = i18n.t("common.ok"),
    cancelText = i18n.t("common.cancel"),
    showCancel = false,
    input = null,
    danger = false,
    choices = [],
    choiceLayout = "buttons"
}) {

    closeActiveModal();

    const root =
        ensureModalRoot();

    return new Promise(resolve => {

        const overlay =
            document.createElement(
                "div"
            );

        overlay.className = `app-modal-overlay${choiceLayout === "list" ? " app-modal-choice-list" : ""}`;

        overlay.innerHTML = `
            <div
                class="app-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="app-modal-title"
            >
                <div class="app-modal-header">
                    <h2 id="app-modal-title">${title ?? ""}</h2>
                </div>
                <div class="app-modal-body">
                    <div class="app-modal-message"></div>
                </div>
                <div class="app-modal-actions">
                    ${choices.map((choice, index) => `
                        <button
                            class="app-modal-confirm app-modal-choice"
                            type="button"
                            data-choice-index="${index}"
                        >${escapeHtml(choice.label)}</button>
                    `).join("")}
                    ${
                        showCancel
                            ? `<button class="app-modal-cancel" type="button">${cancelText}</button>`
                            : ""
                    }
                    ${choices.length === 0
                        ? `<button class="app-modal-confirm${danger ? " app-modal-danger" : ""}" type="button">${confirmText}</button>`
                        : ""
                    }
                </div>
            </div>
        `;

        const messageElement =
            overlay.querySelector(
                ".app-modal-message"
            );

        String(message ?? "")
            .split("\n")
            .forEach(line => {

                const paragraph =
                    document.createElement(
                        "p"
                    );

                paragraph.textContent =
                    line;

                messageElement.appendChild(
                    paragraph
                );

            });

        let inputElement =
            null;

        if (input) {

            inputElement =
                document.createElement(
                    "input"
                );

            inputElement.className =
                "app-modal-input";
            inputElement.type =
                input.type ?? "text";
            inputElement.value =
                input.value ?? "";
            inputElement.placeholder =
                input.placeholder ?? "";

            messageElement.appendChild(
                inputElement
            );

        }

        const finish = value => {

            closeActiveModal();
            resolve(value);

        };

        overlay
            .querySelector(
                ".app-modal-confirm:not(.app-modal-choice)"
            )
            ?.addEventListener(
                "click",
                () => {

                    finish(
                        input
                            ? inputElement.value
                            : true
                    );

                }
            );

        overlay
            .querySelectorAll(
                ".app-modal-choice"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const choice =
                            choices[
                                Number(button.dataset.choiceIndex)
                            ];

                        finish(
                            choice?.value ?? null
                        );

                    }
                );

            });

        overlay
            .querySelector(
                ".app-modal-cancel"
            )
            ?.addEventListener(
                "click",
                () => finish(null)
            );

        overlay.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    finish(null);

                }

                if (event.key === "Enter") {

                    if (
                        choices.length > 0
                        && !inputElement
                    ) {

                        return;

                    }

                    event.preventDefault();
                    finish(
                        input
                            ? inputElement.value
                            : true
                    );

                }

            }
        );

        root.appendChild(
            overlay
        );

        activeModal =
            overlay;

        (
            inputElement
            ||
            overlay.querySelector(
                ".app-modal-choice"
            )
            ||
            overlay.querySelector(
                ".app-modal-confirm"
            )
            ||
            overlay.querySelector(
                ".app-modal-cancel"
            )
        ).focus();

    });

}

function showAlert(
    message,
    options = {}
) {

    return showModal({
        title:
            options.title ?? i18n.t("common.notice"),
        message,
        confirmText:
            options.confirmText ?? i18n.t("common.ok")
    });

}

function showConfirm(
    message,
    options = {}
) {

    return showModal({
        title:
            options.title ?? i18n.t("common.confirm"),
        message,
        confirmText:
            options.confirmText ?? i18n.t("common.ok"),
        cancelText:
            options.cancelText ?? i18n.t("common.cancel"),
        showCancel:
            true,
        danger:
            options.danger ?? false
    });

}

function showPrompt(
    message,
    options = {}
) {

    return showModal({
        title:
            options.title ?? i18n.t("common.input"),
        message,
        confirmText:
            options.confirmText ?? i18n.t("common.save"),
        cancelText:
            options.cancelText ?? i18n.t("common.cancel"),
        showCancel:
            true,
        input: {
            type:
                options.type ?? "text",
            value:
                options.value ?? "",
            placeholder:
                options.placeholder ?? ""
        }
    });

}

function showChoice(
    message,
    options = {}
) {

    return showModal({
        title:
            options.title ?? i18n.t("common.select"),
        message,
        cancelText:
            options.cancelText ?? i18n.t("common.close"),
        showCancel:
            true,
        choices:
            options.choices ?? [],
        choiceLayout:
            options.choiceLayout ?? "buttons"
    });

}

function showSelectForm(message, options = {}) {
    closeActiveModal();
    const root = ensureModalRoot();
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "app-modal-overlay app-modal-form-overlay";
        overlay.innerHTML = `
            <form class="app-modal app-modal-form" role="dialog" aria-modal="true" aria-labelledby="app-modal-title">
                <div class="app-modal-header"><h2 id="app-modal-title">${escapeHtml(options.title ?? i18n.t("common.select"))}</h2></div>
                <div class="app-modal-body">
                    <div class="app-modal-message"><p>${escapeHtml(message)}</p></div>
                    ${options.fields.map(field => field.type === "checkboxes" ? `
                        <fieldset class="app-modal-field app-modal-checkboxes">
                            <legend>${escapeHtml(field.label)}</legend>
                            ${(field.options ?? []).map(item => `<label><input type="checkbox" name="${escapeHtml(field.name)}" value="${escapeHtml(item.value)}" ${(field.value ?? []).map(String).includes(String(item.value)) ? "checked" : ""}> ${escapeHtml(item.label)}</label>`).join("")}
                        </fieldset>
                    ` : `
                        <label class="app-modal-field">
                            <span>${escapeHtml(field.label)}</span>
                            <select name="${escapeHtml(field.name)}" ${field.required ? "required" : ""}>
                                ${(field.options ?? []).map(item => `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(field.value ?? "") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
                            </select>
                        </label>
                    `).join("")}
                    <p class="app-modal-form-error" role="alert"></p>
                </div>
                <div class="app-modal-actions">
                    <button class="app-modal-cancel" type="button">${escapeHtml(options.cancelText ?? i18n.t("common.cancel"))}</button>
                    <button class="app-modal-confirm" type="submit">${escapeHtml(options.confirmText ?? i18n.t("common.ok"))}</button>
                </div>
            </form>`;
        const finish = value => { closeActiveModal(); resolve(value); };
        const form = overlay.querySelector("form");
        form.addEventListener("submit", event => {
            event.preventDefault();
            const formData = new FormData(form);
            const values = Object.fromEntries(formData);
            for (const field of options.fields.filter(item => item.type === "checkboxes")) {
                values[field.name] = formData.getAll(field.name);
            }
            const error = options.validate?.(values);
            if (error) {
                overlay.querySelector(".app-modal-form-error").textContent = error;
                return;
            }
            finish(values);
        });
        overlay.querySelector(".app-modal-cancel").addEventListener("click", () => finish(null));
        overlay.addEventListener("keydown", event => { if (event.key === "Escape") finish(null); });
        root.appendChild(overlay);
        activeModal = overlay;
        overlay.querySelector("select")?.focus();
    });
}

export {
    showAlert,
    showConfirm,
    showPrompt,
    showChoice,
    showSelectForm
};
