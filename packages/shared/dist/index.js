// src/schemas.ts
import { z } from "zod";
var IdSchema = z.string().min(1);
var BoardCreateSchema = z.object({
  title: z.string().min(1).max(120)
});
var ListCreateSchema = z.object({
  title: z.string().min(1).max(120)
});
var ListPatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  position: z.number().int().optional()
});
var CardCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5e3).optional().nullable()
});
var CardPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5e3).optional().nullable(),
  position: z.number().int().optional()
});
var CardMoveSchema = z.object({
  toListId: IdSchema,
  toIndex: z.number().int().min(0)
});
var ReorderListsSchema = z.object({
  listIds: z.array(IdSchema).min(1)
});
var ActivityListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional().transform((v) => v ? Number(v) : 50).pipe(z.number().int().min(1).max(200))
});

// src/utils.ts
var POS_STEP = 1e3;
function positionForIndex(index) {
  return (index + 1) * POS_STEP;
}
export {
  ActivityListQuerySchema,
  BoardCreateSchema,
  CardCreateSchema,
  CardMoveSchema,
  CardPatchSchema,
  IdSchema,
  ListCreateSchema,
  ListPatchSchema,
  POS_STEP,
  ReorderListsSchema,
  positionForIndex
};
//# sourceMappingURL=index.js.map