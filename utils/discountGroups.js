export const customerDiscountGroupNumbers = Object.freeze([
    1,
    3,
    4,
    5,
    6,
    7,
    8,
    14
]);

export const customerDiscountGroupKeys = Object.freeze(
    customerDiscountGroupNumbers.map(number => `pg${number}`)
);

export function normalizeDiscountGroup(value) {
    const rawValue = String(value ?? "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/^PG/, "");

    if (!/^\d+$/.test(rawValue)) return "";

    const number = Number(rawValue);
    return customerDiscountGroupNumbers.includes(number)
        ? `PG${number}`
        : "";
}
