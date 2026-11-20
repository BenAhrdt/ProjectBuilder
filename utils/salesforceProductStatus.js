const NORMAL_SALES_STATUSES = new Set([
    "active",
    "aktiv",
    "available",
    "verfuegbar",
    "inmarket",
    "released",
    "freigegeben",
    "current",
    "aktuell",
    "approved",
    "serie",
    "series",
    "green",
    "true"
]);

const BLOCKED_STATUS_PARTS = [
    "abgekuendigt",
    "abkundigt",
    "blocked",
    "gesperrt",
    "notforsale",
    "nichtfuerdenverkauffreigegeben",
    "discontinued"
];

const EXPIRING_STATUS_PARTS = [
    "warning",
    "yellow",
    "expiring",
    "expiringsoon",
    "absehbar"
];

function normalizeStatus(value) {
    const rawValue = String(value ?? "");
    if (/[✅☑✔✓]/u.test(rawValue)) return "approved";
    if (/[⚠]/u.test(rawValue)) return "warning";
    if (/[⛔🚫]/u.test(rawValue)) return "blocked";

    return rawValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
}

function isSalesforceStatusIndicator(value) {
    return /^[\s✅☑✔✓⚠⛔🚫\uFE0F]+$/u.test(String(value ?? ""));
}

function getSalesforceSalesStatusInfo({
    salesStatus,
    discontinuationDate,
    plantMaterialStatus,
    plantMaterialStatusValidFrom,
    distributionChannelStatus,
    distributionChannelStatusValidFrom,
    now = new Date()
} = {}) {
    const statuses = [
        salesStatus,
        plantMaterialStatus,
        distributionChannelStatus
    ]
        .map(normalizeStatus)
        .filter(Boolean);
    const hasBlockedStatus = statuses.some(status =>
        BLOCKED_STATUS_PARTS.some(part => status.includes(part))
    );
    const hasExpiringStatus = statuses.some(status =>
        EXPIRING_STATUS_PARTS.some(part => status.includes(part))
    );
    const statusIsKnownActive = statuses.length > 0
        && statuses.every(status => NORMAL_SALES_STATUSES.has(status));
    const relevantDate = String(
        discontinuationDate
        || (hasBlockedStatus && plantMaterialStatusValidFrom)
        || (hasBlockedStatus && distributionChannelStatusValidFrom)
        || ""
    ).trim();
    const date = relevantDate ? new Date(`${relevantDate.slice(0, 10)}T00:00:00Z`) : null;
    const hasFutureDate = date && !Number.isNaN(date.getTime()) && date.getTime() > now.getTime();
    const hasUnknownStatus = statuses.some(status => !NORMAL_SALES_STATUSES.has(status));

    if (hasExpiringStatus || (hasFutureDate && (hasBlockedStatus || relevantDate))) {
        return {
            warning: true,
            kind: "expiring",
            message: "articles.salesStatusExpiring",
            discontinuationDate: relevantDate
        };
    }

    if (hasBlockedStatus || (hasUnknownStatus && !statusIsKnownActive) || (relevantDate && !hasFutureDate)) {
        return {
            warning: true,
            kind: "blocked",
            message: "articles.salesStatusNotForSale",
            discontinuationDate: relevantDate
        };
    }

    return {
        warning: false,
        kind: "active",
        message: "",
        discontinuationDate: relevantDate
    };
}

function buildSalesforceProductStatus(fields = {}) {
    const plantStatus = String(fields.plantMaterialStatus ?? "").trim();
    const distributionStatus = String(fields.distributionChannelStatus ?? "").trim();
    const rawSalesStatus = String(fields.salesStatus ?? "").trim();
    const detailedStatus = [plantStatus, distributionStatus].filter(Boolean).join(" / ");
    const salesStatus = detailedStatus && isSalesforceStatusIndicator(rawSalesStatus)
        ? detailedStatus
        : normalizeStatus(rawSalesStatus)
            ? rawSalesStatus
            : detailedStatus;
    const statusInfo = getSalesforceSalesStatusInfo({
        ...fields,
        salesStatus
    });

    return {
        salesStatus,
        discontinuationDate: statusInfo.discontinuationDate || "",
        statusInfo
    };
}

function isSalesforceSalesStatusWarning(fields = {}) {
    return getSalesforceSalesStatusInfo(fields).warning;
}

export {
    buildSalesforceProductStatus,
    getSalesforceSalesStatusInfo,
    isSalesforceSalesStatusWarning,
    normalizeStatus
};
