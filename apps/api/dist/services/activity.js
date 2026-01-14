import { safeJsonParse, safeJsonStringify } from '../lib/json.js';
function toDto(row) {
    return {
        id: row.id,
        boardId: row.boardId,
        actorUserId: row.actorUserId,
        type: row.type,
        payloadJson: safeJsonParse(row.payloadJson),
        createdAt: row.createdAt.toISOString(),
        undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
    };
}
export async function createActivityEvent(prisma, input) {
    const row = await prisma.activityEvent.create({
        data: {
            boardId: input.boardId,
            actorUserId: input.actorUserId,
            type: input.type,
            payloadJson: safeJsonStringify(input.payload),
        },
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
    return toDto(row);
}
export async function markEventUndone(prisma, eventId) {
    const result = await prisma.activityEvent.updateMany({
        where: { id: eventId, undoneAt: null },
        data: { undoneAt: new Date() },
    });
    return { updated: result.count === 1 };
}
export async function getActivityEventById(prisma, eventId) {
    const row = await prisma.activityEvent.findUnique({
        where: { id: eventId },
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
    if (!row)
        return null;
    return { ...toDto(row), rawPayloadJson: row.payloadJson };
}
