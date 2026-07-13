function calculateStructureUnitPrice({
    listPrice,
    customerDiscountPercent = 0,
    projectDiscountPercent = 0,
    priceMode = "list"
}) {
    const normalizedListPrice =
        Number(listPrice);
    const safeListPrice =
        Number.isFinite(normalizedListPrice)
            ? normalizedListPrice
            : 0;

    if (priceMode !== "discounted") {
        return safeListPrice;
    }

    return safeListPrice
        *
        (1 - normalizePercent(customerDiscountPercent) / 100)
        *
        (1 - normalizePercent(projectDiscountPercent) / 100);
}

function normalizePercent(
    value
) {
    const percent =
        Number(value);

    return Number.isFinite(percent)
        ? Math.min(
            Math.max(percent, 0),
            100
        )
        : 0;
}

export {
    calculateStructureUnitPrice
};
