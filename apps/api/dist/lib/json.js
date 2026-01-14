export function safeJsonStringify(value) {
    return JSON.stringify(value ?? null);
}
export function safeJsonParse(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return value;
    }
}
