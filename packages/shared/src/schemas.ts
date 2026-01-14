import { z } from 'zod';

export const IdSchema = z.string().min(1);

export const BoardCreateSchema = z.object({
  title: z.string().min(1).max(120),
});

export const ListCreateSchema = z.object({
  title: z.string().min(1).max(120),
});

export const ListPatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  position: z.number().int().optional(),
});

export const CardCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
});

export const CardPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  position: z.number().int().optional(),
});

export const CardMoveSchema = z.object({
  toListId: IdSchema,
  toIndex: z.number().int().min(0),
});

export const ReorderListsSchema = z.object({
  listIds: z.array(IdSchema).min(1),
});

export const ActivityListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 50))
    .pipe(z.number().int().min(1).max(200)),
});
