let activeModal = null;

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
    confirmText = "OK",
    cancelText = "Abbrechen",
    showCancel = false,
    input = null,
    danger = false
}) {

    closeActiveModal();

    const root =
        ensureModalRoot();

    return new Promise(resolve => {

        const overlay =
            document.createElement(
                "div"
            );

        overlay.className =
            "app-modal-overlay";

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
                    ${
                        showCancel
                            ? `<button class="app-modal-cancel" type="button">${cancelText}</button>`
                            : ""
                    }
                    <button class="app-modal-confirm${danger ? " app-modal-danger" : ""}" type="button">${confirmText}</button>
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
                ".app-modal-confirm"
            )
            .addEventListener(
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
                ".app-modal-confirm"
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
            options.title ?? "Hinweis",
        message,
        confirmText:
            options.confirmText ?? "OK"
    });

}

function showConfirm(
    message,
    options = {}
) {

    return showModal({
        title:
            options.title ?? "Bestätigen",
        message,
        confirmText:
            options.confirmText ?? "OK",
        cancelText:
            options.cancelText ?? "Abbrechen",
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
            options.title ?? "Eingabe",
        message,
        confirmText:
            options.confirmText ?? "Speichern",
        cancelText:
            options.cancelText ?? "Abbrechen",
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

export {
    showAlert,
    showConfirm,
    showPrompt
};
