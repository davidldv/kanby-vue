import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { err } from '../lib/http.js';

export const apiErrorHandler = fp(async (app: FastifyInstance) => {
  app.setErrorHandler(async (error: unknown, _req: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      reply.status(400).send(err('VALIDATION_ERROR', 'Invalid request', error.flatten()));
      return;
    }

    const anyErr = error as any;

    // fastify-sensible http errors
    if (anyErr?.statusCode && typeof anyErr.statusCode === 'number') {
      const statusCode = anyErr.statusCode;
      const message = anyErr.message ?? 'Request failed';
      const code = anyErr.code ?? (statusCode === 404 ? 'NOT_FOUND' : 'HTTP_ERROR');
      reply.status(statusCode).send(err(String(code), String(message)));
      return;
    }

    app.log.error({ err: error }, 'Unhandled error');
    reply.status(500).send(err('INTERNAL_ERROR', 'Internal server error'));
  });
});
