const columnAliases = {
    articleNumber: ["Artikelnummer", "Item number", "Article number"],
    ean: ["EAN"],
    manufacturerType: ["Herstellertyp", "Type", "Manufacturer type"],
    manufacturerName: ["Herstellername", "Manufacturer", "Manufacturer name"],
    originCountry: ["Ursprungsland", "Origin country"],
    originRegion: ["Ursprungsregion", "Origin region"],
    intrastatNumber: ["Intrastatnummer", "Customs code", "Intrastat number"],
    quantity: ["Anzahl_Inhaltseinheiten", "Quantity", "Content quantity"],
    quantityUnit: ["Inhaltseinheit", "Content unit"],
    listPrice: ["Preis_Listenpreis_Preis", "List price"],
    listPriceCurrency: ["Preis_Listenpreis_Währung", "List price currency", "Currency"],
    discountGroup: ["Rabattgruppe", "Price group", "Discount group"],
    description: [
        "Text_Ausschreibungstext_Langtext (Text)",
        "Text_Tender Text",
        "Tender text",
        "Description"
    ]
};

function normalizeColumnName(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function resolvePricelistColumns(headers = []) {
    const headersByNormalizedName = new Map(
        headers.map(header => [normalizeColumnName(header), header])
    );

    return Object.fromEntries(
        Object.entries(columnAliases).map(([field, aliases]) => [
            field,
            aliases
                .map(normalizeColumnName)
                .map(alias => headersByNormalizedName.get(alias))
                .find(Boolean)
                ?? null
        ])
    );
}

function normalizeArticleNumber(value) {
    return typeof value === "number"
        ? String(value).replace(/\.0$/, "")
        : String(value ?? "").trim();
}

function mapPricelistRow(row, columns) {
    const get = field => columns[field] ? row[columns[field]] : undefined;

    return {
        articleNumber: normalizeArticleNumber(get("articleNumber")),
        ean: get("ean") ?? "",
        manufacturerType: get("manufacturerType") ?? "",
        manufacturerName: get("manufacturerName") ?? "",
        originCountry: get("originCountry") ?? "",
        originRegion: get("originRegion") ?? "",
        intrastatNumber: get("intrastatNumber") ?? "",
        quantity: get("quantity") ?? null,
        quantityUnit: get("quantityUnit") ?? "",
        listPrice: get("listPrice") ?? null,
        listPriceCurrency: get("listPriceCurrency") ?? "",
        discountGroup: get("discountGroup") ?? "",
        description: get("description") ?? ""
    };
}

export {
    normalizeColumnName,
    resolvePricelistColumns,
    mapPricelistRow
};
