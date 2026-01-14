export const POS_STEP = 1000;

export function positionsForIds(ids: string[]): Array<{ id: string; position: number }> {
  return ids.map((id, index) => ({ id, position: (index + 1) * POS_STEP }));
}

export function insertAt<T>(arr: T[], index: number, item: T): T[] {
  const clamped = Math.max(0, Math.min(index, arr.length));
  return [...arr.slice(0, clamped), item, ...arr.slice(clamped)];
}

export function removeOne<T>(
  arr: T[],
  predicate: (value: T) => boolean,
): { next: T[]; removed?: T; index: number } {
  const index = arr.findIndex(predicate);
  if (index < 0) return { next: arr, removed: undefined, index: -1 };
  const removed = arr[index];
  const next = [...arr.slice(0, index), ...arr.slice(index + 1)];
  return { next, removed, index };
}
