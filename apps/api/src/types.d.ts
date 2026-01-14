import type { PrismaClient } from '@prisma/client';
import type { Server } from 'socket.io';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    config: { port: number; corsOrigin: string };
    io: Server;
  }

  interface FastifyRequest {
    userId: string;
  }
}

declare module 'socket.io' {
  interface Socket {
    data: {
      userId?: string;
    };
  }
}

export {};
