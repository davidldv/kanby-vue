import type { PrismaClient, Prisma } from '../generated/prisma/client.js';

export async function requireBoardMember(
  prisma: PrismaClient | Prisma.TransactionClient,
  boardId: string,
  userId: string,
): Promise<void> {
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { boardId: true },
  });

  if (!membership) {
    const err = new Error('Not a board member');
    (err as any).statusCode = 403;
    (err as any).code = 'FORBIDDEN';
    throw err;
  }
}
