export type Id = string;

export type UserDto = {
  id: Id;
  name: string;
};

export type BoardDto = {
  id: Id;
  title: string;
  createdAt: string;
};

export type BoardWithMembersDto = BoardDto & {
  members: Array<{ userId: Id; role: 'OWNER' | 'MEMBER'; user: UserDto }>;
};

export type ListDto = {
  id: Id;
  boardId: Id;
  title: string;
  position: number;
};

export type CardDto = {
  id: Id;
  listId: Id;
  title: string;
  description: string | null;
  position: number;
};

export type ActivityEventType =
  | 'BOARD_CREATED'
  | 'LIST_CREATED'
  | 'LIST_UPDATED'
  | 'LIST_DELETED'
  | 'CARD_CREATED'
  | 'CARD_UPDATED'
  | 'CARD_DELETED'
  | 'CARD_MOVED'
  | 'UNDO';

export type ActivityEventDto = {
  id: Id;
  boardId: Id;
  actorUserId: Id;
  type: ActivityEventType;
  payloadJson: unknown;
  createdAt: string;
  undoneAt: string | null;
};

export type ApiErrorDto = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: ApiErrorDto };
export type ApiResponse<T> = ApiOk<T> | ApiErr;
