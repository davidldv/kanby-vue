import type { ApiErr, ApiOk } from '@kanby/shared';

export function ok<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function err(code: string, message: string, details?: unknown): ApiErr {
  return { ok: false, error: { code, message, ...(details === undefined ? {} : { details }) } };
}
