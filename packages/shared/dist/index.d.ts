import { z } from 'zod';

type Id = string;
type UserDto = {
    id: Id;
    name: string;
};
type BoardDto = {
    id: Id;
    title: string;
    createdAt: string;
};
type BoardWithMembersDto = BoardDto & {
    members: Array<{
        userId: Id;
        role: 'OWNER' | 'MEMBER';
        user: UserDto;
    }>;
};
type ListDto = {
    id: Id;
    boardId: Id;
    title: string;
    position: number;
};
type CardDto = {
    id: Id;
    listId: Id;
    title: string;
    description: string | null;
    position: number;
};
type ActivityEventType = 'BOARD_CREATED' | 'LIST_CREATED' | 'LIST_UPDATED' | 'LIST_DELETED' | 'CARD_CREATED' | 'CARD_UPDATED' | 'CARD_DELETED' | 'CARD_MOVED' | 'UNDO';
type ActivityEventDto = {
    id: Id;
    boardId: Id;
    actorUserId: Id;
    type: ActivityEventType;
    payloadJson: unknown;
    createdAt: string;
    undoneAt: string | null;
};
type ApiErrorDto = {
    code: string;
    message: string;
    details?: unknown;
};
type ApiOk<T> = {
    ok: true;
    data: T;
};
type ApiErr = {
    ok: false;
    error: ApiErrorDto;
};
type ApiResponse<T> = ApiOk<T> | ApiErr;

declare const IdSchema: z.ZodString;
declare const BoardCreateSchema: z.ZodObject<{
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
}, {
    title: string;
}>;
declare const ListCreateSchema: z.ZodObject<{
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
}, {
    title: string;
}>;
declare const ListPatchSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    position?: number | undefined;
}, {
    title?: string | undefined;
    position?: number | undefined;
}>;
declare const CardCreateSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description?: string | null | undefined;
}, {
    title: string;
    description?: string | null | undefined;
}>;
declare const CardPatchSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    position: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    position?: number | undefined;
    description?: string | null | undefined;
}, {
    title?: string | undefined;
    position?: number | undefined;
    description?: string | null | undefined;
}>;
declare const CardMoveSchema: z.ZodObject<{
    toListId: z.ZodString;
    toIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    toListId: string;
    toIndex: number;
}, {
    toListId: string;
    toIndex: number;
}>;
declare const ReorderListsSchema: z.ZodObject<{
    listIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    listIds: string[];
}, {
    listIds: string[];
}>;
declare const ActivityListQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodPipeline<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    cursor?: string | undefined;
    limit?: string | undefined;
}>;

declare const POS_STEP = 1000;
declare function positionForIndex(index: number): number;

export { type ActivityEventDto, type ActivityEventType, ActivityListQuerySchema, type ApiErr, type ApiErrorDto, type ApiOk, type ApiResponse, BoardCreateSchema, type BoardDto, type BoardWithMembersDto, CardCreateSchema, type CardDto, CardMoveSchema, CardPatchSchema, type Id, IdSchema, ListCreateSchema, type ListDto, ListPatchSchema, POS_STEP, ReorderListsSchema, type UserDto, positionForIndex };
