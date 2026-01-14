import fp from 'fastify-plugin';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
export const prismaPlugin = fp(async (app) => {
    const connectionString = process.env.RUNTIME_DATABASE_URL ??
        process.env.MIGRATE_DATABASE_URL ??
        process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('Missing RUNTIME_DATABASE_URL (or MIGRATE_DATABASE_URL)');
    }
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });
    app.decorate('prisma', prisma);
    app.addHook('onClose', async (instance) => {
        await instance.prisma.$disconnect();
    });
});
