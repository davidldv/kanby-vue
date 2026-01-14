import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { ActivityEventDto, ActivityEventType } from '@kanby/shared';
import { safeJsonParse, safeJsonStringify } from '../lib/json.js';

export type ActivityCreateInput = {
  boardId: string;
  actorUserId: string;
  type: ActivityEventType;
  payload: unknown;
};

function toDto(row: {
  id: string;
  boardId: string;
  actorUserId: string;
  type: string;
  payloadJson: string;
  createdAt: Date;
  undoneAt: Date | null;
}): ActivityEventDto {
  return {
    id: row.id,
    boardId: row.boardId,
    actorUserId: row.actorUserId,
    type: row.type as ActivityEventType,
    payloadJson: safeJsonParse(row.payloadJson),
    createdAt: row.createdAt.toISOString(),
    undoneAt: row.undoneAt ? row.undoneAt.toISOString() : null,
  };
}

export async function createActivityEvent(
  prisma: PrismaClient | Prisma.TransactionClient,
  input: ActivityCreateInput,
): Promise<ActivityEventDto> {
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

export async function markEventUndone(
  prisma: PrismaClient | Prisma.TransactionClient,
  eventId: string,
): Promise<{ updated: boolean }> {
  const result = await prisma.activityEvent.updateMany({
    where: { id: eventId, undoneAt: null },
    data: { undoneAt: new Date() },
  });

  return { updated: result.count === 1 };
}

export async function getActivityEventById(
  prisma: PrismaClient,
  eventId: string,
): Promise<(ActivityEventDto & { rawPayloadJson: string }) | null> {
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

  if (!row) return null;

  return { ...toDto(row), rawPayloadJson: row.payloadJson };
}
