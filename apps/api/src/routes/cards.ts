import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CardCreateSchema, CardMoveSchema, CardPatchSchema } from '@kanby/shared';
import { ok } from '../lib/http.js';
import { POS_STEP, insertAt, positionsForIds, removeOne } from '../lib/positions.js';
import { requireBoardMember } from '../services/authz.js';
import { createActivityEvent } from '../services/activity.js';

const ParamsListId = z.object({ listId: z.string().min(1) });
const ParamsCardId = z.object({ cardId: z.string().min(1) });

async function requireBoardForList(
  app: FastifyInstance,
  listId: string,
  userId: string,
): Promise<{ boardId: string }> {
  const list = await app.prisma.list.findUnique({
    where: { id: listId },
    select: { boardId: true },
  });
  if (!list) throw app.httpErrors.notFound('List not found');
  await requireBoardMember(app.prisma, list.boardId, userId);
  return list;
}

export async function cardsRoutes(app: FastifyInstance) {
  app.get('/lists/:listId/cards', async (req) => {
    const { listId } = ParamsListId.parse(req.params);
    const list = await requireBoardForList(app, listId, req.userId);

    const cards = await app.prisma.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
      select: { id: true, listId: true, title: true, description: true, position: true },
    });

    return ok({ boardId: list.boardId, listId, cards });
  });

  app.post('/lists/:listId/cards', async (req) => {
    const { listId } = ParamsListId.parse(req.params);
    const body = CardCreateSchema.parse(req.body);
    const list = await requireBoardForList(app, listId, req.userId);

    const result = await app.prisma.$transaction(async (tx) => {
      const last = await tx.card.findFirst({
        where: { listId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      const position = (last?.position ?? 0) + POS_STEP;

      const card = await tx.card.create({
        data: { listId, title: body.title, description: body.description ?? null, position },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });

      const event = await createActivityEvent(tx, {
        boardId: list.boardId,
        actorUserId: req.userId,
        type: 'CARD_CREATED',
        payload: { card },
      });

      return { card, event };
    });

    return ok({ card: result.card, activityEvent: result.event });
  });

  app.patch('/cards/:cardId', async (req) => {
    const { cardId } = ParamsCardId.parse(req.params);
    const body = CardPatchSchema.parse(req.body);

    const result = await app.prisma.$transaction(async (tx) => {
      const before = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });
      if (!before) throw app.httpErrors.notFound('Card not found');

      const list = await tx.list.findUnique({
        where: { id: before.listId },
        select: { boardId: true },
      });
      if (!list) throw app.httpErrors.notFound('List not found');
      await requireBoardMember(tx, list.boardId, req.userId);

      const card = await tx.card.update({
        where: { id: cardId },
        data: {
          ...(body.title === undefined ? {} : { title: body.title }),
          ...(body.description === undefined ? {} : { description: body.description ?? null }),
          ...(body.position === undefined ? {} : { position: body.position }),
        },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });

      const event = await createActivityEvent(tx, {
        boardId: list.boardId,
        actorUserId: req.userId,
        type: 'CARD_UPDATED',
        payload: { cardId, before, after: card },
      });

      return { card, event };
    });

    return ok({ card: result.card, activityEvent: result.event });
  });

  app.delete('/cards/:cardId', async (req) => {
    const { cardId } = ParamsCardId.parse(req.params);

    const result = await app.prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });
      if (!card) throw app.httpErrors.notFound('Card not found');

      const list = await tx.list.findUnique({
        where: { id: card.listId },
        select: { boardId: true },
      });
      if (!list) throw app.httpErrors.notFound('List not found');
      await requireBoardMember(tx, list.boardId, req.userId);

      await tx.card.delete({ where: { id: cardId } });

      const event = await createActivityEvent(tx, {
        boardId: list.boardId,
        actorUserId: req.userId,
        type: 'CARD_DELETED',
        payload: { card },
      });

      return { deletedCardId: cardId, event };
    });

    return ok({ deletedCardId: result.deletedCardId, activityEvent: result.event });
  });

  app.post('/cards/:cardId/move', async (req) => {
    const { cardId } = ParamsCardId.parse(req.params);
    const body = CardMoveSchema.parse(req.body);

    const result = await app.prisma.$transaction(async (tx) => {
      const card = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });
      if (!card) throw app.httpErrors.notFound('Card not found');

      const fromList = await tx.list.findUnique({
        where: { id: card.listId },
        select: { id: true, boardId: true },
      });
      if (!fromList) throw app.httpErrors.notFound('List not found');

      const toList = await tx.list.findUnique({
        where: { id: body.toListId },
        select: { id: true, boardId: true },
      });
      if (!toList) throw app.httpErrors.notFound('Destination list not found');
      if (toList.boardId !== fromList.boardId)
        throw app.httpErrors.badRequest('Cannot move across boards');

      await requireBoardMember(tx, fromList.boardId, req.userId);

      const sourceCards = await tx.card.findMany({
        where: { listId: fromList.id },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      const destCards =
        fromList.id === toList.id
          ? sourceCards
          : await tx.card.findMany({
              where: { listId: toList.id },
              orderBy: { position: 'asc' },
              select: { id: true },
            });

      const sourceIds = sourceCards.map((c) => c.id);
      const destIds = destCards.map((c) => c.id);

      const removed = removeOne(sourceIds, (id) => id === cardId);
      if (removed.index < 0) throw app.httpErrors.internalServerError('Card ordering mismatch');

      const toIndex = Math.max(
        0,
        Math.min(body.toIndex, fromList.id === toList.id ? removed.next.length : destIds.length),
      );

      let nextSourceIds = removed.next;
      let nextDestIds = destIds;

      if (fromList.id === toList.id) {
        nextSourceIds = insertAt(removed.next, toIndex, cardId);
        nextDestIds = nextSourceIds;
      } else {
        nextDestIds = insertAt(destIds, toIndex, cardId);
      }

      // Recompute stable positions with gaps for affected lists
      const sourcePositions = positionsForIds(nextSourceIds);
      for (const p of sourcePositions) {
        await tx.card.update({ where: { id: p.id }, data: { position: p.position } });
      }

      if (fromList.id !== toList.id) {
        const destPositions = positionsForIds(nextDestIds);
        for (const p of destPositions) {
          await tx.card.update({
            where: { id: p.id },
            data: { listId: toList.id, position: p.position },
          });
        }
      }

      const after = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, listId: true, title: true, description: true, position: true },
      });
      if (!after) throw app.httpErrors.internalServerError('Move failed');

      const event = await createActivityEvent(tx, {
        boardId: fromList.boardId,
        actorUserId: req.userId,
        type: 'CARD_MOVED',
        payload: {
          cardId,
          from: { listId: card.listId, index: removed.index, position: card.position },
          to: { listId: after.listId, index: toIndex, position: after.position },
        },
      });

      return { card: after, event };
    });

    return ok({ card: result.card, activityEvent: result.event });
  });
}
