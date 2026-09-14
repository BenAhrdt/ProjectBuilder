export function calculateSalesMetrics(years = []) {
    const current = years[0];
    const previousFive = years.slice(1, 6).filter(item => item.hasData !== false);
    const average = previousFive.length
        ? previousFive.reduce((sum, item) => sum + Number(item.orderAmount || 0), 0) / previousFive.length
        : null;
    const fiveYearComparison = current?.hasData !== false && average > 0
        ? ((Number(current.orderAmount) - average) / average) * 100
        : null;
    const currentAverageOrder = averageOrderValue(current);
    const trendValues = years.slice(0, 6)
        .filter(item => item.hasData !== false && Number(item.orderAmount) > 0);
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
    return year?.hasData !== false && Number(year?.orderCount) > 0
        ? Number(year.orderAmount) / Number(year.orderCount)
        : null;
}
