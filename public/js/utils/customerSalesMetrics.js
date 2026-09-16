export function calculateSalesMetrics(years = []) {
    const current = years[0];
    const previousFive = years.slice(1, 6).filter(hasUsableOrderAmount);
    const average = previousFive.length === 5
        ? previousFive.reduce((sum, item) => sum + Number(item.orderAmount || 0), 0) / previousFive.length
        : null;
    const fiveYearComparison = hasUsableOrderAmount(current) && average > 0
        ? ((Number(current.orderAmount) - average) / average) * 100
        : null;
    const currentAverageOrder = averageOrderValue(current);
    const trendValues = years.slice(0, 6)
        .filter(item => hasUsableOrderAmount(item) && Number(item.orderAmount) > 0);
    const newest = trendValues[0];
    const oldest = trendValues.at(-1);
    const yearSpan = newest && oldest ? Number(newest.year) - Number(oldest.year) : 0;
    const fiveYearTotal = yearSpan > 0
        ? ((Number(newest.orderAmount) / Number(oldest.orderAmount)) - 1) * 100
        : null;
    const cagr = yearSpan > 0
        ? (Math.pow(Number(newest.orderAmount) / Number(oldest.orderAmount), 1 / yearSpan) - 1) * 100
        : null;
    return {
        currentAverageOrder,
        fiveYearComparison,
        fiveYearTotal,
        cagr,
        trendStartYear: oldest?.year ?? null,
        trendEndYear: newest?.year ?? null
    };
}

export function averageOrderValue(year) {
    return hasUsableOrderAmount(year) && Number(year?.orderCount) > 0
        ? Number(year.orderAmount) / Number(year.orderCount)
        : null;
}

function hasUsableOrderAmount(year) {
    return Boolean(year) && year.hasData !== false && year.amountComplete !== false
        && year.orderAmount !== null && year.orderAmount !== undefined
        && Number.isFinite(Number(year.orderAmount));
}
