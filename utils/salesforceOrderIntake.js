export function buildAnnualOrderIntake(
    headerRecords,
    fallbackRecords,
    currentYear,
    displayedYearCount = 10
) {
    const fallbackByYear = new Map();
    for (const record of fallbackRecords) {
        const itemCount = Number(record.itemCount) || 0;
        const netAmountCount = Number(record.netAmountCount) || 0;
        if (itemCount === 0 || itemCount !== netAmountCount) continue;
        const year = Number(record.year);
        const value = fallbackByYear.get(year) ?? { count: 0, amount: 0 };
        value.count += 1;
        value.amount += Number(record.netAmount) || 0;
        fallbackByYear.set(year, value);
    }

    const headersByYear = new Map(headerRecords.map(record => [Number(record.year), record]));
    const annualValues = Array.from({ length: displayedYearCount + 1 }, (_, index) => {
        const year = currentYear - index;
        const record = headersByYear.get(year);
        const orderCount = Number(record?.orderCount) || 0;
        const headerAmountCount = Number(record?.orderAmountCount) || 0;
        const fallback = fallbackByYear.get(year) ?? { count: 0, amount: 0 };
        const amountKnownCount = headerAmountCount + fallback.count;
        const amountComplete = Boolean(record) && amountKnownCount === orderCount;
        return {
            year,
            hasData: Boolean(record),
            orderCount,
            amountKnownCount,
            amountComplete,
            orderAmount: amountComplete
                ? Math.round(((Number(record?.orderAmount) || 0) + fallback.amount) * 100) / 100
                : null
        };
    });

    return annualValues.slice(0, displayedYearCount).map((item, index) => {
        const previous = annualValues[index + 1];
        const comparable = item.amountComplete && previous.amountComplete
            && Number(previous.orderAmount) !== 0;
        return {
            ...item,
            previousYearHasData: previous.amountComplete,
            changePercent: comparable
                ? ((Number(item.orderAmount) - Number(previous.orderAmount)) / Number(previous.orderAmount)) * 100
                : null
        };
    });
}
