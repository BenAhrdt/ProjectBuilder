const HISTORY_INDEX_KEY = "projectBuilderHistoryIndex";
const HISTORY_MAX_INDEX_KEY = "projectBuilderHistoryMaxIndex";

function readIndex(value, fallback = 0) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
}

let currentIndex = readIndex(history.state?.[HISTORY_INDEX_KEY]);
let maxIndex = Math.max(
    currentIndex,
    readIndex(sessionStorage.getItem(HISTORY_MAX_INDEX_KEY), currentIndex)
);

if (history.state?.[HISTORY_INDEX_KEY] == null) {
    history.replaceState(
        { ...(history.state || {}), [HISTORY_INDEX_KEY]: currentIndex },
        "",
        window.location.href
    );
}

sessionStorage.setItem(HISTORY_MAX_INDEX_KEY, String(maxIndex));

function notify() {
    window.dispatchEvent(new CustomEvent("projectbuilder:navigation-state", {
        detail: {
            canGoBack: currentIndex > 0,
            canGoForward: currentIndex < maxIndex
        }
    }));
}

function push(path) {
    currentIndex += 1;
    maxIndex = currentIndex;
    sessionStorage.setItem(HISTORY_MAX_INDEX_KEY, String(maxIndex));
    history.pushState({ [HISTORY_INDEX_KEY]: currentIndex }, "", path);
    notify();
}

function syncFromPopState(state) {
    currentIndex = readIndex(state?.[HISTORY_INDEX_KEY]);
    maxIndex = Math.max(maxIndex, currentIndex);
    sessionStorage.setItem(HISTORY_MAX_INDEX_KEY, String(maxIndex));
    notify();
}

function getState() {
    return {
        canGoBack: currentIndex > 0,
        canGoForward: currentIndex < maxIndex
    };
}

export { getState, notify, push, syncFromPopState };
