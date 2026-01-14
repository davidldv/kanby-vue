export async function requireBoardMember(prisma, boardId, userId) {
    const membership = await prisma.boardMember.findUnique({
        where: { boardId_userId: { boardId, userId } },
        select: { boardId: true },
    });
    if (!membership) {
        const err = new Error('Not a board member');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
    }
}
