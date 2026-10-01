import { customers } from "../database/customers.js";
import { customerDiscountGroupKeys } from "./discountGroups.js";

function createDiscountSnapshot(customer = {}, keys = customerDiscountGroupKeys) {
    return Object.fromEntries(
        keys.map(key => [key, customer?.[key] ?? null])
    );
}

function getChangedGroups(before, after) {
    return customerDiscountGroupKeys.filter(key =>
        (before?.[key] ?? null) !== (after?.[key] ?? null)
    );
}

function logCustomerDiscountChange({
    customerId,
    source,
    requestMethod = null,
    requestPath = null,
    before = {},
    requested = {},
    after = {},
    status = "success",
    errorMessage = null
}) {
    const beforeSnapshot = createDiscountSnapshot(before);
    const requestedSnapshot = Object.fromEntries(
        Object.entries(requested ?? {})
            .filter(([key]) => customerDiscountGroupKeys.includes(key))
            .map(([key, value]) => [key, value ?? null])
    );
    const afterSnapshot = createDiscountSnapshot(after);

    customers.prepare(`
        INSERT INTO customerDiscountHistory (
            customerId,
            changedAt,
            source,
            requestMethod,
            requestPath,
            beforeJson,
            requestedJson,
            afterJson,
            changedGroupsJson,
            status,
            errorMessage
        ) VALUES (
            @customerId,
            @changedAt,
            @source,
            @requestMethod,
            @requestPath,
            @beforeJson,
            @requestedJson,
            @afterJson,
            @changedGroupsJson,
            @status,
            @errorMessage
        )
    `).run({
        customerId: customerId ?? null,
        changedAt: new Date().toISOString(),
        source: String(source || "unknown"),
        requestMethod,
        requestPath,
        beforeJson: JSON.stringify(beforeSnapshot),
        requestedJson: JSON.stringify(requestedSnapshot),
        afterJson: JSON.stringify(afterSnapshot),
        changedGroupsJson: JSON.stringify(getChangedGroups(beforeSnapshot, afterSnapshot)),
        status: String(status || "success"),
        errorMessage: errorMessage ? String(errorMessage) : null
    });
}

function readCustomerDiscountHistory(customerId, limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return customers.prepare(`
        SELECT
            id,
            customerId,
            changedAt,
            source,
            requestMethod,
            requestPath,
            beforeJson,
            requestedJson,
            afterJson,
            changedGroupsJson,
            status,
            errorMessage
        FROM customerDiscountHistory
        WHERE customerId = ?
        ORDER BY id DESC
        LIMIT ${safeLimit}
    `).all(customerId).map(entry => ({
        ...entry,
        before: parseJson(entry.beforeJson),
        requested: parseJson(entry.requestedJson),
        after: parseJson(entry.afterJson),
        changedGroups: parseJson(entry.changedGroupsJson) ?? []
    }));
}

function parseJson(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export {
    logCustomerDiscountChange,
    readCustomerDiscountHistory
};
