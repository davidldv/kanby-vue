export function parseBody(req, schema) {
    return schema.parse(req.body);
}
export function parseParams(req, schema) {
    return schema.parse(req.params);
}
export function parseQuery(req, schema) {
    return schema.parse(req.query);
}
