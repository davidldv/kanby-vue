export function errorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('message' in err)) return fallback;
  const maybe = err as { message?: unknown };
  if (typeof maybe.message === 'string') return maybe.message;
  return fallback;
}
