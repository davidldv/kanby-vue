import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ListCreateSchema, ListPatchSchema, ReorderListsSchema } from '@kanby/shared';
import { ok } from '../lib/http.js';
import { positionsForIds, insertAt, removeOne } from '../lib/positions.js';
import { requireBoardMember } from '../services/authz.js';
import { createActivityEvent } from '../services/activity.js';
import { emitActivity } from '../realtime.js';

const ParamsBoardId = z.object({ boardId: z.string().min(1) });
const ParamsBoardList = z.object({ boardId: z.string().min(1), listId: z.string().min(1) });

export async function listsRoutes(app: FastifyInstance) {
  app.get('/boards/:boardId/lists', async (req) => {
    const { boardId } = ParamsBoardId.parse(req.params);
    await requireBoardMember(app.prisma, boardId, req.userId);

    const lists = await app.prisma.list.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      select: { id: true, boardId: true, title: true, position: true },
    });

    return ok(lists);
  });

  app.post('/boards/:boardId/lists', async (req) => {
    const { boardId } = ParamsBoardId.parse(req.params);
    const body = ListCreateSchema.parse(req.body);
    await requireBoardMember(app.prisma, boardId, req.userId);

    const result = await app.prisma.$transaction(async (tx) => {
      const last = await tx.list.findFirst({
        where: { boardId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      const position = (last?.position ?? 0) + 1000;

      const list = await tx.list.create({
        data: { boardId, title: body.title, position },
        select: { id: true, boardId: true, title: true, position: true },
      });

      const event = await createActivityEvent(tx, {
        boardId,
        actorUserId: req.userId,
        type: 'LIST_CREATED',
        payload: { list },
      });

      return { list, event };
    });

    emitActivity(app.io, result.event, { list: result.list });
    return ok({ list: result.list, activityEvent: result.event });
  });

  app.patch('/boards/:boardId/lists/:listId', async (req) => {
    const { boardId, listId } = ParamsBoardList.parse(req.params);
    const body = ListPatchSchema.parse(req.body);
    await requireBoardMember(app.prisma, boardId, req.userId);

    const result = await app.prisma.$transaction(async (tx) => {
      const before = await tx.list.findFirst({
        where: { id: listId, boardId },
        select: { id: true, boardId: true, title: true, position: true },
      });
      if (!before) throw app.httpErrors.notFound('List not found');

      const list = await tx.list.update({
        where: { id: listId },
        data: {
          ...(body.title === undefined ? {} : { title: body.title }),
          ...(body.position === undefined ? {} : { position: body.position }),
        },
        select: { id: true, boardId: true, title: true, position: true },
      });

      const event = await createActivityEvent(tx, {
        boardId,
        actorUserId: req.userId,
        type: 'LIST_UPDATED',
        payload: { listId, before, after: list },
      });

      return { list, event };
    });

    emitActivity(app.io, result.event, { list: result.list });
    return ok({ list: result.list, activityEvent: result.event });
  });

  app.delete('/boards/:boardId/lists/:listId', async (req) => {
    const { boardId, listId } = ParamsBoardList.parse(req.params);
    await requireBoardMember(app.prisma, boardId, req.userId);

    const result = await app.prisma.$transaction(async (tx) => {
      const list = await tx.list.findFirst({
        where: { id: listId, boardId },
        select: { id: true, boardId: true, title: true, position: true },
      });
      if (!list) throw app.httpErrors.notFound('List not found');

      const cards = await tx.card.findMany({
        where: { listId },
        orderBy: { position: 'asc' },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });

      await tx.list.delete({ where: { id: listId } });

      const event = await createActivityEvent(tx, {
        boardId,
        actorUserId: req.userId,
        type: 'LIST_DELETED',
        payload: { list, cards },
      });

      return { deletedListId: listId, event };
    });

    emitActivity(app.io, result.event, { deletedListId: result.deletedListId });
    return ok({ deletedListId: result.deletedListId, activityEvent: result.event });
  });

  app.post('/boards/:boardId/reorder-lists', async (req) => {
    const { boardId } = ParamsBoardId.parse(req.params);
    const body = ReorderListsSchema.parse(req.body);
    await requireBoardMember(app.prisma, boardId, req.userId);

    const result = await app.prisma.$transaction(async (tx) => {
      const existing = await tx.list.findMany({
        where: { boardId },
        select: { id: true },
        orderBy: { position: 'asc' },
      });
      const existingIds = new Set(existing.map((l) => l.id));

      for (const id of body.listIds) {
        if (!existingIds.has(id)) throw app.httpErrors.badRequest('Unknown list id in reorder');
      }

      const updates = positionsForIds(body.listIds);
      for (const u of updates) {
        await tx.list.update({ where: { id: u.id }, data: { position: u.position } });
      }

      const event = await createActivityEvent(tx, {
        boardId,
        actorUserId: req.userId,
        type: 'LIST_UPDATED',
        payload: { reorder: true, listIds: body.listIds },
      });

      return { listIds: body.listIds, event };
    });

    emitActivity(app.io, result.event, { listIds: result.listIds });
    return ok({ listIds: result.listIds, activityEvent: result.event });
  });
}
