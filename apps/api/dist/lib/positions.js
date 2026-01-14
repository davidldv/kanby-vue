export const POS_STEP = 1000;
export function positionsForIds(ids) {
    return ids.map((id, index) => ({ id, position: (index + 1) * POS_STEP }));
}
export function insertAt(arr, index, item) {
    const clamped = Math.max(0, Math.min(index, arr.length));
    return [...arr.slice(0, clamped), item, ...arr.slice(clamped)];
}
export function removeOne(arr, predicate) {
    const index = arr.findIndex(predicate);
    if (index < 0)
        return { next: arr, removed: undefined, index: -1 };
    const removed = arr[index];
    const next = [...arr.slice(0, index), ...arr.slice(index + 1)];
    return { next, removed, index };
}
