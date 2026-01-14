import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { boardRoom } from '../realtime.js';

function headerToString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function unknownToString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  return undefined;
}

export const socketPlugin = fp(async (app: FastifyInstance) => {
  const corsOrigin = app.config?.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:9000';

  const io = new Server(app.server, {
    cors: { origin: corsOrigin, credentials: true },
  });

  app.decorate('io', io);

  io.on('connection', (socket) => {
    const fromHeader = headerToString(socket.handshake.headers['x-user-id']);
    const fromAuth = unknownToString((socket.handshake as any)?.auth?.userId);
    const fromQuery = unknownToString((socket.handshake.query as any)?.userId);
    const userId = fromHeader ?? fromAuth ?? fromQuery ?? process.env.DEMO_USER_ID ?? 'demo-user';

    socket.data.userId = userId;

    socket.on('board:join', async (payload: { boardId: string }) => {
      const boardId = payload?.boardId;
      if (!boardId) return;

      // authz: only members can join
      const membership = await app.prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
        select: { boardId: true },
      });
      if (!membership) {
        socket.emit('board:join_denied', { boardId });
        return;
      }

      await socket.join(boardRoom(boardId));
      socket.emit('board:joined', { boardId });
    });

    socket.on('board:leave', async (payload: { boardId: string }) => {
      const boardId = payload?.boardId;
      if (!boardId) return;
      await socket.leave(boardRoom(boardId));
      socket.emit('board:left', { boardId });
    });
  });
});
