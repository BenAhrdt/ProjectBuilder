export const GRIDVIS_DAYS_PER_YEAR = 365;

function toNonNegativeNumber(value, name, { allowBlank = false } = {}) {
    if (allowBlank && (value === "" || value === null || value === undefined)) {
        return 0;
    }

    const number = Number(String(value ?? "").trim().replace(",", "."));
    if (!Number.isFinite(number) || number < 0) {
        throw new RangeError(`${name} muss eine nichtnegative Zahl sein.`);
    }
    return number;
}

export function calculateLicenseExpansion({
    existingItems,
    existingAzrDays,
    expansionItems,
    expansionAzrDays
}) {
    const currentItems = toNonNegativeNumber(existingItems, "Bestehende Items");
    const currentAzr = toNonNegativeNumber(existingAzrDays, "Rest-AZR");
    const addedItems = toNonNegativeNumber(expansionItems, "Erweiterungs-Items");
    const addedAzr = toNonNegativeNumber(expansionAzrDays, "AZR der Erweiterung");
    const totalItems = currentItems + addedItems;

    if (totalItems <= 0) {
        throw new RangeError("Mindestens ein Item ist erforderlich.");
    }

    return {
        totalItems,
        azrDays: ((currentItems * currentAzr) + (addedItems * addedAzr)) / totalItems
    };
}

export function calculateMismatchedRenewal({
    existingItems,
    existingAzrDays,
    renewalItems,
    renewalYears
}) {
    const currentItems = toNonNegativeNumber(existingItems, "Bestehende Items");
    const currentAzr = toNonNegativeNumber(existingAzrDays, "Rest-AZR");
    const renewedItems = toNonNegativeNumber(renewalItems, "Verlängerungs-Items");
    const years = toNonNegativeNumber(renewalYears, "Verlängerungsdauer");

    if (currentItems <= 0) {
        throw new RangeError("Die Anzahl der bestehenden Items muss größer als 0 sein.");
    }

    const renewalDays = years * GRIDVIS_DAYS_PER_YEAR;
    return {
        renewalDays,
        azrDays: ((currentItems * currentAzr) + (renewedItems * renewalDays)) / currentItems
    };
}

export function calculateReactivation({
    activeItems,
    activeAzrDays,
    parkedGroups = []
}) {
    const currentItems = toNonNegativeNumber(activeItems, "Aktive Items");
    const currentAzr = toNonNegativeNumber(activeAzrDays, "Rest-AZR der aktiven Items");
    const groups = parkedGroups.map((group, index) => ({
        items: toNonNegativeNumber(group?.items, `Items der Gruppe ${index + 1}`, { allowBlank: true }),
        azrDays: toNonNegativeNumber(group?.azrDays, `Rest-AZR der Gruppe ${index + 1}`, { allowBlank: true })
    }));
    const reactivatedItems = groups.reduce((sum, group) => sum + group.items, 0);
    const totalItems = currentItems + reactivatedItems;

    if (totalItems <= 0) {
        throw new RangeError("Mindestens ein aktives oder zu reaktivierendes Item ist erforderlich.");
    }

    const weightedDays = groups.reduce(
        (sum, group) => sum + (group.items * group.azrDays),
        currentItems * currentAzr
    );

    return {
        totalItems,
        azrDays: weightedDays / totalItems
    };
}
