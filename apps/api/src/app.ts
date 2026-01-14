import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';

import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { apiErrorHandler } from './plugins/error-handler.js';
import { socketPlugin } from './plugins/socket.js';

import { boardsRoutes } from './routes/boards.js';
import { listsRoutes } from './routes/lists.js';
import { cardsRoutes } from './routes/cards.js';
import { activityRoutes } from './routes/activity.js';

export async function buildApp(): Promise<FastifyInstance> {
  const port = Number(process.env.PORT ?? 4000);
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:9000';

  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  app.decorate('config', { port, corsOrigin });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === corsOrigin) return cb(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
      return cb(new Error('CORS origin not allowed'), false);
    },
    credentials: true,
  });
  await app.register(sensible);

  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(apiErrorHandler);
  await app.register(socketPlugin);

  app.get('/health', async () => ({ ok: true, data: { status: 'ok' } }));

  await app.register(boardsRoutes);
  await app.register(listsRoutes);
  await app.register(cardsRoutes);
  await app.register(activityRoutes);

  return app;
}
