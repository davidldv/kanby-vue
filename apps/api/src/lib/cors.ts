import type { OriginFunction as FastifyCorsOriginFunction } from '@fastify/cors';

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAllowlist(raw: string | undefined): {
  allowAll: boolean;
  exact: Set<string>;
  wildcardDomains: RegExp[];
  regexes: RegExp[];
} {
  const tokens = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowAll = tokens.includes('*');
  const exact = new Set<string>();
  const wildcardDomains: RegExp[] = [];
  const regexes: RegExp[] = [];

  for (const token of tokens) {
    if (token === '*') continue;

    // Regex token: /.../ (no flags)
    if (token.startsWith('/') && token.endsWith('/') && token.length > 2) {
      try {
        regexes.push(new RegExp(token.slice(1, -1)));
      } catch {
        // ignore invalid regex tokens
      }
      continue;
    }

    // Wildcard domain token: *.example.com
    if (token.startsWith('*.') && token.length > 2) {
      const domain = token.slice(2);
      wildcardDomains.push(new RegExp(`^https?:\\/\\/[^/]+\\.${escapeRegexLiteral(domain)}$`));
      continue;
    }

    exact.add(token);
  }

  return { allowAll, exact, wildcardDomains, regexes };
}

export function isOriginAllowed(origin: string, corsOriginRaw: string | undefined): boolean {
  // Always allow local dev origins
  if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;

  // Common deployment: Vercel
  if (/^https:\/\/[^/]+\.vercel\.app$/.test(origin)) return true;

  const allowlist = parseAllowlist(corsOriginRaw);
  if (allowlist.allowAll) return true;
  if (allowlist.exact.has(origin)) return true;
  if (allowlist.wildcardDomains.some((re) => re.test(origin))) return true;
  if (allowlist.regexes.some((re) => re.test(origin))) return true;
  return false;
}

export function createSocketIoCorsOrigin(corsOriginRaw: string | undefined) {
  return (origin: string | undefined, cb: CorsOriginCallback) => {
    // Allow non-browser clients / same-origin server-side requests.
    if (!origin) return cb(null, true);
    if (isOriginAllowed(origin, corsOriginRaw)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'), false);
  };
}

export function createFastifyCorsOrigin(
  corsOriginRaw: string | undefined,
): FastifyCorsOriginFunction {
  // Fastify's typing expects a specific callback signature; this wraps our shared logic.
  return ((origin: string | undefined, cb: CorsOriginCallback) => {
    if (!origin) return cb(null, true);
    if (isOriginAllowed(origin, corsOriginRaw)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'), false);
  }) as FastifyCorsOriginFunction;
}
