// --------------------------------------------------
// Excel Validation
// --------------------------------------------------

function validateArticles(articles) {

    const result = {

        valid: true,

        imported: [],

        updated: [],

        skipped: []

    };

    // --------------------------------------------------
    // Bereits vorhandene Artikelnummern
    // --------------------------------------------------

    const articleNumbers =
        new Set();

    // --------------------------------------------------
    // Durchlaufen
    // --------------------------------------------------

    for (const article of articles) {

        // --------------------------------------------------
        // Artikelnummer prüfen
        // --------------------------------------------------

        if (
            !article.articleNumber
        ) {

            result.skipped.push({

                article,
                reason:
                    "Artikelnummer fehlt"

            });

            continue;

        }


        // --------------------------------------------------
        // Doppelte Artikelnummer
        // --------------------------------------------------

        if (

            articleNumbers.has(
                article.articleNumber
            )

        ) {

            result.skipped.push({

                article,
                reason:
                    "Doppelte Artikelnummer"

            });

            continue;

        }

        articleNumbers.add(
            article.articleNumber
        );

        // --------------------------------------------------
        // Neu / Update
        // --------------------------------------------------
        // Hier später DB prüfen
        // --------------------------------------------------

        if (
            article.existsInDatabase
        ) {

            result.updated.push(
                article
            );

        }
        else {

            result.imported.push(
                article
            );

        }

    }

    // --------------------------------------------------
    // Gesamtergebnis
    // --------------------------------------------------

    if (
        result.skipped.length > 0
    ) {

        result.valid = false;

    }

    return result;

}

export {
    validateArticles
};