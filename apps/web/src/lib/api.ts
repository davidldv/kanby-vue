import type { ApiResponse } from '@kanby/shared';
import { getUserId } from './user';

function baseUrl(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  const cleaned = (url && url.trim().length ? url.trim() : undefined)?.replace(/\/$/, '');
  if (cleaned) return cleaned;

  // In production deployments, prefer same-origin proxy routes (see `vercel.json`).
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }

  return 'http://localhost:4000';
}

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  options?: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    'X-User-Id': getUserId(),
  };
  if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers,
  };

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }
  if (options?.signal) {
    init.signal = options.signal;
  }

  const res = await fetch(`${baseUrl()}${path}`, init);

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (!res.ok) {
    if (json && !json.ok)
      throw new ApiError(json.error.code, json.error.message, json.error.details);
    throw new ApiError('HTTP_ERROR', `HTTP ${res.status}`);
  }

  if (!json) throw new ApiError('BAD_JSON', 'Invalid JSON response');
  if (!json.ok) throw new ApiError(json.error.code, json.error.message, json.error.details);
  return json.data;
}
