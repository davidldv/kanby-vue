import fp from 'fastify-plugin';
import { Server } from 'socket.io';
import { boardRoom } from '../realtime.js';
function headerToString(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value) && typeof value[0] === 'string')
        return value[0];
    return undefined;
}
function unknownToString(value) {
    if (typeof value === 'string')
        return value;
    return undefined;
}
export const socketPlugin = fp(async (app) => {
    const corsOrigin = app.config?.corsOrigin ?? process.env.CORS_ORIGIN ?? 'http://localhost:9000';
    const io = new Server(app.server, {
        cors: { origin: corsOrigin, credentials: true },
    });
    app.decorate('io', io);
    io.on('connection', (socket) => {
        const fromHeader = headerToString(socket.handshake.headers['x-user-id']);
        const fromAuth = unknownToString(socket.handshake?.auth?.userId);
        const fromQuery = unknownToString(socket.handshake.query?.userId);
        const userId = fromHeader ?? fromAuth ?? fromQuery ?? process.env.DEMO_USER_ID ?? 'demo-user';
        socket.data.userId = userId;
        socket.on('board:join', async (payload) => {
            const boardId = payload?.boardId;
            if (!boardId)
                return;
            // authz: only members can join
            const membership = await app.prisma.boardMember.findUnique({
                where: { boardId_userId: { boardId, userId } },
                select: { boardId: true },
            });
            if (!membership) {
                socket.emit('board:join_denied', { boardId });
                return;
            }
            await socket.join(boardRoom(boardId));
            socket.emit('board:joined', { boardId });
        });
        socket.on('board:leave', async (payload) => {
            const boardId = payload?.boardId;
            if (!boardId)
                return;
            await socket.leave(boardRoom(boardId));
            socket.emit('board:left', { boardId });
        });
    });
});
