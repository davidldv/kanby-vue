import type { PrismaClient } from './generated/prisma/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    config: { port: number; corsOrigin: string };
  }

  interface FastifyRequest {
    userId: string;
  }
}

export {};
