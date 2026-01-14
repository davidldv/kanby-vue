import type { ActivityEventDto } from '@kanby/shared';

export function activityTitle(event: ActivityEventDto): string {
  switch (event.type) {
    case 'BOARD_CREATED':
      return 'Board created';
    case 'LIST_CREATED':
      return 'List created';
    case 'LIST_UPDATED':
      return 'List updated';
    case 'LIST_DELETED':
      return 'List deleted';
    case 'CARD_CREATED':
      return 'Card created';
    case 'CARD_UPDATED':
      return 'Card updated';
    case 'CARD_DELETED':
      return 'Card deleted';
    case 'CARD_MOVED':
      return 'Card moved';
    case 'UNDO':
      return 'Undo';
    default:
      return event.type;
  }
}

export function activityWhen(event: ActivityEventDto): string {
  const d = new Date(event.createdAt);
  return d.toLocaleString();
}
