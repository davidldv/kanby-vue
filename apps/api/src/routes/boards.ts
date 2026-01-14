import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BoardCreateSchema } from '@kanby/shared';
import { ok } from '../lib/http.js';
import { createActivityEvent } from '../services/activity.js';

const ParamsBoardId = z.object({ boardId: z.string().min(1) });

export async function boardsRoutes(app: FastifyInstance) {
  app.get('/boards', async (req) => {
    const boards = await app.prisma.board.findMany({
      where: { members: { some: { userId: req.userId } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });

    return ok(boards.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() })));
  });

  app.post('/boards', async (req) => {
    const body = BoardCreateSchema.parse(req.body);

    const result = await app.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          title: body.title,
          members: { create: [{ userId: req.userId, role: 'OWNER' }] },
        },
        select: { id: true, title: true, createdAt: true },
      });

      const event = await createActivityEvent(tx, {
        boardId: board.id,
        actorUserId: req.userId,
        type: 'BOARD_CREATED',
        payload: { board },
      });

      return { board, event };
    });

    return ok({
      board: { ...result.board, createdAt: result.board.createdAt.toISOString() },
      activityEvent: result.event,
    });
  });

  app.get('/boards/:boardId', async (req) => {
    const { boardId } = ParamsBoardId.parse(req.params);

    const board = await app.prisma.board.findFirst({
      where: { id: boardId, members: { some: { userId: req.userId } } },
      select: { id: true, title: true, createdAt: true },
    });

    if (!board) throw app.httpErrors.notFound('Board not found');

    return ok({ ...board, createdAt: board.createdAt.toISOString() });
  });
}
