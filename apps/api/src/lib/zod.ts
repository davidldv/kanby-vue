import type { FastifyRequest } from 'fastify';
import type { ZodTypeAny } from 'zod';

export function parseBody<T extends ZodTypeAny>(
  req: FastifyRequest,
  schema: T,
): ReturnType<T['parse']> {
  return schema.parse(req.body);
}

export function parseParams<T extends ZodTypeAny>(
  req: FastifyRequest,
  schema: T,
): ReturnType<T['parse']> {
  return schema.parse(req.params);
}

export function parseQuery<T extends ZodTypeAny>(
  req: FastifyRequest,
  schema: T,
): ReturnType<T['parse']> {
  return schema.parse(req.query);
}
