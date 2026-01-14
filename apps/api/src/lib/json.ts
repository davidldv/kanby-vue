export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
