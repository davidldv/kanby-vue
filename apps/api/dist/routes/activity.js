import { z } from 'zod';
import { ActivityListQuerySchema } from '@kanby/shared';
import { ok, err } from '../lib/http.js';
import { safeJsonParse } from '../lib/json.js';
import { requireBoardMember } from '../services/authz.js';
import { createActivityEvent, getActivityEventById, markEventUndone, } from '../services/activity.js';
import { insertAt, positionsForIds, removeOne } from '../lib/positions.js';
import { boardRoom, emitActivity } from '../realtime.js';
const ParamsBoardId = z.object({ boardId: z.string().min(1) });
const ParamsEventId = z.object({ eventId: z.string().min(1) });
export async function activityRoutes(app) {
    app.get('/boards/:boardId/activity', async (req) => {
        const { boardId } = ParamsBoardId.parse(req.params);
        const query = ActivityListQuerySchema.parse(req.query);
        await requireBoardMember(app.prisma, boardId, req.userId);
        let cursorClause = undefined;
        if (query.cursor) {
            const cursor = await app.prisma.activityEvent.findUnique({
                where: { id: query.cursor },
                select: { id: true, createdAt: true },
            });
            if (cursor) {
                cursorClause = {
                    OR: [
                        { createdAt: { lt: cursor.createdAt } },
                        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                    ],
                };
            }
        }
        const rows = await app.prisma.activityEvent.findMany({
            where: { boardId, ...(cursorClause ?? {}) },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: query.limit,
            select: {
                id: true,
                boardId: true,
                actorUserId: true,
                type: true,
                payloadJson: true,
                createdAt: true,
                undoneAt: true,
            },
        });
        const events = rows.map((r) => ({
            id: r.id,
            boardId: r.boardId,
            actorUserId: r.actorUserId,
            type: r.type,
            payloadJson: safeJsonParse(r.payloadJson),
            createdAt: r.createdAt.toISOString(),
            undoneAt: r.undoneAt ? r.undoneAt.toISOString() : null,
        }));
        const nextCursor = events.length ? events[events.length - 1].id : null;
        return ok({ events, nextCursor });
    });
    app.post('/activity/:eventId/undo', async (req, reply) => {
        const { eventId } = ParamsEventId.parse(req.params);
        const event = await getActivityEventById(app.prisma, eventId);
        if (!event)
            throw app.httpErrors.notFound('Activity event not found');
        await requireBoardMember(app.prisma, event.boardId, req.userId);
        if (event.undoneAt) {
            reply.status(409).send(err('ALREADY_UNDONE', 'Event already undone'));
            return;
        }
        const payload = safeJsonParse(event.rawPayloadJson);
        const result = await app.prisma.$transaction(async (tx) => {
            const marked = await markEventUndone(tx, eventId);
            if (!marked.updated) {
                return { status: 'already-undone' };
            }
            // Apply reversal
            switch (event.type) {
                case 'CARD_CREATED': {
                    const cardId = payload?.card?.id;
                    if (!cardId)
                        throw app.httpErrors.badRequest('Missing payload');
                    await tx.card.delete({ where: { id: cardId } }).catch(() => undefined);
                    break;
                }
                case 'CARD_UPDATED': {
                    const before = payload?.before;
                    if (!before?.id)
                        throw app.httpErrors.badRequest('Missing payload');
                    await tx.card.update({
                        where: { id: before.id },
                        data: {
                            title: before.title,
                            description: before.description ?? null,
                            position: before.position,
                        },
                    });
                    break;
                }
                case 'CARD_DELETED': {
                    const card = payload?.card;
                    if (!card?.id || !card?.listId)
                        throw app.httpErrors.badRequest('Missing payload');
                    const list = await tx.list.findUnique({
                        where: { id: card.listId },
                        select: { id: true, boardId: true },
                    });
                    if (!list)
                        throw app.httpErrors.conflict('List no longer exists');
                    await tx.card.create({
                        data: {
                            id: card.id,
                            listId: card.listId,
                            title: card.title,
                            description: card.description ?? null,
                            position: card.position,
                        },
                    });
                    break;
                }
                case 'CARD_MOVED': {
                    const cardId = payload?.cardId;
                    const fromListId = payload?.from?.listId;
                    const fromIndex = payload?.from?.index;
                    if (!cardId || !fromListId || typeof fromIndex !== 'number')
                        throw app.httpErrors.badRequest('Missing payload');
                    const card = await tx.card.findUnique({
                        where: { id: cardId },
                        select: { id: true, listId: true },
                    });
                    if (!card)
                        throw app.httpErrors.conflict('Card no longer exists');
                    const fromList = await tx.list.findUnique({
                        where: { id: fromListId },
                        select: { id: true },
                    });
                    if (!fromList)
                        throw app.httpErrors.conflict('Original list no longer exists');
                    const sourceCards = await tx.card.findMany({
                        where: { listId: card.listId },
                        orderBy: { position: 'asc' },
                        select: { id: true },
                    });
                    const destCards = card.listId === fromListId
                        ? sourceCards
                        : await tx.card.findMany({
                            where: { listId: fromListId },
                            orderBy: { position: 'asc' },
                            select: { id: true },
                        });
                    const sourceIds = sourceCards.map((c) => c.id);
                    const destIds = destCards.map((c) => c.id);
                    const removed = removeOne(sourceIds, (id) => id === cardId);
                    let nextSourceIds = removed.next;
                    let nextDestIds = destIds;
                    const clampedIndex = Math.max(0, Math.min(fromIndex, destIds.length));
                    if (card.listId === fromListId) {
                        nextSourceIds = insertAt(removed.next, clampedIndex, cardId);
                        nextDestIds = nextSourceIds;
                    }
                    else {
                        nextDestIds = insertAt(destIds, clampedIndex, cardId);
                    }
                    const sourcePositions = positionsForIds(nextSourceIds);
                    for (const p of sourcePositions) {
                        await tx.card.update({ where: { id: p.id }, data: { position: p.position } });
                    }
                    if (card.listId !== fromListId) {
                        const destPositions = positionsForIds(nextDestIds);
                        for (const p of destPositions) {
                            await tx.card.update({
                                where: { id: p.id },
                                data: { listId: fromListId, position: p.position },
                            });
                        }
                    }
                    break;
                }
                case 'LIST_CREATED': {
                    const listId = payload?.list?.id;
                    if (!listId)
                        throw app.httpErrors.badRequest('Missing payload');
                    const cardsCount = await tx.card.count({ where: { listId } });
                    if (cardsCount > 0)
                        throw app.httpErrors.conflict('List has cards; cannot undo create safely');
                    await tx.list.delete({ where: { id: listId } });
                    break;
                }
                case 'LIST_UPDATED': {
                    const before = payload?.before;
                    if (!before?.id)
                        throw app.httpErrors.badRequest('Missing payload');
                    await tx.list.update({
                        where: { id: before.id },
                        data: { title: before.title, position: before.position },
                    });
                    break;
                }
                case 'LIST_DELETED': {
                    const list = payload?.list;
                    const cards = payload?.cards ?? [];
                    if (!list?.id || !list?.boardId)
                        throw app.httpErrors.badRequest('Missing payload');
                    const existing = await tx.list.findUnique({
                        where: { id: list.id },
                        select: { id: true },
                    });
                    if (existing)
                        throw app.httpErrors.conflict('List already exists');
                    await tx.list.create({
                        data: {
                            id: list.id,
                            boardId: list.boardId,
                            title: list.title,
                            position: list.position,
                        },
                    });
                    for (const c of cards) {
                        await tx.card.create({
                            data: {
                                id: c.id,
                                listId: list.id,
                                title: c.title,
                                description: c.description ?? null,
                                position: c.position,
                            },
                        });
                    }
                    break;
                }
                default:
                    throw app.httpErrors.conflict('Event type not undoable');
            }
            const undoEvent = await createActivityEvent(tx, {
                boardId: event.boardId,
                actorUserId: req.userId,
                type: 'UNDO',
                payload: { undoneEventId: event.id, undoneEventType: event.type },
            });
            return { status: 'ok', undoEvent };
        });
        if (result.status === 'already-undone') {
            reply.status(409).send(err('ALREADY_UNDONE', 'Event already undone'));
            return;
        }
        emitActivity(app.io, result.undoEvent, { undoneEventId: eventId });
        return ok({ activityEvent: result.undoEvent });
    });
    app.post('/boards/:boardId/activity/clear', async (req) => {
        const { boardId } = ParamsBoardId.parse(req.params);
        await requireBoardMember(app.prisma, boardId, req.userId);
        await app.prisma.activityEvent.deleteMany({ where: { boardId } });
        app.io.to(boardRoom(boardId)).emit('board:activity_cleared', { boardId });
        return ok({ cleared: true });
    });
}
