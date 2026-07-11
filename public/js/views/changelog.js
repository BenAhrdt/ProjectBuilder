const view = document.getElementById("view");

async function renderView() {
    const [changelogResponse, versionResponse] = await Promise.all([
        fetch("/api/changelog"),
        fetch("/api/version")
    ]);

    if (!changelogResponse.ok || !versionResponse.ok) {
        throw new Error("Changelog konnte nicht geladen werden");
    }

    const markdown = await changelogResponse.text();
    const { version } = await versionResponse.json();
    const releases = parseChangelog(markdown);

    view.innerHTML = `
        <div class="changelog-view">
            <header class="changelog-header">
                <span class="changelog-header-icon">📖</span>
                <div>
                    <h1>Changelog</h1>
                    <p>Versionshistorie von ProjectBuilder</p>
                </div>
            </header>
            <div id="changelog-releases" class="changelog-releases"></div>
        </div>
    `;

    const container = document.getElementById("changelog-releases");
    releases.forEach(release => container.append(createRelease(release, version)));
}

function parseChangelog(markdown) {
    const releases = [];
    let release;
    let section;

    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim();
        const releaseMatch = line.match(/^##\s+([^\s]+)\s+-\s+(.+)$/);

        if (releaseMatch) {
            release = { version: releaseMatch[1], date: releaseMatch[2], sections: [] };
            releases.push(release);
            section = null;
            continue;
        }

        if (line.startsWith("### ") && release) {
            section = { title: line.slice(4), items: [] };
            release.sections.push(section);
            continue;
        }

        if (line.startsWith("- ") && section) section.items.push(line.slice(2));
    }

    return releases;
}

function createRelease(release, currentVersion) {
    const article = document.createElement("article");
    article.className = "changelog-release";
    if (release.version === currentVersion) article.classList.add("current");

    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = `Version ${release.version}`;
    header.append(title);

    if (release.version === currentVersion) {
        const badge = document.createElement("span");
        badge.className = "changelog-current-badge";
        badge.textContent = "Aktuell installiert";
        header.append(badge);
    }

    const date = document.createElement("time");
    date.textContent = release.date;
    header.append(date);
    article.append(header);

    for (const section of release.sections) {
        const sectionElement = document.createElement("section");
        const heading = document.createElement("h3");
        heading.textContent = section.title;
        const list = document.createElement("ul");

        for (const item of section.items) {
            const listItem = document.createElement("li");
            listItem.textContent = item.replaceAll("`", "");
            list.append(listItem);
        }

        sectionElement.append(heading, list);
        article.append(sectionElement);
    }

    return article;
}

export { renderView };
