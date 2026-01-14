import fp from 'fastify-plugin';
function headerToString(value) {
    if (typeof value === 'string')
        return value;
    if (Array.isArray(value) && typeof value[0] === 'string')
        return value[0];
    return undefined;
}
export const authPlugin = fp(async (app) => {
    app.addHook('preHandler', async (req) => {
        const fromHeader = headerToString(req.headers['x-user-id']);
        const userId = fromHeader ?? process.env.DEMO_USER_ID ?? 'demo-user';
        req.userId = userId;
        // Ensure demo user exists (no full auth yet)
        await app.prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId, name: userId === 'demo-user' ? 'Demo User' : `User ${userId}` },
        });
    });
});
