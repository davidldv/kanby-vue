const STORAGE_KEY = 'kanby.userId';

export function getUserId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored.trim().length ? stored : 'demo-user';
}

export function setUserId(userId: string): void {
  const normalized = userId.trim();
  if (!normalized) return;
  localStorage.setItem(STORAGE_KEY, normalized);
}
