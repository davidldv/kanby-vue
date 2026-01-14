export function ok(data) {
    return { ok: true, data };
}
export function err(code, message, details) {
    return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } };
}
