import type { Server } from 'socket.io';
import type { ActivityEventDto } from '@kanby/shared';

export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

export function emitActivity(io: Server, event: ActivityEventDto, payload?: unknown): void {
  io.to(boardRoom(event.boardId)).emit('board:activity_event_created', {
    activityEvent: event,
    payload: payload ?? null,
  });
}
